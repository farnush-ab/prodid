"use client";

import { Icon } from "@/lib/icons";
import { CATALOG_ICON_OPTIONS } from "@/lib/admin-format";
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

export function EmptyRow({ colSpan, text, icon = "search" }: { colSpan: number; text: string; icon?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <div className="adm-empty">
          <div className="e-ico">
            <Icon name={icon} />
          </div>
          <b>{text}</b>
          <p>می‌توانید عبارت جستجو یا فیلترها را تغییر دهید.</p>
        </div>
      </td>
    </tr>
  );
}

const ICON_LABEL: Record<string, string> = {
  steak: "استیک",
  skewer: "سیخ",
  drumstick: "مرغ",
  sausage: "سوسیس",
  burger: "برگر",
  leaf: "سبزی",
  bowl: "کاسه",
  milk: "لبنیات",
  basket: "سبد",
  falafel: "فلافل",
  fish: "ماهی",
  box: "جعبه",
  package: "بسته",
  flame: "شعله",
};

export function IconSelect({ name, defaultValue, id }: { name: string; defaultValue?: string; id?: string }) {
  const initial = defaultValue && (CATALOG_ICON_OPTIONS as readonly string[]).includes(defaultValue) ? defaultValue : "box";
  return (
    <select id={id} name={name} defaultValue={initial}>
      {CATALOG_ICON_OPTIONS.map((ic) => (
        <option key={ic} value={ic}>
          {ICON_LABEL[ic] || ic}
        </option>
      ))}
    </select>
  );
}
