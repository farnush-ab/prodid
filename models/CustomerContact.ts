import { Schema, model, models, type Model } from "mongoose";

/* هر پیام بازگشت/یادآوری که از پنل برای یک مشتری فرستاده شده.
   برای اینکه مدیر ببیند قبلا به کی پیام داده‌اند (و دوباره مزاحم نشوند)
   و بعدا بسنجد کدام پیام‌ها به خرید رسیده‌اند. */
export interface CustomerContactDoc {
  phone: string;
  kind: "winback" | "reminder" | "call";
  productId: string;
  productName: string;
  code: string;
  percent: number;
  sent: boolean;
  error: string;
  note: string;
  by: string;
  createdAt: Date;
}

const CustomerContactSchema = new Schema<CustomerContactDoc>(
  {
    phone: { type: String, required: true, index: true },
    kind: { type: String, enum: ["winback", "reminder", "call"], required: true },
    productId: { type: String, default: "" },
    productName: { type: String, default: "" },
    code: { type: String, default: "" },
    percent: { type: Number, default: 0 },
    sent: { type: Boolean, default: false },
    error: { type: String, default: "" },
    note: { type: String, default: "" },
    by: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
CustomerContactSchema.index({ createdAt: -1 });

export const CustomerContact: Model<CustomerContactDoc> =
  (models.CustomerContact as Model<CustomerContactDoc>) || model<CustomerContactDoc>("CustomerContact", CustomerContactSchema);
