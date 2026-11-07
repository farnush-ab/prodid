import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { CouponError, listOffersFor, previewCoupon } from "@/lib/coupon-server";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id || null;
  const phone = session?.user?.phone || null;
  try {
    const coupons = await listOffersFor({ phone, userId });
    return NextResponse.json({ coupons });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خواندن تخفیف‌ها انجام نشد" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { code?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const session = await getAuthSession();
  const phone = normalizePhone(body.phone || "") || session?.user?.phone || null;
  const userId = session?.user?.id || null;

  try {
    const coupon = await previewCoupon(body.code || "", { phone, userId });
    return NextResponse.json({ coupon });
  } catch (err) {
    if (err instanceof CouponError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "بررسی کد تخفیف انجام نشد" }, { status: 500 });
  }
}
