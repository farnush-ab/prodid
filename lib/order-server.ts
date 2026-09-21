import { randomBytes } from "crypto";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone } from "@/lib/phone";
import { isPhoneBlocked } from "@/lib/blocklist";
import { getLiveCatalog, getStoreSettings } from "@/lib/catalog-server";
import { isEnabledDay, isEnabledSlot } from "@/lib/store-settings";
import {
  isPayMethod,
  type CreateOrderInput,
  type PublicOrder,
  type PublicOrderItem,
} from "@/lib/order";
import { Counter } from "@/models/Counter";
import { Order, type OrderDoc } from "@/models/Order";
import { User } from "@/models/User";
import type { Types } from "mongoose";
import type { Product } from "@/lib/data";
import {
  ZarinpalError,
  getZarinpalConfig,
  isZarinpalConfigured,
  zarinpalRequestPayment,
  zarinpalStartPayUrl,
  zarinpalVerifyPayment,
} from "@/lib/zarinpal";
import { orderPayable, type OrderCoupon } from "@/lib/coupon";
import { CouponError, recordCouponRedemption, releaseCouponForOrder, validateCouponForOrder } from "@/lib/coupon-server";
import { notifyOrderSms, notifyPaymentSms } from "@/lib/sms";

const MAX_ITEMS = 40;
const MAX_NOTES = 500;
const MAX_ORDERS_PER_HOUR = 6;
const MIN_WEIGHT = 0.1;

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function couponFromDoc(doc: { coupon?: OrderCoupon | null }): OrderCoupon | null {
  const c = doc.coupon;
  if (!c || !c.code || !c.percent) return null;
  return { code: c.code, percent: c.percent };
}

export function toPublicOrder(doc: OrderDoc & { _id: Types.ObjectId }, opts?: { token?: boolean }): PublicOrder {
  return {
    id: String(doc._id),
    orderNo: doc.orderNo,
    customer: {
      name: doc.customer.name,
      phone: doc.customer.phone,
      address: doc.customer.address,
    },
    items: doc.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      sale: it.sale,
      qty: it.qty,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
    })),
    notes: doc.notes || "",
    day: doc.day,
    slot: doc.slot,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    status: doc.status,
    estimatedTotal: doc.estimatedTotal,
    finalTotal: doc.finalTotal,
    deliveryFee: doc.deliveryFee ?? null,
    hasWeightItems: doc.hasWeightItems,
    coupon: couponFromDoc(doc),
    zarinpalRefId: doc.zarinpalRefId || "",
    createdAt: (doc.createdAt || new Date()).toISOString(),
    ...(opts?.token ? { viewToken: doc.viewToken } : {}),
  };
}

async function nextOrderNo() {
  const c = await Counter.findOneAndUpdate({ key: "order" }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `PD${String(c.seq).padStart(6, "0")}`;
}

function buildItems(
  raw: CreateOrderInput["items"],
  catalog: Product[]
): { items: PublicOrderItem[]; estimatedTotal: number; hasWeightItems: boolean } {
  if (!Array.isArray(raw) || !raw.length) {
    throw new OrderError("سبد خرید خالی است");
  }
  if (raw.length > MAX_ITEMS) {
    throw new OrderError("تعداد اقلام سبد بیش از حد مجاز است");
  }

  const seen = new Set<string>();
  const items: PublicOrderItem[] = [];

  for (const row of raw) {
    const id = String(row?.id || "");
    if (!id || seen.has(id)) throw new OrderError("سبد خرید نامعتبر است");
    seen.add(id);

    const product = catalog.find((p) => p.id === id);
    if (!product) throw new OrderError("یکی از محصولات دیگر موجود نیست");
    if (!product.available) throw new OrderError(`«${product.name}» ناموجود است`);
    if (product.price === null) throw new OrderError(`قیمت «${product.name}» نیاز به استعلام دارد`);

    const qty = Number(row.qty);
    if (!Number.isFinite(qty)) throw new OrderError("مقدار سفارش نامعتبر است");

    let nextQty = qty;
    if (product.sale === "w") {
      nextQty = Math.round(qty * 1000) / 1000;
      if (nextQty < MIN_WEIGHT || nextQty > 50) {
        throw new OrderError(`وزن «${product.name}» نامعتبر است`);
      }
    } else {
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
        throw new OrderError(`تعداد «${product.name}» نامعتبر است`);
      }
    }

    const lineTotal = Math.round(product.price * nextQty);
    items.push({
      productId: product.id,
      name: product.name,
      sale: product.sale,
      qty: nextQty,
      unitPrice: product.price,
      lineTotal,
    });
  }

  const estimatedTotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const hasWeightItems = items.some((it) => it.sale === "w");
  return { items, estimatedTotal, hasWeightItems };
}

export async function createOrder(
  input: CreateOrderInput,
  sessionUser?: { id: string; phone: string } | null
) {
  const name = String(input.name || "").trim().slice(0, 80);
  const address = String(input.address || "").trim().slice(0, 400);
  const notes = String(input.notes || "").trim().slice(0, MAX_NOTES);
  const phone = normalizePhone(input.phone || "");

  if (!name || !address || !phone) {
    throw new OrderError("لطفا نام، موبایل و آدرس را کامل کنید");
  }
  if (await isPhoneBlocked(phone)) {
    throw new OrderError("امکان ثبت سفارش برای این شماره وجود ندارد", 403);
  }

  const settings = await getStoreSettings();
  if (settings.features.maintenance) {
    throw new OrderError("فروشگاه موقتاً در حال تعمیر و نگهداری است");
  }
  if (!isEnabledDay(settings, input.day)) throw new OrderError("روز تحویل نامعتبر است");
  if (!isEnabledSlot(settings, input.slot)) throw new OrderError("بازه زمانی نامعتبر است");
  if (!isPayMethod(input.pay)) throw new OrderError("روش پرداخت نامعتبر است");
  if (input.pay === "online" && !sessionUser) {
    throw new OrderError("برای پرداخت آنلاین ابتدا وارد حساب شوید", 401);
  }
  if (input.pay === "online" && !settings.features.onlinePay) {
    throw new OrderError("پرداخت آنلاین فعلا فعال نیست");
  }

  const { products } = await getLiveCatalog();
  const { items, estimatedTotal, hasWeightItems } = buildItems(input.items, products);
  if (estimatedTotal < settings.brand.minOrder) {
    throw new OrderError(`حداقل مبلغ سفارش ${settings.brand.minOrder.toLocaleString("fa-IR")} تومان است`);
  }

  await dbConnect();

  let coupon: OrderCoupon | null = null;
  const couponCode = String(input.couponCode || "").trim();
  if (couponCode) {
    try {
      coupon = await validateCouponForOrder(couponCode, { phone, userId: sessionUser?.id || null });
    } catch (err) {
      if (err instanceof CouponError) throw new OrderError(err.message, err.status);
      throw err;
    }
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await Order.countDocuments({ "customer.phone": phone, createdAt: { $gte: since } });
  if (recent >= MAX_ORDERS_PER_HOUR) {
    throw new OrderError("تعداد سفارش‌های این شماره در یک ساعت گذشته زیاد است. کمی بعد تلاش کنید.", 429);
  }

  const order = await Order.create({
    orderNo: await nextOrderNo(),
    viewToken: randomBytes(16).toString("hex"),
    userId: sessionUser?.id || null,
    customer: { name, phone, address },
    items,
    notes,
    day: input.day,
    slot: input.slot,
    paymentMethod: input.pay,
    paymentStatus: "unpaid",
    status: "pending",
    estimatedTotal,
    finalTotal: null,
    deliveryFee: null,
    hasWeightItems,
    coupon,
  });

  if (coupon) {
    try {
      await recordCouponRedemption({ code: coupon.code, phone, orderNo: order.orderNo });
    } catch (err) {
      await Order.deleteOne({ _id: order._id });
      if (err instanceof CouponError) throw new OrderError(err.message, err.status);
      throw err;
    }
  }

  if (sessionUser) {
    await User.findByIdAndUpdate(sessionUser.id, { $set: { name, address } });
  }

  const publicOrder = toPublicOrder(order, { token: true });
  notifyOrderSms(publicOrder);
  return publicOrder;
}

export async function listAllOrders(limit = 200) {
  await dbConnect();
  const docs = await Order.find().sort({ createdAt: -1 }).limit(limit);
  return docs.map((d) => toPublicOrder(d));
}

export async function listOrdersForUser(user: { id: string; phone: string }) {
  await dbConnect();
  await Order.updateMany(
    { "customer.phone": user.phone, $or: [{ userId: null }, { userId: { $exists: false } }] },
    { $set: { userId: user.id } }
  );

  const docs = await Order.find({
    $or: [{ userId: user.id }, { "customer.phone": user.phone }],
  })
    .sort({ createdAt: -1 })
    .limit(50);

  return docs.map((d) => toPublicOrder(d));
}

export function canViewOrder(
  doc: OrderDoc,
  opts: { user?: { id: string; phone: string } | null; token?: string | null }
) {
  if (opts.user?.id && String(doc.userId || "") === opts.user.id) return true;
  if (opts.user?.phone && doc.customer.phone === opts.user.phone) return true;
  if (opts.token && opts.token === doc.viewToken) return true;
  return false;
}

export async function findOrderByNo(orderNo: string) {
  await dbConnect();
  return Order.findOne({ orderNo });
}

export async function findOrderByAuthority(authority: string) {
  await dbConnect();
  const value = String(authority || "").trim();
  if (!value) return null;
  return Order.findOne({ zarinpalAuthority: value });
}

function assertZarinpalReady() {
  if (!isZarinpalConfigured()) {
    throw new ZarinpalError("مرچنت‌آیدی زرین‌پال روی سرور تنظیم نشده است", 503);
  }
}

async function requestZarinpalForOrder(doc: OrderDoc & { save: () => Promise<unknown> }, appUrl?: string) {
  if (doc.paymentMethod !== "online") {
    throw new OrderError("این سفارش پرداخت آنلاین ندارد");
  }
  if (doc.paymentStatus === "paid") {
    throw new OrderError("این سفارش قبلا پرداخت شده است");
  }
  if (doc.status === "cancelled") {
    throw new OrderError("سفارش لغو شده است");
  }

  const config = getZarinpalConfig(appUrl);
  const { authority } = await zarinpalRequestPayment(
    {
      amountToman: orderPayable({
        estimatedTotal: doc.estimatedTotal,
        finalTotal: doc.finalTotal,
        coupon: couponFromDoc(doc),
      }),
      description: `سفارش ${doc.orderNo} — پرودید`,
      mobile: doc.customer.phone,
      orderId: doc.orderNo,
    },
    config
  );

  doc.zarinpalAuthority = authority;
  if (doc.paymentStatus === "failed") doc.paymentStatus = "unpaid";
  await doc.save();

  return zarinpalStartPayUrl(authority, config);
}

export async function startOnlinePaymentForNewOrder(
  input: CreateOrderInput,
  user: { id: string; phone: string },
  appUrl?: string
) {
  assertZarinpalReady();
  const created = await createOrder({ ...input, pay: "online" }, user);
  const doc = await findOrderByNo(created.orderNo);
  if (!doc) throw new OrderError("سفارش ثبت شد اما برای پرداخت پیدا نشد", 500);
  const paymentUrl = await requestZarinpalForOrder(doc, appUrl);
  return { order: toPublicOrder(doc, { token: true }), paymentUrl };
}

export async function startOnlinePaymentForExistingOrder(
  orderNo: string,
  user: { id: string; phone: string },
  appUrl?: string
) {
  assertZarinpalReady();
  const doc = await findOrderByNo(orderNo);
  if (!doc) throw new OrderError("سفارش پیدا نشد", 404);
  if (!canViewOrder(doc, { user })) throw new OrderError("دسترسی به این سفارش ندارید", 403);
  const paymentUrl = await requestZarinpalForOrder(doc, appUrl);
  return { order: toPublicOrder(doc, { token: true }), paymentUrl };
}

export async function finalizeZarinpalCallback(authority: string, status: string, appUrl?: string) {
  const doc = await findOrderByAuthority(authority);
  if (!doc) throw new OrderError("سفارش این پرداخت پیدا نشد", 404);

  if (doc.paymentStatus === "paid") {
    return { order: toPublicOrder(doc, { token: true }), paid: true as const };
  }

  if (status !== "OK") {
    doc.paymentStatus = "failed";
    await doc.save();
    const failed = toPublicOrder(doc, { token: true });
    notifyPaymentSms(failed, false);
    return { order: failed, paid: false as const };
  }

  try {
    const verified = await zarinpalVerifyPayment(
      { amountToman: orderPayable({ estimatedTotal: doc.estimatedTotal, finalTotal: doc.finalTotal, coupon: couponFromDoc(doc) }), authority },
      getZarinpalConfig(appUrl)
    );
    doc.paymentStatus = "paid";
    doc.zarinpalRefId = verified.refId;
    await doc.save();
    const paid = toPublicOrder(doc, { token: true });
    notifyPaymentSms(paid, true);
    return { order: paid, paid: true as const };
  } catch (err) {
    doc.paymentStatus = "failed";
    await doc.save();
    const failed = toPublicOrder(doc, { token: true });
    notifyPaymentSms(failed, false);
    if (err instanceof ZarinpalError || err instanceof OrderError) {
      return { order: failed, paid: false as const };
    }
    throw err;
  }
}

export async function cancelOrder(orderNo: string, user: { id: string; phone: string }) {
  const doc = await findOrderByNo(orderNo);
  if (!doc) throw new OrderError("سفارش پیدا نشد", 404);
  if (!canViewOrder(doc, { user })) throw new OrderError("دسترسی به این سفارش ندارید", 403);
  if (doc.status !== "pending") {
    throw new OrderError("فقط سفارش در انتظار تایید را می‌توان لغو کرد");
  }
  doc.status = "cancelled";
  await doc.save();
  await releaseCouponForOrder(doc.orderNo);
  const publicOrder = toPublicOrder(doc);
  notifyOrderSms(publicOrder);
  return publicOrder;
}
