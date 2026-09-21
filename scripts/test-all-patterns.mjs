import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const apiKey = (process.env.IPPANEL_API_KEY || "").trim();
const fromNumber = (process.env.IPPANEL_FROM || "").trim();
const baseUrl = (process.env.IPPANEL_BASE_URL || "https://edge.ippanel.com/v1/api").replace(/\/$/, "");
const recipient = process.argv[2] || "09130686153";

const name = "امید";
const orderNo = "PD000099";

const baseOrder = {
  "customer.name": name,
  name,
  orderNo,
  order_no: orderNo,
};

const patterns = [
  { label: "ثبت سفارش", env: "IPPANEL_PATTERN_ORDER_PENDING", params: { ...baseOrder, estimatedTotal: "۵۰۰٬۰۰۰" } },
  { label: "تایید سفارش", env: "IPPANEL_PATTERN_ORDER_CONFIRMED", params: { ...baseOrder, day: "امروز", slot: "۹ تا ۱۲" } },
  { label: "آماده‌سازی", env: "IPPANEL_PATTERN_ORDER_PREPARING", params: { ...baseOrder } },
  { label: "ارسال سفارش", env: "IPPANEL_PATTERN_ORDER_DELIVERING", params: { ...baseOrder, slot: "۹ تا ۱۲" } },
  { label: "تحویل سفارش", env: "IPPANEL_PATTERN_ORDER_DELIVERED", params: { ...baseOrder } },
  { label: "لغو سفارش", env: "IPPANEL_PATTERN_ORDER_CANCELLED", params: { ...baseOrder, notes: "درخواست مشتری" } },
  { label: "پرداخت موفق", env: "IPPANEL_PATTERN_PAY_PAID", params: { ...baseOrder, estimatedTotal: "۵۰۰٬۰۰۰", zarinpalRefId: "123456789" } },
  { label: "پرداخت ناموفق", env: "IPPANEL_PATTERN_PAY_FAILED", params: { ...baseOrder } },
  { label: "تخفیف عمومی", env: "IPPANEL_PATTERN_COUPON_PUBLIC", params: { "user.name": name, name, code: "TEST10", percent: "۱۰", expiresAt: "۱۴۰۴/۱۲/۲۹" } },
  { label: "تخفیف وفاداری", env: "IPPANEL_PATTERN_COUPON_LOYALTY", params: { "user.name": name, name, code: "VIP15", percent: "۱۵", expiresAt: "۱۴۰۴/۱۲/۲۹" } },
  { label: "تبریک تولد", env: "IPPANEL_PATTERN_BIRTHDAY", params: { "user.name": name, name, code: "BDAY20", percent: "۲۰", expiresAt: "۱۴۰۴/۰۷/۰۱" } },
  { label: "موجود شدن کالا", env: "IPPANEL_PATTERN_RESTOCK", params: { "user.name": name, "product.name": "استیک گوسفندی", name } },
];

if (!apiKey || !fromNumber) {
  console.error("Missing IPPANEL_API_KEY or IPPANEL_FROM");
  process.exit(1);
}

console.log(`ارسال پترن‌ها به ${recipient} (بدون OTP)\n`);

for (const p of patterns) {
  const code = (process.env[p.env] || "").trim();
  if (!code) {
    console.log(`⏭  ${p.label}: ${p.env} خالی است`);
    continue;
  }

  const res = await fetch(`${baseUrl}/send`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sending_type: "pattern",
      from_number: fromNumber,
      code,
      recipients: [recipient],
      params: p.params,
    }),
  });

  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.meta?.status !== false;
  const msg = data.meta?.message || data.message || res.statusText;
  const id = data.data?.message_outbox_ids?.[0];
  console.log(`${ok ? "✅" : "❌"} ${p.label}: HTTP ${res.status} — ${msg}${id ? ` (id: ${id})` : ""}`);
  if (!ok && data.meta?.errors) {
    console.log("   ", JSON.stringify(data.meta.errors));
  }

  await new Promise((r) => setTimeout(r, 800));
}
