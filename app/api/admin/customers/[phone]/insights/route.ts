import { NextResponse } from "next/server";
import { adminErrorResponse, requireSection, requireStaff } from "@/lib/admin-auth";
import { customerInsight } from "@/lib/insights-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { phone: string } }) {
  try {
    const user = await requireStaff();
    requireSection(user, "customers", "insights");
    return NextResponse.json(await customerInsight(decodeURIComponent(params.phone)));
  } catch (err) {
    return adminErrorResponse(err);
  }
}
