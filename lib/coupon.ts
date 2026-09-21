import { toEnDigits } from "@/lib/phone";

export const COUPON_KINDS = ["public", "loyalty", "birthday"] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

export const COUPON_KIND_LABEL: Record<CouponKind, string> = {
  public: "عمومی",
  loyalty: "مشتری ثابت",
  birthday: "تولد",
};

export const DEFAULT_LOYALTY_MIN_ORDERS = 3;

export interface OrderCoupon {
  code: string;
  percent: number;
}

export interface CouponRecord {
  code: string;
  percent: number;
  kind: CouponKind;
  expiresAt: string | null;
  minOrders: number;
  active: boolean;
  usageCount: number;
  note: string;
  createdAt: string;
}

export interface CouponOffer {
  code: string;
  percent: number;
  kind: CouponKind;
  expiresAt: string | null;
  eligible: boolean;
  reason?: string;
}

export function isCouponKind(v: string): v is CouponKind {
  return (COUPON_KINDS as readonly string[]).includes(v);
}

export function normalizeCouponCode(raw: string): string {
  return toEnDigits(String(raw || ""))
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
}

export function isValidBirthDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  const thisYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric" }).format(new Date()));
  if (y < 1920 || y > thisYear) return false;
  return true;
}

export function iranTodayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(now);
}

export function isBirthdayToday(birthDate: string, now = new Date()): boolean {
  if (!isValidBirthDate(birthDate)) return false;
  return iranTodayYmd(now).slice(5) === birthDate.slice(5);
}

export function couponDiscountAmount(subtotal: number, percent: number): number {
  if (!percent || subtotal <= 0) return 0;
  const p = Math.min(90, Math.max(0, Math.round(percent)));
  return Math.round(subtotal * (p / 100));
}

export function orderSubtotal(order: { estimatedTotal: number; finalTotal?: number | null }): number {
  return order.finalTotal ?? order.estimatedTotal;
}

export function orderPayable(order: {
  estimatedTotal: number;
  finalTotal?: number | null;
  coupon?: OrderCoupon | null;
}): number {
  const sub = orderSubtotal(order);
  const discount = order.coupon ? couponDiscountAmount(sub, order.coupon.percent) : 0;
  return Math.max(0, sub - discount);
}

export function expiresAtEndOfTehranDay(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T23:59:59.999+03:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}
