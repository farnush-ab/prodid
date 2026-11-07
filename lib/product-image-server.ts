import { access, mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_MIMES } from "@/lib/product-image";

const DIRS = [
  path.join(process.cwd(), "uploads", "products"),
  path.join(process.cwd(), "public", "uploads", "products"),
];
const WRITE_DIR = DIRS[0];
const FILE_RE = /^[0-9]+-[a-f0-9]+\.(jpg|png|webp)$/i;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isUploadedProductImage(url: string | null | undefined): boolean {
  const s = (url || "").trim();
  return (s.startsWith("/uploads/products/") || s.startsWith("/api/media/products/")) && !s.includes("..");
}

export function productImageFilename(url: string | null | undefined): string | null {
  const s = (url || "").trim();
  if (!isUploadedProductImage(s)) return null;
  const base = path.basename(s);
  return FILE_RE.test(base) ? base : null;
}

export async function resolveProductImageFile(filename: string): Promise<string | null> {
  if (!FILE_RE.test(filename)) return null;
  for (const dir of DIRS) {
    const full = path.join(dir, filename);
    try {
      await access(full);
      return full;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function saveProductImageFile(file: File): Promise<string> {
  if (!PRODUCT_IMAGE_MIMES.includes(file.type as (typeof PRODUCT_IMAGE_MIMES)[number])) {
    throw new Error("فقط فایل JPEG، PNG یا WebP مجاز است");
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("حجم عکس حداکثر ۲ مگابایت است");
  }
  if (file.size < 24) {
    throw new Error("فایل عکس نامعتبر است");
  }
  const ext = EXT[file.type];
  await mkdir(WRITE_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(WRITE_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/api/media/products/${name}`;
}

export async function deleteStoredProductImage(url: string | null | undefined) {
  const base = productImageFilename(url);
  if (!base) return;
  for (const dir of DIRS) {
    try {
      await unlink(path.join(dir, base));
    } catch {
      /* already gone */
    }
  }
}
