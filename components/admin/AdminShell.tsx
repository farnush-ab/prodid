"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { toast } from "@/lib/toast";

export type AdminView =
  | "dashboard"
  | "orders"
  | "payments"
  | "products"
  | "categories"
  | "customers"
  | "team"
  | "delivery"
  | "assistant"
  | "security"
  | "settings"
  | "reports";

interface NavItem {
  id: AdminView;
  label: string;
  icon: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: "کلی", items: [{ id: "dashboard", label: "داشبورد", icon: "grid" }] },
  {
    label: "فروش",
    items: [
      { id: "orders", label: "سفارش‌ها", icon: "package" },
      { id: "payments", label: "پرداخت‌ها", icon: "wallet" },
    ],
  },
  {
    label: "فروشگاه",
    items: [
      { id: "products", label: "محصولات", icon: "box" },
      { id: "categories", label: "دسته‌بندی‌ها", icon: "store" },
    ],
  },
  {
    label: "افراد",
    items: [
      { id: "customers", label: "مشتریان", icon: "users" },
      { id: "team", label: "تیم ادمین", icon: "shield" },
    ],
  },
  {
    label: "عملیات",
    items: [
      { id: "delivery", label: "ارسال و تحویل", icon: "truck" },
      { id: "assistant", label: "دستیار هوشمند", icon: "chat" },
    ],
  },
  { label: "امنیت", items: [{ id: "security", label: "ورود و OTP", icon: "shield" }] },
  {
    label: "پلتفرم",
    items: [
      { id: "settings", label: "تنظیمات فروشگاه", icon: "gear" },
      { id: "reports", label: "گزارش‌ها", icon: "chart" },
    ],
  },
];

const NOTIFICATIONS = [
  { icon: "package", title: "سفارش جدید PRD-1049 ثبت شد", time: "۲ دقیقه پیش" },
  { icon: "wallet", title: "پرداخت کارت‌به‌کارت نیاز به تایید دارد", time: "۱۰ دقیقه پیش" },
  { icon: "shield", title: "یک شماره به دلیل تلاش زیاد مسدود شد", time: "۴۰ دقیقه پیش" },
  { icon: "box", title: "فیله ران مرغ زعفرانی رو به اتمام است", time: "۱ ساعت پیش" },
];

export function AdminShell({
  active,
  onNavigate,
  pendingOrders,
  maintenanceOn,
  onSearch,
  children,
}: {
  active: AdminView;
  onNavigate: (v: AdminView) => void;
  pendingOrders: number;
  maintenanceOn: boolean;
  onSearch?: (q: string) => { id: string; label: string; view: AdminView }[];
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = query.trim() && onSearch ? onSearch(query.trim()) : [];

  function go(v: AdminView) {
    onNavigate(v);
    setNavOpen(false);
  }

  return (
    <div className={`adm-shell${navOpen ? " nav-open" : ""}`}>
      <div className="adm-shell-backdrop" onClick={() => setNavOpen(false)} />
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <span className="adm-brand-mark">
            <Icon name="flame" />
          </span>
          <div className="adm-brand-text">
            <b>پرودید</b>
            <span>پنل مدیریت</span>
          </div>
        </div>
        <nav className="adm-sidebar-scroll">
          {NAV.map((group) => (
            <div className="adm-nav-group" key={group.label}>
              <div className="adm-nav-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`adm-nav-btn${active === item.id ? " active" : ""}`}
                  onClick={() => go(item.id)}
                >
                  <span className="ico">
                    <Icon name={item.icon} />
                  </span>
                  {item.label}
                  {item.id === "orders" && pendingOrders > 0 ? <span className="count">{pendingOrders}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-sidebar-foot">
          <div className="adm-mini-profile">
            <span className="adm-mini-avatar">ع</span>
            <div className="adm-mini-profile-text">
              <b>عاطفه رستمی</b>
              <span>مالک فروشگاه</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="adm-main">
        {maintenanceOn ? (
          <div className="adm-maintenance-banner">
            <Icon name="info" /> حالت تعمیر و نگهداری فعال است — فروشگاه برای مشتریان قابل خرید نیست.
          </div>
        ) : null}

        <header className="adm-topbar">
          <button type="button" className="adm-menu-toggle" onClick={() => setNavOpen(true)} aria-label="باز کردن منو">
            <Icon name="grid" />
          </button>
          <div className="adm-search">
            <Icon name="search" className="ico" />
            <input
              type="text"
              placeholder="جستجوی سفارش، محصول یا مشتری…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setQuery(""), 150)}
            />
            {results.length > 0 ? (
              <div className="adm-dropdown">
                {results.slice(0, 7).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="adm-dropdown-item"
                    onMouseDown={() => {
                      go(r.view);
                      setQuery("");
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="adm-topbar-spacer" />
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="adm-icon-btn"
              onClick={() => {
                setBellOpen((v) => !v);
                setProfileOpen(false);
              }}
              aria-label="اعلان‌ها"
            >
              <Icon name="bell" />
              <span className="dot" />
            </button>
            {bellOpen ? (
              <div className="adm-dropdown">
                {NOTIFICATIONS.map((n, i) => (
                  <div className="adm-dropdown-item" key={i}>
                    <Icon name={n.icon} />
                    <span>
                      {n.title}
                      <small>{n.time}</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="adm-profile-btn"
              onClick={() => {
                setProfileOpen((v) => !v);
                setBellOpen(false);
              }}
            >
              <span className="adm-mini-avatar" style={{ width: 26, height: 26, fontSize: "0.7rem" }}>
                ع
              </span>
              <span>
                <span className="name" style={{ display: "block" }}>
                  عاطفه رستمی
                </span>
                <span className="role">مالک</span>
              </span>
            </button>
            {profileOpen ? (
              <div className="adm-dropdown" style={{ width: 190 }}>
                <button type="button" className="adm-dropdown-item" onClick={() => { go("settings"); setProfileOpen(false); }}>
                  <Icon name="gear" /> تنظیمات فروشگاه
                </button>
                <button type="button" className="adm-dropdown-item" onClick={() => { go("team"); setProfileOpen(false); }}>
                  <Icon name="shield" /> تیم ادمین
                </button>
                <button
                  type="button"
                  className="adm-dropdown-item"
                  style={{ color: "var(--danger)" }}
                  onClick={() => {
                    toast("این یک نسخه نمایشی است");
                    setProfileOpen(false);
                  }}
                >
                  <Icon name="arrow" /> خروج
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="adm-viewport" onClick={() => { setBellOpen(false); setProfileOpen(false); }}>
          {children}
        </main>
      </div>
    </div>
  );
}
