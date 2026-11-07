import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { normalizePhone } from "@/lib/phone";
import { getStoreSettings, patchStoreSettings } from "@/lib/catalog-server";
import { User } from "@/models/User";
import { isValidBirthDate } from "@/lib/coupon";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { phone: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "customers");
    const phone = normalizePhone(decodeURIComponent(params.phone));
    if (!phone) return NextResponse.json({ error: "شماره نامعتبر است" }, { status: 400 });
    const body = (await req.json()) as { blocked?: boolean; birthDate?: string };
    const blocked = body.blocked;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim().slice(0, 10) : undefined;
    if (birthDate !== undefined && birthDate && !isValidBirthDate(birthDate)) {
      return NextResponse.json({ error: "تاریخ تولد نامعتبر است" }, { status: 400 });
    }

    const set: Record<string, unknown> = {};
    if (typeof blocked === "boolean") set.blocked = blocked;
    if (birthDate !== undefined) set.birthDate = birthDate;

    await User.findOneAndUpdate(
      { phone },
      { $set: set, $setOnInsert: { phone, name: "", address: "", birthDate: birthDate || "", role: "customer", staffActive: true, blocked: false } },
      { upsert: true }
    );

    if (typeof blocked === "boolean") {
      const settings = await getStoreSettings();
      const next = new Set(settings.blockedPhones);
      if (blocked) next.add(phone);
      else next.delete(phone);
      await patchStoreSettings({ blockedPhones: [...next] });
    }

    return NextResponse.json({ ok: true, phone, blocked, birthDate });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
