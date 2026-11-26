/* ---------------------------------------------------------
   شناخت مشتری — تحلیل خرید هر مشتری از روی سفارش‌هایش.

   فقط محاسبه است (بدون دیتابیس)، پس هم سرور (lib/insights-server.ts)
   و هم تست‌ها از آن استفاده می‌کنند. ورودی: سفارش‌های لغونشده‌ی یک
   مشتری. خروجی: الگوی خرید (چه می‌خرد، چند وقت یک‌بار، کدام روز هفته)
   و «هشدار»هایی مثل:
     «معمولاً هر ۷ روز جوجه زعفرانی می‌خرید، بیشتر پنجشنبه‌ها — ۳۲ روز است نخریده»

   روز خرید = روز تحویل (روز ثبت، یا فردای آن اگر «فردا» انتخاب شده)
   به وقت تهران. هفته از شنبه شروع می‌شود.
   --------------------------------------------------------- */

export interface InsightSettings {
  /** یک محصول از چند بار خرید به بعد «عادت» حساب می‌شود */
  habitMinOrders: number;
  /** دیرکرد وقتی است که از آخرین خرید بیش از این ضریب × فاصلهٔ معمول گذشته باشد */
  lateFactor: number;
  /** … و دست‌کم این چند روز بیشتر از فاصلهٔ معمول */
  minLateDays: number;
  /** بعد از پیام به مشتری، تا این چند روز دوباره در صف پیشنهاد نمی‌آید */
  cooldownDays: number;
  /** درصد پیش‌فرض کد تخفیف بازگشت */
  defaultPercent: number;
  /** اعتبار پیش‌فرض کد تخفیف بازگشت (روز) */
  defaultValidDays: number;
}

export const DEFAULT_INSIGHT_SETTINGS: InsightSettings = {
  habitMinOrders: 3,
  lateFactor: 1.5,
  minLateDays: 7,
  cooldownDays: 14,
  defaultPercent: 10,
  defaultValidDays: 7,
};

export function sanitizeInsightSettings(raw: Partial<InsightSettings> | null | undefined): InsightSettings {
  const d = DEFAULT_INSIGHT_SETTINGS;
  const src = raw || {};
  const num = (v: unknown, fb: number, min: number, max: number, int = true) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fb;
    const c = Math.min(max, Math.max(min, n));
    return int ? Math.round(c) : Math.round(c * 10) / 10;
  };
  return {
    habitMinOrders: num(src.habitMinOrders, d.habitMinOrders, 2, 20),
    lateFactor: num(src.lateFactor, d.lateFactor, 1.1, 5, false),
    minLateDays: num(src.minLateDays, d.minLateDays, 1, 60),
    cooldownDays: num(src.cooldownDays, d.cooldownDays, 1, 90),
    defaultPercent: num(src.defaultPercent, d.defaultPercent, 1, 90),
    defaultValidDays: num(src.defaultValidDays, d.defaultValidDays, 1, 60),
  };
}

export const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

export type Segment = "new" | "active" | "loyal" | "at_risk" | "lost" | "one_time";

export const SEGMENT_LABEL: Record<Segment, string> = {
  new: "تازه‌وارد",
  active: "فعال",
  loyal: "وفادار",
  at_risk: "در خطر رفتن",
  lost: "از دست رفته",
  one_time: "یک‌بار خرید",
};

export const SEGMENT_HINT: Record<Segment, string> = {
  new: "اولین خریدش در ۳۰ روز اخیر بوده",
  active: "طبق روال همیشگی‌اش خرید می‌کند",
  loyal: "۵ سفارش یا بیشتر و هنوز طبق روال خرید می‌کند",
  at_risk: "از فاصلهٔ معمول خریدش عقب افتاده — الان بهترین زمان پیام است",
  lost: "خیلی بیشتر از روال همیشه خرید نکرده",
  one_time: "فقط یک بار، بیش از ۳۰ روز پیش خرید کرده",
};

/** سفارش ساده‌شده برای تحلیل (از Order ساخته می‌شود) */
export interface InsightOrder {
  orderNo: string;
  createdAt: string;
  day: string;
  slot: string;
  payable: number;
  items: { productId: string; name: string; qty: number; sale: "w" | "u"; lineTotal: number }[];
}

export interface ProductHabit {
  productId: string;
  name: string;
  sale: "w" | "u";
  /** در چند سفارش بوده */
  orders: number;
  /** جمع مقدار (کیلو یا عدد) */
  qty: number;
  spent: number;
  lastAt: string;
  daysSince: number;
  /** میانهٔ فاصلهٔ بین خریدهای این محصول (روز) */
  gapDays: number | null;
  /** روزی از هفته که بیشتر می‌خرد (۰ = شنبه)، اگر غالب باشد */
  weekday: number | null;
  /** سهم همان روز از خریدهای این محصول (۰ تا ۱) */
  weekdayShare: number;
  /** چند روز از موعد معمول گذشته (۰ یعنی هنوز سر وقت است) */
  overdueDays: number;
  late: boolean;
}

export interface InsightAlert {
  kind: "habit" | "overall";
  productId: string;
  productName: string;
  message: string;
  overdueDays: number;
  gapDays: number;
  daysSince: number;
}

export interface CustomerInsight {
  phone: string;
  name: string;
  orders: number;
  spent: number;
  avgOrder: number;
  firstAt: string;
  lastAt: string;
  daysSince: number;
  gapDays: number | null;
  /** تاریخ تقریبی خرید بعدی بر اساس روال */
  expectedNextAt: string | null;
  segment: Segment;
  /** تعداد سفارش در هر روز هفته (۰ = شنبه) */
  weekday: number[];
  /** تعداد سفارش در هر بازهٔ ساعت تحویل */
  slots: Record<string, number>;
  /** ۱۲ ماه شمسی اخیر، قدیمی به جدید */
  monthly: { key: string; label: string; spent: number; orders: number }[];
  products: ProductHabit[];
  alerts: InsightAlert[];
}

const DAY = 86400000;

const tehranWeekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short" });
const WD_INDEX: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
const jalaliParts = new Intl.DateTimeFormat("en-US-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "numeric" });
const jalaliMonthName = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", month: "long" });

/** روز تحویل سفارش */
export function deliveryDate(o: Pick<InsightOrder, "createdAt" | "day">): Date {
  const t = new Date(o.createdAt).getTime();
  return new Date(o.day === "tomorrow" ? t + DAY : t);
}

export function weekdayOf(d: Date): number {
  return WD_INDEX[tehranWeekday.format(d)] ?? 0;
}

function jalaliKey(d: Date): string {
  const parts = jalaliParts.formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value || "0";
  const m = parts.find((p) => p.type === "month")?.value || "0";
  return `${y.replace(/\D/g, "")}-${m.padStart(2, "0")}`;
}

/** ۱۲ کلید ماه شمسی اخیر، قدیمی به جدید */
export function lastJalaliMonths(n = 12, now = new Date()): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  // از امروز ۱۵ روز ۱۵ روز به عقب می‌رویم تا هر ماه دست‌کم یک بار دیده شود
  for (let i = 0; out.length < n && i < n * 3; i++) {
    const d = new Date(now.getTime() - i * 15 * DAY);
    const key = jalaliKey(d);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: jalaliMonthName.format(d) });
  }
  return out.reverse();
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** فاصلهٔ روزها بین تاریخ‌های مرتب (روزهای تکراری یکی حساب می‌شوند) */
function gapsOf(dates: Date[]): number[] {
  const days = [...new Set(dates.map((d) => Math.floor((d.getTime() + 3.5 * 3600000) / DAY)))].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < days.length; i++) gaps.push(days[i] - days[i - 1]);
  return gaps;
}

function lateThreshold(gap: number, s: InsightSettings) {
  return Math.max(Math.round(gap * s.lateFactor), Math.round(gap + s.minLateDays));
}

export function fmtDays(n: number): string {
  const v = Math.round(n);
  const fa = (x: number) => x.toLocaleString("fa-IR");
  if (v >= 60 && v % 30 < 5) return `${fa(Math.round(v / 30))} ماه`;
  if (v >= 14 && v % 7 === 0) return `${fa(v / 7)} هفته`;
  return `${fa(v)} روز`;
}

export function analyzeCustomer(
  phone: string,
  name: string,
  orders: InsightOrder[],
  settings: InsightSettings = DEFAULT_INSIGHT_SETTINGS,
  now = new Date()
): CustomerInsight {
  const list = [...orders].sort((a, b) => deliveryDate(a).getTime() - deliveryDate(b).getTime());
  const dates = list.map(deliveryDate);
  const spent = list.reduce((s, o) => s + o.payable, 0);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const daysSince = last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / DAY)) : 0;
  const gap = median(gapsOf(dates));

  const weekday = Array(7).fill(0);
  const slots: Record<string, number> = {};
  for (let i = 0; i < list.length; i++) {
    weekday[weekdayOf(dates[i])]++;
    slots[list[i].slot] = (slots[list[i].slot] || 0) + 1;
  }

  const months = lastJalaliMonths(12, now);
  const mIdx = new Map(months.map((m, i) => [m.key, i]));
  const monthly = months.map((m) => ({ ...m, spent: 0, orders: 0 }));
  for (let i = 0; i < list.length; i++) {
    const k = mIdx.get(jalaliKey(dates[i]));
    if (k === undefined) continue;
    monthly[k].spent += list[i].payable;
    monthly[k].orders++;
  }

  /* هر محصول: در کدام سفارش‌ها، چه روزهایی */
  const per = new Map<string, { name: string; sale: "w" | "u"; qty: number; spent: number; dates: Date[] }>();
  for (let i = 0; i < list.length; i++) {
    const seenInOrder = new Set<string>();
    for (const it of list[i].items) {
      const row = per.get(it.productId) || { name: it.name, sale: it.sale, qty: 0, spent: 0, dates: [] };
      row.name = it.name;
      row.qty += it.qty;
      row.spent += it.lineTotal;
      if (!seenInOrder.has(it.productId)) {
        row.dates.push(dates[i]);
        seenInOrder.add(it.productId);
      }
      per.set(it.productId, row);
    }
  }

  const products: ProductHabit[] = [...per.entries()].map(([productId, r]) => {
    const pLast = r.dates[r.dates.length - 1];
    const pSince = Math.max(0, Math.floor((now.getTime() - pLast.getTime()) / DAY));
    const pGap = r.dates.length >= 2 ? median(gapsOf(r.dates)) : null;
    const wd = Array(7).fill(0);
    r.dates.forEach((d) => wd[weekdayOf(d)]++);
    const top = wd.indexOf(Math.max(...wd));
    const share = r.dates.length ? wd[top] / r.dates.length : 0;
    const isHabit = r.dates.length >= settings.habitMinOrders && pGap !== null && pGap > 0;
    const threshold = isHabit ? lateThreshold(pGap!, settings) : Infinity;
    return {
      productId,
      name: r.name,
      sale: r.sale,
      orders: r.dates.length,
      qty: Math.round(r.qty * 1000) / 1000,
      spent: r.spent,
      lastAt: pLast.toISOString(),
      daysSince: pSince,
      gapDays: pGap === null ? null : Math.round(pGap),
      weekday: r.dates.length >= 2 && share >= 0.5 ? top : null,
      weekdayShare: share,
      overdueDays: isHabit ? Math.max(0, pSince - Math.round(pGap!)) : 0,
      late: isHabit && pSince > threshold,
    };
  });
  products.sort((a, b) => b.orders - a.orders || b.spent - a.spent);

  let segment: Segment;
  if (list.length <= 1) segment = daysSince <= 30 ? "new" : "one_time";
  else if (gap !== null && gap > 0 && daysSince > Math.max(gap * 3, 60)) segment = "lost";
  else if (gap !== null && gap > 0 && daysSince > lateThreshold(gap, settings)) segment = "at_risk";
  else segment = list.length >= 5 ? "loyal" : "active";

  const alerts: InsightAlert[] = products
    .filter((p) => p.late)
    .map((p) => ({
      kind: "habit" as const,
      productId: p.productId,
      productName: p.name,
      gapDays: p.gapDays || 0,
      daysSince: p.daysSince,
      overdueDays: p.overdueDays,
      message:
        `معمولاً هر ${fmtDays(p.gapDays || 0)} «${p.name}» می‌خرید` +
        (p.weekday !== null ? `، بیشتر ${WEEKDAYS_FA[p.weekday]}‌ها` : "") +
        ` — ${fmtDays(p.daysSince)} است نخریده`,
    }))
    .sort((a, b) => b.overdueDays - a.overdueDays);

  if (!alerts.length && (segment === "at_risk" || segment === "lost") && gap) {
    const fav = products[0];
    alerts.push({
      kind: "overall",
      productId: fav?.productId || "",
      productName: fav?.name || "",
      gapDays: Math.round(gap),
      daysSince,
      overdueDays: Math.max(0, daysSince - Math.round(gap)),
      message: `معمولاً هر ${fmtDays(gap)} سفارش می‌داد — ${fmtDays(daysSince)} است سفارشی نداده`,
    });
  }

  return {
    phone,
    name,
    orders: list.length,
    spent,
    avgOrder: list.length ? Math.round(spent / list.length) : 0,
    firstAt: first ? first.toISOString() : "",
    lastAt: last ? last.toISOString() : "",
    daysSince,
    gapDays: gap === null ? null : Math.round(gap),
    expectedNextAt: last && gap ? new Date(last.getTime() + gap * DAY).toISOString() : null,
    segment,
    weekday,
    slots,
    monthly,
    products,
    alerts,
  };
}

/* ---------- گزارش کلی ---------- */

export interface ContactRecord {
  phone: string;
  kind: "winback" | "reminder" | "call";
  productName: string;
  code: string;
  percent: number;
  sent: boolean;
  note: string;
  by: string;
  createdAt: string;
  /** بعد از این پیام سفارشی داده؟ (برای سنجیدن اثر پیام‌ها) */
  converted: boolean;
}

export interface QueueItem {
  phone: string;
  name: string;
  segment: Segment;
  orders: number;
  spent: number;
  daysSince: number;
  alert: InsightAlert;
  lastContact: ContactRecord | null;
  /** در دورهٔ استراحت بعد از پیام قبلی است */
  cooling: boolean;
}

export interface InsightsOverview {
  generatedAt: string;
  customers: number;
  repeatRate: number;
  avgGapDays: number | null;
  avgOrder: number;
  segments: Record<Segment, { count: number; spent: number }>;
  weekday: { orders: number; revenue: number }[];
  monthly: { key: string; label: string; revenue: number; orders: number; newCustomers: number; returning: number }[];
  topProducts: { productId: string; name: string; customers: number; orders: number; revenue: number; habitual: number }[];
  topCustomers: { phone: string; name: string; orders: number; spent: number; segment: Segment; daysSince: number }[];
  queue: QueueItem[];
  contacts: { total30: number; converted30: number; recent: (ContactRecord & { name: string })[] };
}
