import type { Product } from "./data";

export const faNum = new Intl.NumberFormat("fa-IR");
export const fmtPrice = (n: number) => faNum.format(n);
export const toFa = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/* تبدیل ارقام فارسی/عربی به انگلیسی و استخراج عدد صحیح */
export function parseIntFa(s: string | number): number {
  const norm = String(s)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\d]/g, "");
  const n = parseInt(norm, 10);
  return Number.isFinite(n) ? n : 0;
}

/* واحد نمایش تعداد */
export function qtyLabel(p: Product, qty: number): string {
  if (p.sale !== "w") return `${faNum.format(qty)} بسته`;
  const g = Math.round(qty * 1000);
  return g >= 1000 ? `${faNum.format(g / 1000)} کیلوگرم` : `${faNum.format(g)} گرم`;
}

export function unitLabel(p: Product): string {
  if (p.price === null) return "";
  return p.sale === "w" ? "تومان / هر کیلو" : "تومان";
}
