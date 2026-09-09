"use client";

import { Icon } from "@/lib/icons";
import { fmtPrice, faNum } from "@/lib/format";
import type { AdminOrder } from "@/lib/admin-data";
import { REVENUE_SERIES, isCreatedToday } from "@/lib/admin-data";
import type { Product } from "@/lib/data";
import type { AdminView } from "./AdminShell";
import { StatusPill } from "./shared";
import { RevenueChart } from "./RevenueChart";
import { CategoryBars } from "./CategoryBars";

export function DashboardView({
  orders,
  products,
  onNavigate,
}: {
  orders: AdminOrder[];
  products: (Product & { sold: number })[];
  onNavigate: (v: AdminView) => void;
}) {
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const todayOrders = orders.filter(isCreatedToday);
  const todayRevenue = todayOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.estimatedTotal, 0);
  const unpaidCard = orders.filter((o) => o.paymentMethod !== "cod" && o.paymentStatus === "unpaid" && o.status !== "cancelled").length;
  const unavailable = products.filter((p) => !p.available).length;

  const stats = [
    { label: "فروش امروز", value: `${fmtPrice(todayRevenue)} تومان`, delta: "۱۲٪+ نسبت به دیروز", up: true, icon: "wallet" },
    { label: "سفارش‌های امروز", value: faNum.format(todayOrders.length), delta: "۲+ نسبت به دیروز", up: true, icon: "package" },
    { label: "در انتظار تایید", value: faNum.format(pendingCount), delta: "نیاز به بررسی", up: false, icon: "clock" },
    { label: "مشتری جدید هفته", value: faNum.format(4), delta: "۱+ نسبت به هفته قبل", up: true, icon: "users" },
  ];

  const attention: { icon: string; text: string; view: AdminView }[] = [];
  if (pendingCount) attention.push({ icon: "package", text: `${faNum.format(pendingCount)} سفارش در انتظار تایید است`, view: "orders" });
  if (unpaidCard) attention.push({ icon: "wallet", text: `${faNum.format(unpaidCard)} پرداخت کارت‌به‌کارت در انتظار تایید`, view: "payments" });
  if (unavailable) attention.push({ icon: "box", text: `${faNum.format(unavailable)} محصول ناموجود است`, view: "products" });

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>سلام عاطفه‌جان 👋</h1>
          <p>خلاصه فعالیت فروشگاه پرودید امروز</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate("reports")}>
          مشاهده گزارش کامل
        </button>
      </div>

      <div className="adm-stat-grid">
        {stats.map((s) => (
          <div className="acc-stat" key={s.label}>
            <span className="s-ico" style={{ background: "var(--wine-tint)", color: "var(--wine)" }}>
              <Icon name={s.icon} />
            </span>
            <div>
              <b>{s.value}</b>
              <span>{s.label}</span>
              <span style={{ display: "block", marginTop: 4, fontSize: "0.7rem", fontWeight: 700, color: s.up ? "var(--brand-green-deep)" : "var(--gold-deep)" }}>
                {s.up ? "▲" : "●"} {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>روند فروش ۱۴ روز اخیر</h3>
              <div className="sub">جمع مبلغ سفارش‌های نهایی‌شده، به تومان</div>
            </div>
            <span className="adm-pill adm-pill-done">
              <span className="dot" /> ۱۸٪+ نسبت به بازه قبل
            </span>
          </div>
          <RevenueChart data={REVENUE_SERIES} />
        </div>
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>نیازمند توجه</h3>
          </div>
          {attention.length ? (
            attention.map((a, i) => (
              <button type="button" className="adm-attention-row" key={i} onClick={() => onNavigate(a.view)}>
                <span className="txt">
                  <Icon name={a.icon} className="ico" />
                  {a.text}
                </span>
                <Icon name="chevron" className="ico" />
              </button>
            ))
          ) : (
            <p className="adm-card-pad" style={{ color: "var(--ink-2)", fontSize: "0.82rem" }}>
              همه‌چیز مرتب است ✨
            </p>
          )}
        </div>
      </div>

      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>سفارش‌های اخیر</h3>
              <div className="sub">۵ سفارش آخر ثبت‌شده</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate("orders")}>
              مشاهده همه
            </button>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.orderNo}>
                    <td>
                      <div className="adm-cell-main">{o.orderNo}</div>
                      <div className="adm-cell-sub">{o.customer.name}</div>
                    </td>
                    <td>{fmtPrice(o.estimatedTotal)} تومان</td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>فروش به تفکیک دسته</h3>
          </div>
          <CategoryBars products={products} />
        </div>
      </div>
    </div>
  );
}
