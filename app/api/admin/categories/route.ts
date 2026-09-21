import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { invalidateStoreCache } from "@/lib/catalog-server";
import { slugifyId } from "@/lib/admin-format";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    requireCan(user, "categories");
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 60);
    if (!name) return NextResponse.json({ error: "نام دسته لازم است" }, { status: 400 });
    const ic = String(body.ic || "box").trim() || "box";
    const soon = !!body.soon;
    const id =
      String(body.id || "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 40) || slugifyId(name, "cat");
    if (await Category.findOne({ id })) {
      return NextResponse.json({ error: "شناسه دسته تکراری است" }, { status: 400 });
    }
    const sort = (await Category.countDocuments()) + 1;
    const doc = await Category.create({ id, name, ic, soon, sort });
    invalidateStoreCache();
    return NextResponse.json({ category: { id: doc.id, name: doc.name, ic: doc.ic, soon: doc.soon } });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireStaff();
    requireCan(user, "categories");
    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) return NextResponse.json({ error: "ترتیب نامعتبر است" }, { status: 400 });
    await Promise.all(ids.map((id, i) => Category.updateOne({ id }, { $set: { sort: i } })));
    invalidateStoreCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
