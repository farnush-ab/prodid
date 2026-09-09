import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { canViewOrder, cancelOrder, findOrderByNo, OrderError, toPublicOrder } from "@/lib/order-server";

export const runtime = "nodejs";

type Ctx = { params: { no: string } };

export async function GET(req: Request, { params }: Ctx) {
  const no = decodeURIComponent(params.no || "").trim();
  if (!no) return NextResponse.json({ error: "شماره سفارش نامعتبر است" }, { status: 400 });

  try {
    const doc = await findOrderByNo(no);
    if (!doc) return NextResponse.json({ error: "سفارش پیدا نشد" }, { status: 404 });

    const session = await getAuthSession();
    const user = session?.user?.id && session.user.phone ? { id: session.user.id, phone: session.user.phone } : null;
    const token = new URL(req.url).searchParams.get("t");

    if (!canViewOrder(doc, { user, token })) {
      return NextResponse.json({ error: "دسترسی به این سفارش ندارید" }, { status: 403 });
    }

    return NextResponse.json({ order: toPublicOrder(doc) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خواندن سفارش انجام نشد" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const no = decodeURIComponent(params.no || "").trim();
  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.phone) {
    return NextResponse.json({ error: "وارد حساب نشده‌اید" }, { status: 401 });
  }

  try {
    const order = await cancelOrder(no, { id: session.user.id, phone: session.user.phone });
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "لغو سفارش انجام نشد" }, { status: 500 });
  }
}
