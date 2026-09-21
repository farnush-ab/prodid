import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { OrderError, startOnlinePaymentForExistingOrder, startOnlinePaymentForNewOrder } from "@/lib/order-server";
import { ZarinpalError } from "@/lib/zarinpal";
import type { CreateOrderInput } from "@/lib/order";

export const runtime = "nodejs";

function appUrlFrom(req: Request) {
  const env = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  const user = session?.user?.id && session.user.phone ? { id: session.user.id, phone: session.user.phone } : null;
  if (!user) {
    return NextResponse.json({ error: "برای پرداخت آنلاین ابتدا وارد حساب شوید" }, { status: 401 });
  }

  let body: (Partial<CreateOrderInput> & { orderNo?: string }) | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const appUrl = appUrlFrom(req);
  const orderNo = String(body?.orderNo || "").trim();

  try {
    const result = orderNo
      ? await startOnlinePaymentForExistingOrder(orderNo, user, appUrl)
      : await startOnlinePaymentForNewOrder(
          {
            items: body?.items || [],
            name: body?.name || "",
            phone: body?.phone || "",
            address: body?.address || "",
            day: body?.day || "",
            slot: body?.slot || "",
            pay: "online",
            notes: body?.notes,
          },
          user,
          appUrl
        );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OrderError || err instanceof ZarinpalError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "اتصال به درگاه پرداخت انجام نشد" }, { status: 500 });
  }
}
