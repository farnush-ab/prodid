import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { getWalletSummary } from "@/lib/wallet-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** موجودی، تنظیمات شارژ و ۶۰ تراکنش آخر کیف پول کاربر واردشده */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "وارد حساب نشده‌اید" }, { status: 401 });
  try {
    return NextResponse.json({ wallet: await getWalletSummary(session.user.id) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خواندن کیف پول انجام نشد" }, { status: 500 });
  }
}
