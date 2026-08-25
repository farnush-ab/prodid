"use client";

/* =========================================================
   دستیار هوشمند پرودید — راهنمای خرید و آشپزی
   پورت وفادار assistant.js؛ به دلیل ماهیت کاملا امپرتیو
   (اسپرایت راه‌رفتن، حباب‌های شناور، پنل چت پویا) به‌جای
   بازنویسی به state ری‌اکت، همان منطق DOM اصلی درون
   useEffect اجرا می‌شود تا رفتار و ظاهر دقیقا حفظ شود.
   ========================================================= */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { BRAND, PRODUCTS, getProduct, type Product } from "@/lib/data";
import { fmtPrice, toFa, unitLabel } from "@/lib/format";
import { iconHTML } from "@/lib/icons";
import { Cart } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { pageHref } from "@/lib/page";

const AVATAR = "/assets/img/assistant.png";
const WALK_IMG = "/assets/img/assistant-walk.png";
const WAVE_IMG = "/assets/img/assistant-wave.png";
const CYCLE_IMG = "/assets/img/assistant-walkcycle.png";
const INTRO_MSG = "سلام! من دستیار هوشمند پرودیدم 👋 سوال‌هات درباره محصولات، ارسال یا حتی آشپزی رو از من بپرس!";
const GREET_MSG = "هی! من می‌تونم کمکت کنما 😊 هر سوالی داشتی روم کلیک کن.";
const PEEK_MSG = "من همین‌جام عزیزم؛ حواسم بهت هست 😉";

const AKEY = "prodid_assistant";

interface AState {
  disabled?: boolean;
  walked?: boolean;
}

function norm(s: string) {
  return s
    .replace(/[يئ]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[?؟!.،,:؛]/g, " ")
    .replace(/‌/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
const has = (t: string, words: string[]) => words.some((w) => t.includes(norm(w)));

const RECIPES: { keys: string[]; title: string; text: string; products: string[] }[] = [
  {
    keys: ["سزار"],
    title: "سالاد سزار",
    text: "برای سالاد سزار: جوجه فیله را گریل کن و ورقه‌ای برش بزن، با کاهو، نان تست برشته، پنیر پارمزان و سس سزار مخلوط کن. فیله مرغ ما مزه‌دار شده و فقط چند دقیقه گریل می‌خواهد.",
    products: ["jooje-file", "salad-anvae"],
  },
  {
    keys: ["برگر", "همبرگر"],
    title: "برگر خانگی",
    text: "برای برگر خانگی: برگر دست‌ساز را از دو طرف روی حرارت متوسط بپز (هر طرف حدود ۴ دقیقه)، با نان برگر، کاهو، گوجه، پنیر و پیاز داغ سرو کن. ژامبون هم برای برگر مخصوص عالیه.",
    products: ["hamburger-gousht", "piaz-dagh", "jambon-morgh"],
  },
  {
    keys: ["کباب", "کوبیده", "چنجه", "شیشلیک", "مهمونی", "مهمانی"],
    title: "کباب برای جمع",
    text: "برای هر نفر حدود ۳۰۰ تا ۴۰۰ گرم در نظر بگیر؛ مثلا برای ۴ نفر: ۱ کیلو کوبیده + ۱ کیلو جوجه فیله ترکیب محبوبیه. چنجه و شیشلیک هم برای مهمانی‌های خاص‌تر پیشنهاد می‌شود. همه مزه‌دار و آماده سیخ هستند.",
    products: ["kabab-koobideh", "jooje-file", "chenje-gosfandi"],
  },
  {
    keys: ["سینه مرغ", "با مرغ چی", "فیله مرغ"],
    title: "ایده با مرغ",
    text: "با سینه/فیله مرغ چند ایده سریع: ۱) جوجه زعفرانی گریل با سبزیجات ۲) شنیسل سوخاری با سیب‌زمینی ۳) چیکن سزار. محصولات ما مزه‌دار و آماده طبخ هستند تا نصف راه را رفته باشی!",
    products: ["jooje-file", "schnitzel-morgh", "file-ran-zafarani"],
  },
  {
    keys: ["رژیم", "رژیمی", "کالری", "شام سبک", "سبک", "سالم"],
    title: "پیشنهاد رژیمی و سبک",
    text: "برای وعده سبک و رژیمی: جوجه فیله گریل (پروتئین بالا، چربی کم) + قارچ کبابی + سالاد. برگر شتر هم گزینه کم‌چرب و مقوی برای تنوع است. سرخ نکن؛ گریل یا فر بهترین روش است.",
    products: ["jooje-file", "gharch-kababi", "salad-anvae", "hamburger-shotor"],
  },
  {
    keys: ["خورشت", "قورمه", "قیمه"],
    title: "خورشت",
    text: "برای خورشت‌های سبزی‌دار، سبزی خورشتی سرخ‌شده ما کار را خیلی سریع می‌کند؛ فقط با گوشت و لوبیا/لپه بپز. گوشت تازه هم به‌صورت وزنی موجود است.",
    products: ["sabzi-khoreshti", "file-gosale"],
  },
  {
    keys: ["کوکو"],
    title: "کوکو سبزی",
    text: "سبزی کوکویی آماده ما را با تخم‌مرغ، کمی آرد و زردچوبه مخلوط کن و در تابه سرخ کن — کوکوی مجلسی در ۲۰ دقیقه!",
    products: ["sabzi-kookooi", "piaz-dagh"],
  },
  {
    keys: ["استیک"],
    title: "استیک خانگی",
    text: "برای استیک: گوشت را ۳۰ دقیقه قبل از پخت از یخچال دربیاور، تابه را خیلی داغ کن، هر طرف ۲ تا ۴ دقیقه (بسته به مغزپخت دلخواه) و بعد ۵ دقیقه استراحت بده. ریبای و تی‌بون ما برش حرفه‌ای دارند.",
    products: ["ribeye-gosale", "tbone-gosfandi", "file-gosale"],
  },
  {
    keys: ["بندری"],
    title: "خوراک بندری",
    text: "بندری آماده ما را فقط گرم کن و با نان باگت و خیارشور سرو کن — ساندویچ خوشمزه در ۱۰ دقیقه.",
    products: ["bandari", "piaz-dagh"],
  },
  {
    keys: ["فلافل", "سمبوسه"],
    title: "فلافل و سمبوسه",
    text: "فلافل و سمبوسه‌های خانگی ما آماده سرخ کردن هستند؛ با روغن داغ ۳-۴ دقیقه کافی است. با نان، سبزیجات و سس دلخواه سرو کن.",
    products: ["falafel-tamdar", "samboose"],
  },
  {
    keys: ["پیتزا"],
    title: "پیتزای خانگی",
    text: "برای پیتزای خانگی: کالباس پپرونی، ژامبون مرغ و قارچ عالی جواب می‌دهند. خمیر + سس گوجه + پنیر + این‌ها = پیتزای حرفه‌ای.",
    products: ["kalbas-pepperoni", "jambon-morgh-gharch"],
  },
];

function faqAnswer(t: string): { text: string; contact?: boolean } | null {
  if (has(t, ["وزنی", "وزن کشی", "قیمت نهایی", "قیمت دقیق", "چرا تقریبی"]))
    return {
      text: "قیمت محصولات وزنی برای «هر کیلوگرم» است؛ مبلغ سبد شما تقریبی محاسبه می‌شود و بعد از وزن‌کشی دقیق سفارش، مبلغ نهایی قبل از ارسال بهت اطلاع داده می‌شود. 🔎 روی هر محصول برچسب «وزنی» یا «عددی» را می‌بینی.",
    };
  if (has(t, ["حداقل سفارش", "حداقل مبلغ", "حداقل خرید"]))
    return { text: `حداقل مبلغ سفارش اینترنتی ${fmtPrice(BRAND.minOrder)} تومان است. برای خرید کمتر، می‌توانی حضوری به فروشگاه سر بزنی.` };
  if (has(t, ["هزینه ارسال", "پیک", "کرایه"]))
    return { text: "هزینه ارسال جداگانه و بر اساس فاصله آدرس شما از فروشگاه محاسبه می‌شود و هنگام تایید سفارش اعلام می‌گردد." };
  if (has(t, ["کی میرسه", "چقدر طول", "زمان ارسال", "زمان تحویل", "بازه", "امروز میرسه", "همان روز", "همون روز"]))
    return { text: "سفارش‌های ساعات کاری، همان روز ارسال می‌شوند و موقع ثبت سفارش می‌توانی بازه تحویل را انتخاب کنی: ۹ تا ۱۲، ۱۲ تا ۱۵، ۱۵ تا ۱۸ یا ۱۸ تا ۲۱." };
  if (has(t, ["کجا ارسال", "محدوده", "شهرستان", "تهران", "خارج از کاشان", "کدوم شهر"]))
    return { text: "فعلا فقط در محدوده شهر کاشان ارسال داریم. اگر از پوشش آدرست مطمئن نیستی، قبل از سفارش یک تماس بگیر.", contact: true };
  if (has(t, ["پرداخت", "درگاه", "کارت به کارت", "نقدی", "پوز", "کارتخوان"]))
    return { text: "فعلا دو روش داریم: کارت به کارت (بعد از تایید سفارش) یا پرداخت در محل تحویل با کارت‌خوان سیار. درگاه آنلاین هم به‌زودی فعال می‌شود." };
  if (has(t, ["نگهداری", "فریزر", "یخچال", "منجمد", "چند روز میمونه", "ماندگاری"]))
    return {
      text: "محصولات تازه را در یخچال حداکثر ۱-۲ روز و در فریزر (۱۸- درجه) تا ۳ ماه می‌توانی نگه داری. کالباس و ژامبون باز شده را در ظرف دربسته در یخچال نگه دار و طی ۳-۴ روز مصرف کن. زنجیره سرد بسته‌بندی ما تا لحظه تحویل حفظ می‌شود.",
    };
  if (has(t, ["موجود", "دارید", "داری", "هست", "موجودی"]))
    return { text: "همه محصولاتی که در فروشگاه می‌بینی موجود هستند؛ اگر محصولی ناموجود شود، روی کارتش مشخص می‌شود. اسم محصول موردنظرت را بنویس تا قیمتش را بگویم!" };
  if (has(t, ["ادرس", "کجایید", "کجاست", "فروشگاه حضوری", "ساعت کاری", "تماس", "شماره", "تلفن", "واتساپ", "اینستاگرام"]))
    return { text: `فروشگاه ما: ${BRAND.address}. تلفن سفارش: ${toFa(BRAND.phone)}. همه‌روزه باز هستیم.`, contact: true };
  if (has(t, ["تفاوت", "فرق"]))
    return { text: "بگو بین کدام دو محصول مردد هستی تا مقایسه‌شان کنم؛ مثلا «فرق ریبای و تی‌بون» یا «فرق ژامبون مرغ و بوقلمون». به‌طور کلی: ریبای چرب‌تر و لطیف‌تر است، تی‌بون دو بافت دارد؛ ژامبون بوقلمون کم‌چرب‌تر از مرغ است." };
  return null;
}

function findProducts(t: string): Product[] {
  const hits: { p: Product; score: number }[] = [];
  for (const p of PRODUCTS) {
    const words = norm(p.name).split(" ").filter((w) => w.length > 2);
    const score = words.filter((w) => t.includes(w)).length;
    if (score >= Math.min(2, words.length)) hits.push({ p, score });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((h) => h.p);
}

interface Answer {
  text: string;
  title?: string;
  products?: string[];
  productObjs?: Product[];
  contact?: boolean;
}

function answer(q: string): Answer {
  const t = norm(q);

  if (has(t, ["سلام", "درود", "خوبی", "هی ", "hello", "hi"]) && t.length < 25)
    return { text: "سلام! 🙌 من دستیار هوشمند پرودید هستم. درباره محصولات، قیمت، ارسال یا حتی ایده و طرز تهیه غذا ازم بپرس." };

  if (has(t, ["مرسی", "ممنون", "تشکر", "دمت گرم"])) return { text: "خواهش می‌کنم! نوش جان 😊 اگر باز سوالی بود در خدمتم." };

  for (const r of RECIPES) {
    if (has(t, r.keys)) return { text: r.text, title: r.title, products: r.products };
  }

  const faq = faqAnswer(t);
  if (faq) return faq;

  if (has(t, ["پیشنهاد", "چی بخرم", "چی خوبه", "پرفروش", "چی بگیرم", "شام چی", "ناهار چی"]))
    return {
      text: "این‌ها محبوب‌ترین‌های مشتری‌های ما هستند؛ اگر بگویی برای چه وعده‌ای یا چند نفر می‌خواهی، دقیق‌تر پیشنهاد می‌دهم:",
      products: ["kabab-koobideh", "hamburger-gousht", "chenje-gosfandi"],
    };

  const found = findProducts(t);
  if (found.length) return { text: "این محصول(ها) را پیدا کردم:", productObjs: found };

  return {
    text: "این یکی را باید از همکاران فروشگاه بپرسی! از راه‌های زیر سریع جوابت را می‌گیری. در ضمن می‌توانی درباره قیمت‌ها، ارسال، نگهداری یا ایده غذا ازم سوال کنی.",
    contact: true,
  };
}

const CHIPS = [
  "با سینه مرغ چی بپزم؟",
  "برای ۴ نفر کباب چی بگیرم؟",
  "پیشنهاد شام رژیمی",
  "هزینه و زمان ارسال",
  "قیمت محصولات وزنی چطوریه؟",
];

export function Assistant() {
  const pathname = usePathname();
  const built = useRef(false);
  const refs = useRef<{
    root: HTMLDivElement;
    fab: HTMLButtonElement;
    panel: HTMLDivElement;
    msgsEl: HTMLDivElement;
  } | null>(null);
  const walkerRef = useRef<HTMLDivElement | null>(null);
  const walkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleReady = useRef<{ frames: number; fw: number; fh: number } | null>(null);
  const stateRef = useRef<AState>({});

  useEffect(() => {
    if (built.current) return;
    built.current = true;

    const readState = (): AState => {
      try {
        return JSON.parse(localStorage.getItem(AKEY) || "{}") || {};
      } catch {
        return {};
      }
    };
    const saveState = () => localStorage.setItem(AKEY, JSON.stringify(stateRef.current));
    stateRef.current = readState();

    function addFooterToggle() {
      const bottom = document.querySelector(".footer-bottom");
      if (!bottom || bottom.querySelector(".as-reenable")) return;
      const a = document.createElement("a");
      a.href = "#";
      a.className = "as-reenable";
      a.textContent = "فعال‌سازی دستیار هوشمند";
      a.style.cssText = "margin-inline-start:12px;text-decoration:underline";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        delete stateRef.current.disabled;
        saveState();
        location.reload();
      });
      bottom.appendChild(a);
    }

    if (stateRef.current.disabled) {
      addFooterToggle();
      return;
    }

    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cycleProbe = new Image();
    cycleProbe.onload = () => {
      const fh = cycleProbe.naturalHeight;
      const frames = Math.max(1, Math.round(cycleProbe.naturalWidth / fh));
      cycleReady.current = { frames, fw: cycleProbe.naturalWidth / frames, fh };
    };
    cycleProbe.src = CYCLE_IMG;

    const root = document.createElement("div");
    root.id = "prodid-assistant";
    root.innerHTML = `
      <button class="as-fab" aria-label="گفتگو با دستیار هوشمند پرودید" hidden>
        <img src="${AVATAR}" alt="">
        <span class="as-fab-dot"></span>
      </button>

      <div class="as-panel" hidden>
        <div class="as-head">
          <img src="${AVATAR}" alt="">
          <div class="as-head-t">
            <b>دستیار هوشمند پرودید</b>
            <span>راهنمای خرید و آشپزی</span>
          </div>
          <button class="as-off" title="غیرفعال کردن دستیار">${iconHTML("trash")}</button>
          <button class="as-min" aria-label="بستن پنجره">${iconHTML("close")}</button>
        </div>
        <div class="as-msgs"></div>
        <div class="as-chips"></div>
        <form class="as-inputrow">
          <input type="text" placeholder="سوالت را بنویس…" aria-label="پیام" autocomplete="off">
          <button type="submit" aria-label="ارسال">${iconHTML("send")}</button>
        </form>
      </div>`;
    document.body.appendChild(root);

    const fab = root.querySelector(".as-fab") as HTMLButtonElement;
    const panel = root.querySelector(".as-panel") as HTMLDivElement;
    const msgsEl = root.querySelector(".as-msgs") as HTMLDivElement;
    refs.current = { root, fab, panel, msgsEl };

    function showFab() {
      fab.hidden = false;
      requestAnimationFrame(() => fab.classList.add("in"));
    }
    function hideFab() {
      fab.classList.remove("in");
      fab.hidden = true;
    }

    function openPanel() {
      fab.classList.remove("in");
      fab.hidden = true;
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add("in"));
      if (!msgsEl.childElementCount) {
        botSays({
          text: "سلام! 👋 من دستیار هوشمند پرودید هستم؛ درباره محصولات، قیمت و ارسال جواب می‌دهم و برای انتخاب غذا و طرز تهیه هم کنارت هستم. چه کمکی از دستم برمی‌آید؟",
        });
      }
      setTimeout(() => panel.querySelector("input")?.focus(), 300);
    }
    function closePanel() {
      panel.classList.remove("in");
      setTimeout(() => {
        panel.hidden = true;
        showFab();
      }, 250);
    }
    function disableAssistant() {
      stateRef.current.disabled = true;
      saveState();
      root.remove();
      toast("دستیار غیرفعال شد؛ از پایین صفحه می‌توانی دوباره فعالش کنی");
      addFooterToggle();
    }

    function scrollMsgs() {
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function productCardMini(p: Product) {
      return `
        <div class="as-product">
          <div class="as-p-img">${iconHTML(p.ic)}<img src="/assets/img/products/${p.id}.jpg" alt="" onerror="this.remove()"></div>
          <div class="as-p-info">
            <b>${p.name}</b>
            <span>${p.price === null ? "استعلام قیمت" : fmtPrice(p.price) + " " + unitLabel(p)}</span>
          </div>
          <div class="as-p-btns">
            <a class="as-p-view" href="${pageHref("product")}?id=${p.id}" title="مشاهده محصول">${iconHTML("search")}</a>
            ${
              p.available && p.price !== null
                ? `<button class="as-p-add" data-add="${p.id}" title="افزودن به سبد">${iconHTML("plus")}</button>`
                : ""
            }
          </div>
        </div>`;
    }

    function botSays(a: Answer) {
      const el = document.createElement("div");
      el.className = "as-msg as-bot";
      let html = "";
      if (a.title) html += `<b class="as-r-title">${a.title}</b>`;
      html += `<span>${a.text}</span>`;

      const prods = a.productObjs || (a.products || []).map(getProduct).filter((p): p is Product => !!p);
      if (prods.length) html += `<div class="as-products">${prods.map(productCardMini).join("")}</div>`;
      if (a.contact) {
        html += `
          <div class="as-contact">
            <a class="btn btn-sm btn-primary" href="tel:${BRAND.phone}">${iconHTML("phone")} تماس</a>
            <a class="btn btn-sm btn-outline" href="https://wa.me/${BRAND.phoneIntl}" target="_blank" rel="noopener">${iconHTML("chat")} واتس‌اپ</a>
          </div>`;
      }
      el.innerHTML = html;
      msgsEl.appendChild(el);
      scrollMsgs();
    }

    function userSays(q: string) {
      const el = document.createElement("div");
      el.className = "as-msg as-user";
      el.textContent = q;
      msgsEl.appendChild(el);
      scrollMsgs();

      const typing = document.createElement("div");
      typing.className = "as-msg as-bot as-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      msgsEl.appendChild(typing);
      scrollMsgs();
      setTimeout(() => {
        typing.remove();
        botSays(answer(q));
      }, 500 + Math.random() * 400);
    }

    function renderChips(list: string[]) {
      const wrap = root.querySelector(".as-chips") as HTMLDivElement;
      wrap.innerHTML = list.map((c) => `<button type="button" class="as-chip">${c}</button>`).join("");
      wrap.addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest(".as-chip");
        if (b) userSays(b.textContent || "");
      });
    }

    fab.addEventListener("click", openPanel);
    root.querySelector(".as-min")?.addEventListener("click", closePanel);
    root.querySelector(".as-off")?.addEventListener("click", disableAssistant);
    // دکمه‌های افزودن به سبد داخل کارت‌های محصول مینیاتوری چت
    root.addEventListener("click", (e) => {
      const addBtn = (e.target as HTMLElement).closest("[data-add]") as HTMLElement | null;
      if (!addBtn) return;
      e.preventDefault();
      const p = getProduct(addBtn.dataset.add);
      if (!p) return;
      Cart.add(p.id);
      toast(`«${p.name}» به سبد اضافه شد`);
    });

    const form = root.querySelector(".as-inputrow") as HTMLFormElement;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input") as HTMLInputElement;
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      userSays(q);
    });

    renderChips(CHIPS);
    showFab();

    /* ---------------- حضورهای شخصیت ---------------- */
    const wt = (fn: () => void, ms: number) => walkTimers.current.push(setTimeout(fn, ms));

    function endMoment(open: boolean) {
      walkTimers.current.forEach(clearTimeout);
      walkTimers.current = [];
      if (!walkerRef.current) return;
      const w = walkerRef.current;
      walkerRef.current = null;
      w.classList.add("as-walk-out");
      setTimeout(() => {
        w.remove();
        if (open) openPanel();
        else showFab();
      }, 450);
    }

    function spawnMoment(cls: string, inner: string) {
      hideFab();
      const walker = document.createElement("div");
      walker.className = `as-walker ${cls}`;
      walker.innerHTML = inner;
      document.body.appendChild(walker);
      walker.addEventListener("click", () => endMoment(true));
      walkerRef.current = walker;
      return walker;
    }

    function startWalkIntro() {
      const el = spawnMoment(
        "",
        `
        <div class="as-walk-bubble" hidden>
          <b>دستیار هوشمند پرودید</b>
          <span>${INTRO_MSG}</span>
        </div>
        ${
          cycleReady.current
            ? `<div class="as-cycle" style="--cf:${cycleReady.current.frames};--cw:${cycleReady.current.fw};--ch:${cycleReady.current.fh}"></div>`
            : `<div class="as-rig" aria-label="دستیار هوشمند پرودید">
                 <img class="as-leg as-leg-l" src="/assets/img/assistant-leg-l.png" alt="">
                 <img class="as-leg as-leg-r" src="/assets/img/assistant-leg-r.png" alt="">
                 <img class="as-body" src="/assets/img/assistant-body.png" alt="">
               </div>`
        }`
      );

      const bubble = el.querySelector(".as-walk-bubble") as HTMLDivElement;
      const cyc0 = el.querySelector(".as-cycle") as HTMLDivElement | null;
      if (cyc0 && cycleReady.current) cyc0.style.animationTimingFunction = `steps(${cycleReady.current.frames})`;
      const imgW = window.innerWidth < 600 ? 100 : 128;
      const endX = window.innerWidth - imgW - 16;
      const walkMs = Math.min(6000, Math.max(3200, window.innerWidth * 3.4));

      const anim = el.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${endX + 170}px)` }],
        { duration: walkMs, easing: "linear", fill: "forwards" }
      );

      anim.onfinish = () => {
        if (!walkerRef.current) return;
        const moving = el.querySelector(".as-cycle") || el.querySelector(".as-rig");
        if (moving) moving.outerHTML = `<img class="as-walk-img as-waving" src="${WAVE_IMG}" alt="">`;
        bubble.hidden = false;
        requestAnimationFrame(() => bubble.classList.add("in"));
        stateRef.current.walked = true;
        saveState();
        wt(() => endMoment(false), 5200);
      };
    }

    function popGreet() {
      const el = spawnMoment(
        "as-pop",
        `
        <div class="as-walk-bubble" hidden>
          <b>دستیار هوشمند پرودید</b>
          <span>${GREET_MSG}</span>
        </div>
        <img class="as-walk-img as-waving" src="${WAVE_IMG}" alt="دستیار هوشمند پرودید">`
      );
      requestAnimationFrame(() => el.classList.add("in"));
      const bubble = el.querySelector(".as-walk-bubble") as HTMLDivElement;
      wt(() => {
        if (!walkerRef.current) return;
        bubble.hidden = false;
        requestAnimationFrame(() => bubble.classList.add("in"));
      }, 700);
      wt(() => endMoment(false), 5200);
    }

    function peekProduct() {
      const el = spawnMoment(
        "as-peek",
        `
        <div class="as-walk-bubble as-peek-bubble" hidden>
          <span>${PEEK_MSG}</span>
        </div>
        <img class="as-peek-img" src="${WAVE_IMG}" alt="دستیار هوشمند پرودید">`
      );
      requestAnimationFrame(() => el.classList.add("in"));
      const bubble = el.querySelector(".as-walk-bubble") as HTMLDivElement;
      wt(() => {
        if (!walkerRef.current) return;
        bubble.hidden = false;
        requestAnimationFrame(() => bubble.classList.add("in"));
      }, 650);
      wt(() => endMoment(false), 4800);
    }

    (refs.current as any).trigger = { startWalkIntro, popGreet, peekProduct, REDUCED };

    return () => {
      walkTimers.current.forEach(clearTimeout);
      root.remove();
      walkerRef.current?.remove();
      built.current = false; // اجازه بازسازی ویجت در remount شبیه‌سازی‌شده‌ی React Strict Mode (dev)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* هر بار مسیر عوض شود، معادل «بار جدید صفحه» رفتار حضور شخصیت را دوباره اجرا می‌کنیم */
  useEffect(() => {
    const t = (refs.current as any)?.trigger;
    if (!t || t.REDUCED) return;
    if (walkerRef.current) return;

    const page = !pathname || pathname === "/" ? "index" : pathname.split("/")[1] || "index";

    if (page === "index") {
      const hero = document.querySelector(".hero");
      if (hero && "IntersectionObserver" in window) {
        let started = false;
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting && !started) {
                started = true;
                io.disconnect();
                if (stateRef.current.walked) t.popGreet();
                else t.startWalkIntro();
              }
            });
          },
          { threshold: 0 }
        );
        io.observe(hero);
        return () => io.disconnect();
      }
    } else if (page === "product") {
      const timer = setTimeout(() => {
        const panel = refs.current?.panel;
        if (panel && !panel.classList.contains("in")) t.peekProduct();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return null;
}
