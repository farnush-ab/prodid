"use client";

import { Icon } from "@/lib/icons";
import { fmtPrice, faNum } from "@/lib/format";
import type { AdminOrder } from "@/lib/admin-data";
import { REVENUE_SERIES } from "@/lib/admin-data";
import type { Product } from "@/lib/data";
import { RevenueChart } from "./RevenueChart";
import { CategoryBars } from "./CategoryBars";

export function ReportsView({ orders, products }: { orders: AdminOrder[]; products: (Product & { sold: number })[] }) {
  const totalRevenue = REVENUE_SERIES.reduce((a, b) => a + b, 0);
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const avgOrder = orders.reduce((s, o) => s + o.estimatedTotal, 0) / orders.length;

  const stats = [
    { label: "فروش ۱۴ روز اخیر", value: fmtPrice(totalRevenue), unit: "تومان", icon: "wallet", bg: "var(--brand-green-tint)", fg: "var(--brand-green-deep)" },
    { label: "تعداد سفارش", value: faNum.format(orders.length), unit: "سفارش", icon: "package", bg: "var(--wine-tint)", fg: "var(--wine)" },
    { label: "میانگین ارزش سفارش", value: fmtPrice(Math.round(avgOrder)), unit: "تومان", icon: "chart", bg: "var(--brand-orange-tint)", fg: "var(--brand-orange-deep)" },
    { label: "نرخ لغو سفارش", value: faNum.format(Math.round((cancelled / orders.length) * 100)), unit: "درصد", icon: "close", bg: "rgba(214, 69, 51, 0.1)", fg: "var(--danger)" },
  ];

  const weightedSold = products.filter((p) => p.sale === "w").reduce((s, p) => s + p.sold, 0);
  const unitSold = products.filter((p) => p.sale === "u").reduce((s, p) => s + p.sold, 0);
  const totalSold = weightedSold + unitSold || 1;
  const weightedPct = Math.round((weightedSold / totalSold) * 100);

  const top = [...products].sort((a, b) => b.sold - a.sold).slice(0, 6);

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>گزارش‌ها</h1>
          <p>عملکرد فروش، پرفروش‌ترین محصولات و ترکیب سفارش‌های وزنی و عددی</p>
        </div>
      </div>

      <div className="adm-stat-grid">
        {stats.map((s) => (
          <div className="adm-metric" key={s.label}>
            <span className="m-ico" style={{ background: s.bg, color: s.fg }}>
              <Icon name={s.icon} />
            </span>
            <span className="m-body">
              <span className="m-label">{s.label}</span>
              <span className="m-value">
                {s.value}
                <small>{s.unit}</small>
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>فروش ۱۴ روز اخیر</h3>
              <div className="sub">تومان</div>
            </div>
          </div>
          <RevenueChart data={REVENUE_SERIES} height={200} />
        </div>
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>سهم دسته‌ها از فروش</h3>
          </div>
          <CategoryBars products={products} />
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>پرفروش‌ترین محصولات</h3>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>محصول</th>
                  <th>تعداد فروش</th>
                  <th>درآمد</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p, i) => (
                  <tr key={p.id}>
                    <td className="adm-cell-sub">{faNum.format(i + 1)}</td>
                    <td className="adm-cell-main">{p.name}</td>
                    <td className="amount">{faNum.format(p.sold)}</td>
                    <td className="amount">{fmtPrice(p.sold * (p.price || 200000))} تومان</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="adm-card adm-card-pad">
          <h3 style={{ marginBottom: 12, fontSize: "0.92rem" }}>ترکیب نوع فروش</h3>
          <div className="adm-bar-row" style={{ padding: "0 0 10px" }}>
            <span className="lbl">
              <span className="adm-swatch" style={{ background: "var(--brand-orange-solid)" }} />
              وزنی
            </span>
            <div className="adm-bar-track">
              <div className="adm-bar-fill" style={{ width: `${weightedPct}%`, background: "var(--brand-orange-solid)" }} />
            </div>
            <span className="amt">{faNum.format(weightedPct)}٪</span>
          </div>
          <div className="adm-bar-row" style={{ padding: 0 }}>
            <span className="lbl">
              <span className="adm-swatch" style={{ background: "#2a78d6" }} />
              عددی
            </span>
            <div className="adm-bar-track">
              <div className="adm-bar-fill" style={{ width: `${100 - weightedPct}%`, background: "#2a78d6" }} />
            </div>
            <span className="amt">{faNum.format(100 - weightedPct)}٪</span>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            سفارش‌های وزنی نیاز به هشدار «مبلغ نهایی پس از وزن‌کشی» دارند و معمولا مبلغ تقریبی کمی کمتر از نهایی ثبت می‌شود.
          </p>
        </div>
      </div>
    </div>
  );
}
