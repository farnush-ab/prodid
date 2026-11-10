import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { OrderError } from "@/lib/order-server";
import { adminPatchSaladOrder } from "@/lib/salad-order-server";
import type { OrderStatus } from "@/lib/order";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { no: string } }) {
  try {
    const user = await requireStaff();
    let body: { action?: "advance" | "cancel"; status?: OrderStatus };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    if (body.action === "cancel") requireCan(user, "orders.cancel");
    else requireCan(user, "salad");

    const order = await adminPatchSaladOrder(params.no, body);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return adminErrorResponse(err);
  }
}
