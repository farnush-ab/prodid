import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { invalidateStoreCache, toProduct } from "@/lib/catalog-server";
import { slugifyId } from "@/lib/admin-format";
import { sanitizeProductImageUrl } from "@/lib/product-image";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import type { SaleType } from "@/lib/data";

export const runtime = "nodejs";

function parseProduct(body: Record<string, unknown>, isNew: boolean) {
  const name = String(body.name || "").trim().slice(0, 80);
  const cat = String(body.cat || "").trim();
  const sale = body.sale === "u" ? "u" : "w";
  const ic = String(body.ic || "box").trim() || "box";
  const desc = String(body.desc || "").trim().slice(0, 800);
  const badge = String(body.badge || "").trim().slice(0, 24);
  const image = sanitizeProductImageUrl(body.image);
  const available = body.available !== false;
  let price: number | null = null;
  if (body.price !== null && body.price !== undefined && body.price !== "") {
    const n = Number(body.price);
    if (!Number.isFinite(n) || n < 0) throw new Error("قیمت نامعتبر است");
    price = Math.round(n);
  }
  if (!name) throw new Error("نام محصول لازم است");
  if (!cat) throw new Error("دسته‌بندی لازم است");
  const id = isNew
    ? String(body.id || "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 48) || slugifyId(name, "p")
    : String(body.id || "");
  if (!/^[a-zA-Z0-9\u0600-\u06FF_-]+$/.test(id)) throw new Error("شناسه محصول نامعتبر است");
  return { id, name, cat, sale: sale as SaleType, ic, image, desc, badge, available, price };
}

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    requireCan(user, "products");
    const body = await req.json();
    const data = parseProduct(body, true);
    const cat = await Category.findOne({ id: data.cat });
    if (!cat) return NextResponse.json({ error: "دسته‌بندی پیدا نشد" }, { status: 400 });
    if (await Product.findOne({ id: data.id })) {
      return NextResponse.json({ error: "شناسه محصول تکراری است" }, { status: 400 });
    }
    const sort = (await Product.countDocuments()) + 1;
    const doc = await Product.create({ ...data, sort });
    if (data.image) {
      await Product.collection.updateOne({ _id: doc._id }, { $set: { image: data.image } });
    }
    const fresh = await Product.collection.findOne({ _id: doc._id });
    invalidateStoreCache();
    return NextResponse.json({
      product: { ...toProduct((fresh || doc) as Parameters<typeof toProduct>[0]), sold: 0 },
    });
  } catch (err) {
    if (err instanceof Error && err.message && !(err as { status?: number }).status) {
      if (
        err.message.includes("نام") ||
        err.message.includes("شناسه") ||
        err.message.includes("قیمت") ||
        err.message.includes("دسته") ||
        err.message.includes("عکس")
      ) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }
    return adminErrorResponse(err);
  }
}
