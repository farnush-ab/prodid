/**
 * آقای پرداخت — ساخت و تایید تراکنش (API v2)
 *
 *   ساخت:    POST https://panel.aqayepardakht.ir/api/v2/create
 *            { pin, amount (تومان), callback, invoice_id?, mobile?, description? }
 *            → { status: "success", transid }   یا   { status: "error", code }
 *   هدایت:   https://panel.aqayepardakht.ir/startpay/<transid>
 *            (سندباکس: …/startpay/sandbox/<transid> و pin = "sandbox")
 *   بازگشت:  درگاه با POST (فرم) به callback برمی‌گردد:
 *            transid, tracking_number, status ("1" موفق / "0" ناموفق), invoice_id, cardnumber
 *   تایید:   POST https://panel.aqayepardakht.ir/api/v2/verify  { pin, amount, transid }
 *            → { status: "success", code: "1" }   (code "2" = قبلا تایید شده؛ آن هم موفق است)
 *
 * فقط سمت سرور. PIN درگاه فقط در .env سرور (AQAYEPARDAKHT_PIN) می‌نشیند.
 */

export class AqayepardakhtError extends Error {
  status: number;
  code?: number;
  constructor(message: string, status = 502, code?: number) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const HOST = "https://panel.aqayepardakht.ir";

const FA_ERRORS: Record<number, string> = {
  [-1]: "مبلغ نباید خالی باشد",
  [-2]: "کد پین درگاه خالی است",
  [-3]: "آدرس بازگشت خالی است",
  [-4]: "مبلغ وارد شده اشتباه است",
  [-5]: "مبلغ باید بین ۱۰۰ تومان تا ۵۰ میلیون تومان باشد",
  [-6]: "کد پین درگاه اشتباه است",
  [-7]: "کد تراکنش خالی است",
  [-8]: "تراکنش مورد نظر وجود ندارد",
  [-9]: "کد پین درگاه با درگاه تراکنش مطابقت ندارد",
  [-10]: "مبلغ با مبلغ تراکنش مطابقت ندارد",
  [-11]: "درگاه در انتظار تایید و یا غیرفعال است",
  [-12]: "امکان ارسال درخواست برای این پذیرنده وجود ندارد",
  [-13]: "شماره کارت باید ۱۶ رقم باشد",
  0: "پرداخت انجام نشد",
};

/** کمترین و بیشترین مبلغی که درگاه می‌پذیرد (تومان) */
export const AQP_MIN_AMOUNT = 1000;
export const AQP_MAX_AMOUNT = 50_000_000;

function truthy(v: string | undefined) {
  return ["1", "true", "yes", "on"].includes((v || "").trim().toLowerCase());
}

export function isAqayepardakhtSandbox() {
  return truthy(process.env.AQAYEPARDAKHT_SANDBOX);
}

export function isAqayepardakhtConfigured() {
  return isAqayepardakhtSandbox() || Boolean((process.env.AQAYEPARDAKHT_PIN || "").trim());
}

function pin(): string {
  if (isAqayepardakhtSandbox()) return "sandbox";
  const p = (process.env.AQAYEPARDAKHT_PIN || "").trim();
  if (!p) throw new AqayepardakhtError("پین درگاه آقای پرداخت روی سرور تنظیم نشده است", 503);
  return p;
}

export function aqayepardakhtCallbackUrl(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/api/payments/aqayepardakht/callback`;
}

export function aqayepardakhtStartPayUrl(transid: string) {
  const id = encodeURIComponent(transid);
  return isAqayepardakhtSandbox() ? `${HOST}/startpay/sandbox/${id}` : `${HOST}/startpay/${id}`;
}

function toAmount(toman: number) {
  const n = Math.round(Number(toman));
  if (!Number.isFinite(n) || n < AQP_MIN_AMOUNT || n > AQP_MAX_AMOUNT) {
    throw new AqayepardakhtError("مبلغ پرداخت خارج از محدودهٔ مجاز درگاه است", 400);
  }
  return n;
}

function codeOf(json: unknown): number | undefined {
  if (!json || typeof json !== "object") return undefined;
  const raw = (json as Record<string, unknown>).code;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

async function post(path: string, body: Record<string, unknown>) {
  let res: Response;
  try {
    res = await fetch(`${HOST}${path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new AqayepardakhtError("ارتباط با درگاه آقای پرداخت برقرار نشد", 502);
  }
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    throw new AqayepardakhtError("پاسخ درگاه آقای پرداخت قابل خواندن نبود", 502);
  }
}

export async function aqayepardakhtCreate(input: {
  amountToman: number;
  appUrl: string;
  invoiceId: string;
  mobile?: string;
  description?: string;
}): Promise<{ transid: string; paymentUrl: string }> {
  const json = await post("/api/v2/create", {
    pin: pin(),
    amount: toAmount(input.amountToman),
    callback: aqayepardakhtCallbackUrl(input.appUrl),
    invoice_id: input.invoiceId,
    ...(input.mobile ? { mobile: input.mobile } : {}),
    ...(input.description ? { description: input.description.slice(0, 250) } : {}),
  });
  const transid = typeof json.transid === "string" || typeof json.transid === "number" ? String(json.transid) : "";
  if (json.status === "success" && transid) {
    return { transid, paymentUrl: aqayepardakhtStartPayUrl(transid) };
  }
  const code = codeOf(json);
  throw new AqayepardakhtError((code != null && FA_ERRORS[code]) || "درگاه پرداخت درخواست را نپذیرفت", 502, code);
}

/** true یعنی پول واقعا رسیده (کد ۱ یا ۲). هر حالت دیگری خطا می‌دهد. */
export async function aqayepardakhtVerify(input: { amountToman: number; transid: string }): Promise<true> {
  const transid = String(input.transid || "").trim();
  if (!transid) throw new AqayepardakhtError("شناسه تراکنش خالی است", 400);
  const json = await post("/api/v2/verify", { pin: pin(), amount: toAmount(input.amountToman), transid });
  const code = codeOf(json);
  if (json.status === "success" && (code === 1 || code === 2 || code === undefined)) return true;
  throw new AqayepardakhtError((code != null && FA_ERRORS[code]) || "تایید پرداخت ناموفق بود", 502, code);
}
