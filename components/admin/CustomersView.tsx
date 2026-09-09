"use client";

import { useMemo, useState } from "react";
import { fmtPrice, faNum } from "@/lib/format";
import type { AdminCustomer, AdminOrder } from "@/lib/admin-data";
import { AppModal } from "@/components/AppModal";
import { EmptyRow, StatusPill } from "./shared";

export function CustomersView({
  customers,
  orders,
  onToggleBlock,
}: {
  customers: AdminCustomer[];
  orders: AdminOrder[];
  onToggleBlock: (phone: string, value: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [openPhone, setOpenPhone] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  const openCustomer = customers.find((c) => c.phone === openPhone) || null;
  const history = openCustomer ? orders.filter((o) => o.customer.phone === openCustomer.phone) : [];

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>مشتریان</h1>
          <p>حساب‌های ثبت‌شده با ورود موبایلی و تاریخچه خرید هرکدام</p>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-toolbar">
          <div className="grow">
            <input type="text" placeholder="جستجو با نام یا موبایل…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>مشتری</th>
                <th>موبایل</th>
                <th>تعداد سفارش</th>
                <th>مجموع خرید</th>
                <th>آخرین سفارش</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((c) => (
                  <tr key={c.phone} className="clickable" onClick={() => setOpenPhone(c.phone)}>
                    <td className="adm-cell-main">{c.name}</td>
                    <td>{c.phone}</td>
                    <td className="amount">{faNum.format(c.orders)}</td>
                    <td className="amount">{fmtPrice(c.spent)} تومان</td>
                    <td>{c.last}</td>
                    <td>
                      {c.status === "active" ? <span className="adm-pill adm-pill-done">فعال</span> : <span className="adm-pill adm-pill-danger">مسدود</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={6} text="مشتری‌ای پیدا نشد" />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openCustomer ? (
        <AppModal title={openCustomer.name} subtitle={openCustomer.phone} icon="user" onClose={() => setOpenPhone(null)}>
          <div className="adm-dgrid" style={{ marginBottom: 16 }}>
            <div className="adm-dblock">
              <label>تعداد سفارش</label>
              <div className="val">{faNum.format(openCustomer.orders)}</div>
            </div>
            <div className="adm-dblock">
              <label>مجموع خرید</label>
              <div className="val">{fmtPrice(openCustomer.spent)} تومان</div>
            </div>
            <div className="adm-dblock">
              <label>آخرین سفارش</label>
              <div className="val">{openCustomer.last}</div>
            </div>
            <div className="adm-dblock">
              <label>وضعیت حساب</label>
              <div className="val">{openCustomer.status === "active" ? "فعال" : "مسدود"}</div>
            </div>
          </div>

          <div className="acc-setting-row" style={{ padding: "0 0 16px" }}>
            <div>
              <b>مسدودسازی حساب</b>
              <span className="hint">در صورت فعال بودن، امکان ورود و سفارش جدید ندارد</span>
            </div>
            <label className="acc-switch">
              <input type="checkbox" checked={openCustomer.status === "blocked"} onChange={(e) => onToggleBlock(openCustomer.phone, e.target.checked)} />
              <span className="track" />
              <span className="thumb" />
            </label>
          </div>

          <div className="adm-cell-sub" style={{ marginBottom: 8 }}>
            تاریخچه سفارش
          </div>
          {history.length ? (
            history.map((o) => (
              <div className="adm-item-line" key={o.orderNo}>
                <span>{o.orderNo}</span>
                <StatusPill status={o.status} />
                <span>{fmtPrice(o.estimatedTotal)} تومان</span>
              </div>
            ))
          ) : (
            <p className="hint">هنوز سفارشی ثبت نشده</p>
          )}
        </AppModal>
      ) : null}
    </div>
  );
}
