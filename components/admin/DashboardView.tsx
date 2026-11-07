"use client";

import { Icon } from "@/lib/icons";
import { fmtPrice, faNum } from "@/lib/format";
import type { AdminOrder } from "@/lib/admin-data";
import { isCreatedToday } from "@/lib/admin-data";
import type { Category, Product } from "@/lib/data";
import type { OrderStatus } from "@/lib/order";
import type { AdminView } from "./AdminShell";
import { orderPayable } from "@/lib/coupon";
import { StatusPill } from "./shared";
import { RevenueChart } from "./RevenueChart";
import { CategoryBars } from "./CategoryBars";

export function DashboardView({
  orders,
  products,
  revenueSeries,
  greetingName,
  categories,
  onNavigate,
  onDrillToOrders,
}: {
  orders: AdminOrder[];
  products: (Product & { sold: number })[];
  revenueSeries: number[];
  greetingName?: string;
  categories: Category[];
  onNavigate: (v: AdminView) => void;
  onDrillToOrders: (status: OrderStatus | "all") => void;
}) {
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const activeCount = orders.filter((o) => ["confirmed", "preparing", "delivering"].includes(o.status)).length;
  const todayOrders = orders.filter(isCreatedToday);
  const todayRevenue = todayOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + orderPayable(o), 0);
  const yesterdayRev = revenueSeries.length >= 2 ? revenueSeries[revenueSeries.length - 2] : 0;
  const revDelta = yesterdayRev ? Math.round(((todayRevenue - yesterdayRev) / yesterdayRev) * 100) : 0;
  const yesterdayCount = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
    }).length;
  })();
  const countDelta = todayOrders.length - yesterdayCount;
  const unpaidCard = orders.filter((o) => o.paymentMethod !== "cod" && o.paymentStatus === "unpaid" && o.status !== "cancelled").length;
  const unavailable = products.filter((p) => !p.available).length;

  const metrics = [
    {
      label: "فروش امروز",
      value: fmtPrice(todayRevenue),
      unit: "تومان",
      delta: revDelta ? `${Math.abs(revDelta)}٪${revDelta > 0 ? "+" : "−"} نسبت به دیروز` : "نسبت به دیروز",
      tone: revDelta > 0 ? ("up" as const) : revDelta < 0 ? ("alert" as const) : ("flat" as const),
      icon: "wallet",
      bg: "var(--brand-green-tint)",
      fg: "var(--brand-green-deep)",
      go: () => onNavigate("reports"),
    },
    {
      label: "سفارش‌های امروز",
      value: faNum.format(todayOrders.length),
      unit: "سفارش",
      delta: countDelta ? `${countDelta > 0 ? "+" : ""}${faNum.format(countDelta)} نسبت به دیروز` : "بدون تغییر نسبت به دیروز",
      tone: countDelta > 0 ? ("up" as const) : countDelta < 0 ? ("alert" as const) : ("flat" as const),
      icon: "package",
      bg: "var(--wine-tint)",
      fg: "var(--wine)",
      go: () => onDrillToOrders("all"),
    },
    {
      label: "در انتظار تایید",
      value: faNum.format(pendingCount),
      unit: "سفارش",
      delta: pendingCount ? "نیاز به بررسی" : "چیزی معطل نمانده",
      tone: pendingCount ? ("alert" as const) : ("flat" as const),
      icon: "clock",
      bg: "var(--gold-tint)",
      fg: "var(--gold-deep)",
      go: () => onDrillToOrders("pending"),
    },
    {
      label: "در جریان ارسال",
      value: faNum.format(activeCount),
      unit: "سفارش",
      delta: "تایید تا تحویل",
      tone: "flat" as const,
      icon: "truck",
      bg: "var(--brand-orange-tint)",
      fg: "var(--brand-orange-deep)",
      go: () => onDrillToOrders("preparing"),
    },
  ];

  const tasks: { icon: string; bg: string; fg: string; title: string; sub: string; go: () => void }[] = [];
  if (pendingCount)
    tasks.push({
      icon: "package",
      bg: "var(--gold-tint)",
      fg: "var(--gold-deep)",
      title: `${faNum.format(pendingCount)} سفارش منتظر تایید شماست`,
      sub: "تا تایید نشوند وارد مرحله آماده‌سازی نمی‌شوند",
      go: () => onDrillToOrders("pending"),
    });
  if (unpaidCard)
    tasks.push({
      icon: "wallet",
      bg: "var(--wine-tint)",
      fg: "var(--wine)",
      title: `${faNum.format(unpaidCard)} پرداخت در انتظار تایید دستی`,
      sub: "کارت‌به‌کارت باید بعد از دیدن رسید تایید شود",
      go: () => onNavigate("payments"),
    });
  if (unavailable)
    tasks.push({
      icon: "box",
      bg: "rgba(214, 69, 51, 0.1)",
      fg: "var(--danger)",
      title: `${faNum.format(unavailable)} محصول ناموجود است`,
      sub: "در فروشگاه به مشتری نمایش داده نمی‌شود",
      go: () => onNavigate("products"),
    });

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>سلام{greetingName?.trim() ? ` ${greetingName.trim().split(" ")[0]}‌جان` : ""} 👋</h1>
          <p>خلاصه امروز فروشگاه پرودید — از هر کارت می‌توانید مستقیم وارد همان بخش شوید</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate("reports")}>
          <Icon name="chart" /> گزارش کامل
        </button>
      </div>

      <div className="adm-stat-grid">
        {metrics.map((m) => (
          <button type="button" className="adm-metric" key={m.label} onClick={m.go}>
            <span className="m-ico" style={{ background: m.bg, color: m.fg }}>
              <Icon name={m.icon} />
            </span>
            <span className="m-body">
              <span className="m-label">{m.label}</span>
              <span className="m-value">
                {m.value}
                <small>{m.unit}</small>
              </span>
              <span className={`m-delta ${m.tone}`}>
                {m.tone === "up" ? "▲" : m.tone === "alert" ? "●" : "—"} {m.delta}
              </span>
            </span>
          </button>
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
              <span className="dot" /> ۱۴ روز اخیر
            </span>
          </div>
          <RevenueChart data={revenueSeries.length ? revenueSeries : [0, 0]} />
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>کارهای امروز</h3>
              <div className="sub">{tasks.length ? `${faNum.format(tasks.length)} مورد نیاز به رسیدگی دارد` : "همه‌چیز رسیدگی شده"}</div>
            </div>
          </div>
          {tasks.length ? (
            tasks.map((t, i) => (
              <button type="button" className="adm-task" key={i} onClick={t.go}>
                <span className="t-ico" style={{ background: t.bg, color: t.fg }}>
                  <Icon name={t.icon} />
                </span>
                <span className="t-body">
                  <span className="t-title">{t.title}</span>
                  <span className="t-sub">{t.sub}</span>
                </span>
                <Icon name="chevron" className="t-go" />
              </button>
            ))
          ) : (
            <div className="adm-empty">
              <div className="e-ico">
                <Icon name="check" />
              </div>
              <b>کارها تمام شد</b>
              <p>سفارش معطل، پرداخت تاییدنشده و محصول ناموجودی وجود ندارد.</p>
            </div>
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDrillToOrders("all")}>
              مشاهده همه <Icon name="chevron" />
            </button>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.orderNo} className="clickable" tabIndex={0} onClick={() => onDrillToOrders("all")}>
                    <td>
                      <div className="adm-cell-main">{o.orderNo}</div>
                      <div className="adm-cell-sub">{o.customer.name}</div>
                    </td>
                    <td className="amount">{fmtPrice(orderPayable(o))} تومان</td>
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
            <div>
              <h3>فروش به تفکیک دسته</h3>
              <div className="sub">۳۰ روز اخیر</div>
            </div>
          </div>
          <CategoryBars products={products} categories={categories} />
        </div>
      </div>
    </div>
  );
}
