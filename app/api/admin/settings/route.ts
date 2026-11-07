import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { deriveBrandFields, type StoreSettings } from "@/lib/store-settings";
import { patchStoreSettings } from "@/lib/catalog-server";
import { phoneToIntl, normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const user = await requireStaff();
    const body = (await req.json()) as Partial<StoreSettings> & { section?: string };
    const section = body.section;

    if (section === "delivery") requireCan(user, "delivery");
    else if (section === "assistant") requireCan(user, "assistant");
    else if (section === "otp" || section === "blocked") requireCan(user, "security");
    else if (section === "payments") requireCan(user, "payments");
    else requireCan(user, "settings");

    const patch: Partial<StoreSettings> = {};
    if (body.brand) {
      if (section === "delivery") {
        patch.brand = {
          minOrder: body.brand.minOrder,
          deliveryFeeNote: body.brand.deliveryFeeNote,
        } as StoreSettings["brand"];
      } else {
        const brand = { ...body.brand };
        const derived = deriveBrandFields({
          phone: brand.phone,
          instagram: brand.instagram,
          phoneIntl: brand.phoneIntl,
        });
        if (!brand.phoneIntl) brand.phoneIntl = derived.phoneIntl || phoneToIntl(brand.phone);
        if (!brand.instagramUrl) brand.instagramUrl = derived.instagramUrl;
        patch.brand = brand as StoreSettings["brand"];
      }
    }
    if (body.delivery) patch.delivery = body.delivery as StoreSettings["delivery"];
    if (body.assistant) patch.assistant = body.assistant as StoreSettings["assistant"];
    if (body.otp) {
      patch.otp = {
        ttlMinutes: Math.max(1, Number(body.otp.ttlMinutes) || 2),
        resendSeconds: Math.max(10, Number(body.otp.resendSeconds) || 60),
        windowHours: Math.max(1, Number(body.otp.windowHours) || 1),
        maxSends: Math.max(1, Number(body.otp.maxSends) || 5),
        maxAttempts: Math.max(1, Number(body.otp.maxAttempts) || 5),
      };
    }
    if (body.features) patch.features = body.features as StoreSettings["features"];
    if (body.payments) patch.payments = body.payments as StoreSettings["payments"];
    if (body.blockedPhones) {
      patch.blockedPhones = body.blockedPhones.map((p) => normalizePhone(p)).filter((p): p is string => !!p);
    }

    const settings = await patchStoreSettings(patch);
    return NextResponse.json({ settings });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
