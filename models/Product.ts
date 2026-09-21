import mongoose, { Schema, model, models, type Model } from "mongoose";
import type { SaleType } from "@/lib/data";

export interface ProductDoc {
  id: string;
  name: string;
  cat: string;
  price: number | null;
  sale: SaleType;
  ic: string;
  image: string;
  desc: string;
  badge: string;
  available: boolean;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    cat: { type: String, required: true, index: true },
    price: { type: Number, default: null },
    sale: { type: String, enum: ["w", "u"], required: true },
    ic: { type: String, default: "box" },
    image: { type: String, default: "" },
    desc: { type: String, default: "" },
    badge: { type: String, default: "" },
    available: { type: Boolean, default: true },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

function productModel(): Model<ProductDoc> {
  const cached = models.Product as Model<ProductDoc> | undefined;
  if (cached && !cached.schema.path("image")) {
    delete (mongoose.models as Record<string, unknown>).Product;
    delete (mongoose.connection.models as Record<string, unknown>).Product;
  }
  return (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", ProductSchema);
}

export const Product: Model<ProductDoc> = productModel();
