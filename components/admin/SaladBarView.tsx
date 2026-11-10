"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { faNum } from "@/lib/format";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order";
import {
  SALAD_WAY_LABEL,
  saladIngredientTotals,
  saladSauceTotals,
  type PublicSaladOrder,
} from "@/lib/salad-order";
import { AppModal } from "@/components/AppModal";
import { EmptyRow, StatusPill } from "./shared";

const money = (n: number) => `${faNum.format(Math.round(n))} تومان`;

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fa-IR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/** مقدار یک ماده همان‌طور که آشپزخانه باید بخواند */
function amount(i: { units: number; grams: number; unitLabel?: string }) {
  return i.unitLabel ? `${faNum.format(i.units)} ${i.unitLabel}` : `${faNum.format(i.grams)} گرم`;
}

const OPEN_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "delivering"];

export function SaladBarView({
  orders,
  canEdit = true,
  onAdvance,
  onCancel,
}: {
  orders: PublicSaladOrder[];
  canEdit?: boolean;
  onAdvance: (orderNo: string) => void | Promise<void>;
  onCancel: (orderNo: string) => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"open" | "today" | "all">("open");
  const [open, setOpen] = useState<PublicSaladOrder | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (tab === "open" && !OPEN_STATUSES.includes(o.status)) return false;
      if (tab === "today" && !isToday(o.createdAt)) return false;
      if (!q) return true;
      return (
        o.orderNo.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.salads.some((s) => s.items.some((i) => i.name.toLowerCase().includes(q)))
      );
    });
  }, [orders, search, tab]);

  /* آمار امروز: چیزی که مسئول شعبه صبح می‌خواهد بداند */
  const today = useMemo(() => orders.filter((o) => isToday(o.createdAt)), [orders]);
  const todayLive = today.filter((o) => o.status !== "cancelled");
  const stats = {
    count: todayLive.length,
    revenue: todayLive.reduce((a, o) => a + o.total, 0),
    bowls: todayLive.reduce((a, o) => a + o.salads.length, 0),
    pickup: todayLive.filter((o) => o.way === "pickup").length,
    waiting: orders.filter((o) => o.status === "pending").length,
  };

  /* آماده‌سازی: مجموع گرم هر ماده در سفارش‌های بازِ امروز */
  const prep = useMemo(
    () => saladIngredientTotals(today.filter((o) => OPEN_STATUSES.includes(o.status))),
    [today]
  );
  const sauces = useMemo(
    () => saladSauceTotals(today.filter((o) => OPEN_STATUSES.includes(o.status))),
    [today]
  );

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>سالاد بار</h1>
          <p>سفارش‌هایی که مشتری خودش در صفحهٔ سالاد بار چیده — با مواد، مقدار دقیق و سس‌ها</p>
        </div>
      </div>

      <div className="adm-stat-grid">
        {[
          { label: "سفارش امروز", value: faNum.format(stats.count), unit: `${faNum.format(stats.bowls)} کاسه`, icon: "bowl" },
          { label: "فروش امروز", value: faNum.format(stats.revenue), unit: "تومان", icon: "wallet" },
          { label: "تحویل حضوری امروز", value: faNum.format(stats.pickup), unit: `از ${faNum.format(stats.count)}`, icon: "store" },
          { label: "در انتظار تأیید", value: faNum.format(stats.waiting), unit: "همه روزها", icon: "clock" },
        ].map((m) => (
          <div className="adm-metric" key={m.label}>
            <span className="m-ico" style={{ background: "var(--brand-orange-tint)", color: "var(--brand-orange-deep)" }}>
              <Icon name={m.icon} />
            </span>
            <span className="m-body">
              <span className="m-label">{m.label}</span>
              <span className="m-value">
                {m.value}
                <small>{m.unit}</small>
              </span>
            </span>
          </div>
        ))}
      </div>

      {prep.length ? (
        <div className="adm-card sb-prep">
          <div className="adm-card-head">
            <h3>
              <Icon name="bowl" /> آماده‌سازی امروز
            </h3>
            <p>مجموع موادی که برای سفارش‌های بازِ امروز لازم است</p>
          </div>
          <div className="sb-prep-grid">
            {prep.map((p) => (
              <span key={p.id} className="sb-prep-chip">
                <b>{p.name}</b>
                {faNum.format(p.grams)} گرم
                <i>{faNum.format(p.orders)} سفارش</i>
              </span>
            ))}
          </div>
          {sauces.length ? (
            <div className="sb-prep-sauces">
              سس‌ها:{" "}
              {sauces.map((s) => (
                <span key={s.id}>
                  {s.name} ×{faNum.format(s.count)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="adm-card">
        <div className="adm-toolbar">
          <div className="grow">
            <input
              type="text"
              placeholder="جستجو با شماره سفارش، نام، موبایل یا نام ماده…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={tab} onChange={(e) => setTab(e.target.value as typeof tab)}>
            <option value="open">در جریان</option>
            <option value="today">امروز</option>
            <option value="all">همه</option>
          </select>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>سفارش</th>
                <th>مشتری</th>
                <th>سالاد</th>
                <th>تحویل</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((o) => (
                  <tr key={o.orderNo} onClick={() => setOpen(o)} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="adm-cell-main">{o.orderNo}</div>
                      <div className="adm-cell-sub">{timeLabel(o.createdAt)}</div>
                    </td>
                    <td>
                      <div className="adm-cell-main">{o.customer.name}</div>
                      <div className="adm-cell-sub">{o.customer.phone}</div>
                    </td>
                    <td>
                      <div className="adm-cell-main">{o.salads.map((s) => s.sizeName).join("، ")}</div>
                      <div className="adm-cell-sub">
                        {faNum.format(o.salads.reduce((a, s) => a + s.items.length, 0))} ماده ·{" "}
                        {faNum.format(o.salads.reduce((a, s) => a + s.weight, 0))} گرم
                      </div>
                    </td>
                    <td>
                      <div className="adm-cell-main">{SALAD_WAY_LABEL[o.way]}</div>
                      <div className="adm-cell-sub">{o.slotLabel}</div>
                    </td>
                    <td className="amount">{money(o.total)}</td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                    <td>
                      <button type="button" className="btn btn-light btn-sm" onClick={() => setOpen(o)}>
                        جزئیات
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={7} text="سفارش سالادی در این نما نیست" icon="bowl" />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <AppModal title={`سفارش سالاد ${open.orderNo}`} icon="bowl" onClose={() => setOpen(null)}>
          <div className="sb-adm-detail">
            <div className="sb-adm-meta">
              <div>
                <span>مشتری</span>
                <b>{open.customer.name}</b>
                <a className="num" href={`tel:${open.customer.phone}`}>
                  {open.customer.phone}
                </a>
              </div>
              <div>
                <span>تحویل</span>
                <b>{SALAD_WAY_LABEL[open.way]}</b>
                {open.slotLabel}
              </div>
              <div>
                <span>ثبت</span>
                <b>{timeLabel(open.createdAt)}</b>
                {ORDER_STATUS_LABEL[open.status]}
              </div>
            </div>

            {open.way === "delivery" ? (
              <p className="sb-adm-addr">
                <Icon name="pin" className="ico" /> {open.customer.address}
              </p>
            ) : null}

            {open.salads.map((s, i) => (
              <div className="sb-adm-salad" key={i}>
                <div className="sb-adm-salad-head">
                  <b>
                    {faNum.format(i + 1)}. {s.name}
                  </b>
                  <span>
                    کاسهٔ {s.sizeName} · {faNum.format(s.weight)} گرم · {faNum.format(s.kcal)} کالری ·{" "}
                    {faNum.format(s.pro)} گرم پروتئین
                  </span>
                  <i className="num">{money(s.price)}</i>
                </div>
                <ul className="sb-adm-ings">
                  {s.items.map((it) => (
                    <li key={it.id}>
                      <span>{it.name}</span>
                      <b className="num">{amount(it)}</b>
                    </li>
                  ))}
                </ul>
                <p className="sb-adm-sauce">
                  سس: {s.sauces.length ? s.sauces.map((x) => x.name).join("، ") : "بدون سس"}
                  {s.sauces.length && s.sauceSide ? " — جدا سرو شود" : ""}
                </p>
              </div>
            ))}

            {open.note ? (
              <p className="sb-adm-note">
                <Icon name="note" className="ico" /> یادداشت مشتری: {open.note}
              </p>
            ) : null}

            <div className="sb-adm-sum">
              <span>
                سالادها <b className="num">{money(open.subtotal)}</b>
              </span>
              {open.deliveryFee ? (
                <span>
                  ارسال <b className="num">{money(open.deliveryFee)}</b>
                </span>
              ) : null}
              <span className="grand">
                جمع کل <b className="num">{money(open.total)}</b>
              </span>
            </div>

            {canEdit ? (
              <div className="adm-actions-row">
                {OPEN_STATUSES.includes(open.status) ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      await onAdvance(open.orderNo);
                      setOpen(null);
                    }}
                  >
                    مرحله بعد
                  </button>
                ) : null}
                {open.status !== "delivered" && open.status !== "cancelled" ? (
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={async () => {
                      await onCancel(open.orderNo);
                      setOpen(null);
                    }}
                  >
                    لغو سفارش
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
