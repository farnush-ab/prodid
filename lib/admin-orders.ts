import {
  OrderError,
  findOrderByNo,
  grantCashback,
  refundCancelledOrderToWallet,
  settleWalletAfterTotalChange,
  toPublicOrder,
} from "@/lib/order-server";
import { NEXT_STATUS } from "@/lib/admin-format";
import { releaseCouponForOrder } from "@/lib/coupon-server";
import { notifyOrderSms, notifyPaymentSms } from "@/lib/sms";
import type { OrderStatus, PayStatus } from "@/lib/order";

export async function adminPatchOrder(
  orderNo: string,
  patch: {
    action?: "advance" | "cancel" | "markPaid" | "refundToWallet";
    status?: OrderStatus;
    paymentStatus?: PayStatus;
    finalTotal?: number | null;
    deliveryFee?: number | null;
  },
  by = ""
) {
  const doc = await findOrderByNo(orderNo);
  if (!doc) throw new OrderError("سفارش پیدا نشد", 404);

  const prevStatus = doc.status;
  const prevPay = doc.paymentStatus;
  const prevFinal = doc.finalTotal;

  if (patch.action === "refundToWallet") {
    if (doc.status !== "cancelled") throw new OrderError("اول سفارش را لغو کنید");
    if (doc.refundedToWallet) throw new OrderError("مبلغ این سفارش قبلا به کیف پول برگشته");
    if (doc.paymentStatus !== "paid" || doc.paymentMethod === "wallet") {
      throw new OrderError("مبلغی خارج از کیف پول برای این سفارش پرداخت نشده");
    }
    await refundCancelledOrderToWallet(doc, { includePaid: true, by });
    return toPublicOrder(doc);
  }

  if (patch.action === "advance") {
    const next = NEXT_STATUS[doc.status];
    if (!next) throw new OrderError("این سفارش مرحله بعدی ندارد");
    doc.status = next;
  } else if (patch.action === "cancel") {
    if (doc.status === "delivered") throw new OrderError("سفارش تحویل‌شده را نمی‌توان لغو کرد");
    if (doc.status === "cancelled") throw new OrderError("این سفارش قبلا لغو شده");
    doc.status = "cancelled";
  } else if (patch.action === "markPaid") {
    doc.paymentStatus = "paid";
  }

  if (patch.status) doc.status = patch.status;
  if (patch.paymentStatus) doc.paymentStatus = patch.paymentStatus;
  if (patch.finalTotal !== undefined) {
    doc.finalTotal = patch.finalTotal === null ? null : Math.max(0, Math.round(Number(patch.finalTotal)));
  }
  if (patch.deliveryFee !== undefined) {
    doc.deliveryFee = patch.deliveryFee === null ? null : Math.max(0, Math.round(Number(patch.deliveryFee)));
  }

  await doc.save();
  if (doc.status === "cancelled" && prevStatus !== "cancelled") {
    await releaseCouponForOrder(doc.orderNo);
    // سهم کیف پول خودکار برمی‌گردد؛ مبلغ پرداخت‌شدهٔ بیرون از کیف پول با دکمهٔ جدا
    await refundCancelledOrderToWallet(doc, { includePaid: false, by });
  }
  if (doc.finalTotal !== prevFinal) await settleWalletAfterTotalChange(doc, by);
  if (doc.status === "delivered" && prevStatus !== "delivered") await grantCashback(doc);

  const order = toPublicOrder(doc);
  if (doc.status !== prevStatus) notifyOrderSms(order);
  else if (doc.paymentStatus === "paid" && prevPay !== "paid") notifyPaymentSms(order, true);
  else if (doc.paymentStatus === "failed" && prevPay !== "failed") notifyPaymentSms(order, false);
  return order;
}
