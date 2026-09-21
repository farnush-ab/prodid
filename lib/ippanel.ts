/**
 * IPPanel send API — https://docs.ippanel.com/docs/send/
 * Base: POST {base}/send  (default https://edge.ippanel.com/v1/api)
 * Auth header: Authorization: <API_KEY>
 *
 * Pattern:  sending_type "pattern"
 * Webservice: sending_type "webservice"
 */

export class IppanelError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export function getIppanelConfig() {
  const apiKey = (process.env.IPPANEL_API_KEY || "").trim();
  const fromNumber = (process.env.IPPANEL_FROM || "").trim();
  const baseUrl = (process.env.IPPANEL_BASE_URL || "https://edge.ippanel.com/v1/api").replace(/\/$/, "");
  return { apiKey, fromNumber, baseUrl };
}

export function isIppanelConfigured() {
  const { apiKey, fromNumber } = getIppanelConfig();
  return Boolean(apiKey && fromNumber);
}

function stringifyParams(params: Record<string, string | number | null | undefined>) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] = String(value);
  }
  return out;
}

async function postSend(payload: Record<string, unknown>) {
  const { apiKey, baseUrl } = getIppanelConfig();
  if (!apiKey) throw new IppanelError("کلید API پنل پیامک تنظیم نشده است", 503);

  const res = await fetch(`${baseUrl}/send`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    meta?: { status?: boolean; message?: string };
    data?: unknown;
  };

  if (!res.ok) {
    throw new IppanelError(data.message || data.error || data.meta?.message || "ارسال پیامک انجام نشد", res.status >= 400 ? res.status : 502);
  }

  if (data.meta && data.meta.status === false) {
    throw new IppanelError(data.meta.message || data.message || "ارسال پیامک رد شد", 502);
  }

  return data;
}

/** ارسال با پترن ثبت‌شده در پنل — docs/send pattern */
export async function sendIppanelPattern(opts: {
  patternCode: string;
  recipient: string;
  params: Record<string, string | number | null | undefined>;
}) {
  const { fromNumber } = getIppanelConfig();
  if (!fromNumber) throw new IppanelError("شماره ارسال‌کننده پنل پیامک تنظیم نشده است", 503);
  const code = opts.patternCode.trim();
  if (!code) throw new IppanelError("کد پترن پیامک تنظیم نشده است", 503);

  return postSend({
    sending_type: "pattern",
    from_number: fromNumber,
    code,
    recipients: [opts.recipient],
    params: stringifyParams(opts.params),
  });
}

/** ارسال متن آزاد وب‌سرویس — docs/send webservice */
export async function sendIppanelWebservice(opts: { message: string; recipients: string[] }) {
  const { fromNumber } = getIppanelConfig();
  if (!fromNumber) throw new IppanelError("شماره ارسال‌کننده پنل پیامک تنظیم نشده است", 503);
  return postSend({
    sending_type: "webservice",
    from_number: fromNumber,
    message: opts.message,
    params: { recipients: opts.recipients },
  });
}
