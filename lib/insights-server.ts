/* ---------------------------------------------------------
   شناخت مشتری — بخش سرور: خواندن سفارش‌ها، اجرای تحلیل برای هر
   مشتری، ساخت گزارش کلی و صف «نیاز به توجه»، و فرستادن پیام بازگشت.
   محاسبه‌ها در lib/insights.ts است.
   --------------------------------------------------------- */

import { randomBytes } from "crypto";
import { dbConnect } from "@/lib/mongodb";
import { getStoreSettings } from "@/lib/catalog-server";
import { orderPayable } from "@/lib/coupon";
import { normalizePhone } from "@/lib/phone";
import { sendCustomerNudgeSms, isPatternReady } from "@/lib/sms";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { Coupon } from "@/models/Coupon";
import { CustomerContact, type CustomerContactDoc } from "@/models/CustomerContact";
import {
  analyzeCustomer,
  deliveryDate,
  lastJalaliMonths,
  weekdayOf,
  type ContactRecord,
  type CustomerInsight,
  type InsightOrder,
  type InsightsOverview,
  type QueueItem,
  type Segment,
} from "@/lib/insights";

export class InsightError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const DAY = 86400000;
/** سالاد سفارشی یک «محصول» مجازی در تحلیل است */
const SALAD_ID = "__salad";

type RawOrder = {
  orderNo: string;
  createdAt: Date;
  day: string;
  slot: string;
  saladSlot?: string;
  kind?: string;
  status: string;
  customer: { name: string; phone: string };
  items: { productId: string; name: string; variantLabel?: string; qty: number; sale: "w" | "u"; lineTotal: number }[];
  salads?: { price?: number }[];
  estimatedTotal: number;
  finalTotal: number | null;
  coupon: { code: string; percent: number } | null;
};

function toInsightOrder(o: RawOrder): InsightOrder {
  const isSalad = o.kind === "salad";
  const payable = isSalad ? o.estimatedTotal : orderPayable({ estimatedTotal: o.estimatedTotal, finalTotal: o.finalTotal, coupon: o.coupon });
  const items = isSalad
    ? [{ productId: SALAD_ID, name: "سالاد سفارشی", qty: (o.salads || []).length || 1, sale: "u" as const, lineTotal: o.estimatedTotal }]
    : (o.items || []).map((it) => ({
        productId: it.productId,
        // گونه‌ها زیر همان محصول جمع می‌شوند (عادت «سبزیجات یخ‌زده»، نه «… — ظرف ۴۰۰ گرمی»)
        name: it.variantLabel ? it.name.replace(` — ${it.variantLabel}`, "") : it.name,
        qty: it.qty,
        sale: it.sale,
        lineTotal: it.lineTotal,
      }));
  return {
    orderNo: o.orderNo,
    createdAt: new Date(o.createdAt).toISOString(),
    day: isSalad ? "today" : o.day,
    slot: isSalad ? o.saladSlot || "salad" : o.slot,
    payable,
    items,
  };
}

async function loadOrders(filter: Record<string, unknown> = {}, limit = 20000) {
  await dbConnect();
  const rows = (await Order.find({ status: { $ne: "cancelled" }, ...filter })
    .select("orderNo createdAt day slot saladSlot kind status customer items salads estimatedTotal finalTotal coupon")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()) as unknown as RawOrder[];
  return rows;
}

function toContact(d: CustomerContactDoc, converted = false): ContactRecord {
  return {
    phone: d.phone,
    kind: d.kind,
    productName: d.productName || "",
    code: d.code || "",
    percent: d.percent || 0,
    sent: d.sent,
    note: d.note || d.error || "",
    by: d.by || "",
    createdAt: (d.createdAt || new Date()).toISOString(),
    converted,
  };
}

/* ---------- یک مشتری ---------- */

export async function customerInsight(rawPhone: string): Promise<{
  insight: CustomerInsight;
  contacts: ContactRecord[];
  smsReady: { winback: boolean; reminder: boolean };
  defaults: { percent: number; validDays: number; cooldownDays: number };
}> {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new InsightError("شماره نامعتبر است");
  const [settings, rows, user, contacts] = await Promise.all([
    getStoreSettings(),
    loadOrders({ "customer.phone": phone }, 2000),
    User.findOne({ phone }).select("name").lean(),
    CustomerContact.find({ phone }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  const name = user?.name || rows[0]?.customer.name || "بدون نام";
  const insight = analyzeCustomer(phone, name, rows.map(toInsightOrder), settings.insights);
  const orderTimes = rows.map((r) => new Date(r.createdAt).getTime());
  return {
    insight,
    contacts: contacts.map((c) => {
      const t = new Date(c.createdAt).getTime();
      return toContact(c, orderTimes.some((o) => o > t && o - t < 30 * DAY));
    }),
    smsReady: { winback: isPatternReady("winback"), reminder: isPatternReady("reminder") },
    defaults: {
      percent: settings.insights.defaultPercent,
      validDays: settings.insights.defaultValidDays,
      cooldownDays: settings.insights.cooldownDays,
    },
  };
}

/* ---------- گزارش کلی ---------- */

export async function insightsOverview(): Promise<InsightsOverview> {
  const [settings, rows, users, contactDocs] = await Promise.all([
    getStoreSettings(),
    loadOrders(),
    User.find({ role: "customer" }).select("phone name").lean(),
    CustomerContact.find({ createdAt: { $gte: new Date(Date.now() - 120 * DAY) } })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
  ]);
  const s = settings.insights;
  const names = new Map(users.map((u) => [u.phone, u.name || ""]));

  const byPhone = new Map<string, RawOrder[]>();
  for (const r of rows) {
    const list = byPhone.get(r.customer.phone) || [];
    list.push(r);
    byPhone.set(r.customer.phone, list);
  }

  const lastContact = new Map<string, CustomerContactDoc>();
  for (const c of contactDocs) if (!lastContact.has(c.phone)) lastContact.set(c.phone, c as CustomerContactDoc);

  const segments = Object.fromEntries(
    (["new", "active", "loyal", "at_risk", "lost", "one_time"] as Segment[]).map((k) => [k, { count: 0, spent: 0 }])
  ) as InsightsOverview["segments"];
  const queue: QueueItem[] = [];
  const insights: CustomerInsight[] = [];
  const gaps: number[] = [];

  for (const [phone, list] of byPhone) {
    const name = names.get(phone) || list[0].customer.name || "بدون نام";
    const ins = analyzeCustomer(phone, name, list.map(toInsightOrder), s);
    insights.push(ins);
    segments[ins.segment].count++;
    segments[ins.segment].spent += ins.spent;
    if (ins.gapDays) gaps.push(ins.gapDays);
    if (ins.alerts.length) {
      const lc = lastContact.get(phone) || null;
      const cooling = !!lc && Date.now() - new Date(lc.createdAt).getTime() < s.cooldownDays * DAY;
      queue.push({
        phone,
        name,
        segment: ins.segment,
        orders: ins.orders,
        spent: ins.spent,
        daysSince: ins.daysSince,
        alert: ins.alerts[0],
        lastContact: lc ? toContact(lc) : null,
        cooling,
      });
    }
  }
  // باارزش‌ترها اول: مشتری‌ای که بیشتر خرید کرده و بیشتر عقب افتاده
  queue.sort((a, b) => Number(a.cooling) - Number(b.cooling) || b.spent * (1 + b.alert.overdueDays / 30) - a.spent * (1 + a.alert.overdueDays / 30));

  /* روزهای هفته و ماه‌ها برای کل فروشگاه */
  const weekday = Array.from({ length: 7 }, () => ({ orders: 0, revenue: 0 }));
  const months = lastJalaliMonths(12);
  const monthIdx = new Map(months.map((m, i) => [m.key, i]));
  const monthly = months.map((m) => ({ ...m, revenue: 0, orders: 0, newCustomers: 0, returning: 0 }));
  const firstSeen = new Map<string, number>();
  for (const ins of insights) firstSeen.set(ins.phone, new Date(ins.firstAt).getTime());
  const monthKeyOf = (d: Date) => {
    // همان کلیدی که lastJalaliMonths می‌سازد
    const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "numeric" }).formatToParts(d);
    const y = (parts.find((p) => p.type === "year")?.value || "0").replace(/\D/g, "");
    const m = (parts.find((p) => p.type === "month")?.value || "0").padStart(2, "0");
    return `${y}-${m}`;
  };
  const seenInMonth = new Map<string, Set<string>>();
  for (const r of rows) {
    const io = toInsightOrder(r);
    const d = deliveryDate(io);
    weekday[weekdayOf(d)].orders++;
    weekday[weekdayOf(d)].revenue += io.payable;
    const key = monthKeyOf(d);
    const k = monthIdx.get(key);
    if (k === undefined) continue;
    monthly[k].revenue += io.payable;
    monthly[k].orders++;
    const set = seenInMonth.get(key) || new Set<string>();
    if (!set.has(r.customer.phone)) {
      set.add(r.customer.phone);
      const fs = firstSeen.get(r.customer.phone);
      if (fs !== undefined && monthKeyOf(new Date(fs)) === key) monthly[k].newCustomers++;
      else monthly[k].returning++;
    }
    seenInMonth.set(key, set);
  }

  /* محصولات: چند مشتری، چند نفر به‌صورت عادت */
  const prod = new Map<string, { name: string; customers: number; orders: number; revenue: number; habitual: number }>();
  for (const ins of insights) {
    for (const p of ins.products) {
      const row = prod.get(p.productId) || { name: p.name, customers: 0, orders: 0, revenue: 0, habitual: 0 };
      row.customers++;
      row.orders += p.orders;
      row.revenue += p.spent;
      if (p.orders >= s.habitMinOrders) row.habitual++;
      prod.set(p.productId, row);
    }
  }
  const topProducts = [...prod.entries()]
    .map(([productId, r]) => ({ productId, ...r }))
    .sort((a, b) => b.customers - a.customers || b.revenue - a.revenue)
    .slice(0, 12);

  const topCustomers = [...insights]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 10)
    .map((i) => ({ phone: i.phone, name: i.name, orders: i.orders, spent: i.spent, segment: i.segment, daysSince: i.daysSince }));

  const totalOrders = rows.length;
  const revenue = insights.reduce((t, i) => t + i.spent, 0);
  const sortedGaps = [...gaps].sort((a, b) => a - b);

  /* اثر پیام‌ها: پیام‌های ۳۰ روز اخیر که بعدشان در ۳۰ روز سفارش آمده */
  const since30 = Date.now() - 30 * DAY;
  const recentContacts = contactDocs.filter((c) => new Date(c.createdAt).getTime() >= since30);
  const ordersAfter = (phone: string, t: number) =>
    (byPhone.get(phone) || []).some((o) => {
      const ot = new Date(o.createdAt).getTime();
      return ot > t && ot - t < 30 * DAY;
    });
  const converted30 = recentContacts.filter((c) => ordersAfter(c.phone, new Date(c.createdAt).getTime())).length;

  return {
    generatedAt: new Date().toISOString(),
    customers: insights.length,
    repeatRate: insights.length ? insights.filter((i) => i.orders >= 2).length / insights.length : 0,
    avgGapDays: sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : null,
    avgOrder: totalOrders ? Math.round(revenue / totalOrders) : 0,
    segments,
    weekday,
    monthly,
    topProducts,
    topCustomers,
    queue: queue.slice(0, 100),
    contacts: {
      total30: recentContacts.length,
      converted30,
      recent: contactDocs.slice(0, 30).map((c) => ({
        ...toContact(c as CustomerContactDoc, ordersAfter(c.phone, new Date(c.createdAt).getTime())),
        name: names.get(c.phone) || byPhone.get(c.phone)?.[0]?.customer.name || "",
      })),
    },
  };
}

/* ---------- پیام بازگشت ---------- */

function personalCode() {
  // بدون حروف/عددهای گیج‌کننده (O/0، I/1)
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "BK";
  for (const b of bytes) out += abc[b % abc.length];
  return out;
}

const faDate = (d: Date) => d.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", month: "long", day: "numeric" });

export async function sendNudge(params: {
  phone: string;
  kind: "winback" | "reminder" | "call";
  productId?: string;
  productName?: string;
  percent?: number;
  validDays?: number;
  note?: string;
  by: string;
}) {
  const phone = normalizePhone(params.phone);
  if (!phone) throw new InsightError("شماره نامعتبر است");
  await dbConnect();
  const settings = await getStoreSettings();
  const user = await User.findOne({ phone }).select("name blocked").lean();
  if (user?.blocked || settings.blockedPhones.includes(phone)) throw new InsightError("این مشتری مسدود است");
  const name = user?.name || (await Order.findOne({ "customer.phone": phone }).sort({ createdAt: -1 }).select("customer.name").lean())?.customer?.name || "";
  const productName = String(params.productName || "").trim().slice(0, 60);
  const note = String(params.note || "").trim().slice(0, 300);

  // «تماس تلفنی» فقط ثبت می‌شود تا در صف نشان داده شود پیگیری شده
  if (params.kind === "call") {
    const c = await CustomerContact.create({ phone, kind: "call", productId: params.productId || "", productName, sent: true, note, by: params.by });
    return { contact: toContact(c), sent: true, code: "" };
  }

  const daysSince = await (async () => {
    const last = await Order.findOne({ "customer.phone": phone, status: { $ne: "cancelled" } }).sort({ createdAt: -1 }).select("createdAt").lean();
    return last ? Math.max(0, Math.floor((Date.now() - new Date(last.createdAt).getTime()) / DAY)) : 0;
  })();

  let code = "";
  let percent = 0;
  let expiresLabel = "";
  if (params.kind === "winback") {
    percent = Math.round(Number(params.percent) || settings.insights.defaultPercent);
    if (percent < 1 || percent > 90) throw new InsightError("درصد تخفیف باید بین ۱ تا ۹۰ باشد");
    const validDays = Math.min(60, Math.max(1, Math.round(Number(params.validDays) || settings.insights.defaultValidDays)));
    const expiresAt = new Date(Date.now() + validDays * DAY);
    for (let i = 0; i < 5 && !code; i++) {
      const candidate = personalCode();
      if (!(await Coupon.exists({ code: candidate }))) code = candidate;
    }
    if (!code) throw new InsightError("ساخت کد تخفیف انجام نشد؛ دوباره تلاش کنید", 500);
    await Coupon.create({
      code,
      percent,
      kind: "personal",
      phone,
      expiresAt,
      minOrders: 0,
      active: true,
      usageCount: 0,
      note: `بازگشت ${name || phone}${productName ? ` — ${productName}` : ""}`.slice(0, 200),
    });
    expiresLabel = faDate(expiresAt);
  }

  const result = await sendCustomerNudgeSms({
    kind: params.kind,
    phone,
    name,
    productName: productName || "محصولات همیشگی",
    days: daysSince,
    code,
    percent,
    expiresAt: expiresLabel,
  });

  const c = await CustomerContact.create({
    phone,
    kind: params.kind,
    productId: params.productId || "",
    productName,
    code,
    percent,
    sent: result.sent,
    error: result.sent ? "" : result.reason || "",
    note,
    by: params.by,
  });
  return { contact: toContact(c), sent: result.sent, reason: result.reason, code };
}
