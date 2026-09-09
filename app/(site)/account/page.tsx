"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Icon } from "@/lib/icons";
import { pageHref } from "@/lib/page";
import { BRAND } from "@/lib/data";
import { Profile, AssistantPrefs } from "@/lib/profile";
import { fmtPrice, faNum, qtyLabelBySale, toFa } from "@/lib/format";
import { toast } from "@/lib/toast";
import {
  ORDER_STATUS_LABEL,
  PAY_METHOD_LABEL,
  PAY_STATUS_LABEL,
  dayLabel,
  orderWhatsappUrl,
  slotLabel,
  type PublicOrder,
} from "@/lib/order";

type TabId = "overview" | "profile" | "orders" | "settings";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "نمای کلی", icon: "grid" },
  { id: "profile", label: "اطلاعات من", icon: "note" },
  { id: "orders", label: "سفارش‌های من", icon: "package" },
  { id: "settings", label: "تنظیمات", icon: "shield" },
];

function orderDate(o: PublicOrder) {
  return new Date(o.createdAt).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

export default function AccountPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [assistantOn, setAssistantOn] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const local = Profile.read();
    setAssistantOn(!AssistantPrefs.isDisabled());

    let cancelled = false;
    (async () => {
      try {
        const [meRes, orderRes] = await Promise.all([fetch("/api/me"), fetch("/api/orders")]);
        if (meRes.ok) {
          const me = await meRes.json();
          if (!cancelled) {
            setName(me.name || "");
            setPhone(me.phone || session?.user.phone || "");
            setAddress(me.address || "");
            Profile.write({ name: me.name || "", phone: me.phone || "", address: me.address || "" });
          }
        } else if (!cancelled) {
          setName(local.name || session?.user.name || "");
          setPhone(session?.user.phone || local.phone || "");
          setAddress(local.address || "");
        }
        if (orderRes.ok) {
          const data = await orderRes.json();
          if (!cancelled) setOrders(data.orders || []);
        }
      } catch {
        if (!cancelled) {
          setName(local.name || session?.user.name || "");
          setPhone(session?.user.phone || local.phone || "");
          setAddress(local.address || "");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user.phone, session?.user.name]);

  const stats = useMemo(
    () => ({
      count: orders.length,
      total: orders.reduce((s, o) => s + (o.finalTotal ?? o.estimatedTotal), 0),
      last: orders.length ? orderDate(orders[0]) : "—",
    }),
    [orders]
  );

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const addr = address.trim();
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, address: addr }),
      });
      if (!res.ok) {
        toast("ذخیره اطلاعات انجام نشد");
        return;
      }
      Profile.write({ name: n, phone, address: addr });
      await update({ name: n });
      toast("اطلاعات شما ذخیره شد");
    } catch {
      toast("ذخیره اطلاعات انجام نشد");
    }
  }

  function toggleAssistant(on: boolean) {
    setAssistantOn(on);
    AssistantPrefs.setDisabled(!on);
    location.reload();
  }

  async function clearProfile() {
    if (!confirm("نام و آدرس ذخیره‌شده پاک شود؟ شماره موبایل حساب باقی می‌ماند.")) return;
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "", address: "" }),
      });
      Profile.write({ name: "", phone, address: "" });
      setName("");
      setAddress("");
      await update({ name: "" });
      toast("اطلاعات پروفایل پاک شد");
    } catch {
      toast("پاک‌کردن اطلاعات انجام نشد");
    }
  }

  async function cancelOrder(orderNo: string) {
    if (!confirm("این سفارش لغو شود؟")) return;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNo)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "لغو سفارش انجام نشد");
        return;
      }
      setOrders((list) => list.map((o) => (o.orderNo === orderNo ? data.order : o)));
      toast("سفارش لغو شد");
    } catch {
      toast("لغو سفارش انجام نشد");
    }
  }

  const initial = name.trim() ? name.trim()[0] : null;

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="user" /> حساب کاربری
          </h1>
          <p>با شماره موبایل وارد شده‌اید؛ مشخصات برای سفارش‌های بعدی ذخیره می‌شود</p>
        </div>
      </div>

      <main className="container">
        <div className="acc-layout">
          <aside className="acc-side">
            <div className="acc-user">
              <span className="acc-avatar">{initial ? initial : <Icon name="user" />}</span>
              <div>
                <div className="acc-user-name">{name.trim() || "کاربر گرامی"}</div>
                <div className="acc-user-sub">{phone.trim() ? toFa(phone) : "شماره موبایل ثبت نشده"}</div>
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
              <button type="button" className="acc-nav-btn" onClick={() => signOut({ callbackUrl: "/" })}>
                <Icon name="close" /> خروج از حساب
              </button>
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
                  orders.slice(0, 2).map((o) => <OrderCard key={o.id} order={o} onCancel={cancelOrder} />)
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
                      <input id="a-phone" className="auth-readonly" dir="ltr" value={phone} readOnly />
                      <span className="hint">برای تغییر شماره باید دوباره با موبایل جدید وارد شوید</span>
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
                  <p>{loaded ? `${faNum.format(orders.length)} سفارش ثبت‌شده` : ""}</p>
                </div>
                {loaded && !orders.length ? (
                  <EmptyOrders />
                ) : (
                  orders.map((o) => <OrderCard key={o.id} order={o} onCancel={cancelOrder} />)
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
                    <b>خروج از حساب</b>
                    <span className="hint">از این دستگاه خارج می‌شوید؛ برای ورود دوباره به کد تایید نیاز دارید</span>
                  </div>
                  <button type="button" className="acc-danger-btn" onClick={() => signOut({ callbackUrl: "/" })}>
                    خروج
                  </button>
                </div>

                <div className="acc-setting-row">
                  <div>
                    <b>پاک‌کردن اطلاعات پروفایل</b>
                    <span className="hint">نام و آدرس پیش‌فرض حذف می‌شود؛ شماره موبایل حساب باقی می‌ماند</span>
                  </div>
                  <button type="button" className="acc-danger-btn" onClick={clearProfile}>
                    پاک‌کردن
                  </button>
                </div>

                <p className="muted mt-2">
                  شماره موبایل هویت حساب شماست. نام و آدرس روی سرور ذخیره می‌شود تا در خریدهای بعدی تکمیل گردد.
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

function OrderCard({ order: o, onCancel }: { order: PublicOrder; onCancel: (no: string) => void }) {
  const total = o.finalTotal ?? o.estimatedTotal;
  return (
    <div className="order-card">
      <div className="o-head">
        <span className="o-total">
          {fmtPrice(total)} تومان{o.hasWeightItems && !o.finalTotal ? " (تقریبی)" : ""}
        </span>
        <span className={`o-badge o-status-${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span>
      </div>
      <div className="o-date">
        <b className="o-no" dir="ltr">
          {o.orderNo}
        </b>
        {" · "}
        {orderDate(o)} — {dayLabel(o.day)} ساعت {slotLabel(o.slot)}
      </div>
      <div className="order-items-list">
        {o.items.map((it) => (
          <span key={it.productId}>
            {it.name} × {qtyLabelBySale(it.sale, it.qty)}
          </span>
        ))}
      </div>
      <div className="muted" style={{ fontSize: ".75rem" }}>
        پرداخت: {PAY_METHOD_LABEL[o.paymentMethod]} — {PAY_STATUS_LABEL[o.paymentStatus]}
      </div>
      <div className="order-actions">
        <a className="btn btn-sm btn-outline" href={orderWhatsappUrl(o, "track")} target="_blank" rel="noopener">
          <Icon name="chat" /> پیگیری در واتس‌اپ
        </a>
        {o.status === "pending" ? (
          <button type="button" className="acc-danger-btn" onClick={() => onCancel(o.orderNo)}>
            لغو سفارش
          </button>
        ) : null}
      </div>
    </div>
  );
}
