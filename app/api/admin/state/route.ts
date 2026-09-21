import { NextResponse } from "next/server";
import { adminErrorResponse, requireStaff } from "@/lib/admin-auth";
import { buildAdminState } from "@/lib/admin-state";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireStaff();
    const state = await buildAdminState({
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
    return NextResponse.json(state);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
