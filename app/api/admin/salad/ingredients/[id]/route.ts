import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { OrderError } from "@/lib/order-server";
import { updateSaladIngredient, deleteSaladIngredient } from "@/lib/salad-admin-server";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "salad-catalog");
    const body = await req.json().catch(() => {
      throw new OrderError("درخواست نامعتبر است");
    });
    const ingredient = await updateSaladIngredient(params.id, body);
    return NextResponse.json({ ingredient });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: err.status });
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "salad-catalog");
    await deleteSaladIngredient(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: err.status });
    return adminErrorResponse(err);
  }
}
