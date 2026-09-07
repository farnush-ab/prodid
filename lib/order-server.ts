import { randomBytes } from "crypto";
import { BRAND, getProduct } from "@/lib/data";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone } from "@/lib/phone";
import {
  isDeliveryDay,
  isDeliverySlot,
  isPayMethod,
  type CreateOrderInput,
  type PublicOrder,
  type PublicOrderItem,
} from "@/lib/order";
import { Counter } from "@/models/Counter";
import { Order, type OrderDoc } from "@/models/Order";
import { User } from "@/models/User";
import type { Types } from "mongoose";

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
    hasWeightItems: doc.hasWeightItems,
    createdAt: (doc.createdAt || new Date()).toISOString(),
    ...(opts?.token ? { viewToken: doc.viewToken } : {}),
  };
}

async function nextOrderNo() {
  const c = await Counter.findOneAndUpdate({ key: "order" }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `PD${String(c.seq).padStart(6, "0")}`;
}

function buildItems(raw: CreateOrderInput["items"]): { items: PublicOrderItem[]; estimatedTotal: number; hasWeightItems: boolean } {
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

    const product = getProduct(id);
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
  if (!isDeliveryDay(input.day)) throw new OrderError("روز تحویل نامعتبر است");
  if (!isDeliverySlot(input.slot)) throw new OrderError("بازه زمانی نامعتبر است");
  if (!isPayMethod(input.pay)) throw new OrderError("روش پرداخت نامعتبر است");
  if (input.pay === "online" && !sessionUser) {
    throw new OrderError("برای پرداخت آنلاین ابتدا وارد حساب شوید", 401);
  }

  const { items, estimatedTotal, hasWeightItems } = buildItems(input.items);
  if (estimatedTotal < BRAND.minOrder) {
    throw new OrderError(`حداقل مبلغ سفارش ${BRAND.minOrder.toLocaleString("fa-IR")} تومان است`);
  }

  await dbConnect();

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
  });

  if (sessionUser) {
    await User.findByIdAndUpdate(sessionUser.id, { $set: { name, address } });
  }

  return toPublicOrder(order, { token: true });
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

export async function cancelOrder(orderNo: string, user: { id: string; phone: string }) {
  const doc = await findOrderByNo(orderNo);
  if (!doc) throw new OrderError("سفارش پیدا نشد", 404);
  if (!canViewOrder(doc, { user })) throw new OrderError("دسترسی به این سفارش ندارید", 403);
  if (doc.status !== "pending") {
    throw new OrderError("فقط سفارش در انتظار تایید را می‌توان لغو کرد");
  }
  doc.status = "cancelled";
  await doc.save();
  return toPublicOrder(doc);
}
