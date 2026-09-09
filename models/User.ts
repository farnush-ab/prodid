import { Schema, model, models, type Model } from "mongoose";

export interface UserDoc {
  phone: string;
  name: string;
  address: string;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    address: { type: String, default: "" },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User: Model<UserDoc> = (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
