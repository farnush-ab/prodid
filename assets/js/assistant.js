/* =========================================================
   دستیار هوشمند پرودید — راهنمای خرید و آشپزی
   ویجت شناور + موتور پاسخ‌گویی قواعد-محور (بدون سرور)
   ========================================================= */

(function () {
  const AKEY = "prodid_assistant";
  const state = (() => {
    try { return JSON.parse(localStorage.getItem(AKEY)) || {}; }
    catch { return {}; }
  })();
  const saveState = () => localStorage.setItem(AKEY, JSON.stringify(state));

  if (state.disabled) {
    // لینک فعال‌سازی دوباره در فوتر تزریق می‌شود
    document.addEventListener("DOMContentLoaded", addFooterToggle);
    return;
  }

  const AVATAR = `${ROOT}assets/img/assistant.png`;
  const INTROS = [
    "سوالی داری؟ من کمکت می‌کنم 👋",
    "برای انتخاب، خرید یا طرز تهیه کمکت می‌کنم",
    "موجودی، ارسال یا طرز تهیه بپرس",
  ];

  /* ---------------- نرمال‌سازی متن فارسی ---------------- */
  function norm(s) {
    return s
      .replace(/[يئ]/g, "ی").replace(/ك/g, "ک").replace(/[أإآ]/g, "ا")
      .replace(/[ًٌٍَُِّْ]/g, "")
      .replace(/[?؟!.،,:؛]/g, " ")
      .replace(/‌/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
  const has = (t, words) => words.some((w) => t.includes(norm(w)));

  /* ---------------- پایگاه دانش دستور پخت ---------------- */
  const RECIPES = [
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

  /* ---------------- پاسخ‌های سوالات پرتکرار ---------------- */
  function faqAnswer(t) {
    if (has(t, ["وزنی", "وزن کشی", "قیمت نهایی", "قیمت دقیق", "چرا تقریبی"]))
      return { text: "قیمت محصولات وزنی برای «هر کیلوگرم» است؛ مبلغ سبد شما تقریبی محاسبه می‌شود و بعد از وزن‌کشی دقیق سفارش، مبلغ نهایی قبل از ارسال بهت اطلاع داده می‌شود. 🔎 روی هر محصول برچسب «وزنی» یا «عددی» را می‌بینی." };
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
      return { text: "محصولات تازه را در یخچال حداکثر ۱-۲ روز و در فریزر (۱۸- درجه) تا ۳ ماه می‌توانی نگه داری. کالباس و ژامبون باز شده را در ظرف دربسته در یخچال نگه دار و طی ۳-۴ روز مصرف کن. زنجیره سرد بسته‌بندی ما تا لحظه تحویل حفظ می‌شود." };
    if (has(t, ["موجود", "دارید", "داری", "هست", "موجودی"]))
      return { text: "همه محصولاتی که در فروشگاه می‌بینی موجود هستند؛ اگر محصولی ناموجود شود، روی کارتش مشخص می‌شود. اسم محصول موردنظرت را بنویس تا قیمتش را بگویم!" };
    if (has(t, ["ادرس", "کجایید", "کجاست", "فروشگاه حضوری", "ساعت کاری", "تماس", "شماره", "تلفن", "واتساپ", "اینستاگرام"]))
      return { text: `فروشگاه ما: ${BRAND.address}. تلفن سفارش: ${toFa(BRAND.phone)}. همه‌روزه باز هستیم.`, contact: true };
    if (has(t, ["تفاوت", "فرق"]))
      return { text: "بگو بین کدام دو محصول مردد هستی تا مقایسه‌شان کنم؛ مثلا «فرق ریبای و تی‌بون» یا «فرق ژامبون مرغ و بوقلمون». به‌طور کلی: ریبای چرب‌تر و لطیف‌تر است، تی‌بون دو بافت دارد؛ ژامبون بوقلمون کم‌چرب‌تر از مرغ است." };
    return null;
  }

  /* ---------------- جست‌وجوی محصول در متن ---------------- */
  function findProducts(t) {
    const hits = [];
    for (const p of PRODUCTS) {
      const words = norm(p.name).split(" ").filter((w) => w.length > 2);
      const score = words.filter((w) => t.includes(w)).length;
      if (score >= Math.min(2, words.length)) hits.push({ p, score });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 3).map((h) => h.p);
  }

  /* ---------------- مغز دستیار ---------------- */
  function answer(q) {
    const t = norm(q);

    if (has(t, ["سلام", "درود", "خوبی", "هی ", "hello", "hi"]) && t.length < 25)
      return { text: "سلام! 🙌 من دستیار هوشمند پرودید هستم. درباره محصولات، قیمت، ارسال یا حتی ایده و طرز تهیه غذا ازم بپرس." };

    if (has(t, ["مرسی", "ممنون", "تشکر", "دمت گرم"]))
      return { text: "خواهش می‌کنم! نوش جان 😊 اگر باز سوالی بود در خدمتم." };

    // دستور پخت / ایده غذا
    for (const r of RECIPES) {
      if (has(t, r.keys)) return { text: r.text, title: r.title, products: r.products };
    }

    // سوالات پرتکرار
    const faq = faqAnswer(t);
    if (faq) return faq;

    // پیشنهاد خرید کلی
    if (has(t, ["پیشنهاد", "چی بخرم", "چی خوبه", "پرفروش", "چی بگیرم", "شام چی", "ناهار چی"]))
      return {
        text: "این‌ها محبوب‌ترین‌های مشتری‌های ما هستند؛ اگر بگویی برای چه وعده‌ای یا چند نفر می‌خواهی، دقیق‌تر پیشنهاد می‌دهم:",
        products: ["kabab-koobideh", "hamburger-gousht", "chenje-gosfandi"],
      };

    // اسم محصول در متن
    const found = findProducts(t);
    if (found.length)
      return { text: "این محصول(ها) را پیدا کردم:", productObjs: found };

    // ناشناخته
    return {
      text: "این یکی را باید از همکاران فروشگاه بپرسی! از راه‌های زیر سریع جوابت را می‌گیری. در ضمن می‌توانی درباره قیمت‌ها، ارسال، نگهداری یا ایده غذا ازم سوال کنی.",
      contact: true,
    };
  }

  /* ---------------- ساخت رابط ---------------- */
  const CHIPS = [
    "با سینه مرغ چی بپزم؟",
    "برای ۴ نفر کباب چی بگیرم؟",
    "پیشنهاد شام رژیمی",
    "هزینه و زمان ارسال",
    "قیمت محصولات وزنی چطوریه؟",
  ];

  let root, fab, panel, msgsEl, introEl;

  function build() {
    root = document.createElement("div");
    root.id = "prodid-assistant";
    root.innerHTML = `
      <div class="as-intro" hidden>
        <button class="as-intro-close" aria-label="بستن">${icon("close")}</button>
        <img src="${AVATAR}" alt="" class="as-intro-avatar">
        <div class="as-intro-bubble">
          <b>دستیار هوشمند پرودید</b>
          <span>${INTROS[Math.floor(Math.random() * INTROS.length)]}</span>
        </div>
      </div>

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
          <button class="as-off" title="غیرفعال کردن دستیار">${icon("trash")}</button>
          <button class="as-min" aria-label="بستن پنجره">${icon("close")}</button>
        </div>
        <div class="as-msgs"></div>
        <div class="as-chips"></div>
        <form class="as-inputrow">
          <input type="text" placeholder="سوالت را بنویس…" aria-label="پیام" autocomplete="off">
          <button type="submit" aria-label="ارسال">${icon("send")}</button>
        </form>
      </div>`;
    document.body.appendChild(root);

    fab = root.querySelector(".as-fab");
    panel = root.querySelector(".as-panel");
    msgsEl = root.querySelector(".as-msgs");
    introEl = root.querySelector(".as-intro");

    fab.addEventListener("click", openPanel);
    root.querySelector(".as-min").addEventListener("click", closePanel);
    root.querySelector(".as-off").addEventListener("click", disableAssistant);
    root.querySelector(".as-intro-close").addEventListener("click", () => collapseIntro(true));
    introEl.addEventListener("click", (e) => {
      if (!e.target.closest(".as-intro-close")) { collapseIntro(); openPanel(); }
    });

    const form = root.querySelector(".as-inputrow");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      userSays(q);
    });

    renderChips(CHIPS);
  }

  /* ---------------- معرفی اولیه ---------------- */
  let introTimer;
  function showIntro() {
    introEl.hidden = false;
    requestAnimationFrame(() => introEl.classList.add("in"));
    introTimer = setTimeout(() => collapseIntro(), 7000);
  }
  function collapseIntro(fully) {
    clearTimeout(introTimer);
    if (introEl.hidden) return;
    introEl.classList.remove("in");
    setTimeout(() => { introEl.hidden = true; if (panel.hidden) showFab(); }, 350);
    state.introSeen = true;
    saveState();
    if (fully) return; // فقط جمع شود؛ FAB می‌ماند
  }
  function showFab() {
    fab.hidden = false;
    requestAnimationFrame(() => fab.classList.add("in"));
  }

  /* ---------------- باز/بسته کردن پنل ---------------- */
  function openPanel() {
    collapseIntro();
    fab.classList.remove("in");
    fab.hidden = true;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("in"));
    if (!msgsEl.childElementCount) {
      botSays({ text: "سلام! 👋 من دستیار هوشمند پرودید هستم؛ درباره محصولات، قیمت و ارسال جواب می‌دهم و برای انتخاب غذا و طرز تهیه هم کنارت هستم. چه کمکی از دستم برمی‌آید؟" });
    }
    setTimeout(() => panel.querySelector("input").focus(), 300);
  }
  function closePanel() {
    panel.classList.remove("in");
    setTimeout(() => { panel.hidden = true; showFab(); }, 250);
  }
  function disableAssistant() {
    state.disabled = true;
    saveState();
    root.remove();
    toast("دستیار غیرفعال شد؛ از پایین صفحه می‌توانی دوباره فعالش کنی");
    addFooterToggle();
  }

  /* ---------------- پیام‌ها ---------------- */
  function scrollMsgs() { msgsEl.scrollTop = msgsEl.scrollHeight; }

  function userSays(q) {
    const el = document.createElement("div");
    el.className = "as-msg as-user";
    el.textContent = q;
    msgsEl.appendChild(el);
    scrollMsgs();

    // نمایش «در حال نوشتن» کوتاه برای حس طبیعی
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

  function productCardMini(p) {
    return `
      <div class="as-product" data-card="${p.id}">
        <div class="as-p-img">${icon(p.ic)}<img src="${ROOT}assets/img/products/${p.id}.jpg" alt="" onerror="this.remove()"></div>
        <div class="as-p-info">
          <b>${p.name}</b>
          <span>${p.price === null ? "استعلام قیمت" : fmtPrice(p.price) + " " + unitLabel(p)}</span>
        </div>
        <div class="as-p-btns">
          <a class="as-p-view" href="${PAGE("product")}?id=${p.id}" title="مشاهده محصول">${icon("search")}</a>
          ${p.available && p.price !== null
            ? `<button class="as-p-add" data-add="${p.id}" title="افزودن به سبد">${icon("plus")}</button>`
            : ""}
        </div>
      </div>`;
  }

  function botSays(a) {
    const el = document.createElement("div");
    el.className = "as-msg as-bot";
    let html = "";
    if (a.title) html += `<b class="as-r-title">${a.title}</b>`;
    html += `<span>${a.text}</span>`;

    const prods = a.productObjs || (a.products || []).map(getProduct).filter(Boolean);
    if (prods.length) {
      html += `<div class="as-products">${prods.map(productCardMini).join("")}</div>`;
    }
    if (a.contact) {
      html += `
        <div class="as-contact">
          <a class="btn btn-sm btn-primary" href="tel:${BRAND.phone}">${icon("phone")} تماس</a>
          <a class="btn btn-sm btn-outline" href="https://wa.me/${BRAND.phoneIntl}" target="_blank" rel="noopener">${icon("chat")} واتس‌اپ</a>
        </div>`;
    }
    el.innerHTML = html;
    msgsEl.appendChild(el);
    scrollMsgs();
  }

  function renderChips(list) {
    const wrap = root.querySelector(".as-chips");
    wrap.innerHTML = list.map((c) => `<button type="button" class="as-chip">${c}</button>`).join("");
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest(".as-chip");
      if (b) userSays(b.textContent);
    });
  }

  /* ---------------- فعال‌سازی دوباره از فوتر ---------------- */
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
      delete state.disabled;
      saveState();
      location.reload();
    });
    bottom.appendChild(a);
  }

  /* ---------------- شروع ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    build();
    if (!state.introSeen) {
      setTimeout(showIntro, 1600);
    } else {
      showFab();
    }
  });
})();
