"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { fmtPrice, faNum, qtyLabelBySale } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAY_METHOD_LABEL, dayLabel, slotLabel, orderWhatsappUrl, type OrderStatus } from "@/lib/order";
import type { AdminOrder } from "@/lib/admin-data";
import { AppModal } from "@/components/AppModal";
import { EmptyRow, PayStatusPill, StatusPill } from "./shared";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "delivering",
  delivering: "delivered",
};
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "تایید سفارش",
  confirmed: "شروع آماده‌سازی",
  preparing: "ارسال شد",
  delivering: "تحویل داده شد",
};
const STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "delivering", "delivered"];
const FILTERS: { id: OrderStatus | "all"; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "pending", label: "در انتظار" },
  { id: "confirmed", label: "تایید شده" },
  { id: "preparing", label: "آماده‌سازی" },
  { id: "delivering", label: "ارسال" },
  { id: "delivered", label: "تحویل شده" },
  { id: "cancelled", label: "لغو شده" },
];

export function OrdersView({
  orders,
  onAdvance,
  onCancel,
  onMarkPaid,
}: {
  orders: AdminOrder[];
  onAdvance: (orderNo: string) => void;
  onCancel: (orderNo: string) => void;
  onMarkPaid: (orderNo: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openOrderNo, setOpenOrderNo] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (statusFilter === "all" || o.status === statusFilter) &&
        (!q || o.orderNo.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q))
    );
  }, [orders, statusFilter, search]);

  const openOrder = orders.find((o) => o.orderNo === openOrderNo) || null;

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>سفارش‌ها</h1>
          <p>مدیریت سفارش‌های ثبت‌شده از سایت، پیگیری وضعیت آماده‌سازی و ارسال، و هماهنگی با مشتری</p>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-toolbar">
          <div className="grow">
            <input type="text" placeholder="جستجو با شماره سفارش، نام یا موبایل…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="adm-chips">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={`adm-chip${statusFilter === f.id ? " active" : ""}`} onClick={() => setStatusFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>سفارش</th>
                <th>مشتری</th>
                <th>اقلام</th>
                <th>مبلغ</th>
                <th>پرداخت</th>
                <th>تحویل</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((o) => (
                  <tr key={o.orderNo} className="clickable" onClick={() => setOpenOrderNo(o.orderNo)}>
                    <td>
                      <div className="adm-cell-main">{o.orderNo}</div>
                      <div className="adm-cell-sub">{o.createdLabel}</div>
                    </td>
                    <td>
                      <div className="adm-cell-main">{o.customer.name}</div>
                      <div className="adm-cell-sub">{o.customer.phone}</div>
                    </td>
                    <td>{faNum.format(o.items.length)} قلم</td>
                    <td>{fmtPrice(o.estimatedTotal)} تومان</td>
                    <td>
                      <PayStatusPill status={o.paymentStatus} />
                      <div className="adm-cell-sub">{PAY_METHOD_LABEL[o.paymentMethod]}</div>
                    </td>
                    <td>
                      {dayLabel(o.day)}
                      <div className="adm-cell-sub">{slotLabel(o.slot)}</div>
                    </td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={7} text="سفارشی با این مشخصات پیدا نشد" />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openOrder ? (
        <AppModal title={openOrder.customer.name} subtitle={openOrder.orderNo} icon="package" onClose={() => setOpenOrderNo(null)}>
          {openOrder.status === "cancelled" ? (
            <span className="adm-pill adm-pill-danger" style={{ marginBottom: 14, display: "inline-flex" }}>
              این سفارش لغو شده است
            </span>
          ) : (
            <div className="adm-stepper">
              {STEPS.map((s, i) => {
                const curIdx = STEPS.indexOf(openOrder.status);
                const done = i < curIdx;
                const now = i === curIdx;
                return (
                  <div className={`adm-step${done ? " done" : now ? " now" : ""}`} key={s}>
                    <span className="sdot">{done ? "✓" : faNum.format(i + 1)}</span>
                    <span>{ORDER_STATUS_LABEL[s]}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ margin: "16px 0" }}>
            <div className="adm-cell-sub" style={{ marginBottom: 8 }}>
              اقلام سفارش
            </div>
            {openOrder.items.map((it) => (
              <div className="adm-item-line" key={it.productId}>
                <span>{it.name}</span>
                <span className="adm-cell-sub">{qtyLabelBySale(it.sale, it.qty)}</span>
              </div>
            ))}
            <div className="adm-item-line" style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 10 }}>
              <b>مبلغ کل</b>
              <b>{fmtPrice(openOrder.estimatedTotal)} تومان</b>
            </div>
          </div>

          <div className="adm-dgrid" style={{ marginBottom: 16 }}>
            <div className="adm-dblock">
              <label>زمان تحویل</label>
              <div className="val">
                {dayLabel(openOrder.day)} · {slotLabel(openOrder.slot)}
              </div>
            </div>
            <div className="adm-dblock">
              <label>روش پرداخت</label>
              <div className="val">{PAY_METHOD_LABEL[openOrder.paymentMethod]}</div>
            </div>
            <div className="adm-dblock">
              <label>وضعیت پرداخت</label>
              <div className="val">
                <PayStatusPill status={openOrder.paymentStatus} />
              </div>
            </div>
            <div className="adm-dblock">
              <label>آدرس</label>
              <div className="val" style={{ fontWeight: 500, fontSize: "0.8rem" }}>
                {openOrder.customer.address}
              </div>
            </div>
          </div>

          {openOrder.notes ? (
            <div className="adm-dblock" style={{ marginBottom: 16 }}>
              <label>یادداشت مشتری</label>
              <div className="val" style={{ fontWeight: 400 }}>
                {openOrder.notes}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {openOrder.status !== "cancelled" && NEXT_STATUS[openOrder.status] ? (
              <button type="button" className="btn btn-primary" onClick={() => onAdvance(openOrder.orderNo)}>
                {NEXT_LABEL[openOrder.status]}
              </button>
            ) : null}
            {openOrder.paymentStatus === "unpaid" && openOrder.paymentMethod !== "cod" ? (
              <button type="button" className="btn btn-outline" onClick={() => onMarkPaid(openOrder.orderNo)}>
                <Icon name="check" /> ثبت پرداخت‌شده
              </button>
            ) : null}
            <a className="btn btn-outline" href={orderWhatsappUrl(openOrder, "track")} target="_blank" rel="noreferrer">
              <Icon name="chat" /> ارسال پیگیری در واتس‌اپ
            </a>
            {openOrder.status !== "cancelled" && openOrder.status !== "delivered" ? (
              <button
                type="button"
                className="btn"
                style={{ background: "rgba(214,69,51,.1)", color: "var(--danger)" }}
                onClick={() => {
                  onCancel(openOrder.orderNo);
                  setOpenOrderNo(null);
                }}
              >
                لغو سفارش
              </button>
            ) : null}
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
