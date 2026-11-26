"use client";

import { useMemo, useState } from "react";
import { fmtPrice, faNum } from "@/lib/format";
import type { AdminCustomer, AdminOrder } from "@/lib/admin-data";
import { EmptyRow } from "./shared";
import { CustomerProfile } from "./CustomerProfile";

export function CustomersView({
  customers,
  orders,
  openPhone,
  onOpen,
  canWallet,
  canNudge,
  canBlock,
  onToggleBlock,
}: {
  customers: AdminCustomer[];
  orders: AdminOrder[];
  openPhone: string | null;
  onOpen: (phone: string | null) => void;
  canWallet: boolean;
  canNudge: boolean;
  canBlock: boolean;
  onToggleBlock: (phone: string, value: boolean) => void;
}) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  const openCustomer =
    customers.find((c) => c.phone === openPhone) ||
    (openPhone ? { name: "بدون نام", phone: openPhone, orders: 0, spent: 0, last: "—", status: "active" as const } : null);

  if (openCustomer) {
    return (
      <CustomerProfile
        key={openCustomer.phone}
        customer={openCustomer}
        orders={orders}
        canWallet={canWallet}
        canNudge={canNudge}
        canBlock={canBlock}
        onBack={() => onOpen(null)}
        onToggleBlock={onToggleBlock}
      />
    );
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>مشتریان</h1>
          <p>برای دیدن پروندهٔ کامل — الگوی خرید، نمودارها، کیف پول و پیام‌ها — روی هر مشتری بزنید</p>
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
                  <tr key={c.phone} className="clickable" onClick={() => onOpen(c.phone)}>
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
    </div>
  );
}
