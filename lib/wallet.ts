/* ---------------------------------------------------------
   کیف پول اعتباری — تایپ‌ها و برچسب‌های مشترک مرورگر و سرور.

   مدل: موجودی هر کاربر روی User.walletBalance نگه داشته می‌شود و هر
   تغییرش دقیقا یک ردیف در دفتر (WalletTxn) دارد با مبلغ علامت‌دار و
   موجودی بعد از آن. هیچ کدی موجودی را مستقیم ست نمی‌کند؛ فقط
   creditWallet / debitWallet در lib/wallet-server.ts با $inc اتمیک.
   همه مبلغ‌ها تومان و عدد صحیح‌اند.
   --------------------------------------------------------- */

export const WALLET_TXN_TYPES = [
  "topup", // شارژ آنلاین از درگاه
  "order", // پرداخت سفارش با کیف پول
  "refund", // برگشت مبلغ سفارش لغوشده یا مازاد وزنی
  "cashback", // اعتبار هدیهٔ درصدی بعد از تحویل سفارش
  "admin_credit", // افزایش دستی توسط مدیر (هدیه، جبران، تسویه)
  "admin_debit", // کاهش دستی توسط مدیر (اصلاح، تسویه نقدی)
] as const;
export type WalletTxnType = (typeof WALLET_TXN_TYPES)[number];

export const WALLET_TXN_LABEL: Record<WalletTxnType, string> = {
  topup: "شارژ کیف پول",
  order: "پرداخت سفارش",
  refund: "برگشت وجه",
  cashback: "اعتبار هدیهٔ خرید",
  admin_credit: "افزایش توسط فروشگاه",
  admin_debit: "کسر توسط فروشگاه",
};

export interface PublicWalletTxn {
  id: string;
  type: WalletTxnType;
  /** مثبت = واریز، منفی = برداشت */
  amount: number;
  balanceAfter: number;
  orderNo: string;
  note: string;
  ref: string;
  createdAt: string;
}

export type TopupStatus = "pending" | "paid" | "failed";

export interface PublicTopup {
  id: string;
  invoiceId: string;
  phone: string;
  name: string;
  amount: number;
  status: TopupStatus;
  trackingNumber: string;
  createdAt: string;
}

export interface WalletSettings {
  /** خاموش = کیف پول نه شارژ می‌شود نه در پرداخت پیشنهاد می‌شود (موجودی‌ها می‌مانند) */
  enabled: boolean;
  /** کمترین مبلغ هر شارژ آنلاین */
  minTopup: number;
  /** سقف موجودی هر کیف پول؛ شارژی که از این بالاتر ببرد پذیرفته نمی‌شود */
  maxBalance: number;
  /** دکمه‌های مبلغ آماده در صفحه شارژ */
  presets: number[];
  /** درصد اعتبار هدیه از مبلغ هر سفارش تحویل‌شده (۰ = خاموش) */
  cashbackPercent: number;
  /** سقف اعتبار هدیه برای هر سفارش (۰ = بدون سقف) */
  cashbackMax: number;
}

export const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  enabled: true,
  minTopup: 50_000,
  maxBalance: 20_000_000,
  presets: [100_000, 200_000, 500_000, 1_000_000],
  cashbackPercent: 0,
  cashbackMax: 0,
};

export function sanitizeWalletSettings(raw: Partial<WalletSettings> | null | undefined): WalletSettings {
  const d = DEFAULT_WALLET_SETTINGS;
  const src = raw || {};
  const int = (v: unknown, fb: number, min: number, max: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
  };
  const minTopup = int(src.minTopup, d.minTopup, 1_000, 50_000_000);
  const maxBalance = int(src.maxBalance, d.maxBalance, minTopup, 500_000_000);
  const presets = (Array.isArray(src.presets) ? src.presets : d.presets)
    .map((p) => int(p, 0, 0, 50_000_000))
    .filter((p) => p >= minTopup)
    .slice(0, 6);
  return {
    enabled: src.enabled === undefined ? d.enabled : Boolean(src.enabled),
    minTopup,
    maxBalance,
    presets: presets.length ? [...new Set(presets)].sort((a, b) => a - b) : d.presets.filter((p) => p >= minTopup),
    cashbackPercent: int(src.cashbackPercent, d.cashbackPercent, 0, 30),
    cashbackMax: int(src.cashbackMax, d.cashbackMax, 0, 50_000_000),
  };
}

/** آنچه صفحه حساب و تسویه حساب از /api/wallet می‌گیرند */
export interface WalletSummary {
  enabled: boolean;
  /** درگاه شارژ آنلاین روی سرور تنظیم شده است */
  canTopup: boolean;
  balance: number;
  minTopup: number;
  maxBalance: number;
  presets: number[];
  cashbackPercent: number;
  txns: PublicWalletTxn[];
}

/** سهم کیف پول از مبلغ قابل پرداخت سفارش */
export function walletShare(payable: number, balance: number): number {
  return Math.max(0, Math.min(Math.round(payable), Math.floor(balance)));
}
