/* ---------------------------------------------------------
   سفارش سالاد بار — تایپ‌های مشترک بین مرورگر و سرور.
   سالادها در همان مجموعهٔ Order ذخیره می‌شوند (kind: "salad") تا شماره
   سفارش، گردش وضعیت، پیامک و ابزارهای پنل مدیریت دوباره نوشته نشوند.
   --------------------------------------------------------- */

import type { OrderStatus } from "@/lib/order";
import type { SaladWay } from "@/lib/salad";

/** یک مادهٔ داخل سالاد، با نامی که همان لحظهٔ سفارش ثبت شده است؛
    اگر بعدا قیمت یا نام ماده عوض شود، سفارش قدیمی دست‌نخورده می‌ماند. */
export interface SaladOrderIngredient {
  id: string;
  name: string;
  /** تعداد واحد انتخاب‌شده (هر واحد = g گرم) */
  units: number;
  /** گرم واقعی، برای آشپزخانه */
  grams: number;
  /** برای موادی که عددی‌اند (مثل تخم‌مرغ) به‌جای گرم این برچسب را نشان بده */
  unitLabel?: string;
}

export interface SaladOrderLine {
  name: string;
  size: string;
  sizeName: string;
  items: SaladOrderIngredient[];
  sauces: { id: string; name: string }[];
  /** سس جدا سرو شود */
  sauceSide: boolean;
  weight: number;
  kcal: number;
  pro: number;
  price: number;
}

export interface PublicSaladOrder {
  id: string;
  orderNo: string;
  customer: { name: string; phone: string; address: string };
  salads: SaladOrderLine[];
  way: SaladWay;
  /** شناسهٔ بازهٔ انتخاب‌شده */
  slot: string;
  /** برچسب خواندنی همان بازه، چون فهرست بازه‌ها ممکن است بعدا عوض شود */
  slotLabel: string;
  note: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  viewToken?: string;
}

export const SALAD_WAY_LABEL: Record<SaladWay, string> = {
  pickup: "تحویل حضوری در شعبه",
  delivery: "ارسال به آدرس",
};

/** مجموع گرم هر ماده در کل سفارش — چیزی که آشپزخانه و انبار لازم دارند */
export function saladIngredientTotals(orders: PublicSaladOrder[]) {
  const map = new Map<string, { id: string; name: string; grams: number; units: number; orders: number }>();
  for (const o of orders) {
    const seen = new Set<string>();
    for (const line of o.salads) {
      for (const ing of line.items) {
        const cur = map.get(ing.id) || { id: ing.id, name: ing.name, grams: 0, units: 0, orders: 0 };
        cur.grams += ing.grams;
        cur.units += ing.units;
        if (!seen.has(ing.id)) {
          cur.orders += 1;
          seen.add(ing.id);
        }
        map.set(ing.id, cur);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.grams - a.grams);
}

/** شمارش سس‌ها در کل سفارش‌ها */
export function saladSauceTotals(orders: PublicSaladOrder[]) {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const o of orders) {
    for (const line of o.salads) {
      for (const s of line.sauces) {
        const cur = map.get(s.id) || { id: s.id, name: s.name, count: 0 };
        cur.count += 1;
        map.set(s.id, cur);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
