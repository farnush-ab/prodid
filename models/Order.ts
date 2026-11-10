import { Schema, model, models, type Model, type Types } from "mongoose";
import type { DeliveryDay, DeliverySlot, OrderStatus, PayMethod, PayStatus } from "@/lib/order";
import type { OrderCoupon } from "@/lib/coupon";
import type { SaladOrderLine } from "@/lib/salad-order";
import type { SaladWay } from "@/lib/salad";

export interface OrderItemDoc {
  productId: string;
  name: string;
  sale: "w" | "u";
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderDoc {
  orderNo: string;
  viewToken: string;
  userId?: Types.ObjectId | null;
  customer: { name: string; phone: string; address: string };
  items: OrderItemDoc[];
  notes: string;
  day: DeliveryDay;
  slot: DeliverySlot;
  paymentMethod: PayMethod;
  paymentStatus: PayStatus;
  status: OrderStatus;
  estimatedTotal: number;
  finalTotal: number | null;
  deliveryFee: number | null;
  hasWeightItems: boolean;
  coupon: OrderCoupon | null;
  /* سفارش سالاد بار در همین مجموعه ذخیره می‌شود: kind آن را از سفارش
     فروشگاه جدا می‌کند و بقیه فیلدها فقط برای سالاد معنی دارند. */
  kind: "shop" | "salad";
  salads: SaladOrderLine[];
  way: SaladWay | null;
  saladSlot: string;
  saladSlotLabel: string;
  // برای اتصال بعدی زرین‌پال
  zarinpalAuthority?: string;
  zarinpalRefId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItemDoc>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    sale: { type: String, enum: ["w", "u"], required: true },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDoc>(
  {
    orderNo: { type: String, required: true, unique: true, index: true },
    viewToken: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true, index: true },
      address: { type: String, required: true },
    },
    items: { type: [OrderItemSchema], required: true },
    notes: { type: String, default: "" },
    day: { type: String, enum: ["today", "tomorrow"], required: true },
    slot: { type: String, enum: ["9-12", "12-15", "15-18", "18-21"], required: true },
    paymentMethod: { type: String, enum: ["card", "cod", "online"], required: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "failed"], default: "unpaid" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    estimatedTotal: { type: Number, required: true },
    finalTotal: { type: Number, default: null },
    deliveryFee: { type: Number, default: null },
    hasWeightItems: { type: Boolean, default: false },
    coupon: { type: Schema.Types.Mixed, default: null },
    kind: { type: String, enum: ["shop", "salad"], default: "shop", index: true },
    salads: { type: Schema.Types.Mixed, default: [] },
    way: { type: String, enum: ["pickup", "delivery", null], default: null },
    saladSlot: { type: String, default: "" },
    saladSlotLabel: { type: String, default: "" },
    zarinpalAuthority: { type: String, default: "", index: true },
    zarinpalRefId: { type: String, default: "" },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ "customer.phone": 1, createdAt: -1 });

export const Order: Model<OrderDoc> = (models.Order as Model<OrderDoc>) || model<OrderDoc>("Order", OrderSchema);
