/* مدل‌های سالاد بار: دسته، ماده، سس و سالاد آماده.
   مثل محصولات، lib/salad.ts فقط داده‌ی اولیه (seed) است و بعد از اولین
   اجرا منبع حقیقت همین مجموعه‌ها هستند. */

import { Schema, model, models, type Model } from "mongoose";
import type { SaladShape, SaladTag, SaladVariant } from "@/lib/salad";

export interface SaladCategoryDoc {
  id: string;
  name: string;
  sort: number;
}

export interface SaladIngredientDoc {
  id: string;
  n: string;
  cat: string;
  unit: number;
  g: number;
  price: number;
  kind: SaladShape;
  v?: SaladVariant | null;
  c: string;
  c2: string;
  kcal: number;
  pro: number;
  tags: SaladTag[];
  ulabel: string;
  /** عکس واقعی ماده؛ اگر خالی باشد همان طرح برداری رسم می‌شود */
  image: string;
  available: boolean;
  sort: number;
}

export interface SaladSauceDoc {
  id: string;
  n: string;
  price: number;
  c: string;
  kcal: number;
  pro: number;
  tags: SaladTag[];
  note: string;
  available: boolean;
  sort: number;
}

export interface SaladPresetDoc {
  id: string;
  n: string;
  d: string;
  size: string;
  items: Record<string, number>;
  sauces: string[];
  /** قیمت دستی؛ خالی یعنی از روی مواد حساب شود */
  price: number | null;
  image: string;
  available: boolean;
  sort: number;
}

const SaladCategorySchema = new Schema<SaladCategoryDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

const SaladIngredientSchema = new Schema<SaladIngredientDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    n: { type: String, required: true },
    cat: { type: String, required: true, index: true },
    unit: { type: Number, default: 50 },
    g: { type: Number, default: 50 },
    price: { type: Number, default: 0 },
    kind: { type: String, default: "kernel" },
    v: { type: String, default: null },
    c: { type: String, default: "#8bb45a" },
    c2: { type: String, default: "#6f9544" },
    kcal: { type: Number, default: 0 },
    pro: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    ulabel: { type: String, default: "" },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

const SaladSauceSchema = new Schema<SaladSauceDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    n: { type: String, required: true },
    price: { type: Number, default: 0 },
    c: { type: String, default: "#e8d9a8" },
    kcal: { type: Number, default: 0 },
    pro: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    note: { type: String, default: "" },
    available: { type: Boolean, default: true },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

const SaladPresetSchema = new Schema<SaladPresetDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    n: { type: String, required: true },
    d: { type: String, default: "" },
    size: { type: String, default: "m" },
    items: { type: Schema.Types.Mixed, default: {} },
    sauces: { type: [String], default: [] },
    price: { type: Number, default: null },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

export const SaladCategory: Model<SaladCategoryDoc> =
  (models.SaladCategory as Model<SaladCategoryDoc>) || model<SaladCategoryDoc>("SaladCategory", SaladCategorySchema);
export const SaladIngredientModel: Model<SaladIngredientDoc> =
  (models.SaladIngredient as Model<SaladIngredientDoc>) ||
  model<SaladIngredientDoc>("SaladIngredient", SaladIngredientSchema);
export const SaladSauceModel: Model<SaladSauceDoc> =
  (models.SaladSauce as Model<SaladSauceDoc>) || model<SaladSauceDoc>("SaladSauce", SaladSauceSchema);
export const SaladPresetModel: Model<SaladPresetDoc> =
  (models.SaladPreset as Model<SaladPresetDoc>) || model<SaladPresetDoc>("SaladPreset", SaladPresetSchema);
