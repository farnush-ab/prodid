import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { OrderError } from "@/lib/order-server";
import { createSaladOrder, type CreateSaladOrderInput } from "@/lib/salad-order-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: CreateSaladOrderInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const session = await getAuthSession();
  const user =
    session?.user?.id && session.user.phone ? { id: session.user.id, phone: session.user.phone } : null;

  try {
    const order = await createSaladOrder(body, user);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "ثبت سفارش سالاد انجام نشد" }, { status: 500 });
  }
}
