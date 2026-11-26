import { NextResponse } from "next/server";
import { adminErrorResponse, requireSection, requireStaff } from "@/lib/admin-auth";
import { insightsOverview } from "@/lib/insights-server";
import { isPatternReady } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireStaff();
    requireSection(user, "insights");
    const overview = await insightsOverview();
    return NextResponse.json({ ...overview, smsReady: { winback: isPatternReady("winback"), reminder: isPatternReady("reminder") } });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
