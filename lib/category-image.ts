/* ---------------------------------------------------------
   پرودید — عکس دسته‌بندی
   عکس دسته یا از پنل مدیریت آپلود می‌شود (همان مسیر ذخیره‌سازی
   عکس محصول) یا اگر چیزی ذخیره نشده باشد، از فایل قراردادی
   /assets/img/categories/{id}.jpg خوانده می‌شود. دسته‌هایی که از
   پنل ساخته می‌شوند شناسهٔ دلخواه دارند و فایل قراردادی ندارند،
   پس عکس آپلودی تنها راه مطمئن است.
   --------------------------------------------------------- */

const UPLOAD_PREFIX = "/uploads/products/";
const MEDIA_PREFIX = "/api/media/products/";
const STATIC_CATEGORY_PREFIX = "/assets/img/categories/";

export function categoryFallbackSrc(id: string): string {
  return `${STATIC_CATEGORY_PREFIX}${id}.jpg`;
}

/** آدرس قابل نمایش عکس دسته؛ همیشه یک رشته برمی‌گرداند */
export function categoryImageSrc(c: { id: string; image?: string | null }): string {
  const img = (c.image || "").trim();
  if (!img) return categoryFallbackSrc(c.id);
  if (img.startsWith(UPLOAD_PREFIX)) return MEDIA_PREFIX + img.slice(UPLOAD_PREFIX.length);
  return img;
}

export function hasStoredCategoryImage(c: { image?: string | null }): boolean {
  return !!(c.image || "").trim();
}

/** اعتبارسنجی آدرسی که از پنل مدیریت می‌آید */
export function sanitizeCategoryImageUrl(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.includes("..") || s.includes("\\") || s.includes("\0")) {
    throw new Error("آدرس عکس نامعتبر است");
  }
  if (s.startsWith(MEDIA_PREFIX) || s.startsWith(UPLOAD_PREFIX) || s.startsWith(STATIC_CATEGORY_PREFIX)) {
    return s.slice(0, 220);
  }
  throw new Error("آدرس عکس نامعتبر است");
}
