import { NextResponse } from "next/server";
import { finalizeAqayepardakhtOrder, OrderError } from "@/lib/order-server";
import { finalizeTopup, isTopupInvoice, isTopupTransid, WalletError } from "@/lib/wallet-server";
import { AqayepardakhtError } from "@/lib/aqayepardakht";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* آقای پرداخت بعد از پرداخت کاربر را با یک فرم POST به این آدرس برمی‌گرداند:
     transid, tracking_number, status ("1" موفق), invoice_id, cardnumber
   invoice_id که با W شروع شود شارژ کیف پول است، بقیه شماره سفارش (PD…). */

function appUrlFrom(req: Request) {
  const env = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (env) return env;
  return new URL(req.url).origin;
}

function redirect(req: Request, path: string) {
  // 303 تا مرورگر بعد از POST درگاه، صفحه را با GET باز کند
  return NextResponse.redirect(new URL(path, appUrlFrom(req)), 303);
}

async function readParams(req: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => (out[k] = v));
  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = (await req.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(j)) out[k] = String(v ?? "");
      } else {
        const form = await req.formData();
        form.forEach((v, k) => (out[k] = typeof v === "string" ? v : ""));
      }
    } catch {
      /* بدنهٔ خراب: با همان پارامترهای آدرس ادامه می‌دهیم */
    }
  }
  return out;
}

async function handle(req: Request) {
  const p = await readParams(req);
  const transid = (p.transid || "").trim();
  const invoiceId = (p.invoice_id || "").trim();
  const status = (p.status || "").trim();
  const trackingNumber = (p.tracking_number || "").trim();
  const cardNumber = (p.cardnumber || "").trim();

  if (!transid && !invoiceId) return redirect(req, "/account?wallet=failed");

  if (isTopupInvoice(invoiceId) || (!invoiceId && (await isTopupTransid(transid)))) {
    try {
      const { paid, topup } = await finalizeTopup({ transid, invoiceId, status, trackingNumber, cardNumber });
      const q = new URLSearchParams({ wallet: paid ? "ok" : "failed", amount: String(topup.amount) });
      return redirect(req, `/account?${q.toString()}`);
    } catch (err) {
      if (!(err instanceof WalletError) && !(err instanceof AqayepardakhtError)) console.error(err);
      return redirect(req, "/account?wallet=failed");
    }
  }

  try {
    const { order, paid } = await finalizeAqayepardakhtOrder({ transid, status, trackingNumber });
    const q = new URLSearchParams();
    if (paid) {
      q.set("done", "1");
      q.set("paid", "1");
    } else q.set("pay", "failed");
    q.set("no", order.orderNo);
    if (order.viewToken) q.set("t", order.viewToken);
    return redirect(req, `/checkout?${q.toString()}`);
  } catch (err) {
    if (!(err instanceof OrderError) && !(err instanceof AqayepardakhtError)) console.error(err);
    return redirect(req, "/checkout?pay=failed");
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
