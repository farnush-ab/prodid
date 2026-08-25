"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/lib/icons";
import { pageHref } from "@/lib/page";
import { useCart, cartCount } from "@/lib/cart";

function currentPageId(pathname: string | null) {
  if (!pathname || pathname === "/") return "index";
  return pathname.split("/")[1] || "index";
}

const ITEMS = [
  { id: "index", label: "خانه", ico: "home" },
  { id: "shop", label: "فروشگاه", ico: "store" },
  { id: "cart", label: "سبد خرید", ico: "cart", badge: true },
  { id: "account", label: "حساب", ico: "user" },
] as const;

export function BottomNav() {
  const n = cartCount(useCart());
  const pathname = usePathname();
  const page = currentPageId(pathname);

  return (
    <nav className="bottom-nav" aria-label="منوی موبایل">
      {ITEMS.map((it) => (
        <Link key={it.id} href={pageHref(it.id)} className={page === it.id ? "active" : ""}>
          <Icon name={it.ico} />
          {it.label}
          {"badge" in it && it.badge ? (
            <span className="cart-badge">{n ? new Intl.NumberFormat("fa-IR").format(n) : ""}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
