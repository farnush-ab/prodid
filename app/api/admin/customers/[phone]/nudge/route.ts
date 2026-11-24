import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { sendNudge } from "@/lib/insights-server";

export const runtime = "nodejs";

/** پیام بازگشت: { kind: "winback"|"reminder"|"call", productId?, productName?, percent?, validDays?, note? } */
export async function POST(req: Request, { params }: { params: { phone: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "insights");
    const body = (await req.json()) as {
      kind?: string;
      productId?: string;
      productName?: string;
      percent?: number;
      validDays?: number;
      note?: string;
    };
    const kind = body.kind === "winback" || body.kind === "call" ? body.kind : "reminder";
    const r = await sendNudge({ ...body, kind, phone: decodeURIComponent(params.phone), by: user.phone });
    return NextResponse.json(r);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
