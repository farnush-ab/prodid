import { NextResponse } from "next/server";
import { adminErrorResponse, requireSection, requireStaff } from "@/lib/admin-auth";
import { listTopups, walletOverview } from "@/lib/wallet-server";
import { isAqayepardakhtConfigured, isAqayepardakhtSandbox } from "@/lib/aqayepardakht";
import { isPatternReady } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireStaff();
    requireSection(user, "wallet");
    const [overview, topups] = await Promise.all([walletOverview(), listTopups(150)]);
    return NextResponse.json({
      ...overview,
      topups,
      gateway: { configured: isAqayepardakhtConfigured(), sandbox: isAqayepardakhtSandbox() },
      sms: { credit: isPatternReady("walletCredit"), debit: isPatternReady("walletDebit") },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
