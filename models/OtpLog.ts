import { Schema, model, models, type Model } from "mongoose";

export type OtpLogResult = "ok" | "blocked" | "expired" | "fail";

export interface OtpLogDoc {
  phone: string;
  attempts: number;
  result: OtpLogResult;
  createdAt: Date;
}

const OtpLogSchema = new Schema<OtpLogDoc>(
  {
    phone: { type: String, required: true, index: true },
    attempts: { type: Number, default: 1 },
    result: { type: String, enum: ["ok", "blocked", "expired", "fail"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OtpLogSchema.index({ createdAt: -1 });

export const OtpLog: Model<OtpLogDoc> =
  (models.OtpLog as Model<OtpLogDoc>) || model<OtpLogDoc>("OtpLog", OtpLogSchema);
