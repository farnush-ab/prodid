import mongoose, { Schema, model, models, type Model } from "mongoose";
import type { SaleType } from "@/lib/data";
import type { ProductVariant } from "@/lib/variants";

export interface ProductDoc {
  id: string;
  name: string;
  cat: string;
  price: number | null;
  sale: SaleType;
  ic: string;
  image: string;
  images: string[];
  desc: string;
  badge: string;
  available: boolean;
  variants: ProductVariant[];
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
    images: { type: [String], default: [] },
    desc: { type: String, default: "" },
    badge: { type: String, default: "" },
    available: { type: Boolean, default: true },
    variants: {
      type: [
        new Schema<ProductVariant>(
          {
            id: { type: String, required: true },
            label: { type: String, required: true },
            price: { type: Number, default: null },
            available: { type: Boolean, default: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

function productModel(): Model<ProductDoc> {
  const cached = models.Product as Model<ProductDoc> | undefined;
  if (cached && (!cached.schema.path("image") || !cached.schema.path("images") || !cached.schema.path("variants"))) {
    delete (mongoose.models as Record<string, unknown>).Product;
    delete (mongoose.connection.models as Record<string, unknown>).Product;
  }
  return (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", ProductSchema);
}

export const Product: Model<ProductDoc> = productModel();
