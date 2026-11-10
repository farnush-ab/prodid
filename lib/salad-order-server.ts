/* ---------------------------------------------------------
   ثبت و خواندن سفارش‌های سالاد بار (فقط سرور).
   سالادها در همان مجموعهٔ Order با kind:"salad" ذخیره می‌شوند تا شمارهٔ
   سفارش، گردش وضعیت و ابزارهای پنل مدیریت مشترک بماند.
   هیچ قیمتی از سمت کلاینت پذیرفته نمی‌شود؛ همه‌چیز این‌جا دوباره از
   lib/salad.ts حساب می‌شود.
   --------------------------------------------------------- */

import { randomBytes } from "crypto";
import type { Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone } from "@/lib/phone";
import { isPhoneBlocked } from "@/lib/blocklist";
import { getStoreSettings } from "@/lib/catalog-server";
import { OrderError } from "@/lib/order-server";
import { sendPatternSms, type SmsPattern } from "@/lib/sms";
import type { OrderStatus } from "@/lib/order";
import { Counter } from "@/models/Counter";
import { Order, type OrderDoc } from "@/models/Order";
import {
  SALAD_DELIVERY_FEE,
  SALAD_DELIVERY_SLOTS,
  SALAD_MAX_UNITS,
  SALAD_PICKUP_SLOTS,
  indexSalad,
  saladCalc,
  saladSlotLabel,
  type SaladIndex,
  type SaladWay,
} from "@/lib/salad";
import { getSaladCatalog } from "@/lib/salad-catalog-server";
import type { PublicSaladOrder, SaladOrderLine } from "@/lib/salad-order";

const SALAD_STATUS_PATTERN: Partial<Record<OrderStatus, SmsPattern>> = {
  confirmed: "orderConfirmed",
  preparing: "orderPreparing",
  delivering: "orderDelivering",
  delivered: "orderDelivered",
  cancelled: "orderCancelled",
};

const MAX_SALADS_PER_ORDER = 8;
const MAX_NOTE = 500;
const MAX_ORDERS_PER_HOUR = 6;

export interface CreateSaladOrderInput {
  salads: { size: string; items: Record<string, number>; sauces: string[]; sauceSide?: boolean; name?: string }[];
  way: string;
  slot: string;
  name: string;
  phone: string;
  address?: string;
  note?: string;
}

function isWay(v: string): v is SaladWay {
  return v === "pickup" || v === "delivery";
}

/** یک سالاد را از ورودی خام می‌سازد و قیمت/وزن را از نو حساب می‌کند */
function buildSalad(raw: CreateSaladOrderInput["salads"][number], index: number, idx: SaladIndex): SaladOrderLine {
  const size = idx.size[String(raw.size)];
  if (!size) throw new OrderError(`اندازهٔ کاسهٔ سالاد ${index + 1} نامعتبر است`);

  const items: SaladOrderLine["items"] = [];
  const cleanItems: Record<string, number> = {};
  for (const [id, rawQty] of Object.entries(raw.items || {})) {
    const ing = idx.ing[id];
    if (!ing) throw new OrderError(`مادهٔ «${id}» در سالاد ${index + 1} شناخته نشد`);
    const units = Math.floor(Number(rawQty));
    if (!Number.isFinite(units) || units <= 0) continue;
    if (units > SALAD_MAX_UNITS) {
      throw new OrderError(`مقدار «${ing.n}» بیش از حد مجاز است`);
    }
    cleanItems[id] = units;
    items.push({
      id,
      name: ing.n,
      units,
      grams: Math.round(ing.g * units),
      ...(ing.ulabel ? { unitLabel: ing.ulabel } : {}),
    });
  }
  if (!items.length) throw new OrderError(`سالاد ${index + 1} هیچ ماده‌ای ندارد`);

  const sauceIds: string[] = [];
  const sauces: SaladOrderLine["sauces"] = [];
  for (const sid of raw.sauces || []) {
    const s = idx.sauce[String(sid)];
    if (!s) throw new OrderError(`سس «${sid}» شناخته نشد`);
    if (sauceIds.includes(s.id)) continue;
    sauceIds.push(s.id);
    sauces.push({ id: s.id, name: s.n });
  }

  const calc = saladCalc(cleanItems, sauceIds, size.id, idx);
  if (calc.weight > size.cap * 1.05) {
    throw new OrderError(`سالاد ${index + 1} از ظرفیت کاسهٔ ${size.name} بیشتر است`);
  }

  return {
    name: String(raw.name || "").trim().slice(0, 60) || `سالاد ${index + 1}`,
    size: size.id,
    sizeName: size.name,
    items,
    sauces,
    sauceSide: !!raw.sauceSide,
    weight: Math.round(calc.weight),
    kcal: calc.kcal,
    pro: calc.pro,
    price: calc.price,
  };
}

async function nextSaladOrderNo() {
  const doc = await Counter.findOneAndUpdate(
    { key: "order" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `S${1000 + (doc?.seq || 1)}`;
}

export function toPublicSaladOrder(
  doc: OrderDoc & { _id: Types.ObjectId },
  opts?: { token?: boolean }
): PublicSaladOrder {
  return {
    id: String(doc._id),
    orderNo: doc.orderNo,
    customer: { name: doc.customer.name, phone: doc.customer.phone, address: doc.customer.address },
    salads: (doc.salads || []) as SaladOrderLine[],
    way: (doc.way || "pickup") as SaladWay,
    slot: doc.saladSlot || "",
    slotLabel: doc.saladSlotLabel || "",
    note: doc.notes || "",
    status: doc.status,
    subtotal: doc.estimatedTotal - (doc.deliveryFee || 0),
    deliveryFee: doc.deliveryFee || 0,
    total: doc.estimatedTotal,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
    ...(opts?.token ? { viewToken: doc.viewToken } : {}),
  };
}

export async function createSaladOrder(
  input: CreateSaladOrderInput,
  sessionUser?: { id: string; phone: string } | null
): Promise<PublicSaladOrder> {
  const name = String(input.name || "").trim().slice(0, 80);
  const phone = normalizePhone(input.phone || "");
  const address = String(input.address || "").trim().slice(0, 400);
  const note = String(input.note || "").trim().slice(0, MAX_NOTE);
  const way = String(input.way || "");

  if (!isWay(way)) throw new OrderError("روش تحویل نامعتبر است");
  if (!name || !phone) throw new OrderError("نام و شمارهٔ موبایل لازم است");
  if (way === "delivery" && !address) throw new OrderError("برای ارسال، آدرس لازم است");
  if (await isPhoneBlocked(phone)) {
    throw new OrderError("امکان ثبت سفارش برای این شماره وجود ندارد", 403);
  }

  const slots = way === "pickup" ? SALAD_PICKUP_SLOTS : SALAD_DELIVERY_SLOTS;
  if (!slots.some((s) => s.id === input.slot)) throw new OrderError("زمان تحویل نامعتبر است");

  const settings = await getStoreSettings();
  if (settings.features.maintenance) {
    throw new OrderError("فروشگاه موقتاً در حال تعمیر و نگهداری است");
  }

  const rawSalads = Array.isArray(input.salads) ? input.salads : [];
  if (!rawSalads.length) throw new OrderError("سفارش هیچ سالادی ندارد");
  if (rawSalads.length > MAX_SALADS_PER_ORDER) {
    throw new OrderError(`در هر سفارش حداکثر ${MAX_SALADS_PER_ORDER} سالاد می‌شود ثبت کرد`);
  }

  const saladCatalog = await getSaladCatalog();
  const idx = indexSalad(saladCatalog);
  const salads = rawSalads.map((raw, i) => buildSalad(raw, i, idx));
  const subtotal = salads.reduce((a, s) => a + s.price, 0);
  const deliveryFee = way === "delivery" ? SALAD_DELIVERY_FEE : 0;

  if (way === "delivery" && subtotal < settings.brand.minOrder) {
    throw new OrderError(
      `حداقل مبلغ سفارش برای ارسال ${settings.brand.minOrder.toLocaleString("fa-IR")} تومان است`
    );
  }

  await dbConnect();

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await Order.countDocuments({ "customer.phone": phone, createdAt: { $gte: since } });
  if (recent >= MAX_ORDERS_PER_HOUR) {
    throw new OrderError("تعداد سفارش‌های این شماره در یک ساعت گذشته زیاد است. کمی بعد تلاش کنید.", 429);
  }

  const order = await Order.create({
    orderNo: await nextSaladOrderNo(),
    viewToken: randomBytes(16).toString("hex"),
    userId: sessionUser?.id || null,
    customer: { name, phone, address: way === "delivery" ? address : "تحویل حضوری در شعبه" },
    items: [],
    notes: note,
    // روز/بازهٔ فروشگاه برای سالاد معنی ندارد؛ مقدار معتبر پیش‌فرض می‌گذاریم
    // و زمان واقعی در saladSlot/saladSlotLabel ذخیره می‌شود.
    day: "today",
    slot: "12-15",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    status: "pending",
    estimatedTotal: subtotal + deliveryFee,
    finalTotal: null,
    deliveryFee,
    hasWeightItems: true,
    coupon: null,
    kind: "salad",
    salads,
    way,
    saladSlot: input.slot,
    saladSlotLabel: saladSlotLabel(way, input.slot),
  });

  return toPublicSaladOrder(order, { token: true });
}

export async function listSaladOrders(limit = 200): Promise<PublicSaladOrder[]> {
  await dbConnect();
  const docs = await Order.find({ kind: "salad" }).sort({ createdAt: -1 }).limit(limit);
  return docs.map((d) => toPublicSaladOrder(d));
}

/* گردش وضعیت سفارش سالاد. از adminPatchOrder فروشگاه جدا است چون پیامک
   باید زمان واقعی سالاد («۲۰ دقیقهٔ دیگر می‌رسم») را بگوید، نه بازهٔ
   ارسال فروشگاه که برای سالاد فقط یک مقدار پیش‌فرض است. */
const NEXT_SALAD_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "delivering",
  delivering: "delivered",
};

export async function adminPatchSaladOrder(
  orderNo: string,
  patch: { action?: "advance" | "cancel"; status?: OrderStatus }
): Promise<PublicSaladOrder> {
  await dbConnect();
  const doc = await Order.findOne({ orderNo, kind: "salad" });
  if (!doc) throw new OrderError("سفارش سالاد پیدا نشد", 404);

  const prev = doc.status;
  if (patch.action === "advance") {
    const next = NEXT_SALAD_STATUS[doc.status];
    if (!next) throw new OrderError("این سفارش مرحلهٔ بعدی ندارد");
    doc.status = next;
  } else if (patch.action === "cancel") {
    if (doc.status === "delivered") throw new OrderError("سفارش تحویل‌شده را نمی‌توان لغو کرد");
    if (doc.status === "cancelled") throw new OrderError("این سفارش قبلا لغو شده");
    doc.status = "cancelled";
  } else if (patch.status) {
    doc.status = patch.status;
  }

  await doc.save();
  const order = toPublicSaladOrder(doc);

  if (doc.status !== prev) {
    const pattern = SALAD_STATUS_PATTERN[doc.status];
    if (pattern) {
      sendPatternSms(pattern, order.customer.phone, {
        "customer.name": order.customer.name,
        name: order.customer.name,
        orderNo: order.orderNo,
        estimatedTotal: order.total.toLocaleString("fa-IR"),
        day: order.way === "pickup" ? "تحویل حضوری" : "ارسال",
        slot: order.slotLabel,
        notes: order.note,
        zarinpalRefId: "",
      }).catch((err) => console.error("[salad sms]", err));
    }
  }

  return order;
}
