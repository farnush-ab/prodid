import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { createOrder, listOrdersForUser, OrderError } from "@/lib/order-server";
import { orderWhatsappUrl, type CreateOrderInput } from "@/lib/order";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.phone) {
    return NextResponse.json({ error: "وارد حساب نشده‌اید" }, { status: 401 });
  }
  try {
    const orders = await listOrdersForUser({ id: session.user.id, phone: session.user.phone });
    return NextResponse.json({ orders });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خواندن سفارش‌ها انجام نشد" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: CreateOrderInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const session = await getAuthSession();
  const user = session?.user?.id && session.user.phone ? { id: session.user.id, phone: session.user.phone } : null;

  try {
    const order = await createOrder(body, user);
    return NextResponse.json({ order, whatsappUrl: orderWhatsappUrl(order, "new") });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "ثبت سفارش انجام نشد" }, { status: 500 });
  }
}
