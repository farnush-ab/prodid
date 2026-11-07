import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { Coupon } from "@/models/Coupon";
import { CouponError, parseCouponInput, toCouponRecord } from "@/lib/coupon-server";
import { normalizeCouponCode } from "@/lib/coupon";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "coupons");
    const code = normalizeCouponCode(decodeURIComponent(params.code));
    const doc = await Coupon.findOne({ code });
    if (!doc) return NextResponse.json({ error: "کد تخفیف پیدا نشد" }, { status: 404 });
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseCouponInput(
      {
        code: doc.code,
        percent: body.percent ?? doc.percent,
        kind: body.kind ?? doc.kind,
        expiresAt:
          body.expiresAt !== undefined
            ? body.expiresAt
            : doc.expiresAt
              ? doc.expiresAt.toISOString().slice(0, 10)
              : "",
        minOrders: body.minOrders ?? doc.minOrders,
        active: body.active ?? doc.active,
        note: body.note ?? doc.note,
      },
      false
    );
    doc.percent = parsed.percent;
    doc.kind = parsed.kind;
    doc.expiresAt = parsed.expiresAt;
    doc.minOrders = parsed.minOrders;
    doc.active = parsed.active;
    doc.note = parsed.note;
    await doc.save();
    return NextResponse.json({ coupon: toCouponRecord(doc) });
  } catch (err) {
    if (err instanceof CouponError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "coupons");
    const code = normalizeCouponCode(decodeURIComponent(params.code));
    const doc = await Coupon.findOneAndDelete({ code });
    if (!doc) return NextResponse.json({ error: "کد تخفیف پیدا نشد" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
