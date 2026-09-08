# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

پرودید (Prodid) — a Persian/RTL e-commerce storefront (protein/food shop in Kashan, Iran) built with **Next.js 14 (App Router) + TypeScript + React 18**. It started as a pure static HTML/CSS/JS site migrated to Next.js with all persistence in `localStorage` and checkout handed off to WhatsApp (`wa.me` links). **A real backend has since been added on top of that**: phone/OTP login via NextAuth and order placement/history via MongoDB (see "Backend / auth / orders" below). Large parts of the UI (cart badges, product cards, guest checkout) still work purely client-side against `localStorage`, so both layers coexist — check whether the code you're touching predates or postdates the backend addition before assuming either model.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000 — requires MongoDB reachable via MONGODB_URI (see .env.example) for auth/orders/account to work
npm run build        # production build
npm run start         # serve production build
npm run lint          # next lint
npx tsc --noEmit      # typecheck (no separate test suite exists)
```

Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` before running `dev`/`build` — routes under `app/api/*` and `middleware.ts` need these. There is no automated test suite; verification is `npx tsc --noEmit` clean, `npm run build` succeeding, and manual/Playwright browser checks (zero console/hydration errors).

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

### Backend / auth / orders
- **Auth**: `lib/auth.ts` configures NextAuth with a single `phone-otp` Credentials provider (JWT sessions, 30-day maxAge). `app/login/page.tsx` + `components/LoginPanel.tsx` drive the flow: request OTP → `POST /api/auth/otp` (creates/updates an `Otp` doc, rate-limited by `lib/otp.ts`'s constants; **the code is currently only `console.log`'d server-side, not actually sent via SMS** — there is no SMS gateway wired up) → submit code → NextAuth `signIn("phone-otp", {phone, code})` → `authorize()` in `lib/auth.ts` verifies against the `Otp` collection and upserts a `User`. `middleware.ts` gates `/account` (via `withAuth`) so it requires a session. `lib/phone.ts` normalizes Iranian numbers (and Persian/Arabic digits) to `09xxxxxxxxx`.
- **Orders**: `lib/order.ts` holds shared order types/enums/labels and builds the WhatsApp summary text (`orderWhatsappText`/`orderWhatsappUrl`) — WhatsApp handoff is still how the shop owner actually receives orders. `lib/order-server.ts` (server-only) validates and persists orders to MongoDB via the `Order`/`Counter`/`User` Mongoose models (`models/*.ts`), enforcing min order total (`BRAND.minOrder`), per-product weight/qty bounds, and a per-phone hourly rate limit. `app/api/orders/route.ts` (`GET` list-mine / `POST` create) and `app/api/orders/[no]/route.ts` (single order by `orderNo`, with `viewToken` for guest access without login) are the HTTP surface; `app/api/me/route.ts` reads/patches the logged-in user's profile.
- **Payment**: `PAY_METHODS` in `lib/order.ts` includes `"online"`, which requires login (enforced in `createOrder`) and opens `components/PaymentSheet.tsx` in `components/AppModal.tsx` — this is a placeholder UI ("زرین‌پال به‌زودی وصل می‌شود"); no payment gateway is integrated yet, `paymentStatus` just stays `"unpaid"`.
- `components/AuthProvider.tsx` wraps the root layout in NextAuth's `SessionProvider`. `app/account/page.tsx` now reads/writes account data through `/api/me` and `/api/orders` (server-backed) in addition to (or instead of) the older `lib/profile.ts` localStorage helpers — when editing account/checkout flows, check which of the two you're actually looking at, since both still exist in the codebase.

### Deployment
Since this is a Next.js app with a live database and auth (not static output), it needs a Node.js host with the env vars above configured (e.g. Vercel + a hosted MongoDB) — GitHub Pages (used before the original migration) does not work at all.
