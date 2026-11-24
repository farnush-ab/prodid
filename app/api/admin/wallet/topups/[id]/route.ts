import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { finalizeTopup } from "@/lib/wallet-server";
import { WalletTopup } from "@/models/Wallet";
import { dbConnect } from "@/lib/mongodb";
import { isValidObjectId } from "mongoose";

export const runtime = "nodejs";

/** «بررسی دوباره» یک شارژ ناموفق/معلق: مستقیم از خود درگاه می‌پرسد پول رسیده یا نه.
    اگر کاربر پرداخت کرده ولی بازگشت به سایت قطع شده بود، همین‌جا کیف پولش شارژ می‌شود. */
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "wallet");
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    await dbConnect();
    const t = await WalletTopup.findById(params.id);
    if (!t) return NextResponse.json({ error: "درخواست شارژ پیدا نشد" }, { status: 404 });
    if (!t.transid) return NextResponse.json({ error: "این درخواست هیچ‌وقت به درگاه نرسیده است" }, { status: 400 });
    const { paid } = await finalizeTopup({ transid: t.transid, status: "1", force: true });
    return NextResponse.json({ paid });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
