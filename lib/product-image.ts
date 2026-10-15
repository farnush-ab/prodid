export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGES_MAX = 8;

const UPLOAD_PREFIX = "/uploads/products/";
const MEDIA_PREFIX = "/api/media/products/";

type ImageFields = { id: string; image?: string | null; images?: string[] | null };

function resolveUrl(raw: string, productId: string): string {
  const img = raw.trim();
  if (!img) return `/assets/img/products/${productId}.jpg`;
  if (img.startsWith(UPLOAD_PREFIX)) return MEDIA_PREFIX + img.slice(UPLOAD_PREFIX.length);
  return img;
}

/** لیست ذخیره‌شده (بدون fallback دارایی استاتیک) */
export function storedProductImages(p: ImageFields): string[] {
  const fromArr = (p.images || []).map((s) => String(s || "").trim()).filter(Boolean);
  if (fromArr.length) return fromArr.slice(0, PRODUCT_IMAGES_MAX);
  const single = (p.image || "").trim();
  return single ? [single] : [];
}

/** آدرس‌های قابل نمایش در فروشگاه؛ اگر هیچ عکسی نباشد یک fallback بر اساس id */
export function productImagesSrc(p: ImageFields): string[] {
  const stored = storedProductImages(p);
  if (!stored.length) return [resolveUrl("", p.id)];
  return stored.map((u) => resolveUrl(u, p.id));
}

export function productImageSrc(p: ImageFields): string {
  return productImagesSrc(p)[0];
}

export function hasStoredProductImage(p: ImageFields): boolean {
  return storedProductImages(p).length > 0;
}

export function sanitizeProductImageUrl(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.includes("..") || s.includes("\\") || s.includes("\0")) {
    throw new Error("آدرس عکس نامعتبر است");
  }
  if (s.startsWith(MEDIA_PREFIX) || s.startsWith(UPLOAD_PREFIX) || s.startsWith("/assets/img/products/")) {
    return s.slice(0, 220);
  }
  throw new Error("آدرس عکس نامعتبر است");
}

/** نرمال‌سازی لیست عکس + کاور برای ذخیره در DB */
export function normalizeProductImageFields(input: {
  image?: unknown;
  images?: unknown;
}): { image: string; images: string[] } {
  const list: string[] = [];
  if (Array.isArray(input.images)) {
    for (const item of input.images) {
      const u = sanitizeProductImageUrl(item);
      if (u && !list.includes(u)) list.push(u);
      if (list.length >= PRODUCT_IMAGES_MAX) break;
    }
  }
  if (!list.length && typeof input.image === "string") {
    const u = sanitizeProductImageUrl(input.image);
    if (u) list.push(u);
  }
  return { images: list, image: list[0] || "" };
}
