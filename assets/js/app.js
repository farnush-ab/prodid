/* =========================================================
   پرودید — منطق اصلی سایت
   سبد خرید در localStorage نگهداری می‌شود و ثبت سفارش از
   طریق واتس‌اپ / تماس انجام می‌شود (بدون نیاز به سرور).
   ========================================================= */

const faNum = new Intl.NumberFormat("fa-IR");
const fmtPrice = (n) => faNum.format(n);
const toFa = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
/* تبدیل ارقام فارسی/عربی به انگلیسی و استخراج عدد صحیح */
function parseIntFa(s) {
  const norm = String(s)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[^\d]/g, "");
  const n = parseInt(norm, 10);
  return Number.isFinite(n) ? n : 0;
}

const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
const getCategory = (id) => CATEGORIES.find((c) => c.id === id);
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

/* مسیر پایه برای صفحات داخل پوشه pages */
const IS_SUB = location.pathname.includes("/pages/");
const ROOT = IS_SUB ? "../" : "";
const PAGE = (name) => (name === "index" ? `${ROOT}index.html` : `${ROOT}pages/${name}.html`);

/* ---------------- سبد خرید ---------------- */
const CART_KEY = "prodid_cart";
const Cart = {
  read() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
    catch { return {}; }
  },
  write(c) {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
    updateCartBadges();
  },
  qty(id) { return this.read()[id] || 0; },
  MIN_WEIGHT: 0.1,                       // حداقل وزن سفارش: ۱۰۰ گرم
  step(p) { return p.sale === "w" ? 0.1 : 1; },      // گام دکمه‌های +/− : ۱۰۰ گرم
  defaultAdd(p) { return p.sale === "w" ? 0.5 : 1; }, // مقدار پیش‌فرض افزودن اولیه: ۵۰۰ گرم
  add(id, amount) {
    const p = getProduct(id);
    if (!p || !p.available || p.price === null) return;
    const c = this.read();
    c[id] = Math.round(((c[id] || 0) + (amount ?? this.defaultAdd(p))) * 1000) / 1000;
    if (c[id] <= 0) delete c[id];
    this.write(c);
  },
  set(id, qty) {
    const c = this.read();
    if (qty <= 0) delete c[id];
    else c[id] = Math.round(qty * 1000) / 1000;
    this.write(c);
  },
  /* تعیین وزن دقیق بر حسب گرم (با اعمال حداقل ۱۰۰ گرم) */
  setGrams(id, grams) {
    const kg = Math.max(this.MIN_WEIGHT, grams / 1000);
    this.set(id, Math.round(kg * 1000) / 1000);
  },
  remove(id) { this.set(id, 0); },
  clear() { this.write({}); },
  count() { return Object.keys(this.read()).length; },
  items() {
    return Object.entries(this.read())
      .map(([id, qty]) => ({ p: getProduct(id), qty }))
      .filter((it) => it.p);
  },
  total() {
    return this.items().reduce((sum, { p, qty }) => sum + (p.price || 0) * qty, 0);
  },
  hasWeightItems() { return this.items().some(({ p }) => p.sale === "w"); },
};

/* واحد نمایش تعداد */
function qtyLabel(p, qty) {
  if (p.sale !== "w") return `${faNum.format(qty)} بسته`;
  const g = Math.round(qty * 1000);
  return g >= 1000 ? `${faNum.format(g / 1000)} کیلوگرم` : `${faNum.format(g)} گرم`;
}
function unitLabel(p) {
  if (p.price === null) return "";
  return p.sale === "w" ? "تومان / هر کیلو" : "تومان";
}

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
  let el = qs(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.innerHTML = `${icon("check")}<span>${msg}</span>`;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------------- انیمیشن ورود ---------------- */
const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" })
  : null;

function observeReveals(root = document) {
  if (!revealObserver) {
    qsa(".reveal", root).forEach((el) => el.classList.add("in"));
    return;
  }
  qsa(".reveal:not(.in)", root).forEach((el) => revealObserver.observe(el));
}

/* ---------------- افکت سه‌بعدی (تیلت با موس) ---------------- */
function init3D() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const MAX = 7; // حداکثر زاویه چرخش (درجه)
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest?.(".tilt");
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.transition = "transform 0.08s linear";
    el.style.transform =
      `perspective(900px) rotateX(${((0.5 - py) * MAX).toFixed(2)}deg)` +
      ` rotateY(${((px - 0.5) * MAX).toFixed(2)}deg) translateY(-4px)`;
  });
  document.addEventListener("pointerout", (e) => {
    const el = e.target.closest?.(".tilt");
    if (el && !el.contains(e.relatedTarget)) {
      el.style.transition = "";
      el.style.transform = "";
    }
  });
}

/* افزودن reveal پلکانی به فرزندان یک گرید */
function staggerReveal(container) {
  if (!container) return;
  [...container.children].forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${Math.min(i * 60, 360)}ms`;
  });
  observeReveals(container);
}

/* ---------------- هدر / فوتر / منوی پایین ---------------- */
const NAV_LINKS = [
  { id: "index",    label: "صفحه اصلی" },
  { id: "shop",     label: "فروشگاه" },
  { id: "shipping", label: "ارسال و سفارش" },
  { id: "about",    label: "درباره ما" },
  { id: "contact",  label: "تماس با ما" },
  { id: "faq",      label: "سوالات متداول" },
  { id: "account",  label: "حساب کاربری" },
];

function currentPage() {
  return document.body.dataset.page || "index";
}

function renderHeader() {
  const page = currentPage();
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="container header-inner">
      <a class="logo" href="${PAGE("index")}" aria-label="پرودید">
        <span class="logo-mark">${icon("steak")}</span>
        <span class="logo-text">
          <span class="logo-name">پرودید</span><br>
          <span class="logo-slogan">${BRAND.slogan}</span>
        </span>
      </a>
      <form class="header-search" id="search-desktop" role="search">
        <input type="search" name="q" placeholder="جست‌وجوی محصول؛ مثلا کباب، ژامبون…" aria-label="جست‌وجو">
        <span class="search-ico">${icon("search")}</span>
      </form>
      <a class="header-phone" href="tel:${BRAND.phone}">
        ${icon("phone")}
        <span>سفارش تلفنی <b class="num">${toFa(BRAND.phone)}</b></span>
      </a>
      <div class="header-actions">
        <a class="icon-btn" href="${PAGE("account")}" title="حساب کاربری">${icon("user")}</a>
        <a class="icon-btn" href="${PAGE("cart")}" title="سبد خرید">${icon("cart")}<span class="cart-badge" data-cart-badge></span></a>
      </div>
    </div>
    <nav class="main-nav" aria-label="منوی اصلی">
      <div class="container">
        <ul>
          ${NAV_LINKS.map((l) => `<li><a href="${PAGE(l.id)}" class="${page === l.id ? "active" : ""}">${l.label}</a></li>`).join("")}
        </ul>
      </div>
    </nav>
    <div class="mobile-search">
      <form class="header-search" id="search-mobile" role="search">
        <input type="search" name="q" placeholder="جست‌وجوی محصول؛ مثلا کباب، ژامبون…" aria-label="جست‌وجو">
        <span class="search-ico">${icon("search")}</span>
      </form>
    </div>`;
  document.body.prepend(header);

  qsa(".header-search", header).forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = form.q.value.trim();
      location.href = `${PAGE("shop")}${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    });
  });
}

function renderBottomNav() {
  const page = currentPage();
  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  nav.setAttribute("aria-label", "منوی موبایل");
  const items = [
    { id: "index", label: "خانه", ico: "home" },
    { id: "shop", label: "فروشگاه", ico: "store" },
    { id: "cart", label: "سبد خرید", ico: "cart", badge: true },
    { id: "account", label: "حساب", ico: "user" },
  ];
  nav.innerHTML = items
    .map((it) => `
      <a href="${PAGE(it.id)}" class="${page === it.id ? "active" : ""}">
        ${icon(it.ico)}${it.label}
        ${it.badge ? '<span class="cart-badge" data-cart-badge></span>' : ""}
      </a>`)
    .join("");
  document.body.appendChild(nav);
}

function renderFooter() {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>پرودید | ${BRAND.slogan}</h4>
          <p class="footer-about">
            فروشگاه تخصصی مواد پروتئینی و فودشاپ در ${BRAND.city}؛ گوشت و استیک تازه،
            محصولات کبابی و مزه‌دار، سوسیس و کالباس، برگر خانگی و سبزیجات نیمه‌آماده —
            با ارسال سریع در سطح شهر ${BRAND.city}.
          </p>
        </div>
        <div>
          <h4>دسترسی سریع</h4>
          <ul>
            ${NAV_LINKS.map((l) => `<li><a href="${PAGE(l.id)}">${l.label}</a></li>`).join("")}
            <li><a href="${PAGE("terms")}">قوانین و مقررات</a></li>
          </ul>
        </div>
        <div>
          <h4>تماس با ما</h4>
          <div class="footer-contact-line">${icon("pin")}<span>${BRAND.address}</span></div>
          <div class="footer-contact-line">${icon("phone")}<a href="tel:${BRAND.phone}" class="num">${toFa(BRAND.phone)}</a></div>
          <div class="footer-contact-line">${icon("instagram")}<a href="${BRAND.instagramUrl}" target="_blank" rel="noopener">اینستاگرام ${BRAND.instagram}@</a></div>
          <div class="footer-contact-line">${icon("chat")}<a href="https://wa.me/${BRAND.phoneIntl}" target="_blank" rel="noopener">سفارش در واتس‌اپ</a></div>
        </div>
      </div>
      <div class="footer-bottom">
        © ${toFa(new Date().toLocaleDateString("fa-IR", { year: "numeric" }))} پرودید — تمامی حقوق محفوظ است.
      </div>
    </div>`;
  document.body.appendChild(footer);
}

function updateCartBadges() {
  const n = Cart.count();
  qsa("[data-cart-badge]").forEach((b) => { b.textContent = n ? faNum.format(n) : ""; });
}

/* ---------------- کارت محصول ---------------- */
function productImg(p, cls = "p-img") {
  // اگر عکس واقعی در assets/img/products/<id>.jpg موجود باشد نمایش داده می‌شود،
  // در غیر این صورت آیکن دسته‌بندی نشان داده می‌شود.
  return `
    <div class="${cls}">
      ${icon(p.ic, "p-ico")}
      <img src="${ROOT}assets/img/products/${p.id}.jpg" alt="${p.name}" loading="lazy"
           onerror="this.remove()">
    </div>`;
}

function saleBadge(p) {
  if (!p.available) return '<span class="badge badge-out">ناموجود</span>';
  return p.sale === "w"
    ? `<span class="badge badge-weight">${icon("scale")}وزنی</span>`
    : `<span class="badge badge-unit">${icon("package")}عددی</span>`;
}

function priceHTML(p) {
  if (p.price === null) return '<span class="p-price-call">استعلام قیمت</span>';
  return `<span class="p-price">${fmtPrice(p.price)}</span>
          <span class="p-price-unit">${unitLabel(p)}</span>`;
}

function cardActionHTML(p) {
  if (!p.available) return `<button class="p-add out" disabled title="ناموجود">${icon("close")}</button>`;
  if (p.price === null)
    return `<a class="p-add" href="tel:${BRAND.phone}" title="تماس برای سفارش">${icon("phone")}</a>`;
  const inCart = Cart.qty(p.id);
  if (inCart > 0) return stepperHTML(p, inCart);
  return `<button class="p-add" data-add="${p.id}" title="افزودن به سبد">${icon("plus")}</button>`;
}

function stepperHTML(p, qty) {
  if (p.sale === "w") {
    return `
    <div class="p-stepper wgt" data-stepper="${p.id}">
      <button type="button" data-inc="${p.id}" aria-label="افزایش ۱۰۰ گرم">${icon("plus")}</button>
      <span class="st-wgt">
        <input class="st-inp" data-wgt="${p.id}" type="text" inputmode="numeric"
               value="${toFa(Math.round(qty * 1000))}" aria-label="وزن به گرم">
        <span class="st-unit">گرم</span>
      </span>
      <button type="button" data-dec="${p.id}" aria-label="کاهش ۱۰۰ گرم">${icon("minus")}</button>
    </div>`;
  }
  return `
    <div class="p-stepper" data-stepper="${p.id}">
      <button type="button" data-inc="${p.id}" aria-label="افزایش">${icon("plus")}</button>
      <span class="st-val">${qtyLabel(p, qty)}</span>
      <button type="button" data-dec="${p.id}" aria-label="کاهش">${icon("minus")}</button>
    </div>`;
}

function productCard(p) {
  return `
    <article class="p-card tilt" data-card="${p.id}">
      <a href="${PAGE("product")}?id=${p.id}" aria-label="${p.name}">
        <div class="p-badges">
          ${p.badge ? `<span class="badge badge-gold">${p.badge}</span>` : ""}
          ${saleBadge(p)}
        </div>
        ${productImg(p)}
      </a>
      <div class="p-body">
        <a href="${PAGE("product")}?id=${p.id}"><h3 class="p-name">${p.name}</h3></a>
        <div class="p-foot">
          <div class="p-price-row">${priceHTML(p)}</div>
          <div class="card-action">${cardActionHTML(p)}</div>
        </div>
      </div>
    </article>`;
}

/* رویدادهای افزودن/کم‌کردن که روی کل صفحه گوش می‌دهیم */
function bindCartEvents(afterChange) {
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add]");
    const incBtn = e.target.closest("[data-inc]");
    const decBtn = e.target.closest("[data-dec]");
    if (!addBtn && !incBtn && !decBtn) return;
    e.preventDefault();

    if (addBtn) {
      const p = getProduct(addBtn.dataset.add);
      Cart.add(p.id);
      toast(`«${p.name}» به سبد اضافه شد`);
      refreshCardAction(p.id);
    } else if (incBtn) {
      const p = getProduct(incBtn.dataset.inc);
      Cart.add(p.id, Cart.step(p));
      refreshCardAction(p.id);
    } else if (decBtn) {
      const p = getProduct(decBtn.dataset.dec);
      Cart.add(p.id, -Cart.step(p));
      refreshCardAction(p.id);
    }
    if (afterChange) afterChange();
  });

  // ورود وزن دلخواه (گرم) در استپرهای وزنی داخل کارت و سبد
  document.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-wgt]");
    if (!inp) return;
    const p = getProduct(inp.dataset.wgt);
    if (!p) return;
    Cart.setGrams(p.id, parseIntFa(inp.value));
    refreshCardAction(p.id);
    if (afterChange) afterChange();
  });
}

function refreshCardAction(id) {
  const p = getProduct(id);
  qsa(`[data-card="${id}"] .card-action`).forEach((el) => {
    el.innerHTML = cardActionHTML(p);
  });
}

/* ---------------- پروفایل کاربر (localStorage) ---------------- */
const PROFILE_KEY = "prodid_profile";
const ORDERS_KEY = "prodid_orders";
const Profile = {
  read() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch { return {}; }
  },
  write(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); },
};
const Orders = {
  read() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
    catch { return []; }
  },
  add(order) {
    const list = Orders.read();
    list.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
  },
};

/* ---------------- راه‌اندازی مشترک ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  hydrateIcons();
  renderHeader();
  renderBottomNav();
  renderFooter();
  updateCartBadges();

  const page = currentPage();
  const init = {
    index: initHome,
    shop: initShop,
    product: initProductPage,
    cart: initCartPage,
    checkout: initCheckoutPage,
    account: initAccountPage,
  }[page];
  if (init) init();
  else bindCartEvents();

  observeReveals();
  init3D();
  showVpnNotice();
});

/* ---------------- اطلاعیه خاموش‌کردن VPN ---------------- */
const VPN_NOTICE_KEY = "prodid_vpn_notice";
function showVpnNotice() {
  // فقط یک‌بار در هر نشست (session) نمایش داده می‌شود
  try { if (sessionStorage.getItem(VPN_NOTICE_KEY)) return; } catch { /* noop */ }

  const overlay = document.createElement("div");
  overlay.className = "vpn-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "vpn-title");
  overlay.innerHTML = `
    <div class="vpn-card" role="document">
      <button type="button" class="vpn-close" aria-label="بستن">${icon("close")}</button>
      <span class="vpn-ico">${icon("wifi")}</span>
      <h3 id="vpn-title">لطفاً VPN خود را خاموش کنید</h3>
      <p>برای تجربه‌ای روان‌تر و بارگذاری سریع‌تر سایت، پیشنهاد می‌کنیم
      فیلترشکن (VPN) خود را موقتاً خاموش کنید.</p>
      <button type="button" class="btn btn-primary btn-block vpn-ok">${icon("check")} متوجه شدم</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  function close() {
    try { sessionStorage.setItem(VPN_NOTICE_KEY, "1"); } catch { /* noop */ }
    overlay.classList.remove("show");
    overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  overlay.querySelector(".vpn-close").addEventListener("click", close);
  overlay.querySelector(".vpn-ok").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", onKey);
}

/* =========================================================
   صفحه اصلی
   ========================================================= */
function initHome() {
  bindCartEvents();

  // دسته‌بندی‌ها
  qs("#home-cats").innerHTML = CATEGORIES.map((c) => `
    <a class="cat-card tilt" href="${c.soon ? "#" : `${PAGE("shop")}?cat=${c.id}`}"
       ${c.soon ? 'onclick="toast(\'این دسته به‌زودی تکمیل می‌شود\');return false;"' : ""}>
      ${c.soon ? '<span class="soon-tag">به‌زودی</span>' : ""}
      <span class="c-img">${icon(c.ic)}<img src="${ROOT}assets/img/categories/${c.id}.jpg" alt="${c.name}" loading="lazy" onerror="this.remove()"></span>
      <span class="c-name">${c.name}</span>
    </a>`).join("");
  staggerReveal(qs("#home-cats"));

  // پرفروش‌ها
  const best = PRODUCTS.filter((p) => p.badge === "پرفروش")
    .concat(PRODUCTS.filter((p) => p.badge === "ویژه"))
    .slice(0, 4);
  qs("#home-best").innerHTML = best.map(productCard).join("");
  staggerReveal(qs("#home-best"));

  // تازه‌های امروز
  const fresh = PRODUCTS.filter((p) => ["veg", "kebab"].includes(p.cat)).slice(0, 4);
  qs("#home-fresh").innerHTML = fresh.map(productCard).join("");
  staggerReveal(qs("#home-fresh"));
}

/* =========================================================
   فروشگاه
   ========================================================= */
function initShop() {
  bindCartEvents();

  const params = new URLSearchParams(location.search);
  const state = {
    cat: params.get("cat") || "all",
    q: params.get("q") || "",
    type: "all",
    onlyAvailable: false,
    sort: "default",
  };

  const cats = [{ id: "all", name: "همه" }, ...CATEGORIES.filter((c) => !c.soon)];
  qs("#shop-chips").innerHTML = cats.map((c) =>
    `<button class="chip ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}">${c.name}</button>`
  ).join("");

  if (state.q) {
    qsa(".header-search input").forEach((i) => { i.value = state.q; });
  }

  function apply() {
    let list = PRODUCTS.slice();
    if (state.cat !== "all") list = list.filter((p) => p.cat === state.cat);
    if (state.q) {
      const q = state.q.trim();
      list = list.filter((p) => p.name.includes(q) || (p.desc || "").includes(q));
    }
    if (state.type !== "all") list = list.filter((p) => p.sale === state.type);
    if (state.onlyAvailable) list = list.filter((p) => p.available);

    if (state.sort === "price-asc") list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (state.sort === "price-desc") list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "fa"));

    qs("#shop-count").textContent = list.length ? `${faNum.format(list.length)} محصول` : "";
    const grid = qs("#shop-grid");
    grid.innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="empty-state" style="grid-column:1/-1">
           <div class="e-ico">${icon("search")}</div>
           <b>محصولی پیدا نشد</b>
           جست‌وجو یا فیلترها را تغییر دهید.
         </div>`;
    if (list.length) staggerReveal(grid);
  }

  qs("#shop-chips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    if (!chip) return;
    state.cat = chip.dataset.cat;
    qsa("#shop-chips .chip").forEach((c) => c.classList.toggle("active", c === chip));
    apply();
  });
  qs("#f-type").addEventListener("change", (e) => { state.type = e.target.value; apply(); });
  qs("#f-sort").addEventListener("change", (e) => { state.sort = e.target.value; apply(); });
  qs("#f-available").addEventListener("change", (e) => { state.onlyAvailable = e.target.checked; apply(); });

  apply();
}

/* =========================================================
   صفحه محصول
   ========================================================= */
function initProductPage() {
  bindCartEvents(syncProductQty);

  const id = new URLSearchParams(location.search).get("id");
  const p = getProduct(id);
  const wrap = qs("#product-wrap");

  if (!p) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="e-ico">${icon("search")}</div>
        <b>محصول پیدا نشد</b>
        <div class="mt-2"><a class="btn btn-primary" href="${PAGE("shop")}">رفتن به فروشگاه</a></div>
      </div>`;
    return;
  }

  document.title = `${p.name} | پرودید`;
  const cat = getCategory(p.cat);

  wrap.innerHTML = `
    <nav class="breadcrumb" aria-label="مسیر">
      <a href="${PAGE("index")}">خانه</a> ‹
      <a href="${PAGE("shop")}">فروشگاه</a> ‹
      <a href="${PAGE("shop")}?cat=${p.cat}">${cat.name}</a> ‹
      ${p.name}
    </nav>
    <div class="product-layout">
      ${productImg(p, "product-gallery")}
      <div class="product-info">
        <div class="p-meta">
          ${p.badge ? `<span class="badge badge-gold">${p.badge}</span>` : ""}
          ${saleBadge(p)}
          <span class="badge" style="background:var(--wine-tint);color:var(--wine)">${cat.name}</span>
        </div>
        <h1>${p.name}</h1>
        <p class="product-desc">${p.desc}</p>
        <div class="price-box">
          <div class="p-price-row">${priceHTML(p)}</div>
          ${p.sale === "w" && p.price !== null ? `
            <div class="note-box">${icon("scale")}
              <span>این محصول <b>وزنی</b> است؛ قیمت بالا برای هر کیلوگرم است و
              مبلغ نهایی سفارش شما پس از وزن‌کشی دقیق مشخص و اطلاع‌رسانی می‌شود.</span>
            </div>` : ""}
          ${p.price === null ? `
            <div class="note-box">${icon("phone")}
              <span>قیمت این محصول روزانه تغییر می‌کند؛ برای استعلام و سفارش با
              <a href="tel:${BRAND.phone}" class="num"><b>${toFa(BRAND.phone)}</b></a> تماس بگیرید.</span>
            </div>` : ""}
        </div>
        <div id="product-action"></div>
        <a class="btn btn-outline btn-block mt-2" href="tel:${BRAND.phone}">${icon("headset")} سوال دارید؟ تماس بگیرید</a>
      </div>
    </div>
    <section class="section">
      <div class="section-head"><h2 class="section-title">محصولات مرتبط</h2></div>
      <div class="products-grid" id="related-grid">
        ${PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(productCard).join("")}
      </div>
    </section>`;

  staggerReveal(qs("#related-grid"));

  function syncProductQty() {
    const action = qs("#product-action");
    if (!p.available) {
      action.innerHTML = '<button class="btn btn-block" disabled style="background:#eee9dd;color:#a39a89">ناموجود</button>';
      return;
    }
    if (p.price === null) {
      action.innerHTML = `<a class="btn btn-primary btn-block" href="tel:${BRAND.phone}">${icon("phone")} تماس برای سفارش</a>`;
      return;
    }
    if (p.sale === "w") {
      action.innerHTML = weightControlHTML(p);
      bindWeightControl(p, action, syncProductQty);
      return;
    }
    const inCart = Cart.qty(p.id);
    if (inCart > 0) {
      action.innerHTML = `
        <div class="qty-row">
          <div class="qty-stepper">
            <button type="button" data-inc="${p.id}">${icon("plus")}</button>
            <span class="qty-val">${qtyLabel(p, inCart)}</span>
            <button type="button" data-dec="${p.id}">${icon("minus")}</button>
          </div>
          <a class="btn btn-primary" style="flex:1" href="${PAGE("cart")}">مشاهده سبد و ادامه خرید</a>
        </div>`;
    } else {
      action.innerHTML = `<button class="btn btn-primary btn-block" data-add="${p.id}">${icon("cart")} افزودن به سبد خرید</button>`;
    }
  }
  syncProductQty();
}

/* انتخاب‌گر وزن دلخواه در صفحه محصول (محصولات وزنی) */
const WEIGHT_CHIPS = [250, 500, 750, 1000, 1500];
function weightControlHTML(p) {
  const inCart = Cart.qty(p.id);
  const grams = inCart > 0 ? Math.round(inCart * 1000) : 500;
  const inCartNow = inCart > 0;
  return `
    <div class="wctl" data-wctl="${p.id}">
      <span class="wctl-label">${icon("scale")} وزن دلخواه خود را وارد کنید</span>
      <div class="wctl-row">
        <div class="qty-stepper wgt">
          <button type="button" data-winc aria-label="افزایش ۱۰۰ گرم">${icon("plus")}</button>
          <span class="qty-val">
            <input class="wctl-inp" data-wgt-inp type="text" inputmode="numeric"
                   value="${toFa(grams)}" aria-label="وزن به گرم">
            <span class="wctl-unit">گرم</span>
          </span>
          <button type="button" data-wdec aria-label="کاهش ۱۰۰ گرم">${icon("minus")}</button>
        </div>
        <div class="wctl-price">
          قیمت تقریبی<br>
          <b data-wprice>${fmtPrice(Math.round(p.price * grams / 1000))}</b> تومان
        </div>
      </div>
      <div class="wchips">
        ${WEIGHT_CHIPS.map((g) =>
          `<button type="button" class="wchip${g === grams ? " active" : ""}" data-wchip="${g}">${
            g >= 1000 ? `${toFa(g / 1000)} کیلو` : `${toFa(g)} گرم`
          }</button>`).join("")}
      </div>
      ${inCartNow
        ? `<a class="btn btn-primary btn-block" href="${PAGE("cart")}">${icon("cart")} مشاهده سبد و ادامه خرید</a>`
        : `<button type="button" class="btn btn-primary btn-block" data-wadd>${icon("cart")} افزودن به سبد خرید</button>`}
      <p class="wctl-hint">${icon("scale")} حداقل سفارش ۱۰۰ گرم؛ مبلغ نهایی پس از وزن‌کشی دقیق مشخص و اطلاع‌رسانی می‌شود.</p>
    </div>`;
}

function bindWeightControl(p, root, rerender) {
  const box = qs("[data-wctl]", root);
  if (!box) return;
  const input = qs("[data-wgt-inp]", box);
  const priceEl = qs("[data-wprice]", box);
  const STEP = 100;
  const MIN = Math.round(Cart.MIN_WEIGHT * 1000);
  let grams = parseIntFa(input.value) || 500;

  const clamp = (g) => Math.max(MIN, Math.round(g / 10) * 10); // دقت ۱۰ گرمی
  const paint = () => {
    input.value = toFa(grams);
    priceEl.textContent = fmtPrice(Math.round((p.price * grams) / 1000));
    qsa("[data-wchip]", box).forEach((c) =>
      c.classList.toggle("active", Number(c.dataset.wchip) === grams));
    if (Cart.qty(p.id) > 0) Cart.setGrams(p.id, grams); // پس از افزودن، سبد را همگام نگه دار
  };

  qs("[data-winc]", box).addEventListener("click", () => { grams = clamp(grams + STEP); paint(); });
  qs("[data-wdec]", box).addEventListener("click", () => { grams = clamp(grams - STEP); paint(); });
  qsa("[data-wchip]", box).forEach((c) =>
    c.addEventListener("click", () => { grams = Number(c.dataset.wchip); paint(); }));

  input.addEventListener("input", () => {
    const g = parseIntFa(input.value);
    if (g) { grams = g; priceEl.textContent = fmtPrice(Math.round((p.price * grams) / 1000)); }
  });
  input.addEventListener("change", () => { grams = clamp(parseIntFa(input.value) || MIN); paint(); });

  const addBtn = qs("[data-wadd]", box);
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      grams = clamp(grams);
      Cart.setGrams(p.id, grams);
      toast(`«${p.name}» (${qtyLabel(p, grams / 1000)}) به سبد اضافه شد`);
      if (rerender) rerender();
    });
  }
}

/* =========================================================
   سبد خرید
   ========================================================= */
function initCartPage() {
  bindCartEvents(renderCart);

  function renderCart() {
    const wrap = qs("#cart-wrap");
    const items = Cart.items();

    if (!items.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="e-ico">${icon("cart")}</div>
          <b>سبد خرید شما خالی است</b>
          از فروشگاه، محصولات تازه و خوشمزه انتخاب کنید.
          <div class="mt-2"><a class="btn btn-primary" href="${PAGE("shop")}">رفتن به فروشگاه</a></div>
        </div>`;
      return;
    }

    const total = Cart.total();
    const underMin = total < BRAND.minOrder;

    wrap.innerHTML = `
      <div class="cart-layout">
        <div class="cart-list">
          ${items.map(({ p, qty }) => `
            <div class="cart-item" data-card="${p.id}">
              <a class="ci-img" href="${PAGE("product")}?id=${p.id}">
                ${icon(p.ic)}
                <img src="${ROOT}assets/img/products/${p.id}.jpg" alt="" onerror="this.remove()">
              </a>
              <div>
                <a href="${PAGE("product")}?id=${p.id}"><div class="ci-name">${p.name}</div></a>
                <div class="ci-unit">${p.sale === "w" ? `${fmtPrice(p.price)} تومان / کیلو · وزنی` : `${fmtPrice(p.price)} تومان / بسته`}</div>
                <div class="ci-price">${fmtPrice(p.price * qty)} تومان${p.sale === "w" ? " (تقریبی)" : ""}</div>
              </div>
              <div class="ci-side">
                ${stepperHTML(p, qty)}
                <button class="ci-remove" data-remove="${p.id}">${icon("trash")}حذف</button>
              </div>
            </div>`).join("")}
        </div>
        <aside class="summary-card">
          <h3>خلاصه سفارش</h3>
          <div class="sum-row"><span>تعداد اقلام</span><span>${faNum.format(items.length)}</span></div>
          <div class="sum-row total"><span>جمع کل${Cart.hasWeightItems() ? " (تقریبی)" : ""}</span><span>${fmtPrice(total)} تومان</span></div>
          ${Cart.hasWeightItems() ? `
            <p class="sum-note">${icon("scale")}<span>سبد شما شامل محصولات وزنی است؛ مبلغ نهایی پس از وزن‌کشی دقیق مشخص می‌شود.</span></p>` : ""}
          <p class="sum-note">${icon("truck")}<span>${BRAND.deliveryFeeNote}.</span></p>
          ${underMin ? `
            <div class="min-order-warn">حداقل مبلغ سفارش ${fmtPrice(BRAND.minOrder)} تومان است.
            ${fmtPrice(BRAND.minOrder - total)} تومان دیگر به سبد اضافه کنید.</div>` : ""}
          <a class="btn btn-primary btn-block ${underMin ? "disabled" : ""}"
             href="${underMin ? "#" : PAGE("checkout")}"
             ${underMin ? 'onclick="toast(\'مبلغ سفارش به حداقل نرسیده است\');return false;"' : ""}>
             ادامه و تسویه حساب</a>
          <a class="btn btn-light btn-block mt-1" href="${PAGE("shop")}">ادامه خرید</a>
        </aside>
      </div>`;

    qsa("[data-remove]", wrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        Cart.remove(btn.dataset.remove);
        renderCart();
      });
    });
  }
  renderCart();
}

/* =========================================================
   تسویه حساب
   ========================================================= */
function initCheckoutPage() {
  const wrap = qs("#checkout-wrap");

  if (new URLSearchParams(location.search).get("done") === "1") {
    wrap.innerHTML = checkoutSuccessHTML();
    return;
  }

  const items = Cart.items();

  if (!items.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="e-ico">${icon("cart")}</div>
        <b>سبدی برای تسویه وجود ندارد</b>
        <div class="mt-2"><a class="btn btn-primary" href="${PAGE("shop")}">رفتن به فروشگاه</a></div>
      </div>`;
    return;
  }

  const profile = Profile.read();
  const total = Cart.total();
  const SLOTS = ["۹ تا ۱۲", "۱۲ تا ۱۵", "۱۵ تا ۱۸", "۱۸ تا ۲۱"];

  wrap.innerHTML = `
    <form id="checkout-form" class="checkout-grid" novalidate>
      <div>
        <div class="form-card">
          <h3><span class="step-num">۱</span> مشخصات گیرنده</h3>
          <div class="form-grid cols-2">
            <div>
              <label for="f-name">نام و نام خانوادگی *</label>
              <input id="f-name" name="name" required value="${profile.name || ""}" placeholder="مثلا: علی محمدی">
            </div>
            <div>
              <label for="f-phone">شماره موبایل *</label>
              <input id="f-phone" name="phone" required inputmode="tel" dir="ltr" value="${profile.phone || ""}" placeholder="0913xxxxxxx">
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3><span class="step-num">۲</span> آدرس تحویل (فقط ${BRAND.city})</h3>
          <div class="form-grid">
            <div>
              <label for="f-address">آدرس دقیق *</label>
              <textarea id="f-address" name="address" rows="3" required placeholder="محله، خیابان، کوچه، پلاک، واحد">${profile.address || ""}</textarea>
            </div>
          </div>
          <p class="muted mt-1">ارسال فقط در محدوده شهر ${BRAND.city} انجام می‌شود؛ ${BRAND.deliveryFeeNote}.</p>
        </div>

        <div class="form-card">
          <h3><span class="step-num">۳</span> زمان تحویل</h3>
          <div class="form-grid cols-2 mb-2">
            <div>
              <label for="f-day">روز تحویل</label>
              <select id="f-day" name="day">
                <option value="امروز (ارسال همان‌روز)">امروز (ارسال همان‌روز)</option>
                <option value="فردا">فردا</option>
              </select>
            </div>
          </div>
          <label>بازه زمانی</label>
          <div class="slot-grid" id="slot-grid">
            ${SLOTS.map((s, i) => `<button type="button" class="slot ${i === 0 ? "active" : ""}" data-slot="${s}">${s}</button>`).join("")}
          </div>
        </div>

        <div class="form-card">
          <h3><span class="step-num">۴</span> روش پرداخت</h3>
          <label class="pay-option">
            <input type="radio" name="pay" value="کارت به کارت" checked>
            <span><b>${icon("card")} کارت به کارت</b>
            <span>شماره کارت پس از تایید سفارش برای شما ارسال می‌شود.</span></span>
          </label>
          <label class="pay-option">
            <input type="radio" name="pay" value="پرداخت در محل">
            <span><b>${icon("wallet")} پرداخت در محل تحویل</b>
            <span>پرداخت با کارت‌خوان سیار یا نقدی هنگام تحویل.</span></span>
          </label>
          <label class="pay-option" style="opacity:.55">
            <input type="radio" name="pay" value="پرداخت آنلاین" disabled>
            <span><b>${icon("card")} پرداخت آنلاین <span class="soon-chip">به‌زودی</span></b>
            <span>اتصال به درگاه پرداخت اینترنتی در حال راه‌اندازی است.</span></span>
          </label>
        </div>

        <div class="form-card">
          <h3><span class="step-num">۵</span> توضیحات سفارش (اختیاری)</h3>
          <textarea name="notes" rows="2" placeholder="مثلا: کوبیده‌ها را سیخ‌شده آماده کنید / گوشت کم‌چرب باشد"></textarea>
        </div>
      </div>

      <aside class="summary-card">
        <h3>خلاصه سفارش</h3>
        ${items.map(({ p, qty }) => `
          <div class="sum-row">
            <span>${p.name} × ${qtyLabel(p, qty)}</span>
            <span>${fmtPrice(p.price * qty)}</span>
          </div>`).join("")}
        <div class="sum-row total"><span>جمع کل${Cart.hasWeightItems() ? " (تقریبی)" : ""}</span><span>${fmtPrice(total)} تومان</span></div>
        ${Cart.hasWeightItems() ? `<p class="sum-note">${icon("scale")}<span>مبلغ نهایی محصولات وزنی پس از وزن‌کشی مشخص و پیش از ارسال به شما اطلاع داده می‌شود.</span></p>` : ""}
        <p class="sum-note">${icon("truck")}<span>${BRAND.deliveryFeeNote}.</span></p>
        <button type="submit" class="btn btn-primary btn-block">${icon("chat")} ثبت نهایی سفارش در واتس‌اپ</button>
        <a class="btn btn-outline btn-block mt-1" href="tel:${BRAND.phone}">${icon("phone")} ثبت سفارش با تماس</a>
        <p class="sum-note text-center" style="display:block">با ثبت سفارش، <a href="${PAGE("terms")}" style="color:var(--wine)"><b>قوانین فروشگاه</b></a> را می‌پذیرید.</p>
      </aside>
    </form>`;

  let selectedSlot = SLOTS[0];
  qs("#slot-grid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-slot]");
    if (!btn) return;
    selectedSlot = btn.dataset.slot;
    qsa("#slot-grid .slot").forEach((s) => s.classList.toggle("active", s === btn));
  });

  qs("#checkout-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const address = form.address.value.trim();
    if (!name || !phone || !address) {
      toast("لطفا نام، موبایل و آدرس را کامل کنید");
      return;
    }
    if (!/^0?9\d{9}$/.test(phone.replace(/[^\d]/g, ""))) {
      toast("شماره موبایل معتبر نیست");
      return;
    }

    Profile.write({ name, phone, address });

    const day = form.day.value;
    const pay = form.pay.value;
    const notes = form.notes.value.trim();

    const lines = [
      "*سفارش جدید از سایت پرودید*",
      "──────────────",
      ...items.map(({ p, qty }, i) =>
        `${faNum.format(i + 1)}. ${p.name} — ${qtyLabel(p, qty)} — ${fmtPrice(p.price * qty)} تومان${p.sale === "w" ? " (تقریبی)" : ""}`),
      "──────────────",
      `جمع کل${Cart.hasWeightItems() ? " (تقریبی)" : ""}: ${fmtPrice(total)} تومان`,
      `گیرنده: ${name}`,
      `موبایل: ${phone}`,
      `آدرس: ${address}`,
      `زمان تحویل: ${day} — ساعت ${selectedSlot}`,
      `روش پرداخت: ${pay}`,
      notes ? `توضیحات: ${notes}` : "",
    ].filter(Boolean);

    Orders.add({
      date: new Date().toISOString(),
      items: items.map(({ p, qty }) => ({ id: p.id, name: p.name, qty, price: p.price })),
      total,
      day,
      slot: selectedSlot,
      pay,
    });

    const url = `https://wa.me/${BRAND.phoneIntl}?text=${encodeURIComponent(lines.join("\n"))}`;
    Cart.clear();
    window.open(url, "_blank");
    location.href = `${PAGE("checkout")}?done=1`;
  });
}

function checkoutSuccessHTML() {
  return `
    <div class="success-box">
      <div class="s-ico">${icon("check")}</div>
      <h2>سفارش شما ثبت شد!</h2>
      <p>جزئیات سفارش در واتس‌اپ برای فروشگاه ارسال شد. همکاران ما به‌زودی
      برای تایید نهایی و اعلام مبلغ دقیق (محصولات وزنی) با شما تماس می‌گیرند.</p>
      <a class="btn btn-primary btn-block" href="${PAGE("shop")}">بازگشت به فروشگاه</a>
      <a class="btn btn-light btn-block mt-1" href="${PAGE("account")}">مشاهده سفارش‌های من</a>
    </div>`;
}

/* =========================================================
   حساب کاربری
   ========================================================= */
function initAccountPage() {
  const profile = Profile.read();
  const orders = Orders.read();

  qs("#profile-form").innerHTML = `
    <div class="form-grid">
      <div>
        <label for="a-name">نام و نام خانوادگی</label>
        <input id="a-name" name="name" value="${profile.name || ""}" placeholder="مثلا: علی محمدی">
      </div>
      <div>
        <label for="a-phone">شماره موبایل</label>
        <input id="a-phone" name="phone" dir="ltr" inputmode="tel" value="${profile.phone || ""}" placeholder="0913xxxxxxx">
      </div>
      <div>
        <label for="a-address">آدرس پیش‌فرض</label>
        <textarea id="a-address" name="address" rows="3" placeholder="محله، خیابان، کوچه، پلاک">${profile.address || ""}</textarea>
      </div>
      <button type="submit" class="btn btn-dark">ذخیره اطلاعات</button>
    </div>`;

  qs("#profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    Profile.write({
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      address: f.address.value.trim(),
    });
    toast("اطلاعات شما ذخیره شد");
  });

  const ordersWrap = qs("#orders-wrap");
  if (!orders.length) {
    ordersWrap.innerHTML = `
      <div class="empty-state">
        <div class="e-ico">${icon("package")}</div>
        <b>هنوز سفارشی ثبت نکرده‌اید</b>
        <div class="mt-2"><a class="btn btn-primary" href="${PAGE("shop")}">اولین سفارش را ثبت کنید</a></div>
      </div>`;
    return;
  }
  ordersWrap.innerHTML = orders.map((o) => `
    <div class="order-card">
      <div class="o-head">
        <span class="o-total">${fmtPrice(o.total)} تومان</span>
        <span class="o-date">${new Date(o.date).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })} — ${o.day}، ساعت ${o.slot}</span>
      </div>
      <div class="o-items">
        ${o.items.map((it) => `${it.name} (${faNum.format(it.qty)})`).join("، ")}
      </div>
      <div class="muted" style="font-size:.75rem">پرداخت: ${o.pay}</div>
    </div>`).join("");
}
