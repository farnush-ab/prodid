"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { pageHref } from "@/lib/page";
import { BRAND, getProduct } from "@/lib/data";
import { Profile, Orders, AssistantPrefs, type Order, type OrderItem } from "@/lib/profile";
import { fmtPrice, faNum, qtyLabel } from "@/lib/format";
import { toast } from "@/lib/toast";

type TabId = "overview" | "profile" | "orders" | "settings";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "نمای کلی", icon: "grid" },
  { id: "profile", label: "اطلاعات من", icon: "note" },
  { id: "orders", label: "سفارش‌های من", icon: "package" },
  { id: "settings", label: "تنظیمات", icon: "shield" },
];

function orderDate(o: Order) {
  return new Date(o.date).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

function orderItemQty(it: OrderItem) {
  const p = getProduct(it.id);
  return p ? qtyLabel(p, it.qty) : `${faNum.format(it.qty)} عدد`;
}

function trackOnWhatsapp(o: Order) {
  const lines = [
    "*پیگیری سفارش پرودید*",
    `تاریخ سفارش: ${orderDate(o)}`,
    `زمان تحویل: ${o.day} — ساعت ${o.slot}`,
    "──────────────",
    ...o.items.map((it) => `${it.name} × ${orderItemQty(it)}`),
    "──────────────",
    `مبلغ: ${fmtPrice(o.total)} تومان`,
  ];
  window.open(`https://wa.me/${BRAND.phoneIntl}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [assistantOn, setAssistantOn] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const profile = Profile.read();
    setName(profile.name || "");
    setPhone(profile.phone || "");
    setAddress(profile.address || "");
    setOrders(Orders.read());
    setAssistantOn(!AssistantPrefs.isDisabled());
    setLoaded(true);
  }, []);

  const stats = useMemo(
    () => ({
      count: orders.length,
      total: orders.reduce((s, o) => s + o.total, 0),
      last: orders.length ? orderDate(orders[0]) : "—",
    }),
    [orders]
  );

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    Profile.write({ name: name.trim(), phone: phone.trim(), address: address.trim() });
    toast("اطلاعات شما ذخیره شد");
  }

  function toggleAssistant(on: boolean) {
    setAssistantOn(on);
    AssistantPrefs.setDisabled(!on);
    location.reload();
  }

  function clearProfile() {
    if (!confirm("مشخصات ذخیره‌شده (نام، موبایل، آدرس) پاک شود؟")) return;
    Profile.clear();
    setName("");
    setPhone("");
    setAddress("");
    toast("اطلاعات پروفایل پاک شد");
  }

  function clearOrders() {
    if (!confirm("تاریخچه سفارش‌های ذخیره‌شده روی این دستگاه پاک شود؟")) return;
    Orders.clear();
    setOrders([]);
    toast("تاریخچه سفارش‌ها پاک شد");
  }

  const initial = name.trim() ? name.trim()[0] : null;

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="user" /> حساب کاربری
          </h1>
          <p>اطلاعات شما فقط روی همین دستگاه ذخیره می‌شود و در خریدهای بعدی به‌صورت خودکار تکمیل می‌گردد</p>
        </div>
      </div>

      <main className="container">
        <div className="acc-layout">
          <aside className="acc-side">
            <div className="acc-user">
              <span className="acc-avatar">{initial ? initial : <Icon name="user" />}</span>
              <div>
                <div className="acc-user-name">{name.trim() || "کاربر گرامی"}</div>
                <div className="acc-user-sub">{phone.trim() || "شماره موبایل ثبت نشده"}</div>
              </div>
            </div>

            <nav className="acc-nav">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`acc-nav-btn${activeTab === t.id ? " active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <Icon name={t.icon} />
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="acc-side-links">
              <Link className="acc-side-link" href={pageHref("shop")}>
                <Icon name="store" /> رفتن به فروشگاه
              </Link>
              <Link className="acc-side-link" href={pageHref("faq")}>
                <Icon name="chat" /> سوالات متداول
              </Link>
              <Link className="acc-side-link" href={pageHref("terms")}>
                <Icon name="note" /> قوانین و مقررات
              </Link>
              <a className="acc-side-link" href={`tel:${BRAND.phone}`}>
                <Icon name="phone" /> تماس با پشتیبانی
              </a>
            </div>
          </aside>

          <section className="acc-content">
            {activeTab === "overview" && (
              <div>
                <div className="banner">
                  <div>
                    <h3>
                      <Icon name="award" /> خوش آمدید{name.trim() ? `، ${name.trim()}` : ""}!
                    </h3>
                    <p>خلاصه فعالیت حساب و سفارش‌های شما در پرودید</p>
                  </div>
                  <Link className="btn btn-primary" href={pageHref("shop")}>
                    سفارش جدید
                  </Link>
                </div>

                <div className="acc-stats">
                  <div className="acc-stat">
                    <span className="s-ico">
                      <Icon name="package" />
                    </span>
                    <div>
                      <b>{loaded ? faNum.format(stats.count) : "—"}</b>
                      <span>تعداد سفارش‌ها</span>
                    </div>
                  </div>
                  <div className="acc-stat">
                    <span className="s-ico">
                      <Icon name="wallet" />
                    </span>
                    <div>
                      <b>{loaded ? fmtPrice(stats.total) : "—"}</b>
                      <span>مجموع خرید (تومان)</span>
                    </div>
                  </div>
                  <div className="acc-stat">
                    <span className="s-ico">
                      <Icon name="clock" />
                    </span>
                    <div>
                      <b style={{ fontSize: "0.85rem" }}>{loaded ? stats.last : "—"}</b>
                      <span>آخرین سفارش</span>
                    </div>
                  </div>
                </div>

                <div className="acc-panel-head">
                  <h2>سفارش‌های اخیر</h2>
                  {orders.length > 0 && (
                    <button type="button" className="section-link" onClick={() => setActiveTab("orders")}>
                      مشاهده همه <Icon name="arrow" />
                    </button>
                  )}
                </div>

                {loaded && !orders.length ? (
                  <EmptyOrders />
                ) : (
                  orders.slice(0, 2).map((o, i) => <OrderCard key={i} order={o} />)
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="form-card">
                <h3>
                  <Icon name="note" /> اطلاعات من
                </h3>
                <form onSubmit={saveProfile}>
                  <div className="form-grid">
                    <div>
                      <label htmlFor="a-name">نام و نام خانوادگی</label>
                      <input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلا: علی محمدی" />
                    </div>
                    <div>
                      <label htmlFor="a-phone">شماره موبایل</label>
                      <input
                        id="a-phone"
                        dir="ltr"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0913xxxxxxx"
                      />
                    </div>
                    <div>
                      <label htmlFor="a-address">آدرس پیش‌فرض</label>
                      <textarea
                        id="a-address"
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="محله، خیابان، کوچه، پلاک"
                      />
                    </div>
                    <button type="submit" className="btn btn-dark">
                      ذخیره اطلاعات
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                <div className="acc-panel-head">
                  <h2>سفارش‌های من</h2>
                  <p>{loaded ? `${faNum.format(orders.length)} سفارش ثبت‌شده روی این دستگاه` : ""}</p>
                </div>
                {loaded && !orders.length ? (
                  <EmptyOrders />
                ) : (
                  orders.map((o, i) => <OrderCard key={i} order={o} />)
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="form-card">
                <h3>
                  <Icon name="shield" /> تنظیمات
                </h3>

                <div className="acc-setting-row">
                  <div>
                    <b>دستیار هوشمند پرودید</b>
                    <span className="hint">نمایش دکمه شناور دستیار هوشمند در گوشه صفحات سایت</span>
                  </div>
                  <label className="acc-switch">
                    <input type="checkbox" checked={assistantOn} onChange={(e) => toggleAssistant(e.target.checked)} />
                    <span className="track"></span>
                    <span className="thumb"></span>
                  </label>
                </div>

                <div className="acc-setting-row">
                  <div>
                    <b>پاک‌کردن اطلاعات پروفایل</b>
                    <span className="hint">نام، شماره موبایل و آدرس پیش‌فرض ذخیره‌شده حذف می‌شود</span>
                  </div>
                  <button type="button" className="acc-danger-btn" onClick={clearProfile}>
                    پاک‌کردن
                  </button>
                </div>

                <div className="acc-setting-row">
                  <div>
                    <b>پاک‌کردن تاریخچه سفارش‌ها</b>
                    <span className="hint">سفارش‌های ثبت‌شده روی این دستگاه حذف می‌شود (سفارش‌های ثبت‌شده در فروشگاه تحت تاثیر قرار نمی‌گیرند)</span>
                  </div>
                  <button type="button" className="acc-danger-btn" onClick={clearOrders}>
                    پاک‌کردن
                  </button>
                </div>

                <p className="muted mt-2">
                  اطلاعات حساب کاربری شما فقط روی همین دستگاه و مرورگر ذخیره می‌شود و به هیچ سروری ارسال نمی‌گردد.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function EmptyOrders() {
  return (
    <div className="empty-state">
      <div className="e-ico">
        <Icon name="package" />
      </div>
      <b>هنوز سفارشی ثبت نکرده‌اید</b>
      از فروشگاه، محصولات تازه و خوشمزه انتخاب کنید.
      <div className="mt-2">
        <Link className="btn btn-primary" href={pageHref("shop")}>
          اولین سفارش را ثبت کنید
        </Link>
      </div>
    </div>
  );
}

function OrderCard({ order: o }: { order: Order }) {
  return (
    <div className="order-card">
      <div className="o-head">
        <span className="o-total">{fmtPrice(o.total)} تومان</span>
        <span className="o-badge">{o.day}</span>
      </div>
      <div className="o-date">
        {orderDate(o)} — ساعت {o.slot}
      </div>
      <div className="order-items-list">
        {o.items.map((it, i) => (
          <span key={i}>
            {it.name} × {orderItemQty(it)}
          </span>
        ))}
      </div>
      <div className="muted" style={{ fontSize: ".75rem" }}>
        پرداخت: {o.pay}
      </div>
      <div className="order-actions">
        <button type="button" className="btn btn-sm btn-outline" onClick={() => trackOnWhatsapp(o)}>
          <Icon name="chat" /> پیگیری در واتس‌اپ
        </button>
      </div>
    </div>
  );
}
