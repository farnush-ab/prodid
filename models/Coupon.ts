import { Schema, model, models, type Model } from "mongoose";
import type { CouponKind } from "@/lib/coupon";

export interface CouponDoc {
  code: string;
  percent: number;
  kind: CouponKind;
  expiresAt: Date | null;
  minOrders: number;
  active: boolean;
  usageCount: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<CouponDoc>(
  {
    code: { type: String, required: true, unique: true, index: true },
    percent: { type: Number, required: true, min: 1, max: 90 },
    kind: { type: String, enum: ["public", "loyalty", "birthday"], required: true, index: true },
    expiresAt: { type: Date, default: null, index: true },
    minOrders: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    usageCount: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Coupon: Model<CouponDoc> = (models.Coupon as Model<CouponDoc>) || model<CouponDoc>("Coupon", CouponSchema);
