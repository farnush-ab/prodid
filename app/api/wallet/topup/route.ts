import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { startTopup, WalletError } from "@/lib/wallet-server";
import { AqayepardakhtError } from "@/lib/aqayepardakht";
import { toEnDigits } from "@/lib/phone";

export const runtime = "nodejs";

function appUrlFrom(req: Request) {
  const env = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** شروع شارژ آنلاین: { amount } → { paymentUrl } */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.phone) {
    return NextResponse.json({ error: "برای شارژ کیف پول وارد حساب شوید" }, { status: 401 });
  }
  let body: { amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
  const amount = Number(toEnDigits(String(body.amount ?? "")).replace(/[^\d]/g, ""));
  try {
    const result = await startTopup({ id: session.user.id, phone: session.user.phone }, amount, appUrlFrom(req));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WalletError || err instanceof AqayepardakhtError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "اتصال به درگاه انجام نشد" }, { status: 500 });
  }
}
