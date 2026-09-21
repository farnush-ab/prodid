"use client";

/* =========================================================
   پرودید — سبد خرید
   در localStorage نگهداری می‌شود؛ برای همگام‌سازی زنده بین
   تمام کامپوننت‌ها (نشان سبد در هدر، استپر کارت محصول و ...)
   از الگوی external store + useSyncExternalStore استفاده می‌شود.

   نکته مهم Hydration: مقدار سبد فقط باید از طریق useCart() (که
   useSyncExternalStore است) در حین رندر خوانده شود، نه مستقیم از
   Cart.count()/items()/... — چون آن‌ها روی localStorage واقعی
   کار می‌کنند و بین سرور (همیشه خالی) و کلاینت متفاوت خواهند بود.
   ========================================================= */

import { useSyncExternalStore } from "react";
import type { Product } from "./data";
import { getLiveProduct } from "./catalog-store";

const CART_KEY = "prodid_cart";
export const MIN_WEIGHT = 0.1; // حداقل وزن سفارش: ۱۰۰ گرم

export type CartMap = Record<string, number>;
const EMPTY: CartMap = {};

let cache: CartMap | null = null;
const listeners = new Set<() => void>();

function readRaw(): CartMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function getSnapshot(): CartMap {
  if (cache === null) cache = readRaw();
  return cache;
}

function getServerSnapshot(): CartMap {
  return EMPTY;
}

function writeRaw(c: CartMap) {
  cache = c;
  if (typeof window !== "undefined") {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function step(p: Product) {
  return p.sale === "w" ? 0.1 : 1; // گام دکمه‌های +/− : ۱۰۰ گرم
}
export function defaultAdd(p: Product) {
  return p.sale === "w" ? 0.5 : 1; // مقدار پیش‌فرض افزودن اولیه: ۵۰۰ گرم
}

/** هوک ری‌اکتی؛ در حین رندر همیشه از این استفاده شود (سازگار با hydration) */
export function useCart(): CartMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function cartQty(cart: CartMap, id: string) {
  return cart[id] || 0;
}
export function cartCount(cart: CartMap) {
  return Object.keys(cart).length;
}
export function cartItems(cart: CartMap) {
  return Object.entries(cart)
    .map(([id, qty]) => ({ p: getLiveProduct(id), qty }))
    .filter((it): it is { p: Product; qty: number } => !!it.p);
}
export function cartTotal(cart: CartMap) {
  return cartItems(cart).reduce((sum, { p, qty }) => sum + (p.price || 0) * qty, 0);
}
export function cartHasWeightItems(cart: CartMap) {
  return cartItems(cart).some(({ p }) => p.sale === "w");
}

/** جهش‌ها (mutations) — فقط از هندلرهای رویداد صدا زده می‌شوند، نه در حین رندر */
export const Cart = {
  add(id: string, amount?: number) {
    const p = getLiveProduct(id);
    if (!p || !p.available || p.price === null) return;
    const c = { ...getSnapshot() };
    const next = Math.round(((c[id] || 0) + (amount ?? defaultAdd(p))) * 1000) / 1000;
    if (next <= 0) delete c[id];
    else c[id] = next;
    writeRaw(c);
  },
  set(id: string, qty: number) {
    const c = { ...getSnapshot() };
    if (qty <= 0) delete c[id];
    else c[id] = Math.round(qty * 1000) / 1000;
    writeRaw(c);
  },
  /* تعیین وزن دقیق بر حسب گرم (با اعمال حداقل ۱۰۰ گرم) */
  setGrams(id: string, grams: number) {
    const kg = Math.max(MIN_WEIGHT, grams / 1000);
    this.set(id, Math.round(kg * 1000) / 1000);
  },
  remove(id: string) {
    this.set(id, 0);
  },
  clear() {
    writeRaw({});
  },
  /** خواندن مقدار فعلی خارج از رندر (مثلا هنگام ثبت سفارش) */
  snapshot: getSnapshot,
};
