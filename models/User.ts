import { Schema, model, models, type Model } from "mongoose";
import type { UserRole } from "@/lib/roles";

export interface UserDoc {
  phone: string;
  name: string;
  address: string;
  birthDate: string;
  role: UserRole;
  blocked: boolean;
  staffActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    address: { type: String, default: "" },
    birthDate: { type: String, default: "" },
    role: {
      type: String,
      enum: ["customer", "owner", "orders", "catalog", "support"],
      default: "customer",
      index: true,
    },
    blocked: { type: Boolean, default: false, index: true },
    staffActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User: Model<UserDoc> = (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
