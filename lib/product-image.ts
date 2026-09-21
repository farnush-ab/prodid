export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

const UPLOAD_PREFIX = "/uploads/products/";
const MEDIA_PREFIX = "/api/media/products/";

export function productImageSrc(p: { id: string; image?: string | null }): string {
  const img = (p.image || "").trim();
  if (!img) return `/assets/img/products/${p.id}.jpg`;
  if (img.startsWith(UPLOAD_PREFIX)) return MEDIA_PREFIX + img.slice(UPLOAD_PREFIX.length);
  return img;
}

export function hasStoredProductImage(p: { image?: string | null }): boolean {
  return !!(p.image || "").trim();
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
