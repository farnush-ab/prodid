"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@/lib/icons";
import { BRAND } from "@/lib/data";
import { toFa } from "@/lib/format";
import { NAV_LINKS } from "@/lib/nav";
import { pageHref } from "@/lib/page";
import { useCart, cartCount } from "@/lib/cart";

function currentPageId(pathname: string | null) {
  if (!pathname || pathname === "/") return "index";
  return pathname.split("/")[1] || "index";
}

function SearchForm({ id }: { id: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className="header-search"
      id={id}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(`${pageHref("shop")}${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      }}
    >
      <input
        type="search"
        name="q"
        placeholder="جست‌وجوی محصول؛ مثلا کباب، ژامبون…"
        aria-label="جست‌وجو"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <span className="search-ico">
        <Icon name="search" />
      </span>
    </form>
  );
}

export function Header() {
  const n = cartCount(useCart());
  const pathname = usePathname();
  const page = currentPageId(pathname);
  const { status } = useSession();
  const [logoOk, setLogoOk] = useState(true);
  const accountHref = status === "unauthenticated" ? pageHref("login") : pageHref("account");

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="logo" href={pageHref("index")} aria-label={`پرودید — ${BRAND.slogan}`}>
          {logoOk ? (
            <img
              className="logo-img"
              src="/assets/img/logo.png"
              alt={`پرودید — ${BRAND.slogan}`}
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="logo-fallback">
              <span className="logo-mark">
                <Icon name="steak" />
              </span>
              <span className="logo-text">
                <span className="logo-name">پرودید</span>
                <br />
                <span className="logo-slogan">{BRAND.slogan}</span>
              </span>
            </span>
          )}
        </Link>

        <SearchForm id="search-desktop" />

        <a className="header-phone" href={`tel:${BRAND.phone}`}>
          <Icon name="phone" />
          <span>
            سفارش تلفنی <b className="num">{toFa(BRAND.phone)}</b>
          </span>
        </a>

        <div className="header-actions">
          <Link className="icon-btn" href={accountHref} title={status === "authenticated" ? "حساب کاربری" : "ورود به حساب"}>
            <Icon name="user" />
          </Link>
          <Link className="icon-btn" href={pageHref("cart")} title="سبد خرید">
            <Icon name="cart" />
            <span className="cart-badge">{n ? new Intl.NumberFormat("fa-IR").format(n) : ""}</span>
          </Link>
        </div>
      </div>

      <nav className="main-nav" aria-label="منوی اصلی">
        <div className="container">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.id}>
                <Link href={l.href} className={page === l.id || (l.id === "account" && page === "login") ? "active" : ""}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="mobile-search">
        <SearchForm id="search-mobile" />
      </div>
    </header>
  );
}
