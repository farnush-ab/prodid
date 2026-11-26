/* ---------------------------------------------------------
   گونه‌های محصول (محصول متغیر)

   یک محصول می‌تواند چند «گونه» داشته باشد — مثلا سبزیجات یخ‌زده در ظرف
   ۴۰۰ گرمی و ۵۰۰ گرمی — که هرکدام قیمت و موجودی خودش را دارد، بدون اینکه
   برای هر اندازه محصول جدا تعریف شود.

   در سبد و سفارش، هر گونه یک «ردیف» جداست با کلید `<شناسه محصول>~<شناسه گونه>`.
   lineProduct() از محصول و گونه یک Product مشتق می‌سازد که id آن همان کلید،
   نامش «نام — گونه» و قیمت و موجودی‌اش مال گونه است؛ برای همین بقیهٔ کد سبد،
   تسویه و صفحه محصول بدون تغییر با آن کار می‌کند.

   برای محصول وزنی (sale: "w") قیمت گونه هم «هر کیلو» است.
   --------------------------------------------------------- */

import type { Product } from "@/lib/data";

export interface ProductVariant {
  id: string;
  /** مثلا «ظرف ۴۰۰ گرمی» */
  label: string;
  /** null = استعلامی */
  price: number | null;
  available: boolean;
}

export const VARIANT_SEP = "~";
export const MAX_VARIANTS = 12;

export function variantKey(productId: string, variantId: string) {
  return `${productId}${VARIANT_SEP}${variantId}`;
}

export function splitKey(key: string): { productId: string; variantId: string | null } {
  const i = key.indexOf(VARIANT_SEP);
  if (i < 0) return { productId: key, variantId: null };
  return { productId: key.slice(0, i), variantId: key.slice(i + 1) || null };
}

export function hasVariants(p: Pick<Product, "variants"> | null | undefined): boolean {
  return !!p?.variants && p.variants.length > 0;
}

/** ردیف سبد/سفارش برای یک گونه */
export function lineProduct(p: Product, v: ProductVariant): Product {
  return {
    ...p,
    id: variantKey(p.id, v.id),
    name: `${p.name} — ${v.label}`,
    price: v.price,
    available: p.available && v.available,
    variants: undefined,
    baseId: p.id,
    variantLabel: v.label,
  };
}

/** کلید سبد (ساده یا با گونه) → محصول یا ردیف گونه */
export function resolveLine(products: Product[], key: string): Product | undefined {
  const { productId, variantId } = splitKey(key);
  const p = products.find((x) => x.id === productId);
  if (!p) return undefined;
  if (!variantId) return hasVariants(p) ? undefined : p;
  const v = p.variants?.find((x) => x.id === variantId);
  return v ? lineProduct(p, v) : undefined;
}

/** اولین گونهٔ قابل خرید (برای انتخاب پیش‌فرض) */
export function defaultVariant(p: Product): ProductVariant | undefined {
  return p.variants?.find((v) => v.available && v.price !== null) || p.variants?.find((v) => v.available) || p.variants?.[0];
}

/**
 * نمای ویترین: محصول گونه‌دار وقتی موجود است که خودش روشن باشد و دست‌کم
 * یک گونه‌اش موجود باشد؛ قیمت نمایشی کمترین قیمت گونه‌های موجود است («از …»).
 */
export function storefrontProduct(p: Product): Product {
  if (!hasVariants(p)) return p;
  const live = p.variants!.filter((v) => v.available);
  const priced = (live.length ? live : p.variants!).map((v) => v.price).filter((n): n is number => n !== null);
  return {
    ...p,
    available: p.available && live.length > 0,
    price: priced.length ? Math.min(...priced) : null,
  };
}

function slug(s: string, i: number) {
  const base = s
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .slice(0, 24);
  return base || `v${i + 1}`;
}

export class VariantError extends Error {
  status = 400;
}

/** قیمت ذخیره‌شدهٔ محصول گونه‌دار = کمترین قیمت گونه‌ها (برای فهرست‌ها و مرتب‌سازی) */
export function priceFromVariants(variants: ProductVariant[], fallback: number | null): number | null {
  if (!variants.length) return fallback;
  const priced = variants.map((v) => v.price).filter((n): n is number => n !== null);
  return priced.length ? Math.min(...priced) : null;
}

/** پاک‌سازی ورودی پنل؛ گونهٔ بی‌عنوان حذف می‌شود و شناسه‌ها یکتا می‌شوند */
export function sanitizeVariants(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductVariant[] = [];
  const ids = new Set<string>();
  raw.slice(0, MAX_VARIANTS).forEach((r, i) => {
    const row = (r || {}) as Record<string, unknown>;
    const label = String(row.label || "").trim().slice(0, 40);
    if (!label) return;
    let id = String(row.id || "").trim().replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 24) || slug(label, i);
    while (ids.has(id)) id = `${id}-${i + 1}`;
    ids.add(id);
    let price: number | null = null;
    if (row.price !== null && row.price !== undefined && String(row.price).trim() !== "") {
      // رقم فارسی/عربی → انگلیسی، جداکننده‌های هزارگان حذف؛ هر چیز دیگری (منفی، حروف) خطاست
      const txt = String(row.price)
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[\s,٬،]/g, "");
      const n = /^\d+(\.\d+)?$/.test(txt) ? Number(txt) : NaN;
      if (!Number.isFinite(n)) throw new VariantError(`قیمت گونهٔ «${label}» نامعتبر است`);
      price = Math.round(n);
    }
    out.push({ id, label, price, available: row.available !== false });
  });
  return out;
}
