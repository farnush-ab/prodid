/* عکس مواد و سالادهای آماده — همان خط لوله‌ی عکس محصول:
   فایل در uploads/products/ ذخیره و از /api/media/products/ سرو می‌شود. */

const UPLOAD_PREFIX = "/uploads/products/";
const MEDIA_PREFIX = "/api/media/products/";

/** آدرس قابل نمایش؛ رشتهٔ خالی یعنی عکسی نیست و باید طرح برداری رسم شود */
export function saladImageSrc(image?: string | null): string {
  const img = (image || "").trim();
  if (!img) return "";
  if (img.startsWith(UPLOAD_PREFIX)) return MEDIA_PREFIX + img.slice(UPLOAD_PREFIX.length);
  return img;
}

/** اعتبارسنجی آدرسی که از پنل مدیریت می‌آید */
export function sanitizeSaladImageUrl(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.includes("..") || s.includes("\\") || s.includes("\0")) {
    throw new Error("آدرس عکس نامعتبر است");
  }
  if (s.startsWith(MEDIA_PREFIX) || s.startsWith(UPLOAD_PREFIX)) return s.slice(0, 220);
  throw new Error("آدرس عکس نامعتبر است");
}
