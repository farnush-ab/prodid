import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireSection, requireStaff } from "@/lib/admin-auth";
import { normalizePhone, toEnDigits } from "@/lib/phone";
import { adminAdjustWallet, getBalance, listWalletTxns, walletReconcile } from "@/lib/wallet-server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function phoneOf(raw: string) {
  return normalizePhone(decodeURIComponent(raw));
}

export async function GET(_req: Request, { params }: { params: { phone: string } }) {
  try {
    const user = await requireStaff();
    requireSection(user, "customers", "wallet");
    const phone = phoneOf(params.phone);
    if (!phone) return NextResponse.json({ error: "شماره نامعتبر است" }, { status: 400 });
    await dbConnect();
    const u = await User.findOne({ phone }).select("_id").lean();
    if (!u) return NextResponse.json({ balance: 0, txns: [], reconcile: { ok: true, balance: 0, ledger: 0 } });
    const [balance, txns, reconcile] = await Promise.all([getBalance(u._id), listWalletTxns(u._id, 100), walletReconcile(phone)]);
    return NextResponse.json({ balance, txns, reconcile });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

/** افزایش/کاهش دستی: { direction: "credit"|"debit", amount, note, sms } */
export async function POST(req: Request, { params }: { params: { phone: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "wallet");
    const phone = phoneOf(params.phone);
    if (!phone) return NextResponse.json({ error: "شماره نامعتبر است" }, { status: 400 });
    const body = (await req.json()) as { direction?: string; amount?: unknown; note?: string; sms?: boolean };
    const direction = body.direction === "debit" ? "debit" : "credit";
    const amount = Number(toEnDigits(String(body.amount ?? "")).replace(/[^\d]/g, ""));
    const r = await adminAdjustWallet({ phone, amount, direction, note: body.note || "", by: user.phone, sms: body.sms !== false });
    return NextResponse.json({ balance: r.balance, txn: r.txn });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
