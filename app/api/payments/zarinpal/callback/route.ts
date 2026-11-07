import { NextResponse } from "next/server";
import { finalizeZarinpalCallback, OrderError } from "@/lib/order-server";
import { ZarinpalError } from "@/lib/zarinpal";

export const runtime = "nodejs";

function appUrlFrom(req: Request) {
  const env = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (env) return env;
  return new URL(req.url).origin;
}

function checkoutRedirect(
  appUrl: string,
  opts: { done?: boolean; failed?: boolean; orderNo?: string; token?: string }
) {
  const q = new URLSearchParams();
  if (opts.done) q.set("done", "1");
  if (opts.failed) q.set("pay", "failed");
  if (opts.orderNo) q.set("no", opts.orderNo);
  if (opts.token) q.set("t", opts.token);
  if (opts.done) q.set("paid", "1");
  return NextResponse.redirect(new URL(`/checkout?${q.toString()}`, appUrl));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appUrl = appUrlFrom(req);
  const authority = (url.searchParams.get("Authority") || url.searchParams.get("authority") || "").trim();
  const status = (url.searchParams.get("Status") || url.searchParams.get("status") || "").trim();

  if (!authority) {
    return checkoutRedirect(appUrl, { failed: true });
  }

  try {
    const { order, paid } = await finalizeZarinpalCallback(authority, status, appUrl);
    return checkoutRedirect(appUrl, {
      done: paid,
      failed: !paid,
      orderNo: order.orderNo,
      token: order.viewToken,
    });
  } catch (err) {
    if (!(err instanceof OrderError) && !(err instanceof ZarinpalError)) {
      console.error(err);
    }
    return checkoutRedirect(appUrl, { failed: true });
  }
}
