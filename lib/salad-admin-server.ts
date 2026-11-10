/* ---------------------------------------------------------
   نوشتن روی کاتالوگ سالاد بار از پنل مدیریت (فقط سرور).
   هر تغییر کش عمومی را باطل می‌کند تا سایت بلافاصله به‌روز شود.
   --------------------------------------------------------- */

import { OrderError } from "@/lib/order-server";
import { sanitizeSaladImageUrl } from "@/lib/salad-image";
import { SALAD_SIZES, type SaladShape, type SaladTag, type SaladVariant } from "@/lib/salad";
import { ensureSaladSeeded, invalidateSaladCache, saladSlug } from "@/lib/salad-catalog-server";
import {
  SaladCategory,
  SaladIngredientModel,
  SaladPresetModel,
  SaladSauceModel,
} from "@/models/SaladCatalog";
import { dbConnect } from "@/lib/mongodb";

const SHAPES: SaladShape[] = ["leaf", "shred", "ring", "round", "strip", "cube", "nut", "crumb", "kernel"];
const TAGS: SaladTag[] = ["v", "d", "n", "lowcal", "highpro"];
const VARIANTS: SaladVariant[] = ["tomato", "egg", "corn", "bacon", "feta", "berry"];
const HEX = /^#[0-9a-fA-F]{3,8}$/;

function str(v: unknown, max: number, label: string, required = false): string {
  const s = String(v ?? "").trim().slice(0, max);
  if (required && !s) throw new OrderError(`${label} لازم است`);
  return s;
}

function num(v: unknown, label: string, { min = 0, max = 10_000_000, fallback }: { min?: number; max?: number; fallback?: number } = {}): number {
  if ((v === "" || v === null || v === undefined) && fallback !== undefined) return fallback;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) throw new OrderError(`${label} عدد نیست`);
  if (n < min || n > max) throw new OrderError(`${label} خارج از محدودهٔ مجاز است`);
  return n;
}

function color(v: unknown, fallback: string): string {
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  if (!HEX.test(s)) throw new OrderError("کد رنگ نامعتبر است");
  return s;
}

function tags(v: unknown): SaladTag[] {
  const arr = Array.isArray(v) ? v.map(String) : [];
  return arr.filter((t): t is SaladTag => (TAGS as string[]).includes(t));
}

async function freeId(model: { findOne: (q: object) => { lean: () => Promise<unknown> } }, wanted: string, prefix: string) {
  let id = wanted || prefix;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await model.findOne({ id }).lean()) {
    id = `${wanted || prefix}-${n++}`;
    if (n > 50) throw new OrderError("ساخت شناسهٔ یکتا ممکن نشد");
  }
  return id;
}

/* ---------------- دسته‌های سالاد ---------------- */

export async function createSaladCategory(body: Record<string, unknown>) {
  await dbConnect();
  await ensureSaladSeeded();
  const name = str(body.name, 60, "نام دسته", true);
  const id = await freeId(SaladCategory, saladSlug(String(body.id || name), "cat"), "cat");
  const sort = await SaladCategory.countDocuments();
  const doc = await SaladCategory.create({ id, name, sort });
  invalidateSaladCache();
  return { id: doc.id, name: doc.name };
}

export async function updateSaladCategory(id: string, body: Record<string, unknown>) {
  await dbConnect();
  const doc = await SaladCategory.findOne({ id });
  if (!doc) throw new OrderError("دسته پیدا نشد", 404);
  doc.name = str(body.name, 60, "نام دسته", true);
  await doc.save();
  invalidateSaladCache();
  return { id: doc.id, name: doc.name };
}

export async function deleteSaladCategory(id: string) {
  await dbConnect();
  const used = await SaladIngredientModel.countDocuments({ cat: id });
  if (used) throw new OrderError(`${used} ماده در این دسته است؛ اول آن‌ها را جابه‌جا یا حذف کنید`);
  const res = await SaladCategory.deleteOne({ id });
  if (!res.deletedCount) throw new OrderError("دسته پیدا نشد", 404);
  invalidateSaladCache();
}

/* ---------------- مواد ---------------- */

export async function createSaladIngredient(body: Record<string, unknown>) {
  await dbConnect();
  await ensureSaladSeeded();
  const n = str(body.n, 60, "نام ماده", true);
  const cat = str(body.cat, 40, "دسته", true);
  if (!(await SaladCategory.findOne({ id: cat }).lean())) throw new OrderError("دستهٔ انتخاب‌شده وجود ندارد");
  const id = await freeId(SaladIngredientModel, saladSlug(String(body.id || n), "ing"), "ing");
  const sort = await SaladIngredientModel.countDocuments();
  const doc = await SaladIngredientModel.create({ ...ingredientFields(body), id, n, cat, sort });
  invalidateSaladCache();
  return doc.toObject();
}

function ingredientFields(body: Record<string, unknown>) {
  const kindRaw = String(body.kind || "kernel");
  const kind = (SHAPES as string[]).includes(kindRaw) ? (kindRaw as SaladShape) : "kernel";
  const g = num(body.g, "وزن هر واحد", { min: 1, max: 2000, fallback: 50 });
  return {
    unit: num(body.unit, "واحد", { min: 1, max: 2000, fallback: g }),
    g,
    price: num(body.price, "قیمت", { min: 0, max: 10_000_000, fallback: 0 }),
    kind,
    v: (VARIANTS as string[]).includes(String(body.v || "")) ? (String(body.v) as SaladVariant) : null,
    c: color(body.c, "#8bb45a"),
    c2: color(body.c2, "#6f9544"),
    kcal: num(body.kcal, "کالری", { min: 0, max: 2000, fallback: 0 }),
    pro: num(body.pro, "پروتئین", { min: 0, max: 200, fallback: 0 }),
    tags: tags(body.tags),
    ulabel: str(body.ulabel, 20, "واحد شمارش"),
    image: sanitizeSaladImageUrl(body.image),
    available: body.available !== false,
  };
}

export async function updateSaladIngredient(id: string, body: Record<string, unknown>) {
  await dbConnect();
  const doc = await SaladIngredientModel.findOne({ id });
  if (!doc) throw new OrderError("ماده پیدا نشد", 404);
  const cat = str(body.cat, 40, "دسته", true);
  if (!(await SaladCategory.findOne({ id: cat }).lean())) throw new OrderError("دستهٔ انتخاب‌شده وجود ندارد");
  Object.assign(doc, ingredientFields(body), { n: str(body.n, 60, "نام ماده", true), cat });
  await doc.save();
  invalidateSaladCache();
  return doc.toObject();
}

export async function deleteSaladIngredient(id: string) {
  await dbConnect();
  const res = await SaladIngredientModel.deleteOne({ id });
  if (!res.deletedCount) throw new OrderError("ماده پیدا نشد", 404);
  /* از سالادهای آماده هم برداشته می‌شود تا کاسه به مادهٔ حذف‌شده ارجاع ندهد */
  await SaladPresetModel.updateMany({}, { $unset: { [`items.${id}`]: "" } });
  invalidateSaladCache();
}

/* ---------------- سس‌ها ---------------- */

export async function createSaladSauce(body: Record<string, unknown>) {
  await dbConnect();
  await ensureSaladSeeded();
  const n = str(body.n, 60, "نام سس", true);
  const id = await freeId(SaladSauceModel, saladSlug(String(body.id || n), "sauce"), "sauce");
  const sort = await SaladSauceModel.countDocuments();
  const doc = await SaladSauceModel.create({ ...sauceFields(body), id, n, sort });
  invalidateSaladCache();
  return doc.toObject();
}

function sauceFields(body: Record<string, unknown>) {
  return {
    price: num(body.price, "قیمت", { min: 0, max: 10_000_000, fallback: 0 }),
    c: color(body.c, "#e8d9a8"),
    kcal: num(body.kcal, "کالری", { min: 0, max: 2000, fallback: 0 }),
    pro: num(body.pro, "پروتئین", { min: 0, max: 200, fallback: 0 }),
    tags: tags(body.tags),
    note: str(body.note, 120, "توضیح"),
    available: body.available !== false,
  };
}

export async function updateSaladSauce(id: string, body: Record<string, unknown>) {
  await dbConnect();
  const doc = await SaladSauceModel.findOne({ id });
  if (!doc) throw new OrderError("سس پیدا نشد", 404);
  Object.assign(doc, sauceFields(body), { n: str(body.n, 60, "نام سس", true) });
  await doc.save();
  invalidateSaladCache();
  return doc.toObject();
}

export async function deleteSaladSauce(id: string) {
  await dbConnect();
  const res = await SaladSauceModel.deleteOne({ id });
  if (!res.deletedCount) throw new OrderError("سس پیدا نشد", 404);
  await SaladPresetModel.updateMany({}, { $pull: { sauces: id } });
  invalidateSaladCache();
}

/* ---------------- سالادهای آماده ---------------- */

async function presetFields(body: Record<string, unknown>) {
  const size = String(body.size || "m");
  if (!SALAD_SIZES.some((s) => s.id === size)) throw new OrderError("اندازهٔ کاسه نامعتبر است");

  const rawItems = (body.items || {}) as Record<string, unknown>;
  const items: Record<string, number> = {};
  for (const [id, q] of Object.entries(rawItems)) {
    const units = Math.round(Number(q));
    if (!Number.isFinite(units) || units <= 0) continue;
    if (!(await SaladIngredientModel.findOne({ id }).lean())) throw new OrderError(`مادهٔ «${id}» وجود ندارد`);
    items[id] = Math.min(units, 12);
  }
  if (!Object.keys(items).length) throw new OrderError("سالاد آماده باید حداقل یک ماده داشته باشد");

  const sauces: string[] = [];
  for (const sid of Array.isArray(body.sauces) ? body.sauces.map(String) : []) {
    if (!(await SaladSauceModel.findOne({ id: sid }).lean())) throw new OrderError(`سس «${sid}» وجود ندارد`);
    if (!sauces.includes(sid)) sauces.push(sid);
  }

  const priceRaw = body.price;
  const price =
    priceRaw === "" || priceRaw === null || priceRaw === undefined
      ? null
      : num(priceRaw, "قیمت", { min: 0, max: 100_000_000 });

  return {
    d: str(body.d, 200, "توضیح"),
    size,
    items,
    sauces,
    price,
    image: sanitizeSaladImageUrl(body.image),
    available: body.available !== false,
  };
}

export async function createSaladPreset(body: Record<string, unknown>) {
  await dbConnect();
  await ensureSaladSeeded();
  const n = str(body.n, 80, "نام سالاد", true);
  const id = await freeId(SaladPresetModel, saladSlug(String(body.id || n), "preset"), "preset");
  const sort = await SaladPresetModel.countDocuments();
  const doc = await SaladPresetModel.create({ ...(await presetFields(body)), id, n, sort });
  invalidateSaladCache();
  return doc.toObject();
}

export async function updateSaladPreset(id: string, body: Record<string, unknown>) {
  await dbConnect();
  const doc = await SaladPresetModel.findOne({ id });
  if (!doc) throw new OrderError("سالاد آماده پیدا نشد", 404);
  Object.assign(doc, await presetFields(body), { n: str(body.n, 80, "نام سالاد", true) });
  await doc.save();
  invalidateSaladCache();
  return doc.toObject();
}

export async function deleteSaladPreset(id: string) {
  await dbConnect();
  const res = await SaladPresetModel.deleteOne({ id });
  if (!res.deletedCount) throw new OrderError("سالاد آماده پیدا نشد", 404);
  invalidateSaladCache();
}
