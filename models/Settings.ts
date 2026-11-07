import { Schema, model, models, type Model } from "mongoose";
import type { StoreSettings } from "@/lib/store-settings";

export interface SettingsDoc extends StoreSettings {
  key: "store";
  updatedAt: Date;
}

const SettingsSchema = new Schema<SettingsDoc>(
  {
    key: { type: String, required: true, unique: true, default: "store" },
    brand: { type: Schema.Types.Mixed, required: true },
    delivery: { type: Schema.Types.Mixed, required: true },
    assistant: { type: Schema.Types.Mixed, required: true },
    otp: { type: Schema.Types.Mixed, required: true },
    features: { type: Schema.Types.Mixed, required: true },
    payments: { type: Schema.Types.Mixed, required: true },
    blockedPhones: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) || model<SettingsDoc>("Settings", SettingsSchema);
