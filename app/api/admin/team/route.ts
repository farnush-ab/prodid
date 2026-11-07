import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { normalizePhone } from "@/lib/phone";
import { isStaffRole, type StaffRole } from "@/lib/roles";
import { lastSeenLabel } from "@/lib/admin-format";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await requireStaff();
    requireCan(actor, "team");
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 80);
    const phone = normalizePhone(body.phone || "");
    const role = body.role as StaffRole;
    if (!name || !phone) return NextResponse.json({ error: "نام و موبایل لازم است" }, { status: 400 });
    if (!isStaffRole(role) || role === "owner") {
      return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
    }

    const existing = await User.findOne({ phone });
    if (existing && isStaffRole(existing.role) && existing.staffActive !== false) {
      return NextResponse.json({ error: "این شماره از قبل در تیم است" }, { status: 400 });
    }

    const doc = await User.findOneAndUpdate(
      { phone },
      {
        $set: { name, role, staffActive: true, blocked: false },
        $setOnInsert: { phone, address: "", lastLoginAt: new Date(0) },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      member: {
        name: doc.name,
        phone: doc.phone,
        role: doc.role,
        active: lastSeenLabel(doc.lastLoginAt?.getTime() ? doc.lastLoginAt : null),
        status: "active" as const,
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
