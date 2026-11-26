import { Schema, model, models, type Model, type Types } from "mongoose";
import type { TopupStatus, WalletTxnType } from "@/lib/wallet";

/* دفتر کیف پول — هر تغییر موجودی یک ردیف. هیچ‌وقت ویرایش یا حذف نمی‌شود. */
export interface WalletTxnDoc {
  userId: Types.ObjectId;
  phone: string;
  type: WalletTxnType;
  amount: number;
  balanceAfter: number;
  orderNo: string;
  /** شناسهٔ شارژ (invoice) یا کد رهگیری بانک */
  ref: string;
  note: string;
  /** موبایل کارمندی که تراکنش دستی را ثبت کرده */
  by: string;
  /** کلید یکتا برای جلوگیری از ثبت دوباره (مثلا برگشت وجه یک سفارش) */
  dedupe?: string;
  createdAt: Date;
}

const WalletTxnSchema = new Schema<WalletTxnDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    phone: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["topup", "order", "refund", "cashback", "admin_credit", "admin_debit"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    orderNo: { type: String, default: "", index: true },
    ref: { type: String, default: "" },
    note: { type: String, default: "" },
    by: { type: String, default: "" },
    dedupe: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
WalletTxnSchema.index({ userId: 1, createdAt: -1 });
WalletTxnSchema.index({ dedupe: 1 }, { unique: true, partialFilterExpression: { dedupe: { $type: "string" } } });

export const WalletTxn: Model<WalletTxnDoc> =
  (models.WalletTxn as Model<WalletTxnDoc>) || model<WalletTxnDoc>("WalletTxn", WalletTxnSchema);

/* درخواست شارژ آنلاین — تا وقتی درگاه تایید نکند پولی به کیف پول نمی‌رسد */
export interface WalletTopupDoc {
  invoiceId: string;
  userId: Types.ObjectId;
  phone: string;
  amount: number;
  status: TopupStatus | "verifying";
  transid: string;
  trackingNumber: string;
  cardNumber: string;
  error: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTopupSchema = new Schema<WalletTopupDoc>(
  {
    invoiceId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    phone: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "verifying", "paid", "failed"], default: "pending", index: true },
    transid: { type: String, default: "", index: true },
    trackingNumber: { type: String, default: "" },
    cardNumber: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);
WalletTopupSchema.index({ createdAt: -1 });

export const WalletTopup: Model<WalletTopupDoc> =
  (models.WalletTopup as Model<WalletTopupDoc>) || model<WalletTopupDoc>("WalletTopup", WalletTopupSchema);
