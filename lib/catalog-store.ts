"use client";

import { useSyncExternalStore } from "react";
import { BRAND, CATEGORIES, PRODUCTS, type Category, type Product } from "@/lib/data";
import { GREET_MSG, INTRO_MSG, PEEK_MSG, RECIPES, type RecipeTip } from "@/lib/assistant-content";
import { DELIVERY_DAYS, DELIVERY_SLOTS } from "@/lib/order";
import type { BrandInfo, DeliveryToggle, DeliveryZone, StoreFeatures } from "@/lib/store-settings";

export interface PublicCatalog {
  products: Product[];
  categories: Category[];
  brand: BrandInfo;
  features: StoreFeatures;
  delivery: {
    days: DeliveryToggle[];
    slots: DeliveryToggle[];
    zones: DeliveryZone[];
  };
  assistant: {
    intro: string;
    greet: string;
    peek: string;
    defaultOn: boolean;
    recipes: RecipeTip[];
  };
}

export const DEFAULT_CATALOG: PublicCatalog = {
  products: PRODUCTS,
  categories: CATEGORIES,
  brand: { ...BRAND },
  features: {
    maintenance: false,
    vpnNotice: true,
    assistantWidget: true,
    onlinePay: false,
  },
  delivery: {
    days: DELIVERY_DAYS.map((d) => ({ id: d.id, label: d.label, enabled: true })),
    slots: DELIVERY_SLOTS.map((s) => ({ id: s.id, label: s.label, enabled: true })),
    zones: [
      { name: "داخل محدوده کاشان", fee: 25000 },
      { name: "حومه و شهرک‌های اطراف", fee: 45000 },
    ],
  },
  assistant: {
    intro: INTRO_MSG,
    greet: GREET_MSG,
    peek: PEEK_MSG,
    defaultOn: true,
    recipes: RECIPES,
  },
};

let snapshot: PublicCatalog = DEFAULT_CATALOG;
const listeners = new Set<() => void>();

export function getCatalogSnapshot(): PublicCatalog {
  return snapshot;
}

export function setCatalogSnapshot(next: PublicCatalog) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function subscribeCatalog(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLiveProduct(id: string | null | undefined): Product | undefined {
  if (!id) return undefined;
  return snapshot.products.find((p) => p.id === id);
}

export function getLiveCategory(id: string | null | undefined): Category | undefined {
  if (!id) return undefined;
  return snapshot.categories.find((c) => c.id === id);
}

export function useCatalog(): PublicCatalog {
  return useSyncExternalStore(subscribeCatalog, getCatalogSnapshot, () => DEFAULT_CATALOG);
}
