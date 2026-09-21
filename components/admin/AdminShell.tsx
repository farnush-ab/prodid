"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Icon } from "@/lib/icons";
import { canAccessSection, TEAM_ROLE_LABEL, type StaffRole } from "@/lib/roles";
import type { AdminMe, AdminNotification } from "@/lib/admin-state";

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
  | "reports"
  | "coupons";

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
      { id: "coupons", label: "تخفیف‌ها", icon: "award" },
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

const NOTIFICATIONS: AdminNotification[] = [];

export function AdminShell({
  active,
  onNavigate,
  pendingOrders,
  maintenanceOn,
  onSearch,
  role = "owner",
  me,
  notifications = NOTIFICATIONS,
  children,
}: {
  active: AdminView;
  onNavigate: (v: AdminView) => void;
  pendingOrders: number;
  maintenanceOn: boolean;
  onSearch?: (q: string) => { id: string; label: string; kind: string; icon: string; view: AdminView }[];
  role?: StaffRole;
  me?: AdminMe;
  notifications?: AdminNotification[];
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const displayName = me?.name?.trim() || "مدیر";
  const initial = displayName.charAt(0);
  const roleLabel = me?.role ? TEAM_ROLE_LABEL[me.role].split("—")[0].trim() : "مدیر";
  const results = query.trim() && onSearch ? onSearch(query.trim()) : [];

  /* «/» برای پرش به جستجو، Esc برای بستن آن — میان‌بر رایج پنل‌های مدیریتی */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        searchRef.current?.blur();
        setBellOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
          {NAV.map((group) => {
            const items = group.items.filter((item) => canAccessSection(role, item.id));
            if (!items.length) return null;
            return (
            <div className="adm-nav-group" key={group.label}>
              <div className="adm-nav-label">{group.label}</div>
              {items.map((item) => (
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
            );
          })}
        </nav>
        <div className="adm-sidebar-foot">
          <div className="adm-mini-profile">
            <span className="adm-mini-avatar">{initial}</span>
            <div className="adm-mini-profile-text">
              <b>{displayName}</b>
              <span>{roleLabel}</span>
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
              ref={searchRef}
              type="text"
              placeholder="جستجوی سفارش، محصول یا مشتری…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setQuery(""), 150)}
            />
            <span className="kbd">/</span>
            {query.trim() ? (
              <div className="adm-dropdown">
                {results.length ? (
                  results.slice(0, 7).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="adm-dropdown-item"
                      onMouseDown={() => {
                        go(r.view);
                        setQuery("");
                      }}
                    >
                      <Icon name={r.icon} />
                      <span>
                        {r.label}
                        <small>{r.kind}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="hint" style={{ padding: "14px 12px", margin: 0 }}>
                    چیزی با «{query.trim()}» پیدا نشد
                  </p>
                )}
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
              {notifications.length ? <span className="dot" /> : null}
            </button>
            {bellOpen ? (
              <div className="adm-dropdown">
                {notifications.length ? (
                  notifications.map((n, i) => (
                    <button
                      type="button"
                      className="adm-dropdown-item"
                      key={i}
                      onClick={() => {
                        if (n.view) go(n.view as AdminView);
                        setBellOpen(false);
                      }}
                    >
                      <Icon name={n.icon} />
                      <span>
                        {n.title}
                        <small>{n.time}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="hint" style={{ padding: "14px 12px", margin: 0 }}>
                    اعلان جدیدی نیست
                  </p>
                )}
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
                {initial}
              </span>
              <span>
                <span className="name" style={{ display: "block" }}>
                  {displayName}
                </span>
                <span className="role">{roleLabel}</span>
              </span>
            </button>
            {profileOpen ? (
              <div className="adm-dropdown" style={{ width: 190 }}>
                {canAccessSection(role, "settings") ? (
                  <button type="button" className="adm-dropdown-item" onClick={() => { go("settings"); setProfileOpen(false); }}>
                    <Icon name="gear" /> تنظیمات فروشگاه
                  </button>
                ) : null}
                {canAccessSection(role, "team") ? (
                  <button type="button" className="adm-dropdown-item" onClick={() => { go("team"); setProfileOpen(false); }}>
                    <Icon name="shield" /> تیم ادمین
                  </button>
                ) : null}
                <button
                  type="button"
                  className="adm-dropdown-item"
                  style={{ color: "var(--danger)" }}
                  onClick={() => {
                    setProfileOpen(false);
                    signOut({ callbackUrl: "/" });
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
