import { Schema, model, models, type Model } from "mongoose";

export interface CouponRedemptionDoc {
  code: string;
  phone: string;
  orderNo: string;
  createdAt: Date;
}

const CouponRedemptionSchema = new Schema<CouponRedemptionDoc>(
  {
    code: { type: String, required: true, index: true },
    phone: { type: String, required: true, index: true },
    orderNo: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CouponRedemptionSchema.index({ code: 1, phone: 1 }, { unique: true });

export const CouponRedemption: Model<CouponRedemptionDoc> =
  (models.CouponRedemption as Model<CouponRedemptionDoc>) || model<CouponRedemptionDoc>("CouponRedemption", CouponRedemptionSchema);
