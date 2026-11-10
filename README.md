# پرودید (Prodid) — Persian/RTL protein & food storefront

**For the shop owner:** this is the website of پرودید (پروتئین هر خانه), the protein shop in Kashan.
Day-to-day changes — products, prices, categories, photos, coupons, orders, delivery slots, SMS
patterns — are all made from the admin panel at `/admin`, not in the code. See
[«ویرایش روزمره» below](#ویرایش-روزمره-برای-مالک-فروشگاه).

**For the next AI / developer:** read this file and `CLAUDE.md` before touching anything, then read
[Never touch](#never-touch) twice. Several things in this codebase look like bugs or clutter and are
load-bearing. The [Verify](#verify-before-you-call-anything-done) bar is non-negotiable: there is no
test suite, so a typecheck, a build and a real browser pass are the only safety net.

- 📍 کاشان، میدان عامریه، خیابان امیرکبیر محور چهاربانده، ۱۰۰ متر بعد از پیتزا دولپی (سابق)
- 📞 ۰۹۱۳۰۶۱۲۰۱۹ · 📷 [@PRODID1](https://www.instagram.com/prodid1/)

---

## Built with

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14.2 (App Router), React 18, TypeScript 5.5 |
| Styling | One hand-written `app/globals.css`. No Tailwind, no CSS-in-JS, no component library |
| Database | MongoDB via Mongoose 9 (`models/*.ts`) |
| Auth | NextAuth 4 — a single `phone-otp` Credentials provider, JWT sessions, 30-day maxAge |
| SMS | IPPanel pattern messages (`lib/ippanel.ts`, `lib/sms.ts`) |
| Payment | ZarinPal (`lib/zarinpal.ts`, `app/api/payments/zarinpal/*`) |
| Order handoff | WhatsApp `wa.me` deep links (`lib/order.ts`) — still how the owner actually receives orders |
| Icons & art | Inline SVG only (`lib/icons.tsx`, `lib/salad-art.ts`). No icon package |
| Runtime | Docker (`Dockerfile` + `docker-compose.yml`) on the owner's own server |

Dependencies are deliberately few: **mongoose, next, next-auth, react, react-dom**. Nothing else in
`dependencies`. Keep it that way — if a feature can be done with the standard library, the Web
Animations API or an inline SVG, do that instead of adding a package.

## How it was built

The order matters, because the codebase still carries the fingerprints of each stage and you will
meet code from all of them in the same file.

1. **Static site (first).** Plain HTML/CSS/JS with `index.html` + `pages/*.html`, hosted on GitHub
   Pages. Cart in `localStorage`, checkout handed off to WhatsApp, no server at all.
2. **Migration to Next.js 14.** Every page became a Client Component (`"use client"`); `styles.css`
   was copied to `app/globals.css` **verbatim**, with only asset URLs rewritten. The look and
   behaviour of the static site were preserved exactly — this is why some CSS looks odd (see
   [Never touch](#never-touch)). GitHub Pages stopped working at this point and has not come back.
3. **A real backend was added on top.** Phone/OTP login (NextAuth + the `Otp` collection), orders
   persisted to MongoDB, a user profile API, and later coupons, a ZarinPal payment flow, SMS
   notifications, and a staff-role system.
4. **Admin panel `/admin`.** First a UI-only mock, then wired to real admin APIs with
   `requireStaff()` / `requireCan(user, section)` and roles on the `User` model.
5. **Feature work since then**, newest last: per-product multiple images, per-category images, the
   assistant character appearing only once per user, and the **salad bar** (`/salad-bar`) where a
   customer composes a salad and watches the bowl fill in as they pick ingredients.

**Consequence you must internalise:** the client-side-only layer (localStorage cart, guest
checkout, `lib/profile.ts`) and the server-backed layer (`/api/*`, Mongo) **coexist**. Before you
edit anything, work out which of the two you are looking at. Both are live. Neither is dead code.

## Architecture

### Routing

```
app/
  layout.tsx            true root — <html>/<body>, globals.css, <ToastHost/>. Intentionally bare.
  globals.css           the entire stylesheet for the whole site
  (site)/               every customer-facing route (the group does NOT affect URLs)
    layout.tsx          Header, BottomNav, Footer, Assistant, VpnNotice, TiltProvider, AuthProvider
    page.tsx            home · shop · product · cart · checkout · account · login
    salad-bar/          the salad builder
    about · contact · faq · shipping · terms
  admin/                sibling of (site), NOT inside it → renders without storefront chrome
  links/                link-in-bio page for QR codes, also outside (site), deliberately bare
  api/                  all HTTP endpoints (see below)
```

Rules that follow from this layout:

- Anything customer-facing goes **inside** `app/(site)/`. Anything that must not look like the
  storefront goes **outside** it. Keep `app/layout.tsx` minimal.
- Page components are Client Components, so they cannot export `metadata`. A route that needs its
  own `<title>` gets a thin sibling `layout.tsx` that exports `metadata` and returns `children` —
  nothing else. See `app/(site)/salad-bar/layout.tsx` for the pattern.
- `/product` is **not** a dynamic route. It reads `?id=` with `useSearchParams()`, mirroring the old
  static site's query-param navigation. Every page using `useSearchParams()` (product, cart,
  checkout, shop) needs a `Suspense` boundary or the build fails.

### Where the data actually lives

This trips people up, including the current `CLAUDE.md`:

- `lib/data.ts` holds `BRAND`, `CATEGORIES` and `PRODUCTS`. Since the backend was added it is only
  the **seed** — `lib/seed.ts` inserts it the first time each collection is empty, and the
  `ADMIN_PHONES` env var promotes the first owner accounts at the same time.
- After that, **MongoDB is the source of truth.** `lib/catalog-server.ts` reads products,
  categories and settings from Mongo (3-second cache; call `invalidateStoreCache()` after any
  mutation) and merges them over the defaults in `lib/store-settings.ts`.
- The browser gets that via `GET /api/catalog`; `components/CatalogSync.tsx` fetches it once and
  pushes it into the `lib/catalog-store.ts` snapshot, which client components read.
- So **editing `lib/data.ts` does not change a running shop.** It only affects a fresh, empty
  database. Real catalog edits happen in `/admin`.

### API surface

```
api/auth/[...nextauth]      NextAuth handler
api/auth/otp                request an OTP code (rate-limited in lib/otp.ts)
api/catalog                 public catalog + settings snapshot for the browser
api/me                      read/patch the logged-in user's profile
api/orders, orders/[no]     create / list-mine / fetch one (guest access via viewToken)
api/coupons                 list the offers available to the caller / preview a coupon code
api/payments/zarinpal/*     request + callback
api/media/products/[file]   serves uploaded images out of the uploads/ volume
api/admin/*                 state, orders, products, categories, coupons, customers, team,
                            settings, and the two image-upload endpoints
```

Every `api/admin/*` route calls `requireStaff()` and then `requireCan(user, "<section>")`.
`middleware.ts` only gates `/account`. `/admin` is **not** in the matcher: its page shell can
render, but it fetches `/api/admin/state` and gets 401/403 without a staff session, so the data is
protected at the API, not the route.

### Key modules

| File | Why it matters |
| --- | --- |
| `lib/cart.ts` | The cart as a manual external store over `localStorage`, exposed by `useCart()` (`useSyncExternalStore`). Also `MIN_WEIGHT`, `step()`, `defaultAdd()` |
| `lib/order.ts` / `lib/order-server.ts` | Shared order types & WhatsApp text / server-side validation, min-order, per-item bounds, per-phone hourly rate limit |
| `lib/catalog-server.ts` / `lib/catalog-store.ts` | Server read+merge / client snapshot |
| `lib/roles.ts` | `StaffRole`, `AdminSection`, `canMutate()` — the whole permission model |
| `lib/salad.ts` / `lib/salad-art.ts` | Salad data + maths / the seeded-PRNG SVG drawing engine |
| `lib/phone.ts` | Normalises Iranian numbers and Persian/Arabic digits to `09xxxxxxxxx` |
| `lib/toast.tsx` | Imperative `toast()` + `<ToastHost/>` mounted once in the root layout |
| `lib/icons.tsx` | Every icon in the site. Add new ones here; a missing key renders nothing |

## Run it

```bash
npm install
cp .env.example .env.local      # then fill it in — see below
npm run dev                     # http://localhost:3000
```

`.env.local` needs at least `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Without a reachable
MongoDB, the storefront still renders but `/api/catalog`, auth, orders, account and the whole admin
panel return 500 — expect that in a sandbox and do not "fix" it by mocking the database.
`ADMIN_PHONES` (comma-separated) decides who becomes an owner on first seed.

```bash
npm run build                   # production build
npm run start                   # serve the build
npm run lint                    # next lint
npx tsc --noEmit                # typecheck — there is no test suite
```

## Verify before you call anything done

There is **no automated test suite**. The bar is:

1. `npx tsc --noEmit` — clean.
2. `npm run build` — succeeds.
3. A real browser pass with Playwright at **390px and 1280px**: zero console errors, zero
   hydration errors, no horizontal scroll, and the thing you changed actually works when clicked.

Notes that will save you an hour:

- Use `waitUntil: "domcontentloaded"`, never `networkidle` — `CatalogSync` retries forever without
  a database and `networkidle` never settles.
- Set `sessionStorage.prodid_vpn_notice = "1"` before navigating, or `VpnNotice` overlays and eats
  your clicks.
- `public/assets/img/assistant-walkcycle.png` is **absent on purpose** (the code falls back to a
  three-layer rig). Its 404 is expected; filter it out of console assertions.

## How to change it

| You want to… | Do this |
| --- | --- |
| Change products, prices, categories, photos, coupons, delivery slots, SMS text | Use `/admin`. Do not edit code |
| Change the seed for a brand-new database | `lib/data.ts` (`price: null` = «قیمت روی تماس», `available: false` = out of stock, `sale: "w"` = per-kg / `"u"` = per package) |
| Add a storefront page | New folder under `app/(site)/`, `"use client"` page, plus a `layout.tsx` exporting only `metadata` if it needs a title |
| Add it to the menu | `lib/nav.ts` — one array feeds both `Header` and `Footer` |
| Add an icon | `lib/icons.tsx` |
| Add an admin section | A view in `components/admin/`, a tab in `app/admin/page.tsx`, a route under `app/api/admin/`, and the section name in `lib/roles.ts` |
| Add a field to a catalog entity | Model in `models/`, `toProduct`/`toCategory` in `lib/catalog-server.ts`, the type in `lib/data.ts`, the admin API's sanitiser, the admin view, and the storefront component. All six, or it silently drops |
| Add styling | Append to `app/globals.css` with a new prefix (`.sb-` for salad bar, `.adm-` for admin) and reuse the existing tokens: `--brand-orange-solid`, `--espresso-800`, `--line`, `--radius`, `--ease`, `--bottomnav-h` |
| Deploy | On the owner's server: `git pull origin main && docker compose up -d --build`. Needs the external network `prodid-net`; it publishes to `127.0.0.1:3200` behind a reverse proxy, with uploads on the `product-uploads` volume |

## Never touch

Each of these looks wrong and is not. Breaking one produces a bug that is slow and miserable to
find, because it shows up as a blank render, a hydration crash or a phone-only visual fault.

1. **Never read `Cart.count()` / `Cart.items()` / `Cart.total()` during render.** They talk to
   `localStorage`, which is empty on the server and full on the client → React hydration errors
   #418/#423/#425. Use the `useCart()` snapshot and the `cartQty` / `cartItems` / `cartTotal`
   helpers. `Cart.add/set/setGrams/remove/clear` are **mutations only**, called from event handlers.
   The same rule applies to `Profile.read()` and `Orders.read()` in `lib/profile.ts`: load them in a
   `useEffect`, never inline.
2. **`app/globals.css` is a verbatim port of the old static site's stylesheet.** Preserve its
   behaviour exactly. In particular, the `prefers-reduced-motion` fallback for `.reveal` is
   overridden by a later "3D tilt" block. That is a pre-existing quirk inherited from the static
   site. **Do not "fix" it while doing unrelated work.**
3. **`components/Assistant.tsx` must reset `built.current = false` in its effect cleanup.** React
   18 Strict Mode mounts → cleans up → remounts once in `next dev`; without the reset the chat
   panel silently never rebuilds. It only breaks in `npm run dev`, never in a production build, so
   you will not catch it in a build check.
4. **Keep SVG ids namespaced per-SVG in `lib/salad-art.ts` (`nsid()`).** Duplicate `id`s resolve to
   the first occurrence **document-wide**, so a hidden SVG earlier in the page will hijack the
   gradients and filters of every later copy and the ingredient renders washed out or blurred.
5. **Do not add `align-items: start` to `.sb-shell`.** It shrinks `.sb-aside` to the height of its
   own card, which leaves `position: sticky` no room to travel, so the salad bowl scrolls off
   screen and the fly-to-bowl animation silently targets nothing.
6. **Grid children need `min-width: 0`** (`.sb-shell > *`, and the same guard anywhere you add a
   grid column). Default `min-width: auto`
   lets a horizontally-scrolling row of cards force the whole column wider than the viewport, which
   shows up as page-wide horizontal scroll at every width.
7. **Never force `direction: ltr` on a string that mixes Persian and Latin/@ characters** — it
   reorders them (`PRODID1@`). Scope `dir="ltr"` to the Latin-only span.
8. **Persian digits everywhere in the UI.** `toLocaleString("fa-IR")` with `٬` as the thousands
   separator. A stray `100 گرم` next to `۱۴٬۰۰۰` is a visible bug.
9. **Never commit secrets.** `.env*.local` is gitignored and must stay out of git.
   ⚠️ `.env.example` is committed and currently contains what looks like a **real IPPanel API key
   and pattern codes**. It should be rotated and replaced with empty placeholders. Do not copy that
   key anywhere, and never add a live secret to a tracked file.
10. **Never run `npm audit fix --force`.** It upgrades Next.js to 16 and breaks the project. Patch
    advisories by hand, within the 14.2 line.
11. **`uploads/` is runtime data, not source.** Uploaded product and category images live there and
    are served through `/api/media/products/<file>`; in production it is a Docker volume. Only
    `uploads/products/.gitkeep` is tracked, so that the directory exists in a fresh checkout —
    keep it. Do not commit the images themselves, do not clear the directory, and do not change
    the served path without migrating the stored values (`lib/category-image.ts` / `lib/product-image.ts` do that translation).
12. **Do not delete the client-side localStorage layer** because the backend exists. Guest checkout
    and the cart still depend on it.

## Known gaps — do not mistake these for bugs

- **Salad bar orders go to WhatsApp only.** They are not written to the `Order` collection and so
  never appear in the admin order list. Fixing that means teaching the `Order` model a salad line
  item (ingredients + amounts + sauces), not patching the page.
- **OTP delivery degrades silently.** `sendOtpSms` sends an IPPanel pattern message when the SMS
  env vars are set; when they are not, it prints the code to the server console and returns `false`
  instead of failing the request. In a sandbox the server log is the only place to read the code.
- `CLAUDE.md` is largely accurate but predates the admin API work: it still says `/admin` is
  "UI/UX only with no admin API" and that `lib/data.ts` is the single source of truth for the
  catalog. Both are now wrong — trust this file's [Where the data actually lives](#where-the-data-actually-lives)
  and [API surface](#api-surface) sections instead.

## ویرایش روزمره (برای مالک فروشگاه)

همه کارهای روزمره از پنل `/admin` انجام می‌شود و نیازی به دست‌زدن به کد نیست:

- **محصول، قیمت، موجودی، عکس** → تب محصولات. قیمت `خالی` یعنی «قیمت روی تماس».
- **دسته‌بندی و عکس دسته** → تب دسته‌ها.
- **سفارش‌ها** → تب سفارش‌ها؛ تایید، آماده‌سازی، ارسال و تحویل، هر کدام با یک کلیک روی ردیف.
- **کد تخفیف، بازه‌های ارسال، متن پیامک‌ها، پیام‌های دستیار** → تب‌های مربوط به خودشان.

برای **انتشار تغییرات کد** روی سرور:

```bash
git pull origin main
docker compose up -d --build
curl -I http://127.0.0.1:3200/        # باید ۲۰۰ بدهد
```

اگر شبکه `prodid-net` نبود: `docker network create prodid-net`. اگر بیلد وسط کار کشته شد، سرور رم
کافی ندارد — موقتاً swap اضافه کن.

## Suggested next steps

- Persist salad-bar orders into the `Order` collection so they show up in `/admin`.
- Rotate the IPPanel key and empty out `.env.example`.
- Replace the procedural salad ingredient art with real photographs once the shop provides them
  (`lib/salad-art.ts` already has an image slot for this).
- Refresh `CLAUDE.md` so the admin-API and catalog-source sections match reality.
