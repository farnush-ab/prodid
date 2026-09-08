# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

پرودید (Prodid) — a Persian/RTL e-commerce storefront (protein/food shop in Kashan, Iran) built with **Next.js 14 (App Router) + TypeScript + React 18**. It was migrated from a pure static HTML/CSS/JS site, preserving exact visual appearance and behavior. There is **no backend/API** — all persistence is client-side `localStorage`, and checkout is completed by handing off to WhatsApp (`wa.me` links), not a payment gateway.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build; must emit static-prerendered routes for all pages
npm run start         # serve production build
npm run lint          # next lint
npx tsc --noEmit      # typecheck (no separate test suite exists)
```

There is no automated test suite. Verification is: `npx tsc --noEmit` clean, `npm run build` succeeds with all routes statically prerendered, and manual/Playwright browser checks (zero console/hydration errors).

## Architecture

### Routing
Every page under `app/*/page.tsx` is a **Client Component** (`"use client"`) — the whole site is interactive/localStorage-driven rather than server-rendered data. Route folders that need per-route `<title>` metadata (which can't come from a client `page.tsx`) get a thin `layout.tsx` sibling that only exports `metadata` and passes `children` through (see `app/product/layout.tsx`, `app/cart/layout.tsx`, etc.). `app/layout.tsx` is the root shell: it wraps every page with `<Header>`, `<BottomNav>` (mobile), `<Footer>`, the floating `<Assistant>` widget, `<VpnNotice>`, `<TiltProvider>` (3D tilt effect), and `<ToastHost>`.

The product page (`app/product/page.tsx`) is not a dynamic route — it reads `?id=` via `useSearchParams()`, mirroring the original static site's query-param navigation. Any page using `useSearchParams()` (product, cart, checkout, shop) needs a `Suspense` boundary.

### Cart state — hydration-safe pattern (important, easy to break)
`lib/cart.ts` implements the cart as a manual external store over `localStorage`, exposed via `useCart()` (`useSyncExternalStore`). **Never read `Cart.count()/items()/...` directly during render** — those talk to `localStorage` and return different values on the server (always empty) than on the client, which throws React hydration errors (#425/#418/#423). The correct pattern, used everywhere (`Header`, `BottomNav`, `ProductCard`, cart/checkout/product pages):

```ts
const cart = useCart();                 // snapshot, hydration-safe
const qty = cartQty(cart, id);
const items = cartItems(cart);
const total = cartTotal(cart);
```

`Cart.add/set/setGrams/remove/clear` are **mutations only** — call them from event handlers, never during render. Same rule applies to `lib/profile.ts`'s `Profile.read()`/`Orders.read()`: load them in a `useEffect`, not inline during render.

Products can be sold weighted (`sale: "w"`, price = per-kg, min order 100g / `MIN_WEIGHT` in `lib/cart.ts`) or unit (`sale: "u"`, price = per package). `step()`/`defaultAdd()` in `lib/cart.ts` branch on this.

### Data layer
`lib/data.ts` is the single source of truth for `BRAND` info, `CATEGORIES`, and `PRODUCTS` (id, name, category, price, `sale` type, icon, description, badge, availability). Editing products/prices/categories means editing this file only — no CMS/DB. `price: null` means "قیمت روی تماس" (price on inquiry); `available: false` marks a product out of stock.

### Assistant widget (dev-mode gotcha)
`components/Assistant.tsx` builds its floating chat widget imperatively into the DOM in a `useEffect`. In React 18 Strict Mode, `next dev` mounts→cleans up→remounts every component once; the cleanup function must reset the `built.current` guard (`built.current = false`) or the widget's panel will silently fail to rebuild on the simulated remount (the walking-character animation still works because it's rebuilt in a separate effect) — this only manifests in `npm run dev`, not in production builds.

### Other client-side singletons
- `lib/profile.ts` — `Profile` (name/phone/address) and `Orders` (order history) in `localStorage`; `AssistantPrefs` toggles hiding the assistant widget.
- `lib/toast.tsx` — imperative toast API + `<ToastHost/>` mounted once in the root layout.
- `components/VpnNotice.tsx`, `components/TiltProvider.tsx` — global, mounted once in root layout, not per-page.
- `lib/nav.ts` / `lib/page.ts` — static nav link list and a `pageHref(id)` helper (Next.js routes are root-relative; this mirrors an equivalent helper from the old static site).

### Styling
`app/globals.css` is a verbatim port of the original static site's `styles.css` (only asset URLs rewritten to `/assets/...`). Preserve this file's behavior exactly when touching it — e.g. a `prefers-reduced-motion` fallback for `.reveal` elements is currently overridden by a later "3D tilt" block; this is a pre-existing quirk from the original site and should not be "fixed" incidentally while doing unrelated work.

### Deployment
Since this is now a Next.js app (not static output), it needs a Node.js host (e.g. Vercel) — GitHub Pages (used before the migration) no longer works.
