import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { invalidateStoreCache, toProduct } from "@/lib/catalog-server";
import { normalizeProductImageFields, storedProductImages } from "@/lib/product-image";
import { deleteStoredProductImage } from "@/lib/product-image-server";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import type { SaleType } from "@/lib/data";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "products");
    const body = (await req.json()) as Record<string, unknown>;
    const doc = await Product.findOne({ id: params.id });
    if (!doc) return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    const raw = (await Product.collection.findOne({ _id: doc._id })) as {
      image?: string;
      images?: string[];
    } | null;
    const prevImages = storedProductImages({
      id: params.id,
      image: raw?.image,
      images: raw?.images,
    });

    if (typeof body.name === "string") doc.name = body.name.trim().slice(0, 80) || doc.name;
    if (typeof body.cat === "string") {
      const cat = await Category.findOne({ id: body.cat });
      if (!cat) return NextResponse.json({ error: "دسته‌بندی پیدا نشد" }, { status: 400 });
      doc.cat = body.cat;
    }
    if (body.sale === "w" || body.sale === "u") doc.sale = body.sale as SaleType;
    if (typeof body.ic === "string") doc.ic = body.ic.trim() || doc.ic;
    if (typeof body.desc === "string") doc.desc = body.desc.trim().slice(0, 800);
    if (typeof body.badge === "string") doc.badge = body.badge.trim().slice(0, 24);
    if (typeof body.available === "boolean") doc.available = body.available;
    let nextImages: string[] | undefined;
    if (Array.isArray(body.images) || typeof body.image === "string") {
      nextImages = normalizeProductImageFields(body).images;
    }
    if (body.price === null || body.price === "") doc.price = null;
    else if (body.price !== undefined) {
      const n = Number(body.price);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
      doc.price = Math.round(n);
    }
    await doc.save();
    if (nextImages !== undefined) {
      const removed = prevImages.filter((u) => !nextImages!.includes(u));
      await Promise.all(removed.map((u) => deleteStoredProductImage(u)));
      await Product.collection.updateOne(
        { _id: doc._id },
        { $set: { images: nextImages, image: nextImages[0] || "" } }
      );
    }
    const fresh = await Product.collection.findOne({ _id: doc._id });
    invalidateStoreCache();
    return NextResponse.json({ product: toProduct((fresh || doc) as Parameters<typeof toProduct>[0]) });
  } catch (err) {
    if (err instanceof Error && err.message.includes("عکس")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireStaff();
    requireCan(user, "products");
    const doc = await Product.findOneAndDelete({ id: params.id });
    if (!doc) return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    const images = storedProductImages({
      id: params.id,
      image: doc.image,
      images: (doc as { images?: string[] }).images,
    });
    await Promise.all(images.map((u) => deleteStoredProductImage(u)));
    invalidateStoreCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
