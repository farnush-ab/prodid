import { dbConnect } from "@/lib/mongodb";
import { CATEGORIES, PRODUCTS, type Category, type Product } from "@/lib/data";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/store-settings";
import { ensureSeeded } from "@/lib/seed";
import { Category as CategoryModel } from "@/models/Category";
import { Product as ProductModel } from "@/models/Product";
import { Settings } from "@/models/Settings";

let settingsCache: { value: StoreSettings; at: number } | null = null;
let catalogCache: { products: Product[]; categories: Category[]; at: number } | null = null;
const CACHE_MS = 3000;

export function invalidateStoreCache() {
  settingsCache = null;
  catalogCache = null;
}

export function toProduct(doc: {
  id: string;
  name: string;
  cat: string;
  price: number | null;
  sale: "w" | "u";
  ic: string;
  image?: string | null;
  desc: string;
  badge: string;
  available: boolean;
}): Product {
  return {
    id: doc.id,
    name: doc.name,
    cat: doc.cat,
    price: doc.price,
    sale: doc.sale,
    ic: doc.ic,
    image: (doc.image || "").trim(),
    desc: doc.desc,
    badge: doc.badge,
    available: doc.available,
  };
}

function toCategory(doc: { id: string; name: string; ic: string; soon: boolean }): Category {
  return { id: doc.id, name: doc.name, ic: doc.ic, soon: doc.soon };
}

function omitUndef<T extends object>(obj?: T | null): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function mergeSettings(raw: Partial<StoreSettings> | null | undefined): StoreSettings {
  const src = raw || {};
  return {
    brand: { ...DEFAULT_SETTINGS.brand, ...(src.brand || {}) },
    delivery: {
      days: src.delivery?.days?.length ? src.delivery.days : DEFAULT_SETTINGS.delivery.days,
      slots: src.delivery?.slots?.length ? src.delivery.slots : DEFAULT_SETTINGS.delivery.slots,
      zones: src.delivery?.zones ? src.delivery.zones : DEFAULT_SETTINGS.delivery.zones,
    },
    assistant: {
      ...DEFAULT_SETTINGS.assistant,
      ...(src.assistant || {}),
      recipes: src.assistant?.recipes || DEFAULT_SETTINGS.assistant.recipes,
    },
    otp: { ...DEFAULT_SETTINGS.otp, ...(src.otp || {}) },
    features: { ...DEFAULT_SETTINGS.features, ...(src.features || {}) },
    payments: { ...DEFAULT_SETTINGS.payments, ...(src.payments || {}) },
    blockedPhones: src.blockedPhones || [],
  };
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (settingsCache && Date.now() - settingsCache.at < CACHE_MS) return settingsCache.value;
  await dbConnect();
  await ensureSeeded();
  const doc = await Settings.findOne({ key: "store" }).lean();
  const value = mergeSettings(doc as Partial<StoreSettings> | null);
  settingsCache = { value, at: Date.now() };
  return value;
}

export async function getLiveCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_MS) return catalogCache;
  await dbConnect();
  await ensureSeeded();
  const [products, categories] = await Promise.all([
    ProductModel.collection.find({}).sort({ sort: 1, createdAt: 1 }).toArray(),
    CategoryModel.find().sort({ sort: 1, createdAt: 1 }).lean(),
  ]);
  const value = {
    products: products.length ? products.map((p) => toProduct(p as unknown as Parameters<typeof toProduct>[0])) : PRODUCTS,
    categories: categories.length ? categories.map(toCategory) : CATEGORIES,
  };
  catalogCache = { ...value, at: Date.now() };
  return value;
}

export async function getLiveProduct(id: string): Promise<Product | undefined> {
  const { products } = await getLiveCatalog();
  return products.find((p) => p.id === id);
}

export async function patchStoreSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  await dbConnect();
  await ensureSeeded();
  const current = await getStoreSettings();
  const next: StoreSettings = {
    brand: { ...current.brand, ...omitUndef(patch.brand) },
    delivery: {
      days: patch.delivery?.days ?? current.delivery.days,
      slots: patch.delivery?.slots ?? current.delivery.slots,
      zones: patch.delivery?.zones ?? current.delivery.zones,
    },
    features: { ...current.features, ...omitUndef(patch.features) },
    payments: { ...current.payments, ...omitUndef(patch.payments) },
    otp: { ...current.otp, ...omitUndef(patch.otp) },
    assistant: {
      ...current.assistant,
      ...omitUndef(patch.assistant),
      recipes: patch.assistant?.recipes ?? current.assistant.recipes,
    },
    blockedPhones: patch.blockedPhones ?? current.blockedPhones,
  };
  await Settings.findOneAndUpdate({ key: "store" }, { $set: { ...next, key: "store" } }, { upsert: true });
  invalidateStoreCache();
  return next;
}
