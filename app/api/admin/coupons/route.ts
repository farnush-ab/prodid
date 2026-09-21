import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { Coupon } from "@/models/Coupon";
import { CouponError, listAllCoupons, parseCouponInput, toCouponRecord } from "@/lib/coupon-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireStaff();
    const coupons = await listAllCoupons();
    return NextResponse.json({ coupons });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    requireCan(user, "coupons");
    const body = (await req.json()) as Record<string, unknown>;
    const data = parseCouponInput(body, true);
    if (await Coupon.findOne({ code: data.code })) {
      return NextResponse.json({ error: "این کد تخفیف قبلا ثبت شده است" }, { status: 400 });
    }
    const doc = await Coupon.create({ ...data, usageCount: 0 });
    return NextResponse.json({ coupon: toCouponRecord(doc) });
  } catch (err) {
    if (err instanceof CouponError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return adminErrorResponse(err);
  }
}
