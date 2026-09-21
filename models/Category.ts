import { Schema, model, models, type Model } from "mongoose";

export interface CategoryDoc {
  id: string;
  name: string;
  ic: string;
  soon: boolean;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ic: { type: String, default: "box" },
    soon: { type: Boolean, default: false },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc>) || model<CategoryDoc>("Category", CategorySchema);
