import { Schema, model, models, type Model } from "mongoose";

export interface OtpDoc {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
  windowStart: Date;
  sendCount: number;
}

const OtpSchema = new Schema<OtpDoc>({
  phone: { type: String, required: true, unique: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  windowStart: { type: Date, required: true },
  sendCount: { type: Number, default: 1 },
});

export const Otp: Model<OtpDoc> = (models.Otp as Model<OtpDoc>) || model<OtpDoc>("Otp", OtpSchema);
