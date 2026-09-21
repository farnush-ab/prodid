import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { adminPatchOrder } from "@/lib/admin-orders";
import { toAdminOrder } from "@/lib/admin-format";
import { OrderError } from "@/lib/order-server";
import type { OrderStatus, PayStatus } from "@/lib/order";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { no: string } }) {
  try {
    const user = await requireStaff();
    let body: {
      action?: "advance" | "cancel" | "markPaid";
      status?: OrderStatus;
      paymentStatus?: PayStatus;
      finalTotal?: number | null;
      deliveryFee?: number | null;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    if (body.action === "cancel") requireCan(user, "orders.cancel");
    else if (body.action === "markPaid") requireCan(user, "payments");
    else requireCan(user, "orders");

    const order = await adminPatchOrder(params.no, body);
    return NextResponse.json({ order: toAdminOrder(order) });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return adminErrorResponse(err);
  }
}
