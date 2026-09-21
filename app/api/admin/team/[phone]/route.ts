import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { normalizePhone } from "@/lib/phone";
import { isStaffRole } from "@/lib/roles";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { phone: string } }) {
  try {
    const actor = await requireStaff();
    requireCan(actor, "team");
    const phone = normalizePhone(decodeURIComponent(params.phone));
    if (!phone) return NextResponse.json({ error: "شماره نامعتبر است" }, { status: 400 });
    if (phone === actor.phone) return NextResponse.json({ error: "نمی‌توانید وضعیت خودتان را تغییر دهید" }, { status: 400 });

    const body = (await req.json()) as { staffActive?: boolean; role?: string };
    const doc = await User.findOne({ phone });
    if (!doc || !isStaffRole(doc.role)) return NextResponse.json({ error: "عضو تیم پیدا نشد" }, { status: 404 });
    if (doc.role === "owner") return NextResponse.json({ error: "مالک فروشگاه قابل تغییر نیست" }, { status: 400 });

    if (typeof body.staffActive === "boolean") doc.staffActive = body.staffActive;
    await doc.save();
    return NextResponse.json({
      member: {
        name: doc.name,
        phone: doc.phone,
        role: doc.role,
        status: doc.staffActive === false ? "suspended" : "active",
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { phone: string } }) {
  try {
    const actor = await requireStaff();
    requireCan(actor, "team");
    const phone = normalizePhone(decodeURIComponent(params.phone));
    if (!phone) return NextResponse.json({ error: "شماره نامعتبر است" }, { status: 400 });
    if (phone === actor.phone) return NextResponse.json({ error: "نمی‌توانید خودتان را حذف کنید" }, { status: 400 });

    const doc = await User.findOne({ phone });
    if (!doc || !isStaffRole(doc.role)) return NextResponse.json({ error: "عضو تیم پیدا نشد" }, { status: 404 });
    if (doc.role === "owner") return NextResponse.json({ error: "مالک فروشگاه قابل حذف نیست" }, { status: 400 });

    doc.role = "customer";
    doc.staffActive = true;
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
