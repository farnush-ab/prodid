/* ---------------------------------------------------------
   کاتالوگ سالاد بار از دیتابیس (فقط سرور).
   الگویش همان lib/catalog-server.ts است: اولین بار از lib/salad.ts
   seed می‌شود، بعد از آن دیتابیس منبع حقیقت است و پنل مدیریت همان را
   ویرایش می‌کند. خواندن کش کوتاه دارد؛ بعد از هر تغییر
   invalidateSaladCache() صدا زده می‌شود.
   --------------------------------------------------------- */

import { dbConnect } from "@/lib/mongodb";
import {
  SALAD_CATS,
  SALAD_INGREDIENTS,
  SALAD_PRESETS,
  SALAD_SAUCES,
  SALAD_SIZES,
  type SaladCatalog,
  type SaladIngredient,
  type SaladPreset,
  type SaladSauce,
  type SaladShape,
  type SaladTag,
  type SaladVariant,
} from "@/lib/salad";
import {
  SaladCategory,
  SaladIngredientModel,
  SaladPresetModel,
  SaladSauceModel,
  type SaladIngredientDoc,
  type SaladPresetDoc,
  type SaladSauceDoc,
} from "@/models/SaladCatalog";

const CACHE_MS = 3000;
let cache: { value: SaladCatalog; at: number } | null = null;

export function invalidateSaladCache() {
  cache = null;
}

let seeding: Promise<void> | null = null;

/** شناسه‌ی یکتا از روی نام فارسی — مثل دسته‌های محصول */
export function saladSlug(name: string, fallback: string): string {
  const base = String(name || "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .slice(0, 48);
  return base || fallback;
}

async function seedOnce() {
  await dbConnect();
  if ((await SaladCategory.countDocuments()) === 0) {
    await SaladCategory.insertMany(SALAD_CATS.map((c, i) => ({ id: c.id, name: c.name, sort: i })));
  }
  if ((await SaladIngredientModel.countDocuments()) === 0) {
    await SaladIngredientModel.insertMany(
      SALAD_INGREDIENTS.map((x, i) => ({
        ...x,
        v: x.v ?? null,
        ulabel: x.ulabel || "",
        image: "",
        available: true,
        sort: i,
      }))
    );
  }
  if ((await SaladSauceModel.countDocuments()) === 0) {
    await SaladSauceModel.insertMany(SALAD_SAUCES.map((x, i) => ({ ...x, available: true, sort: i })));
  }
  if ((await SaladPresetModel.countDocuments()) === 0) {
    await SaladPresetModel.insertMany(
      SALAD_PRESETS.map((p, i) => ({
        id: p.id || saladSlug(p.n, `preset-${i + 1}`),
        n: p.n,
        d: p.d,
        size: p.size,
        items: p.items,
        sauces: p.sauces,
        price: null,
        image: "",
        available: true,
        sort: i,
      }))
    );
  }
}

export async function ensureSaladSeeded() {
  if (!seeding) seeding = seedOnce().catch((err) => { seeding = null; throw err; });
  return seeding;
}

function toIngredient(d: SaladIngredientDoc): SaladIngredient {
  return {
    id: d.id,
    n: d.n,
    cat: d.cat,
    unit: d.unit,
    g: d.g,
    price: d.price,
    kind: d.kind as SaladShape,
    ...(d.v ? { v: d.v as SaladVariant } : {}),
    c: d.c,
    c2: d.c2,
    kcal: d.kcal,
    pro: d.pro,
    tags: (d.tags || []) as SaladTag[],
    ...(d.ulabel ? { ulabel: d.ulabel } : {}),
    image: d.image || "",
    available: d.available !== false,
  };
}

function toSauce(d: SaladSauceDoc): SaladSauce {
  return {
    id: d.id,
    n: d.n,
    price: d.price,
    c: d.c,
    kcal: d.kcal,
    pro: d.pro,
    tags: (d.tags || []) as SaladTag[],
    note: d.note || "",
    available: d.available !== false,
  };
}

function toPreset(d: SaladPresetDoc): SaladPreset {
  return {
    id: d.id,
    n: d.n,
    d: d.d || "",
    size: d.size,
    items: (d.items || {}) as Record<string, number>,
    sauces: d.sauces || [],
    price: d.price ?? null,
    image: d.image || "",
    available: d.available !== false,
  };
}

/** کاتالوگ کامل، شامل مواد غیرفعال — برای پنل مدیریت */
export async function getSaladCatalogAll(): Promise<SaladCatalog> {
  await dbConnect();
  await ensureSaladSeeded();
  const [cats, ings, sauces, presets] = await Promise.all([
    SaladCategory.find().sort({ sort: 1 }).lean(),
    SaladIngredientModel.find().sort({ sort: 1 }).lean(),
    SaladSauceModel.find().sort({ sort: 1 }).lean(),
    SaladPresetModel.find().sort({ sort: 1 }).lean(),
  ]);
  return {
    cats: cats.map((c) => ({ id: c.id, name: c.name })),
    ingredients: ings.map((d) => toIngredient(d as SaladIngredientDoc)),
    sauces: sauces.map((d) => toSauce(d as SaladSauceDoc)),
    presets: presets.map((d) => toPreset(d as SaladPresetDoc)),
    sizes: SALAD_SIZES,
  };
}

/** کاتالوگ قابل نمایش در سایت — فقط موارد فعال */
export async function getSaladCatalog(): Promise<SaladCatalog> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const all = await getSaladCatalogAll();
  const value: SaladCatalog = {
    cats: all.cats,
    ingredients: all.ingredients.filter((i) => i.available !== false),
    sauces: all.sauces.filter((s) => s.available !== false),
    presets: all.presets.filter((p) => p.available !== false),
    sizes: all.sizes,
  };
  cache = { value, at: Date.now() };
  return value;
}
