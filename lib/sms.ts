import { fmtPrice, toFa } from "@/lib/format";
import { dayLabel, slotLabel, type PublicOrder } from "@/lib/order";
import { IppanelError, isIppanelConfigured, sendIppanelPattern } from "@/lib/ippanel";

export type SmsPattern =
  | "otp"
  | "orderPending"
  | "orderConfirmed"
  | "orderPreparing"
  | "orderDelivering"
  | "orderDelivered"
  | "orderCancelled"
  | "payPaid"
  | "payFailed"
  | "couponPublic"
  | "couponLoyalty"
  | "birthday"
  | "restock";

const PATTERN_ENV: Record<SmsPattern, string> = {
  otp: "IPPANEL_PATTERN_OTP",
  orderPending: "IPPANEL_PATTERN_ORDER_PENDING",
  orderConfirmed: "IPPANEL_PATTERN_ORDER_CONFIRMED",
  orderPreparing: "IPPANEL_PATTERN_ORDER_PREPARING",
  orderDelivering: "IPPANEL_PATTERN_ORDER_DELIVERING",
  orderDelivered: "IPPANEL_PATTERN_ORDER_DELIVERED",
  orderCancelled: "IPPANEL_PATTERN_ORDER_CANCELLED",
  payPaid: "IPPANEL_PATTERN_PAY_PAID",
  payFailed: "IPPANEL_PATTERN_PAY_FAILED",
  couponPublic: "IPPANEL_PATTERN_COUPON_PUBLIC",
  couponLoyalty: "IPPANEL_PATTERN_COUPON_LOYALTY",
  birthday: "IPPANEL_PATTERN_BIRTHDAY",
  restock: "IPPANEL_PATTERN_RESTOCK",
};

const ORDER_STATUS_PATTERN: Record<string, SmsPattern> = {
  pending: "orderPending",
  confirmed: "orderConfirmed",
  preparing: "orderPreparing",
  delivering: "orderDelivering",
  delivered: "orderDelivered",
  cancelled: "orderCancelled",
};

function patternCode(id: SmsPattern) {
  return (process.env[PATTERN_ENV[id]] || "").trim();
}

function orderParams(order: PublicOrder) {
  const name = order.customer.name || "";
  return {
    "customer.name": name,
    name,
    orderNo: order.orderNo,
    estimatedTotal: fmtPrice(order.estimatedTotal),
    day: dayLabel(order.day),
    slot: slotLabel(order.slot),
    notes: order.notes || "",
    zarinpalRefId: order.zarinpalRefId || "",
  };
}

export async function sendPatternSms(
  id: SmsPattern,
  phone: string,
  params: Record<string, string | number | null | undefined>
) {
  if (!isIppanelConfigured()) return false;
  const code = patternCode(id);
  if (!code) {
    console.warn(`[sms] پترن ${id} (${PATTERN_ENV[id]}) تنظیم نشده؛ ارسال نشد`);
    return false;
  }
  await sendIppanelPattern({ patternCode: code, recipient: phone, params });
  return true;
}

function fire(label: string, fn: () => Promise<unknown>) {
  void fn().catch((err) => {
    console.error(`[sms] ${label}`, err instanceof Error ? err.message : err);
  });
}

export async function sendOtpSms(phone: string, code: string, ttlMinutes: number) {
  if (!isIppanelConfigured()) {
    console.log(`[پرودید OTP] ${phone} → ${code}  (اعتبار ${ttlMinutes} دقیقه) — پنل پیامک تنظیم نشده`);
    return false;
  }
  if (!patternCode("otp")) {
    throw new IppanelError("کد پترن OTP در IPPANEL_PATTERN_OTP تنظیم نشده است", 503);
  }
  try {
    return await sendPatternSms("otp", phone, { code, ttlMinutes: toFa(ttlMinutes) });
  } catch (err) {
    if (err instanceof IppanelError) throw err;
    throw new IppanelError("ارسال پیامک کد تایید انجام نشد");
  }
}

export function notifyOrderSms(order: PublicOrder) {
  const id = ORDER_STATUS_PATTERN[order.status];
  if (!id) return;
  fire(`order ${order.orderNo} ${order.status}`, () =>
    sendPatternSms(id, order.customer.phone, orderParams(order))
  );
}

export function notifyPaymentSms(order: PublicOrder, paid: boolean) {
  fire(`pay ${order.orderNo} ${paid ? "paid" : "failed"}`, () =>
    sendPatternSms(paid ? "payPaid" : "payFailed", order.customer.phone, orderParams(order))
  );
}

export function notifyCouponSms(opts: {
  kind: "public" | "loyalty";
  phone: string;
  name: string;
  code: string;
  percent: number;
  expiresAt?: string | null;
}) {
  const id: SmsPattern = opts.kind === "loyalty" ? "couponLoyalty" : "couponPublic";
  fire(`coupon ${opts.code} → ${opts.phone}`, () =>
    sendPatternSms(id, opts.phone, {
      "user.name": opts.name,
      name: opts.name,
      code: opts.code,
      percent: toFa(opts.percent),
      expiresAt: opts.expiresAt || "",
    })
  );
}

export function notifyBirthdaySms(opts: {
  phone: string;
  name: string;
  code: string;
  percent: number;
  expiresAt?: string | null;
}) {
  fire(`birthday → ${opts.phone}`, () =>
    sendPatternSms("birthday", opts.phone, {
      "user.name": opts.name,
      name: opts.name,
      code: opts.code,
      percent: toFa(opts.percent),
      expiresAt: opts.expiresAt || "",
    })
  );
}

export function notifyRestockSms(opts: { phone: string; name: string; productName: string }) {
  fire(`restock ${opts.productName} → ${opts.phone}`, () =>
    sendPatternSms("restock", opts.phone, {
      "user.name": opts.name,
      "product.name": opts.productName,
      name: opts.name,
    })
  );
}
