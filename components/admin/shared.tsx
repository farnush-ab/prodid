"use client";

import type { OrderStatus, PayStatus } from "@/lib/order";
import { ORDER_STATUS_LABEL, PAY_STATUS_LABEL } from "@/lib/order";

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "adm-pill-wait",
  confirmed: "adm-pill-progress",
  preparing: "adm-pill-progress",
  delivering: "adm-pill-progress",
  delivered: "adm-pill-done",
  cancelled: "adm-pill-danger",
};
const PAY_CLASS: Record<PayStatus, string> = {
  unpaid: "adm-pill-wait",
  paid: "adm-pill-done",
  failed: "adm-pill-danger",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`adm-pill ${STATUS_CLASS[status]}`}>
      <span className="dot" />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function PayStatusPill({ status }: { status: PayStatus }) {
  return (
    <span className={`adm-pill ${PAY_CLASS[status]}`}>
      <span className="dot" />
      {PAY_STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr className="adm-empty-row">
      <td colSpan={colSpan}>{text}</td>
    </tr>
  );
}
