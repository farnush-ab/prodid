/**
 * زرین‌پال — درخواست و تایید پرداخت (REST v4)
 * https://www.zarinpal.com/docs/paymentGateway/connectToGateway.html
 * سندباکس: https://www.zarinpal.com/docs/paymentGateway/sandBox.html
 */

export type ZarinpalCurrency = "IRT" | "IRR";

export class ZarinpalError extends Error {
  status: number;
  code?: number;
  constructor(message: string, status = 502, code?: number) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ZarinpalConfig {
  merchantId: string;
  sandbox: boolean;
  currency: ZarinpalCurrency;
  appUrl: string;
  requestUrl: string;
  verifyUrl: string;
}

const FA_ERRORS: Record<number, string> = {
  [-9]: "اطلاعات ارسال‌شده به درگاه ناقص است",
  [-10]: "مرچنت‌آیدی یا آی‌پی درگاه معتبر نیست",
  [-11]: "درگاه پرداخت فعال نیست",
  [-12]: "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید",
  [-14]: "آدرس بازگشت با دامنه ثبت‌شده در زرین‌پال هم‌خوانی ندارد",
  [-15]: "درگاه پرداخت تعلیق شده است",
  [-50]: "مبلغ تایید با مبلغ پرداخت برابر نیست",
  [-51]: "پرداخت ناموفق بود",
  [-54]: "شناسه پرداخت نامعتبر است",
};

function truthyEnv(v: string | undefined) {
  return ["1", "true", "yes", "on"].includes((v || "").trim().toLowerCase());
}

export function isZarinpalConfigured() {
  return Boolean((process.env.ZARINPAL_MERCHANT_ID || "").trim());
}

export function getZarinpalConfig(appUrlOverride?: string): ZarinpalConfig {
  const merchantId = (process.env.ZARINPAL_MERCHANT_ID || "").trim();
  if (!merchantId) {
    throw new ZarinpalError("مرچنت‌آیدی زرین‌پال روی سرور تنظیم نشده است", 503);
  }

  const sandbox = truthyEnv(process.env.ZARINPAL_SANDBOX);
  const currency: ZarinpalCurrency = (process.env.ZARINPAL_CURRENCY || "IRT").trim().toUpperCase() === "IRR" ? "IRR" : "IRT";
  const appUrl = (appUrlOverride || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const host = sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";

  return {
    merchantId,
    sandbox,
    currency,
    appUrl,
    requestUrl: `${host}/pg/v4/payment/request.json`,
    verifyUrl: `${host}/pg/v4/payment/verify.json`,
  };
}

export function zarinpalStartPayUrl(authority: string, config?: Pick<ZarinpalConfig, "sandbox">) {
  const sandbox = config?.sandbox ?? truthyEnv(process.env.ZARINPAL_SANDBOX);
  const host = sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
  return `${host}/pg/StartPay/${authority}`;
}

export function zarinpalCallbackUrl(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/api/payments/zarinpal/callback`;
}

/** قیمت فروشگاه تومان است؛ IRT همان تومان، IRR ریال (= تومان × ۱۰). */
export function toZarinpalAmount(toman: number, currency: ZarinpalCurrency) {
  const n = Math.round(Number(toman));
  if (!Number.isFinite(n) || n < 1) {
    throw new ZarinpalError("مبلغ پرداخت نامعتبر است", 400);
  }
  return currency === "IRR" ? n * 10 : n;
}

function pickCode(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const rec = payload as Record<string, unknown>;
  if (typeof rec.code === "number") return rec.code;
  if (typeof rec.code === "string" && rec.code.trim()) {
    const n = Number(rec.code);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function pickMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const rec = payload as Record<string, unknown>;
  return typeof rec.message === "string" ? rec.message : "";
}

function parseEnvelope(json: unknown): { data: Record<string, unknown> | null; errors: unknown } {
  if (!json || typeof json !== "object") return { data: null, errors: null };
  const rec = json as Record<string, unknown>;
  const data = rec.data && typeof rec.data === "object" && !Array.isArray(rec.data) ? (rec.data as Record<string, unknown>) : null;
  return { data, errors: rec.errors };
}

function throwFromResponse(json: unknown, fallback: string): never {
  const { data, errors } = parseEnvelope(json);
  const code = pickCode(data) ?? pickCode(errors);
  const raw = pickMessage(data) || pickMessage(errors);
  const mapped = code != null ? FA_ERRORS[code] : undefined;
  throw new ZarinpalError(mapped || raw || fallback, 502, code);
}

async function postJson(url: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ZarinpalError("ارتباط با درگاه زرین‌پال برقرار نشد", 502);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    throw new ZarinpalError("پاسخ درگاه زرین‌پال قابل خواندن نبود", 502);
  }
  return json;
}

export async function zarinpalRequestPayment(
  input: {
    amountToman: number;
    description: string;
    mobile?: string;
    orderId?: string;
  },
  config = getZarinpalConfig()
) {
  const amount = toZarinpalAmount(input.amountToman, config.currency);
  const description = String(input.description || "").trim().slice(0, 500);
  if (!description) throw new ZarinpalError("توضیحات پرداخت خالی است", 400);

  const json = await postJson(config.requestUrl, {
    merchant_id: config.merchantId,
    amount,
    currency: config.currency,
    description,
    callback_url: zarinpalCallbackUrl(config.appUrl),
    metadata: {
      ...(input.mobile ? { mobile: input.mobile } : {}),
      ...(input.orderId ? { order_id: input.orderId } : {}),
    },
  });

  const { data } = parseEnvelope(json);
  const code = pickCode(data);
  const authority = typeof data?.authority === "string" ? data.authority : "";
  if ((code === 100 || code === 101) && authority) {
    return { authority, fee: Number(data?.fee) || 0 };
  }
  throwFromResponse(json, "درگاه پرداخت درخواست را نپذیرفت");
}

export async function zarinpalVerifyPayment(
  input: { amountToman: number; authority: string },
  config = getZarinpalConfig()
) {
  const authority = String(input.authority || "").trim();
  if (!authority) throw new ZarinpalError("شناسه پرداخت نامعتبر است", 400);

  const json = await postJson(config.verifyUrl, {
    merchant_id: config.merchantId,
    amount: toZarinpalAmount(input.amountToman, config.currency),
    authority,
  });

  const { data } = parseEnvelope(json);
  const code = pickCode(data);
  if (code === 100 || code === 101) {
    return {
      code,
      refId: data?.ref_id != null ? String(data.ref_id) : "",
      cardPan: typeof data?.card_pan === "string" ? data.card_pan : "",
    };
  }
  throwFromResponse(json, "تایید پرداخت ناموفق بود");
}
