/* ---------------------------------------------------------
   پرودید — داده‌های نمایشی پنل مدیریت
   این فایل هیچ اتصالی به MongoDB/API ندارد؛ فقط برای نمایش
   کامل رابط کاربری پنل مدیریت با داده‌های واقع‌گرا (بر مبنای
   محصولات و قوانین واقعی سایت) استفاده می‌شود. اعداد ثابت‌اند
   (نه رندوم) تا خروجی سرور و کلاینت هنگام hydration یکسان بماند.
   --------------------------------------------------------- */

import { CATEGORIES as REAL_CATEGORIES, PRODUCTS as REAL_PRODUCTS } from "./data";
import type { Category, Product } from "./data";
import { DELIVERY_DAYS, DELIVERY_SLOTS, type PublicOrder } from "./order";

export function cloneCategories(): Category[] {
  return REAL_CATEGORIES.map((c) => ({ ...c }));
}
export function cloneProducts(): (Product & { sold: number })[] {
  return REAL_PRODUCTS.map((p, i) => ({ ...p, sold: SOLD_COUNTS[i] ?? 20 }));
}

/* تعداد فروش هر محصول در ۳۰ روز اخیر — ثابت، فقط برای گزارش‌ها و پرفروش‌ترین‌ها */
const SOLD_COUNTS = [
  38, 22, 41, 19, 96, 31, 142, 128, 54, 47, 64, 58, 37, 29, 26, 33, 18, 21, 15, 20, 73, 44, 12, 9,
  8, 6, 22, 13, 39,
];

export interface AdminOrder extends PublicOrder {
  createdLabel: string;
}

/* آیا سفارش امروز ثبت شده — بر اساس زمان واقعی ثبت (createdAt/createdLabel)،
   نه روز تحویل انتخابی مشتری (day) که می‌تواند برای سفارش‌های قدیمی هم «امروز»/«فردا» باشد */
export function isCreatedToday(order: AdminOrder): boolean {
  return !order.createdLabel.includes("دیروز") && !order.createdLabel.includes("روز پیش");
}

const item = (productId: string, qty: number) => {
  const p = REAL_PRODUCTS.find((x) => x.id === productId)!;
  const lineTotal = Math.round((p.price ?? 0) * qty);
  return { productId, name: p.name, sale: p.sale, qty, unitPrice: p.price ?? 0, lineTotal };
};

export const ADMIN_ORDERS: AdminOrder[] = [
  {
    id: "1049", orderNo: "PRD-1049", customer: { name: "مریم اکبری", phone: "09121234567", address: "کاشان، خیابان شهید بهشتی، کوچه ۱۲، پلاک ۴" },
    items: [item("kabab-koobideh", 1), item("jooje-file", 0.5)], notes: "لطفا زنگ بزنید قبل از رسیدن",
    day: "today", slot: "15-18", paymentMethod: "card", paymentStatus: "unpaid", status: "pending",
    estimatedTotal: 830000 + Math.round(345000 * 0.5), finalTotal: null, hasWeightItems: true,
    createdAt: "2026-09-08T10:50:00.000Z", createdLabel: "۱۴:۲۰",
  },
  {
    id: "1048", orderNo: "PRD-1048", customer: { name: "حسین طاهری", phone: "09135557788", address: "کاشان، بلوار قطب راوندی، مجتمع نور، واحد ۹" },
    items: [item("hamburger-gousht", 0.35), item("piaz-dagh", 1)], notes: "",
    day: "today", slot: "12-15", paymentMethod: "online", paymentStatus: "unpaid", status: "pending",
    estimatedTotal: Math.round(980000 * 0.35) + 176000, finalTotal: null, hasWeightItems: true,
    createdAt: "2026-09-08T10:25:00.000Z", createdLabel: "۱۳:۵۵",
  },
  {
    id: "1047", orderNo: "PRD-1047", customer: { name: "سارا محمدی", phone: "09193334455", address: "کاشان، خیابان امیرکبیر، نبش کوچه ۷" },
    items: [item("chenje-gosfandi", 0.5)], notes: "",
    day: "today", slot: "18-21", paymentMethod: "cod", paymentStatus: "unpaid", status: "confirmed",
    estimatedTotal: Math.round(1550000 * 0.5), finalTotal: null, hasWeightItems: true,
    createdAt: "2026-09-08T09:40:00.000Z", createdLabel: "۱۳:۱۰",
  },
  {
    id: "1046", orderNo: "PRD-1046", customer: { name: "امیر رضایی", phone: "09361112233", address: "کاشان، میدان کمال‌الملک، خیابان فاضل نراقی" },
    items: [item("schnitzel-morgh", 0.7), item("salad-anvae", 1)], notes: "بدون سس",
    day: "today", slot: "9-12", paymentMethod: "card", paymentStatus: "paid", status: "preparing",
    estimatedTotal: Math.round(348000 * 0.7) + 358000, finalTotal: Math.round(348000 * 0.7) + 358000, hasWeightItems: true,
    createdAt: "2026-09-08T08:10:00.000Z", createdLabel: "۱۱:۴۰",
  },
  {
    id: "1045", orderNo: "PRD-1045", customer: { name: "نگار حسینی", phone: "09122223344", address: "کاشان، خیابان علوی، کوچه شهید مطهری، پلاک ۲۱" },
    items: [item("kabab-koobideh", 2), item("jooje-file", 1)], notes: "مهمانی — لطفا زودتر آماده شود",
    day: "today", slot: "9-12", paymentMethod: "cod", paymentStatus: "unpaid", status: "delivering",
    estimatedTotal: 830000 * 2 + 345000, finalTotal: null, hasWeightItems: true,
    createdAt: "2026-09-08T07:20:00.000Z", createdLabel: "۱۰:۵۰",
  },
  {
    id: "1044", orderNo: "PRD-1044", customer: { name: "علی کریمی", phone: "09151234567", address: "کاشان، خیابان انقلاب، پاساژ ستاره، طبقه ۲" },
    items: [item("jambon-morgh", 1)], notes: "",
    day: "today", slot: "15-18", paymentMethod: "card", paymentStatus: "paid", status: "delivered",
    estimatedTotal: 535000, finalTotal: 535000, hasWeightItems: true,
    createdAt: "2026-09-07T12:35:00.000Z", createdLabel: "دیروز ۱۶:۰۵",
  },
  {
    id: "1043", orderNo: "PRD-1043", customer: { name: "فاطمه نوری", phone: "09141239876", address: "کاشان، خیابان شهید رجایی، کوچه ۵" },
    items: [item("hamburger-shotor", 0.25)], notes: "",
    day: "tomorrow", slot: "12-15", paymentMethod: "online", paymentStatus: "paid", status: "delivered",
    estimatedTotal: Math.round(1140000 * 0.25), finalTotal: Math.round(1140000 * 0.25), hasWeightItems: true,
    createdAt: "2026-09-07T09:10:00.000Z", createdLabel: "دیروز ۱۲:۴۰",
  },
  {
    id: "1042", orderNo: "PRD-1042", customer: { name: "رضا قاسمی", phone: "09301239988", address: "کاشان، خیابان کاشانی، کوچه ۱۴، پلاک ۸" },
    items: [item("gharch-kababi", 0.5)], notes: "مشتری انصراف داد",
    day: "today", slot: "9-12", paymentMethod: "cod", paymentStatus: "unpaid", status: "cancelled",
    estimatedTotal: Math.round(290000 * 0.5), finalTotal: null, hasWeightItems: true,
    createdAt: "2026-09-07T05:45:00.000Z", createdLabel: "دیروز ۰۹:۱۵",
  },
  {
    id: "1041", orderNo: "PRD-1041", customer: { name: "مریم اکبری", phone: "09121234567", address: "کاشان، خیابان شهید بهشتی، کوچه ۱۲، پلاک ۴" },
    items: [item("kabab-koobideh", 1.5)], notes: "",
    day: "tomorrow", slot: "18-21", paymentMethod: "card", paymentStatus: "paid", status: "delivered",
    estimatedTotal: Math.round(830000 * 1.5), finalTotal: Math.round(830000 * 1.5), hasWeightItems: true,
    createdAt: "2026-09-06T14:00:00.000Z", createdLabel: "۲ روز پیش",
  },
];

export interface AdminCustomer {
  name: string;
  phone: string;
  orders: number;
  spent: number;
  last: string;
  status: "active" | "blocked";
}
export const ADMIN_CUSTOMERS: AdminCustomer[] = [
  { name: "مریم اکبری", phone: "09121234567", orders: 6, spent: 5680000, last: "امروز", status: "active" },
  { name: "حسین طاهری", phone: "09135557788", orders: 2, spent: 612000, last: "امروز", status: "active" },
  { name: "سارا محمدی", phone: "09193334455", orders: 4, spent: 2140000, last: "امروز", status: "active" },
  { name: "امیر رضایی", phone: "09361112233", orders: 1, spent: 287000, last: "امروز", status: "active" },
  { name: "نگار حسینی", phone: "09122223344", orders: 9, spent: 11340000, last: "امروز", status: "active" },
  { name: "علی کریمی", phone: "09151234567", orders: 3, spent: 1420000, last: "دیروز", status: "active" },
  { name: "فاطمه نوری", phone: "09141239876", orders: 2, spent: 498000, last: "دیروز", status: "active" },
  { name: "رضا قاسمی", phone: "09301239988", orders: 1, spent: 170000, last: "دیروز", status: "blocked" },
];

/* بازه‌های OTP مطابق مقادیر واقعی lib/otp.ts (اینجا فقط برای پیش‌نمایش/ویرایش تکرار شده، چون آن فایل از crypto سمت سرور استفاده می‌کند) */
export const OTP_DEFAULTS = { ttlMinutes: 2, resendSeconds: 60, windowHours: 1, maxSends: 5, maxAttempts: 5 };

export interface OtpLogEntry { phone: string; time: string; attempts: number; result: "ok" | "blocked" | "expired" }
export const OTP_LOG: OtpLogEntry[] = [
  { phone: "09121234567", time: "۱۴:۲۰", attempts: 1, result: "ok" },
  { phone: "09135557788", time: "۱۳:۵۴", attempts: 1, result: "ok" },
  { phone: "09190001122", time: "۱۳:۴۰", attempts: 5, result: "blocked" },
  { phone: "09193334455", time: "۱۲:۵۱", attempts: 1, result: "ok" },
  { phone: "09301239988", time: "۱۱:۰۲", attempts: 3, result: "expired" },
  { phone: "09122223344", time: "۱۰:۴۸", attempts: 1, result: "ok" },
];
export const INITIAL_BLOCKED_PHONES = ["09190001122"];

export type TeamRole = "owner" | "orders" | "catalog" | "support";
export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  owner: "مالک — دسترسی کامل", orders: "مدیر سفارش‌ها", catalog: "مدیر کاتالوگ", support: "پشتیبانی",
};
export interface TeamMember { name: string; phone: string; role: TeamRole; active: string; status: "active" | "suspended" }
export const ADMIN_TEAM: TeamMember[] = [
  { name: "عاطفه رستمی", phone: "09130612019", role: "owner", active: "اکنون", status: "active" },
  { name: "یاسمن قربانی", phone: "09121110099", role: "orders", active: "۲۰ دقیقه پیش", status: "active" },
  { name: "کیان شریفی", phone: "09355558877", role: "catalog", active: "دیروز", status: "active" },
  { name: "بابک عزیزی", phone: "09140004455", role: "support", active: "۳ روز پیش", status: "suspended" },
];

export interface DeliveryZone { name: string; fee: number }
export const INITIAL_ZONES: DeliveryZone[] = [
  { name: "داخل محدوده کاشان", fee: 25000 },
  { name: "حومه و شهرک‌های اطراف", fee: 45000 },
];

export function cloneDeliveryDays() {
  return DELIVERY_DAYS.map((d) => ({ ...d, enabled: true as boolean }));
}
export function cloneDeliverySlots() {
  return DELIVERY_SLOTS.map((s) => ({ ...s, enabled: true as boolean }));
}

/* روند فروش ۱۴ روز اخیر (تومان) — برای نمودار داشبورد/گزارش‌ها */
export const REVENUE_SERIES = [
  2100000, 2450000, 1980000, 3100000, 2870000, 3320000, 2960000, 3540000, 3980000, 3610000, 4120000, 4460000, 4030000, 4890000,
];
