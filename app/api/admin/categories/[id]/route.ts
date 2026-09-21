import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { invalidateStoreCache } from "@/lib/catalog-server";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "categories");
    const body = (await req.json()) as Record<string, unknown>;
    const doc = await Category.findOne({ id: params.id });
    if (!doc) return NextResponse.json({ error: "دسته‌بندی پیدا نشد" }, { status: 404 });
    if (typeof body.name === "string") doc.name = body.name.trim().slice(0, 60) || doc.name;
    if (typeof body.ic === "string") doc.ic = body.ic.trim() || doc.ic;
    if (typeof body.soon === "boolean") doc.soon = body.soon;
    await doc.save();
    invalidateStoreCache();
    return NextResponse.json({ category: { id: doc.id, name: doc.name, ic: doc.ic, soon: doc.soon } });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "categories");
    const used = await Product.countDocuments({ cat: params.id });
    if (used > 0) {
      return NextResponse.json({ error: "ابتدا محصولات این دسته را منتقل یا حذف کنید" }, { status: 400 });
    }
    const doc = await Category.findOneAndDelete({ id: params.id });
    if (!doc) return NextResponse.json({ error: "دسته‌بندی پیدا نشد" }, { status: 404 });
    invalidateStoreCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
