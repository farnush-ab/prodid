import { Coupon, type CouponDoc } from "@/models/Coupon";
import { CouponRedemption } from "@/models/CouponRedemption";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { dbConnect } from "@/lib/mongodb";
import {
  DEFAULT_LOYALTY_MIN_ORDERS,
  type CouponKind,
  type CouponOffer,
  type CouponRecord,
  type OrderCoupon,
  expiresAtEndOfTehranDay,
  isBirthdayToday,
  isCouponKind,
  isValidBirthDate,
  normalizeCouponCode,
} from "@/lib/coupon";

export class CouponError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function toCouponRecord(doc: CouponDoc): CouponRecord {
  return {
    code: doc.code,
    percent: doc.percent,
    kind: doc.kind,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    minOrders: doc.minOrders || 0,
    active: doc.active !== false,
    usageCount: doc.usageCount || 0,
    note: doc.note || "",
    createdAt: (doc.createdAt || new Date()).toISOString(),
  };
}

export function parseCouponInput(body: Record<string, unknown>, isNew: boolean) {
  const code = normalizeCouponCode(String(body.code || ""));
  if (code.length < 4) throw new CouponError("کد تخفیف باید حداقل ۴ کاراکتر انگلیسی یا عدد باشد");
  const percent = Math.round(Number(body.percent));
  if (!Number.isFinite(percent) || percent < 1 || percent > 90) {
    throw new CouponError("درصد تخفیف باید بین ۱ تا ۹۰ باشد");
  }
  const kindRaw = String(body.kind || "public");
  if (!isCouponKind(kindRaw)) throw new CouponError("نوع تخفیف نامعتبر است");
  const kind: CouponKind = kindRaw;
  let expiresAt: Date | null = null;
  if (body.expiresAt !== null && body.expiresAt !== undefined && String(body.expiresAt).trim()) {
    const raw = String(body.expiresAt).trim().slice(0, 10);
    expiresAt = expiresAtEndOfTehranDay(raw);
    if (!expiresAt) throw new CouponError("تاریخ انقضا نامعتبر است");
  }
  const minOrders =
    kind === "loyalty"
      ? Math.max(1, Math.round(Number(body.minOrders) || DEFAULT_LOYALTY_MIN_ORDERS))
      : 0;
  const active = body.active !== false;
  const note = String(body.note || "").trim().slice(0, 200);
  return { code: isNew ? code : code, percent, kind, expiresAt, minOrders, active, note };
}

export async function listAllCoupons(): Promise<CouponRecord[]> {
  await dbConnect();
  const docs = await Coupon.find().sort({ createdAt: -1 }).limit(200);
  return docs.map(toCouponRecord);
}

async function deliveredLikeCount(phone: string) {
  return Order.countDocuments({
    "customer.phone": phone,
    status: { $nin: ["cancelled", "pending"] },
  });
}

async function couponEligibility(
  coupon: CouponDoc,
  ctx: { phone?: string | null; userId?: string | null }
): Promise<{ eligible: boolean; reason?: string }> {
  if (!coupon.active) return { eligible: false, reason: "این کد فعلا غیرفعال است" };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { eligible: false, reason: "مهلت این کد تمام شده است" };
  }
  if (ctx.phone) {
    const used = await CouponRedemption.findOne({ code: coupon.code, phone: ctx.phone }).lean();
    if (used) return { eligible: false, reason: "این کد قبلا برای این شماره استفاده شده است" };
  }
  if (coupon.kind === "loyalty") {
    if (!ctx.phone) return { eligible: false, reason: "برای کد مشتری ثابت وارد حساب شوید" };
    const n = await deliveredLikeCount(ctx.phone);
    const need = coupon.minOrders || DEFAULT_LOYALTY_MIN_ORDERS;
    if (n < need) {
      return { eligible: false, reason: `این کد برای مشتریان با حداقل ${need} سفارش تاییدشده است` };
    }
  }
  if (coupon.kind === "birthday") {
    if (!ctx.userId) return { eligible: false, reason: "برای کد تولد وارد حساب شوید" };
    const user = await User.findById(ctx.userId).lean();
    const birthDate = String(user?.birthDate || "");
    if (!isValidBirthDate(birthDate)) {
      return { eligible: false, reason: "تاریخ تولد را در حساب کاربری ثبت کنید" };
    }
    if (!isBirthdayToday(birthDate)) {
      return { eligible: false, reason: "این کد فقط در روز تولد معتبر است" };
    }
  }
  return { eligible: true };
}

export async function listOffersFor(ctx: { phone?: string | null; userId?: string | null }): Promise<CouponOffer[]> {
  await dbConnect();
  const docs = await Coupon.find({ active: true }).sort({ createdAt: -1 }).limit(50);
  const now = Date.now();
  const live = docs.filter((c) => !c.expiresAt || c.expiresAt.getTime() >= now);
  const out: CouponOffer[] = [];
  for (const c of live) {
    if (c.kind !== "public" && !ctx.userId) continue;
    const check = await couponEligibility(c, ctx);
    if (c.kind !== "public" && !check.eligible) continue;
    out.push({
      code: c.code,
      percent: c.percent,
      kind: c.kind,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      eligible: check.eligible,
      reason: check.reason,
    });
  }
  return out;
}

export async function previewCoupon(
  rawCode: string,
  ctx: { phone?: string | null; userId?: string | null }
): Promise<CouponOffer> {
  await dbConnect();
  const code = normalizeCouponCode(rawCode);
  if (code.length < 4) throw new CouponError("کد تخفیف نامعتبر است");
  const coupon = await Coupon.findOne({ code });
  if (!coupon) throw new CouponError("کد تخفیف پیدا نشد");
  const check = await couponEligibility(coupon, ctx);
  if (!check.eligible) throw new CouponError(check.reason || "این کد قابل استفاده نیست");
  return {
    code: coupon.code,
    percent: coupon.percent,
    kind: coupon.kind,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
    eligible: true,
  };
}

export async function validateCouponForOrder(
  rawCode: string,
  ctx: { phone: string; userId?: string | null }
): Promise<OrderCoupon> {
  const offer = await previewCoupon(rawCode, ctx);
  return { code: offer.code, percent: offer.percent };
}

export async function recordCouponRedemption(params: { code: string; phone: string; orderNo: string }) {
  await dbConnect();
  try {
    await CouponRedemption.create({
      code: params.code,
      phone: params.phone,
      orderNo: params.orderNo,
    });
  } catch (err) {
    const e = err as { code?: number };
    if (e.code === 11000) throw new CouponError("این کد قبلا برای این شماره استفاده شده است");
    throw err;
  }
  await Coupon.updateOne({ code: params.code }, { $inc: { usageCount: 1 } });
}

export async function releaseCouponForOrder(orderNo: string) {
  await dbConnect();
  const row = await CouponRedemption.findOneAndDelete({ orderNo });
  if (row) {
    await Coupon.updateOne({ code: row.code, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
  }
}
