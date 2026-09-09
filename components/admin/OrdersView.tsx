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
/* برچسب کوتاه برای دکمه داخل ردیف جدول */
const QUICK_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "تایید",
  confirmed: "آماده‌سازی",
  preparing: "ارسال شد",
  delivering: "تحویل شد",
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
  statusFilter,
  onStatusFilter,
  onAdvance,
  onCancel,
  onMarkPaid,
}: {
  orders: AdminOrder[];
  statusFilter: OrderStatus | "all";
  onStatusFilter: (s: OrderStatus | "all") => void;
  onAdvance: (orderNo: string) => void;
  onCancel: (orderNo: string) => void;
  onMarkPaid: (orderNo: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [openOrderNo, setOpenOrderNo] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return map;
  }, [orders]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (statusFilter === "all" || o.status === statusFilter) &&
        (!q || o.orderNo.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q))
    );
  }, [orders, statusFilter, search]);

  const openOrder = orders.find((o) => o.orderNo === openOrderNo) || null;
  const activeFilterLabel = FILTERS.find((f) => f.id === statusFilter)?.label;

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>سفارش‌ها</h1>
          <p>سفارش‌ها را از همین‌جا تایید کنید و تا تحویل پیش ببرید — برای دیدن جزئیات روی هر ردیف بزنید</p>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-toolbar stack">
          <div className="grow">
            <input type="text" placeholder="جستجو با شماره سفارش، نام یا موبایل…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="adm-chips">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={`adm-chip${statusFilter === f.id ? " active" : ""}`} onClick={() => onStatusFilter(f.id)}>
                {f.label}
                <span className="n">{faNum.format(counts[f.id] || 0)}</span>
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
                <th>اقدام بعدی</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((o) => (
                  <tr
                    key={o.orderNo}
                    className="clickable"
                    tabIndex={0}
                    onClick={() => setOpenOrderNo(o.orderNo)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setOpenOrderNo(o.orderNo);
                    }}
                  >
                    <td>
                      <div className="adm-cell-main">{o.orderNo}</div>
                      <div className="adm-cell-sub">{o.createdLabel}</div>
                    </td>
                    <td>
                      <div className="adm-cell-main">{o.customer.name}</div>
                      <div className="adm-cell-sub">{o.customer.phone}</div>
                    </td>
                    <td>{faNum.format(o.items.length)} قلم</td>
                    <td className="amount">{fmtPrice(o.estimatedTotal)} تومان</td>
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
                    <td>
                      {NEXT_STATUS[o.status] ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm adm-quick"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdvance(o.orderNo);
                          }}
                        >
                          <Icon name="check" /> {QUICK_LABEL[o.status]}
                        </button>
                      ) : (
                        <span className="adm-cell-sub">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={8} text={search ? "سفارشی با این مشخصات پیدا نشد" : `سفارشی در وضعیت «${activeFilterLabel}» وجود ندارد`} />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openOrder ? (
        <AppModal title={openOrder.customer.name} subtitle={`${openOrder.orderNo} · ${openOrder.createdLabel}`} icon="package" onClose={() => setOpenOrderNo(null)}>
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
              <b>مبلغ کل{openOrder.hasWeightItems ? " (تقریبی)" : ""}</b>
              <b className="amount">{fmtPrice(openOrder.estimatedTotal)} تومان</b>
            </div>
            {openOrder.hasWeightItems ? (
              <p className="hint" style={{ marginTop: 8 }}>
                این سفارش قلم وزنی دارد؛ مبلغ نهایی پس از وزن‌کشی مشخص می‌شود.
              </p>
            ) : null}
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
              <label>موبایل</label>
              <div className="val" dir="ltr" style={{ textAlign: "right" }}>
                {openOrder.customer.phone}
              </div>
            </div>
            <div className="adm-dblock" style={{ gridColumn: "1 / -1" }}>
              <label>آدرس</label>
              <div className="val" style={{ fontWeight: 500, fontSize: "0.8rem", lineHeight: 1.9 }}>
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

          <div className="adm-actions">
            {openOrder.status !== "cancelled" && NEXT_STATUS[openOrder.status] ? (
              <button type="button" className="btn btn-primary btn-block" onClick={() => onAdvance(openOrder.orderNo)}>
                <Icon name="check" /> {NEXT_LABEL[openOrder.status]}
              </button>
            ) : null}

            <div className="adm-actions-row">
              <a className="btn btn-outline btn-sm" href={orderWhatsappUrl(openOrder, "track")} target="_blank" rel="noreferrer">
                <Icon name="chat" /> واتس‌اپ
              </a>
              <a className="btn btn-outline btn-sm" href={`tel:${openOrder.customer.phone}`}>
                <Icon name="phone" /> تماس
              </a>
              {openOrder.paymentStatus === "unpaid" && openOrder.paymentMethod !== "cod" ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onMarkPaid(openOrder.orderNo)}>
                  <Icon name="wallet" /> ثبت پرداخت
                </button>
              ) : null}
            </div>

            {openOrder.status !== "cancelled" && openOrder.status !== "delivered" ? (
              <button
                type="button"
                className="adm-destructive"
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
