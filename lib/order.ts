import { BRAND } from "@/lib/data";
import { faNum, fmtPrice, qtyLabelBySale } from "@/lib/format";
import { couponDiscountAmount, orderPayable, type OrderCoupon } from "@/lib/coupon";

export const DELIVERY_DAYS = [
  { id: "today", label: "امروز (ارسال همان‌روز)" },
  { id: "tomorrow", label: "فردا" },
] as const;

export const DELIVERY_SLOTS = [
  { id: "9-12", label: "۹ تا ۱۲" },
  { id: "12-15", label: "۱۲ تا ۱۵" },
  { id: "15-18", label: "۱۵ تا ۱۸" },
  { id: "18-21", label: "۱۸ تا ۲۱" },
] as const;

export const PAY_METHODS = [
  {
    id: "card" as const,
    label: "کارت به کارت",
    hint: "شماره کارت پس از تایید سفارش برای شما ارسال می‌شود.",
    icon: "card",
  },
  {
    id: "cod" as const,
    label: "پرداخت در محل تحویل",
    hint: "پرداخت با کارت‌خوان سیار یا نقدی هنگام تحویل.",
    icon: "wallet",
  },
  {
    id: "online" as const,
    label: "پرداخت آنلاین",
    hint: "با درگاه امن بانکی؛ ورود با موبایل لازم است.",
    icon: "card",
  },
];

export type DeliveryDay = (typeof DELIVERY_DAYS)[number]["id"];
export type DeliverySlot = (typeof DELIVERY_SLOTS)[number]["id"];
/* "wallet" در فهرست انتخاب صفحه پرداخت نیست: وقتی موجودی کیف پول کل مبلغ را
   بپوشاند سفارش خودکار با این روش ثبت می‌شود. */
export type PayMethod = (typeof PAY_METHODS)[number]["id"] | "wallet";
export type PayStatus = "unpaid" | "paid" | "failed";
export type OrderStatus = "pending" | "confirmed" | "preparing" | "delivering" | "delivered" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "در انتظار تایید",
  confirmed: "تایید شده",
  preparing: "در حال آماده‌سازی",
  delivering: "در حال ارسال",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  card: "کارت به کارت",
  cod: "پرداخت در محل",
  online: "پرداخت آنلاین",
  wallet: "کیف پول",
};

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  unpaid: "پرداخت نشده",
  paid: "پرداخت شده",
  failed: "ناموفق",
};

export interface PublicOrderItem {
  /** همیشه شناسهٔ محصول اصلی (برای گزارش‌ها)، حتی برای گونه */
  productId: string;
  /** گونهٔ انتخاب‌شده، اگر محصول گونه‌دار بوده؛ نام ردیف هم «نام — گونه» است */
  variantId?: string;
  variantLabel?: string;
  name: string;
  sale: "w" | "u";
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PublicOrder {
  id: string;
  orderNo: string;
  customer: { name: string; phone: string; address: string };
  items: PublicOrderItem[];
  notes: string;
  day: DeliveryDay;
  slot: DeliverySlot;
  paymentMethod: PayMethod;
  paymentStatus: PayStatus;
  status: OrderStatus;
  estimatedTotal: number;
  finalTotal: number | null;
  deliveryFee?: number | null;
  hasWeightItems: boolean;
  coupon?: OrderCoupon | null;
  zarinpalRefId?: string;
  /** کد رهگیری بانکی پرداخت آنلاین */
  payRef?: string;
  /** مبلغی که از کیف پول کسر شده */
  walletUsed?: number;
  /** اعتبار هدیه‌ای که بعد از تحویل به کیف پول رفته */
  cashback?: number;
  /** مبلغی که پس از لغو به کیف پول برگشته */
  refundedToWallet?: number;
  createdAt: string;
  viewToken?: string;
}

export interface CreateOrderInput {
  items: { id: string; qty: number }[];
  name: string;
  phone: string;
  address: string;
  day: string;
  slot: string;
  pay: string;
  notes?: string;
  couponCode?: string;
  /** موجودی کیف پول تا سقف مبلغ سفارش خرج شود (فقط برای کاربر واردشده) */
  useWallet?: boolean;
}

export function dayLabel(id: string) {
  return DELIVERY_DAYS.find((d) => d.id === id)?.label || id;
}

export function slotLabel(id: string) {
  return DELIVERY_SLOTS.find((s) => s.id === id)?.label || id;
}

export function isDeliveryDay(v: string): v is DeliveryDay {
  return DELIVERY_DAYS.some((d) => d.id === v);
}

export function isDeliverySlot(v: string): v is DeliverySlot {
  return DELIVERY_SLOTS.some((s) => s.id === v);
}

export function isPayMethod(v: string): v is PayMethod {
  return v === "wallet" || PAY_METHODS.some((p) => p.id === v);
}

/** آنچه بعد از کسر سهم کیف پول باید با روش اصلی پرداخت شود */
export function orderDue(o: Pick<PublicOrder, "estimatedTotal" | "finalTotal" | "coupon" | "walletUsed">): number {
  return Math.max(0, orderPayable(o) - Math.round(o.walletUsed || 0));
}

export function canPayOnlineOrder(o: Pick<PublicOrder, "paymentMethod" | "paymentStatus" | "status">) {
  return o.paymentMethod === "online" && o.paymentStatus !== "paid" && o.status !== "cancelled";
}

export function orderWhatsappText(order: PublicOrder, kind: "new" | "track" = "new") {
  const title = kind === "track" ? "*پیگیری سفارش پرودید*" : "*سفارش جدید از سایت پرودید*";
  const lines = [
    title,
    `شماره سفارش: ${order.orderNo}`,
    "──────────────",
    ...order.items.map(
      (it, i) =>
        `${faNum.format(i + 1)}. ${it.name} — ${qtyLabelBySale(it.sale, it.qty)} — ${fmtPrice(it.lineTotal)} تومان${
          it.sale === "w" ? " (تقریبی)" : ""
        }`
    ),
    "──────────────",
    `جمع کل${order.hasWeightItems ? " (تقریبی)" : ""}: ${fmtPrice(order.estimatedTotal)} تومان`,
    order.coupon
      ? `تخفیف ${faNum.format(order.coupon.percent)}٪ کد ${order.coupon.code}: −${fmtPrice(couponDiscountAmount(order.estimatedTotal, order.coupon.percent))} تومان`
      : "",
    order.coupon ? `قابل پرداخت: ${fmtPrice(orderPayable(order))} تومان` : "",
    order.walletUsed ? `پرداخت از کیف پول: −${fmtPrice(order.walletUsed)} تومان` : "",
    order.walletUsed ? `مانده: ${fmtPrice(orderDue(order))} تومان` : "",
    `گیرنده: ${order.customer.name}`,
    `موبایل: ${order.customer.phone}`,
    `آدرس: ${order.customer.address}`,
    `زمان تحویل: ${dayLabel(order.day)} — ساعت ${slotLabel(order.slot)}`,
    `روش پرداخت: ${PAY_METHOD_LABEL[order.paymentMethod]}`,
    order.notes ? `توضیحات: ${order.notes}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function orderWhatsappUrl(order: PublicOrder, kind: "new" | "track" = "new", phoneIntl?: string) {
  const intl = phoneIntl || BRAND.phoneIntl;
  return `https://wa.me/${intl}?text=${encodeURIComponent(orderWhatsappText(order, kind))}`;
}

export const LAST_ORDER_KEY = "prodid_last_order";
