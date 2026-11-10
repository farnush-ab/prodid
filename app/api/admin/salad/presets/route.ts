import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { OrderError } from "@/lib/order-server";
import { createSaladPreset } from "@/lib/salad-admin-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    requireCan(user, "salad-catalog");
    const body = await req.json().catch(() => {
      throw new OrderError("درخواست نامعتبر است");
    });
    const preset = await createSaladPreset(body);
    return NextResponse.json({ preset });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: err.status });
    return adminErrorResponse(err);
  }
}
