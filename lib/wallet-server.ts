/* ---------------------------------------------------------
   کیف پول اعتباری — منطق سمت سرور.

   قاعدهٔ طلایی: موجودی فقط با creditWallet / debitWallet عوض می‌شود.
   هر دو با $inc اتمیک روی User.walletBalance کار می‌کنند (برداشت فقط
   وقتی موجودی کافی باشد — شرط در خود کوئری است، پس دو درخواست هم‌زمان
   نمی‌توانند موجودی را منفی کنند) و بلافاصله یک ردیف در دفتر WalletTxn
   با موجودی بعد از تغییر می‌نویسند.

   dedupe: کلید یکتای اختیاری. برگشت وجه یک سفارش، اعتبار هدیهٔ یک
   سفارش و شارژ یک فاکتور هر کدام کلید ثابت دارند، پس اگر کد دو بار
   صدا زده شود (رفرش صفحه بازگشت درگاه، دو کلیک ادمین) پول دو بار واریز
   نمی‌شود.
   --------------------------------------------------------- */

import { randomBytes } from "crypto";
import type { Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone } from "@/lib/phone";
import { getStoreSettings } from "@/lib/catalog-server";
import { User } from "@/models/User";
import { WalletTopup, WalletTxn, type WalletTopupDoc, type WalletTxnDoc } from "@/models/Wallet";
import {
  AqayepardakhtError,
  aqayepardakhtCreate,
  aqayepardakhtVerify,
  isAqayepardakhtConfigured,
  AQP_MAX_AMOUNT,
} from "@/lib/aqayepardakht";
import {
  WALLET_TXN_LABEL,
  type PublicTopup,
  type PublicWalletTxn,
  type WalletSummary,
  type WalletTxnType,
} from "@/lib/wallet";
import { notifyWalletSms } from "@/lib/sms";

export class WalletError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type Uid = string | Types.ObjectId;

export function toPublicTxn(d: WalletTxnDoc & { _id: unknown }): PublicWalletTxn {
  return {
    id: String(d._id),
    type: d.type,
    amount: d.amount,
    balanceAfter: d.balanceAfter,
    orderNo: d.orderNo || "",
    note: d.note || "",
    ref: d.ref || "",
    createdAt: (d.createdAt || new Date()).toISOString(),
  };
}

export function toPublicTopup(d: WalletTopupDoc & { _id: unknown }, name = ""): PublicTopup {
  return {
    id: String(d._id),
    invoiceId: d.invoiceId,
    phone: d.phone,
    name,
    amount: d.amount,
    status: d.status === "verifying" ? "pending" : d.status,
    trackingNumber: d.trackingNumber || "",
    createdAt: (d.createdAt || new Date()).toISOString(),
  };
}

/** کاربر یک شماره را پیدا یا (برای مشتری مهمانی که هنوز وارد نشده) می‌سازد،
    تا برگشت وجه سفارش مهمان هم جایی برای نشستن داشته باشد؛ با اولین ورود
    موبایلی همان حساب را می‌بیند. */
export async function ensureUserByPhone(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new WalletError("شماره موبایل نامعتبر است");
  await dbConnect();
  return User.findOneAndUpdate(
    { phone },
    {
      $setOnInsert: {
        phone,
        name: "",
        address: "",
        birthDate: "",
        role: "customer",
        blocked: false,
        staffActive: true,
        walletBalance: 0,
      },
    },
    { upsert: true, new: true }
  );
}

interface MoveInput {
  userId: Uid;
  amount: number;
  type: WalletTxnType;
  orderNo?: string;
  ref?: string;
  note?: string;
  by?: string;
  dedupe?: string;
  /** پیامک واریز/برداشت (پیش‌فرض: روشن برای همه به جز پرداخت سفارش) */
  sms?: boolean;
}

function cleanAmount(v: number) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) throw new WalletError("مبلغ نامعتبر است");
  return n;
}

async function writeTxn(
  user: { _id: Types.ObjectId; phone: string; walletBalance: number },
  signed: number,
  input: MoveInput
): Promise<WalletTxnDoc & { _id: unknown }> {
  const doc = await WalletTxn.create({
    userId: user._id,
    phone: user.phone,
    type: input.type,
    amount: signed,
    balanceAfter: user.walletBalance,
    orderNo: input.orderNo || "",
    ref: input.ref || "",
    note: (input.note || "").slice(0, 300),
    by: input.by || "",
    ...(input.dedupe ? { dedupe: input.dedupe } : {}),
  });
  return doc;
}

function isDupKey(err: unknown) {
  return (err as { code?: number })?.code === 11000;
}

/** واریز به کیف پول. با dedupe تکراری، بدون تغییر همان ردیف قبلی برمی‌گردد. */
export async function creditWallet(input: MoveInput) {
  const amount = cleanAmount(input.amount);
  await dbConnect();
  if (input.dedupe) {
    const prev = await WalletTxn.findOne({ dedupe: input.dedupe });
    if (prev) return { txn: toPublicTxn(prev), balance: prev.balanceAfter, duplicate: true as const };
  }
  const user = await User.findOneAndUpdate({ _id: input.userId }, { $inc: { walletBalance: amount } }, { new: true });
  if (!user) throw new WalletError("حساب کاربر پیدا نشد", 404);
  let txn;
  try {
    txn = await writeTxn(user, amount, input);
  } catch (err) {
    // ثبت دفتر نشد → واریز را برگردان تا موجودی و دفتر هیچ‌وقت از هم جدا نشوند
    await User.updateOne({ _id: user._id }, { $inc: { walletBalance: -amount } });
    if (isDupKey(err) && input.dedupe) {
      const prev = await WalletTxn.findOne({ dedupe: input.dedupe });
      if (prev) return { txn: toPublicTxn(prev), balance: prev.balanceAfter, duplicate: true as const };
    }
    throw err;
  }
  if (input.sms !== false) {
    notifyWalletSms({ phone: user.phone, name: user.name, amount, balance: user.walletBalance, reason: input.note || WALLET_TXN_LABEL[input.type], credit: true });
  }
  return { txn: toPublicTxn(txn), balance: user.walletBalance, duplicate: false as const };
}

/** برداشت از کیف پول. اگر موجودی کافی نباشد هیچ چیزی کم نمی‌شود و خطا می‌دهد. */
export async function debitWallet(input: MoveInput) {
  const amount = cleanAmount(input.amount);
  await dbConnect();
  if (input.dedupe) {
    const prev = await WalletTxn.findOne({ dedupe: input.dedupe });
    if (prev) return { txn: toPublicTxn(prev), balance: prev.balanceAfter, duplicate: true as const };
  }
  const user = await User.findOneAndUpdate(
    { _id: input.userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true }
  );
  if (!user) {
    const exists = await User.exists({ _id: input.userId });
    if (!exists) throw new WalletError("حساب کاربر پیدا نشد", 404);
    throw new WalletError("موجودی کیف پول کافی نیست", 409);
  }
  let txn;
  try {
    txn = await writeTxn(user, -amount, input);
  } catch (err) {
    await User.updateOne({ _id: user._id }, { $inc: { walletBalance: amount } });
    if (isDupKey(err) && input.dedupe) {
      const prev = await WalletTxn.findOne({ dedupe: input.dedupe });
      if (prev) return { txn: toPublicTxn(prev), balance: prev.balanceAfter, duplicate: true as const };
    }
    throw err;
  }
  if (input.sms) {
    notifyWalletSms({ phone: user.phone, name: user.name, amount, balance: user.walletBalance, reason: input.note || WALLET_TXN_LABEL[input.type], credit: false });
  }
  return { txn: toPublicTxn(txn), balance: user.walletBalance, duplicate: false as const };
}

export async function getBalance(userId: Uid): Promise<number> {
  await dbConnect();
  const u = await User.findById(userId).select("walletBalance").lean();
  return Math.max(0, Math.round(u?.walletBalance || 0));
}

export async function listWalletTxns(userId: Uid, limit = 50): Promise<PublicWalletTxn[]> {
  await dbConnect();
  const rows = await WalletTxn.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(limit);
  return rows.map(toPublicTxn);
}

export async function getWalletSummary(userId: Uid): Promise<WalletSummary> {
  const [settings, balance, txns] = await Promise.all([getStoreSettings(), getBalance(userId), listWalletTxns(userId, 60)]);
  const w = settings.wallet;
  return {
    enabled: w.enabled,
    canTopup: w.enabled && isAqayepardakhtConfigured(),
    balance,
    minTopup: w.minTopup,
    maxBalance: w.maxBalance,
    presets: w.presets,
    cashbackPercent: w.cashbackPercent,
    txns,
  };
}

/* ---------- شارژ آنلاین ---------- */

function newInvoiceId() {
  // حرف W اول شناسه، بازگشت درگاه را از پرداخت سفارش (PD…) جدا می‌کند
  return `W${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function isTopupInvoice(invoiceId: string) {
  return /^W[0-9A-Z]+$/.test(invoiceId || "");
}

/** اگر درگاه invoice_id را برنگرداند، شارژ را از روی transid تشخیص می‌دهیم */
export async function isTopupTransid(transid: string) {
  if (!transid) return false;
  await dbConnect();
  return Boolean(await WalletTopup.exists({ transid }));
}

export async function startTopup(user: { id: string; phone: string }, rawAmount: number, appUrl: string) {
  const settings = await getStoreSettings();
  const w = settings.wallet;
  if (!w.enabled) throw new WalletError("کیف پول فعلا غیرفعال است");
  if (!isAqayepardakhtConfigured()) throw new WalletError("درگاه پرداخت روی سرور تنظیم نشده است", 503);
  const amount = Math.round(Number(rawAmount));
  if (!Number.isFinite(amount) || amount < w.minTopup) {
    throw new WalletError(`کمترین مبلغ شارژ ${w.minTopup.toLocaleString("fa-IR")} تومان است`);
  }
  if (amount > AQP_MAX_AMOUNT) throw new WalletError("مبلغ هر شارژ حداکثر ۵۰ میلیون تومان است");
  const balance = await getBalance(user.id);
  if (balance + amount > w.maxBalance) {
    throw new WalletError(`سقف موجودی کیف پول ${w.maxBalance.toLocaleString("fa-IR")} تومان است`);
  }
  await dbConnect();
  const recent = await WalletTopup.countDocuments({ userId: user.id, createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } });
  if (recent >= 10) throw new WalletError("تعداد درخواست شارژ در یک ساعت گذشته زیاد است. کمی بعد تلاش کنید.", 429);

  const topup = await WalletTopup.create({
    invoiceId: newInvoiceId(),
    userId: user.id,
    phone: user.phone,
    amount,
    status: "pending",
  });
  try {
    const { transid, paymentUrl } = await aqayepardakhtCreate({
      amountToman: amount,
      appUrl,
      invoiceId: topup.invoiceId,
      mobile: user.phone,
      description: `شارژ کیف پول پرودید — ${topup.invoiceId}`,
    });
    topup.transid = transid;
    await topup.save();
    return { paymentUrl, invoiceId: topup.invoiceId };
  } catch (err) {
    topup.status = "failed";
    topup.error = err instanceof Error ? err.message : "خطا";
    await topup.save();
    throw err;
  }
}

/**
 * بازگشت از درگاه برای یک شارژ. ایمن برای چند بار صدا زدن: فقط یک
 * درخواست می‌تواند وضعیت را از pending/failed به verifying ببرد.
 */
export async function finalizeTopup(params: {
  transid?: string;
  invoiceId?: string;
  status: string;
  trackingNumber?: string;
  cardNumber?: string;
  /** بررسی دوبارهٔ دستی از پنل: حتی اگر درگاه status=0 گفته باشد از خود درگاه بپرس */
  force?: boolean;
}) {
  await dbConnect();
  const q = params.transid ? { transid: params.transid } : { invoiceId: params.invoiceId };
  const topup = await WalletTopup.findOne(q);
  if (!topup) throw new WalletError("درخواست شارژ پیدا نشد", 404);
  if (topup.status === "paid") return { topup, paid: true as const };

  const claimed = await WalletTopup.findOneAndUpdate(
    { _id: topup._id, status: { $in: ["pending", "failed"] } },
    { $set: { status: "verifying" } },
    { new: true }
  );
  if (!claimed) {
    // درخواست هم‌زمان دیگری در حال تایید است
    const now = await WalletTopup.findById(topup._id);
    return { topup: now || topup, paid: now?.status === "paid" };
  }

  if (params.trackingNumber) claimed.trackingNumber = String(params.trackingNumber).slice(0, 64);
  if (params.cardNumber) claimed.cardNumber = String(params.cardNumber).slice(0, 32);

  if (params.status !== "1" && !params.force) {
    claimed.status = "failed";
    claimed.error = "پرداخت توسط کاربر انجام نشد یا لغو شد";
    await claimed.save();
    return { topup: claimed, paid: false as const };
  }

  try {
    await aqayepardakhtVerify({ amountToman: claimed.amount, transid: claimed.transid });
  } catch (err) {
    claimed.status = "failed";
    claimed.error = err instanceof Error ? err.message : "تایید ناموفق";
    await claimed.save();
    if (err instanceof AqayepardakhtError) return { topup: claimed, paid: false as const };
    throw err;
  }

  await creditWallet({
    userId: claimed.userId,
    amount: claimed.amount,
    type: "topup",
    ref: claimed.trackingNumber || claimed.invoiceId,
    note: "شارژ آنلاین",
    dedupe: `topup:${claimed.invoiceId}`,
  });
  claimed.status = "paid";
  claimed.error = "";
  await claimed.save();
  return { topup: claimed, paid: true as const };
}

export async function listTopups(limit = 100): Promise<PublicTopup[]> {
  await dbConnect();
  const rows = await WalletTopup.find().sort({ createdAt: -1 }).limit(limit);
  const phones = [...new Set(rows.map((r) => r.phone))];
  const users = await User.find({ phone: { $in: phones } }).select("phone name").lean();
  const names = new Map(users.map((u) => [u.phone, u.name || ""]));
  return rows.map((r) => toPublicTopup(r, names.get(r.phone) || ""));
}

/* ---------- اصلاح دستی توسط مدیر ---------- */

export async function adminAdjustWallet(params: {
  phone: string;
  amount: number;
  direction: "credit" | "debit";
  note: string;
  by: string;
  sms: boolean;
}) {
  const note = String(params.note || "").trim();
  if (note.length < 3) throw new WalletError("دلیل تغییر موجودی را بنویسید (در دفتر و پیامک مشتری می‌آید)");
  const user = await ensureUserByPhone(params.phone);
  if (params.direction === "credit") {
    const settings = await getStoreSettings();
    if (user.walletBalance + cleanAmount(params.amount) > settings.wallet.maxBalance) {
      throw new WalletError("این مبلغ موجودی را از سقف کیف پول بالاتر می‌برد (در تنظیمات کیف پول قابل تغییر است)");
    }
    return creditWallet({ userId: user._id, amount: params.amount, type: "admin_credit", note, by: params.by, sms: params.sms });
  }
  return debitWallet({ userId: user._id, amount: params.amount, type: "admin_debit", note, by: params.by, sms: params.sms });
}

/* ---------- آمار برای پنل ---------- */

export async function walletOverview() {
  await dbConnect();
  const [liab] = await User.aggregate<{ total: number; holders: number }>([
    { $match: { walletBalance: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$walletBalance" }, holders: { $sum: 1 } } },
  ]);
  const since = new Date(Date.now() - 30 * 86400000);
  const flows = await WalletTxn.aggregate<{ _id: WalletTxnType; sum: number; n: number }>([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$type", sum: { $sum: "$amount" }, n: { $sum: 1 } } },
  ]);
  const recent = await WalletTxn.find().sort({ createdAt: -1, _id: -1 }).limit(80);
  const phones = [...new Set(recent.map((r) => r.phone))];
  const users = await User.find({ phone: { $in: phones } }).select("phone name").lean();
  const names = new Map(users.map((u) => [u.phone, u.name || ""]));
  return {
    totalBalance: liab?.total || 0,
    holders: liab?.holders || 0,
    last30: Object.fromEntries(flows.map((f) => [f._id, { sum: f.sum, n: f.n }])) as Partial<Record<WalletTxnType, { sum: number; n: number }>>,
    recent: recent.map((r) => ({ ...toPublicTxn(r), phone: r.phone, name: names.get(r.phone) || "", by: r.by || "" })),
  };
}

/** مقایسهٔ موجودی ذخیره‌شده با جمع دفتر — برای اطمینان مالک از سالم بودن حساب‌ها */
export async function walletReconcile(phone: string) {
  await dbConnect();
  const user = await User.findOne({ phone }).select("walletBalance").lean();
  if (!user) return { balance: 0, ledger: 0, ok: true };
  const [agg] = await WalletTxn.aggregate<{ sum: number }>([
    { $match: { userId: user._id } },
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]);
  const ledger = agg?.sum || 0;
  return { balance: user.walletBalance || 0, ledger, ok: ledger === (user.walletBalance || 0) };
}
