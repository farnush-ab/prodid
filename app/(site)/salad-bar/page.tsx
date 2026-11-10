"use client";

/* =========================================================
   پرودید — سالاد بار
   کاسه همیشه جلوی چشم است (ستون چسبان در دسکتاپ، نوار چسبان در
   موبایل) و هر ماده‌ای که انتخاب شود با یک قوس به داخل کاسه پرواز
   می‌کند. سفارش نهایی مثل بقیه سفارش‌های سایت از طریق واتس‌اپ به
   فروشگاه می‌رسد.

   نکته hydration: سبد سالادها در localStorage نگهداری می‌شود ولی
   هرگز حین رندر خوانده نمی‌شود — فقط داخل useEffect.
   ========================================================= */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { faNum } from "@/lib/format";
import { BRAND } from "@/lib/data";
import { toast } from "@/lib/toast";
import { AppModal } from "@/components/AppModal";
import {
  SALAD_DELIVERY_FEE,
  SALAD_DELIVERY_SLOTS,
  SALAD_DIETS,
  SALAD_MAX_UNITS,
  SALAD_PICKUP_SLOTS,
  dietAllows,
  indexSalad,
  saladAmountLabel,
  saladCalc,
  saladOrderTotal,
  saladSlotLabel,
  saladWhatsappUrl,
  type BuiltSalad,
  type SaladIngredient,
  type SaladWay,
} from "@/lib/salad";
import { useSaladCatalog } from "@/lib/catalog-store";
import { saladImageSrc } from "@/lib/salad-image";
import { SALAD_KIND, saladBowlSvg, saladIconSvg, saladPieceSvg } from "@/lib/salad-art";

const CART_KEY = "prodid_saladbar";
const money = (n: number) => `${faNum.format(Math.round(n))} تومان`;

type Items = Record<string, number>;

/* ---------- انیمیشن پرواز ماده به داخل کاسه ----------
   مقصد پرواز همان کاسه‌ای است که کاربر همان لحظه می‌بیند: روی موبایل
   کاسهٔ کوچک نوار چسبان بالا، روی دسکتاپ کاسهٔ بزرگ ستون کناری. هر
   کدام که در کادر دید باشد انتخاب می‌شود. */
function visibleBowl(): HTMLElement | null {
  const vh = window.innerHeight || 0;
  const cands = [
    document.querySelector<HTMLElement>(".sb-rail-bowl"),
    document.querySelector<HTMLElement>(".sb-bowl"),
  ];
  for (const el of cands) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 4 && r.height > 4 && r.bottom > 40 && r.top < vh - 10) return el;
  }
  return null;
}

function flyPiece(ing: SaladIngredient, tile: HTMLElement | null) {
  if (!tile) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const bowl = visibleBowl();
  if (!bowl) return;
  const art = tile.querySelector(".sb-art");
  if (!art) return;
  const a = art.getBoundingClientRect();
  const b = bowl.getBoundingClientRect();
  if (!a.width || !b.width) return;

  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const ang = Math.random() * Math.PI * 2;
  const rad = Math.sqrt(Math.random()) * 0.32;
  const x1 = b.left + b.width / 2 + Math.cos(ang) * b.width * rad;
  const y1 = b.top + b.height / 2 + Math.sin(ang) * b.height * rad;
  const size = Math.max(32, Math.min(a.width, 70));
  const arc = Math.max(110, Math.abs(x1 - x0) * 0.4 + 60);
  const cx = (x0 + x1) / 2;
  const cy = Math.min(y0, y1) - arc;

  const launch = (cls: string, delay: number, done?: () => void) => {
    const n = document.createElement("div");
    n.className = "sb-fly " + cls;
    n.style.cssText = `left:${x0 - size / 2}px;top:${y0 - size / 2}px;width:${size}px;height:${size}px`;
    n.innerHTML = saladPieceSvg(ing);
    document.body.appendChild(n);
    const N = 24;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      const s = (1 + 0.32 * Math.sin(Math.PI * t) - 0.5 * t).toFixed(3);
      frames.push({
        transform: `translate(${(x - x0).toFixed(1)}px,${(y - y0).toFixed(1)}px) rotate(${Math.round(500 * t)}deg) scale(${s})`,
        opacity: t > 0.9 ? 0 : 1,
      });
    }
    const an = n.animate(frames, { duration: 560, delay, easing: "cubic-bezier(.3,.08,.25,1)", fill: "backwards" });
    const cleanup = () => {
      n.remove();
      done?.();
    };
    an.onfinish = cleanup;
    window.setTimeout(() => {
      if (n.isConnected) cleanup();
    }, 1400);
  };

  launch("trail", 80);
  launch("lead", 0, () => {
    const d = document.createElement("div");
    d.className = "sb-splash";
    d.style.cssText = `left:${x1 - 13}px;top:${y1 - 13}px;width:26px;height:26px`;
    document.body.appendChild(d);
    const sa = d.animate([{ transform: "scale(.3)", opacity: 0.8 }, { transform: "scale(3.1)", opacity: 0 }], {
      duration: 450,
      easing: "cubic-bezier(.2,.7,.3,1)",
    });
    sa.onfinish = () => d.remove();
    window.setTimeout(() => d.remove(), 900);
    bump(bowl, "sb-land", 560);
    bump(document.querySelector<HTMLElement>(".sb-bowl"), "sb-land", 560);
  });
}

function bump(node: HTMLElement | null, cls: string, ms: number) {
  if (!node) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  window.setTimeout(() => node.classList.remove(cls), ms);
}

function Svg({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function SaladBarPage() {
  /* مواد، سس‌ها، دسته‌ها و سالادهای آماده از دیتابیس می‌آیند (پنل مدیریت
     آن‌ها را می‌سازد)؛ تا رسیدن /api/catalog داده‌ی اولیه نشان داده می‌شود. */
  const saladCat = useSaladCatalog();
  const INGS = saladCat.ingredients;
  const SAUCES = saladCat.sauces;
  const PRESETS = saladCat.presets;
  const CATS = saladCat.cats;
  const SIZES = saladCat.sizes;
  const idx = useMemo(() => indexSalad(saladCat), [saladCat]);

  const [size, setSize] = useState("m");
  const [items, setItems] = useState<Items>({ "kahoo-pich": 2, khiar: 1, goje: 1, morgh: 2, zorrat: 1 });
  const [sauces, setSauces] = useState<string[]>(["caesar"]);
  const [sauceSide, setSauceSide] = useState(true);
  const [cat, setCat] = useState<string>("base");
  const [diets, setDiets] = useState<string[]>([]);
  const [cart, setCart] = useState<BuiltSalad[]>([]);
  const [way, setWay] = useState<SaladWay | null>(null);
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [toss, setToss] = useState(0);
  const [pop, setPop] = useState<{ id: string; from: number } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const bowlRef = useRef<HTMLDivElement | null>(null);

  /* نوار پایین این صفحه روی دکمه شناور دستیار می‌افتد؛ با این کلاس
     فقط در همین صفحه بالاتر می‌رود. */
  useEffect(() => {
    document.body.classList.add("sb-page");
    return () => document.body.classList.remove("sb-page");
  }, []);

  /* سبد سالادها را فقط بعد از mount می‌خوانیم تا hydration نشکند */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCart(parsed as BuiltSalad[]);
      }
    } catch {
      /* سبد خراب بود؛ از خالی شروع می‌کنیم */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* حافظه در دسترس نیست */
    }
  }, [cart]);

  const calc = useMemo(() => saladCalc(items, sauces, size, idx), [items, sauces, size, idx]);
  const cap = idx.size[size].cap;
  const fill = calc.weight / cap;
  const itemCount = Object.keys(items).length;
  const hasBase = useMemo(() => INGS.some((i) => i.cat === "base" && items[i.id]), [items, INGS]);
  const totals = saladOrderTotal(cart, way || "pickup");
  const canAdd = hasBase && itemCount >= 2;

  const bowlSvg = useMemo(() => saladBowlSvg(items, sauces, fill, { pop, toss, idx }), [items, sauces, fill, pop, toss, idx]);
  const miniSvg = useMemo(() => saladBowlSvg(items, sauces, fill, { simple: true, toss, idx }), [items, sauces, fill, toss, idx]);
  const floaters = useMemo(() => Object.keys(items).slice(-4).reverse(), [items]);

  const setQty = useCallback(
    (id: string, next: number, tile?: HTMLElement | null) => {
      const ing = idx.ing[id];
      if (!ing) return;
      const before = items[id] || 0;
      const q = Math.max(0, Math.min(next, SALAD_MAX_UNITS));
      setItems((prev) => {
        const copy = { ...prev };
        if (q <= 0) delete copy[id];
        else copy[id] = q;
        return copy;
      });
      if (q > before) {
        const k = SALAD_KIND[ing.kind] || SALAD_KIND.kernel;
        const had = before === 0 ? 0 : Math.max(1, Math.min(Math.round(before * k.per), 52));
        setPop({ id, from: had });
        flyPiece(ing, tile || null);
        if (tile) bump(tile.querySelector(".sb-stage"), "sb-kick", 380);
      } else {
        setPop(null);
      }
    },
    [items]
  );

  function loadPreset(i: number) {
    const p = PRESETS[i];
    setPop(null);
    setSize(p.size);
    setItems({ ...p.items });
    setSauces([...p.sauces]);
    bump(bowlRef.current, "sb-land", 560);
    toast(`«${p.n}» در کاسه چیده شد — هرچه خواستی عوض کن`);
    document.getElementById("sb-items")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function doToss() {
    if (itemCount < 2) return;
    setPop(null);
    bump(bowlRef.current, "sb-mixing", 700);
    bump(document.querySelector<HTMLElement>(".sb-rail-bowl"), "sb-mixing", 700);
    window.setTimeout(() => setToss((t) => t + 1), 230);
    toast("سالاد هم زده شد");
  }

  function addToOrder() {
    if (!hasBase) return toast("اول یک برگ سبز پایه انتخاب کن");
    if (itemCount < 2) return toast("حداقل دو ماده لازم است");
    const c = saladCalc(items, sauces, size, idx);
    setCart((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        name: `سالاد ${faNum.format(prev.length + 1)}`,
        size,
        items: { ...items },
        sauces: [...sauces],
        sauceSide,
        price: c.price,
        weight: c.weight,
        kcal: c.kcal,
        pro: c.pro,
      },
    ]);
    setPop(null);
    setItems({});
    setSauces([]);
    setCat("base");
    toast("به سفارش اضافه شد — یکی دیگر بساز یا ادامه بده");
    document.getElementById("sb-cart")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editSalad(key: string) {
    const s = cart.find((x) => x.key === key);
    if (!s) return;
    setPop(null);
    setSize(s.size);
    setItems({ ...s.items });
    setSauces([...s.sauces]);
    setSauceSide(s.sauceSide);
    setCart((prev) => prev.filter((x) => x.key !== key));
    toast("برای ویرایش به کاسه برگشت");
    document.getElementById("sb-items")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openReview() {
    if (!cart.length) return toast("اول یک سالاد به سفارش اضافه کن");
    if (!way) {
      document.getElementById("sb-deliver")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast("روش تحویل را انتخاب کن");
    }
    if (!slot) {
      document.getElementById("sb-deliver")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast("زمان تحویل را انتخاب کن");
    }
    if (!form.name.trim() || !form.phone.trim()) {
      document.getElementById("sb-deliver")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast("نام و شماره موبایل لازم است");
    }
    if (way === "delivery" && !form.address.trim()) {
      document.getElementById("sb-deliver")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast("آدرس را وارد کن");
    }
    if (way === "delivery" && totals.sub < BRAND.minOrder) {
      document.getElementById("sb-deliver")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast("حداقل سفارش ارسال رعایت نشده");
    }
    setReviewOpen(true);
  }

  /* سفارش هم در دیتابیس ثبت می‌شود (تا در پنل مدیریت دیده شود) و هم به
     واتس‌اپ می‌رود (کانالی که فروشنده عملاً سفارش را از آن می‌گیرد).
     اگر ثبت در سرور خطا بدهد، واتس‌اپ باز نمی‌شود و خطا را می‌گوییم —
     وگرنه مشتری فکر می‌کند سفارش ثبت شده ولی در پنل خبری نیست. */
  async function sendOrder() {
    if (!way || sending) return;
    setSending(true);
    const draft = {
      salads: cart,
      way,
      slot,
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
    };
    try {
      const res = await fetch("/api/salad-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          salads: cart.map((s) => ({
            name: s.name,
            size: s.size,
            items: s.items,
            sauces: s.sauces,
            sauceSide: s.sauceSide,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data?.error || "ثبت سفارش انجام نشد؛ دوباره تلاش کن");
        setSending(false);
        return;
      }
      setOrderNo(String(data?.order?.orderNo || ""));
      window.open(saladWhatsappUrl(draft), "_blank", "noopener");
      setSent(true);
      setReviewOpen(false);
    } catch {
      toast("اتصال برقرار نشد؛ دوباره تلاش کن");
    } finally {
      setSending(false);
    }
  }

  const visibleIngredients = INGS.filter((i) => i.cat === cat);
  const anyVisible = visibleIngredients.some((i) => dietAllows(diets, i.tags));
  const gap = BRAND.minOrder - totals.sub;

  return (
    <>
      <section className="sb-hero">
        <div className="container">
          <span className="sb-eyebrow">تازه و دلخواه</span>
          <h1>
            سالادت را <em>خودت</em> بچین
          </h1>
          <p>
            کاسه را انتخاب کن، هر مادهٔ تازه‌ای که دوست داری با مقدار دلخواه اضافه کن و همان لحظه ببین سالادت چه شکلی
            می‌شود. حضوری در شعبه تحویل بگیر یا بگذار برایت بیاوریم.
          </p>
          <div className="sb-marks">
            <span>
              <Icon name="leaf" className="ico" /> {faNum.format(INGS.length)} مادهٔ تازه
            </span>
            <span>
              <Icon name="scale" className="ico" /> مقدار هر ماده دست خودت
            </span>
            <span>
              <Icon name="clock" className="ico" /> آماده در ۸ دقیقه
            </span>
          </div>
        </div>
      </section>

      {/* نوار چسبان کاسه — فقط موبایل. کارت بزرگ کاسه در ستون کناری است و
          روی گوشی زیر کل فهرست مواد می‌افتد، پس حین انتخاب تنها جایی که
          کاربر سالادش را می‌بیند همین است؛ به‌عمد بزرگ است. */}
      <div className="sb-rail">
        <div className="container sb-rail-in">
          <button
            type="button"
            className="sb-rail-bowl"
            onClick={() => document.getElementById("sb-bowl-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            aria-label="دیدن کاسهٔ کامل و ثبت سفارش"
          >
            <Svg html={miniSvg} />
          </button>
          <div className="sb-rail-info">
            <b>{itemCount ? money(calc.price) : money(calc.base)}</b>
            <span>
              {itemCount
                ? `${faNum.format(Math.round(calc.weight))} گرم · ${faNum.format(calc.kcal)} کالری`
                : `کاسهٔ ${idx.size[size].name} — هنوز خالی است`}
            </span>
            <i className={`sb-fillbar${fill > 1 ? " over" : ""}`}>
              <b style={{ width: `${Math.min(100, fill * 100)}%` }} />
            </i>
            {itemCount ? (
              <span className="sb-rail-hint">
                <Icon name="chevron" className="ico" /> روی کاسه بزن تا کاملش را ببینی
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <main className="container sb-shell">
        <div className="sb-main">
          {/* ۱ کاسه */}
          <section className="sb-block" id="sb-size">
            <div className="sb-head">
              <span className="sb-n">۱</span>
              <div>
                <h2>کاسه‌ات را انتخاب کن</h2>
                <p>اندازهٔ کاسه ظرفیت سالاد و هزینهٔ پایهٔ سرویس را مشخص می‌کند. مواد جداگانه حساب می‌شوند.</p>
              </div>
            </div>
            <div className="sb-sizes">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`sb-size${size === s.id ? " on" : ""}`}
                  onClick={() => {
                    setPop(null);
                    setSize(s.id);
                  }}
                >
                  <Icon name="bowl" className="ico" />
                  <b>{s.name}</b>
                  <span>تا {faNum.format(s.cap)} گرم</span>
                  <i>{faNum.format(s.base)} تومان</i>
                </button>
              ))}
            </div>

            <h3 className="sb-sub">یا از یک سالاد آماده شروع کن</h3>
            <p className="sb-subnote">یکی را بزن تا در کاسه بنشیند، بعد هرچه خواستی کم و زیاد کن.</p>
            <div className="sb-presets">
              {PRESETS.map((p, i) => {
                const c = saladCalc(p.items, p.sauces, p.size, idx);
                return (
                  <button key={p.id || p.n} type="button" className="sb-preset" onClick={() => loadPreset(i)}>
                    {p.image ? (
                      /* عکس واقعی که ادمین آپلود کرده؛ نبودش یعنی همان طرح برداری */
                      <img className="sb-preset-art sb-preset-photo" src={saladImageSrc(p.image)} alt="" loading="lazy" />
                    ) : (
                      <Svg className="sb-preset-art" html={saladBowlSvg(p.items, p.sauces, c.weight / idx.size[p.size].cap, { simple: true, idx })} />
                    )}
                    <span className="sb-preset-body">
                      <b>{p.n}</b>
                      <span className="sb-preset-desc">{p.d}</span>
                      <span className="sb-preset-stats">
                        {faNum.format(c.kcal)} کالری · {faNum.format(c.pro)} گرم پروتئین
                      </span>
                      <span className="sb-preset-foot">
                        <i>{money(p.price ?? c.price)}</i>
                        <em>بچین و عوض کن ←</em>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ۲ مواد */}
          <section className="sb-block" id="sb-items">
            <div className="sb-head">
              <span className="sb-n">۲</span>
              <div>
                <h2>مواد را بچین</h2>
                <p>روی هر ماده بزن تا به کاسه پرت شود؛ با − و + مقدارش را دقیق تنظیم کن.</p>
              </div>
            </div>
            <div className="sb-diet">
              {SALAD_DIETS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`sb-dchip${diets.includes(d.id) ? " on" : ""}`}
                  onClick={() => setDiets((prev) => (prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]))}
                >
                  {d.n}
                </button>
              ))}
            </div>
            <nav className="sb-cats" aria-label="دسته‌بندی مواد">
              {CATS.map((c) => {
                const n = INGS.filter((i) => i.cat === c.id && items[i.id]).length;
                return (
                  <button key={c.id} type="button" className={`sb-cat${cat === c.id ? " on" : ""}`} onClick={() => setCat(c.id)}>
                    {c.name}
                    {n ? <em>{faNum.format(n)}</em> : null}
                  </button>
                );
              })}
            </nav>

            {!anyVisible && (
              <div className="sb-alert info">
                <Icon name="info" className="ico" />
                <span>با این فیلترها در این دسته چیزی نمی‌ماند. یکی از فیلترها را بردار.</span>
              </div>
            )}

            <div className="sb-ings">
              {visibleIngredients.map((i) => {
                const q = items[i.id] || 0;
                const ok = dietAllows(diets, i.tags);
                const flag = i.tags.includes("n") ? "مغزدار" : i.tags.includes("d") ? "لبنی" : "";
                return (
                  <div key={i.id} className={`sb-ing${q ? " on" : ""}${ok ? "" : " off"}`} data-ing={i.id}>
                    <button
                      type="button"
                      className="sb-tap"
                      aria-label={`افزودن ${i.n}`}
                      onClick={(e) => {
                        if (!ok) toast("این ماده با فیلترهای فعلی نمی‌خواند");
                        setQty(i.id, q + 1, e.currentTarget.closest(".sb-ing") as HTMLElement);
                      }}
                    >
                      <span className="sb-stage">
                        {i.image ? (
                          <img className="sb-art sb-art-photo" src={saladImageSrc(i.image)} alt="" loading="lazy" />
                        ) : (
                          <Svg className="sb-art" html={saladIconSvg(i)} />
                        )}
                        {flag ? <span className="sb-flag">{flag}</span> : null}
                      </span>
                    </button>
                    <div className="sb-ctl">
                      {q ? (
                        <span className="sb-qpill">
                          <button type="button" aria-label={`کمتر کردن ${i.n}`} onClick={(e) => setQty(i.id, q - 1, e.currentTarget.closest(".sb-ing") as HTMLElement)}>
                            −
                          </button>
                          <b>{saladAmountLabel(i, q)}</b>
                          <button type="button" aria-label={`بیشتر کردن ${i.n}`} onClick={(e) => setQty(i.id, q + 1, e.currentTarget.closest(".sb-ing") as HTMLElement)}>
                            +
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="sb-addbtn"
                          aria-label={`افزودن ${i.n}`}
                          onClick={(e) => setQty(i.id, 1, e.currentTarget.closest(".sb-ing") as HTMLElement)}
                        >
                          <Icon name="plus" className="ico" />
                        </button>
                      )}
                    </div>
                    <div className="sb-meta">
                      <b>{i.n}</b>
                      <span>{q ? `${faNum.format(i.price * q)} تومان` : `${faNum.format(i.price)} تومان`}</span>
                      <i>{i.ulabel ? `هر ${faNum.format(i.unit)} ${i.ulabel}` : `هر ${faNum.format(i.unit)} گرم`}</i>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ۳ سس */}
          <section className="sb-block" id="sb-sauce">
            <div className="sb-head">
              <span className="sb-n">۳</span>
              <div>
                <h2>سس</h2>
                <p>تا دو سس می‌توانی انتخاب کنی. اگر سالاد را می‌بری یا برایت ارسال می‌شود، پیشنهاد ما سس جداست.</p>
              </div>
            </div>
            <div className="sb-sauces">
              {SAUCES.map((s) => {
                const on = sauces.includes(s.id);
                const full = sauces.length >= 2 && !on;
                const ok = dietAllows(diets, s.tags);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`sb-sauce${on ? " on" : ""}${full || !ok ? " off" : ""}`}
                    onClick={() => {
                      setPop(null);
                      if (on) setSauces((prev) => prev.filter((x) => x !== s.id));
                      else if (sauces.length >= 2) toast("حداکثر دو سس — یکی را بردار");
                      else {
                        setSauces((prev) => [...prev, s.id]);
                        bump(bowlRef.current, "sb-land", 560);
                      }
                    }}
                  >
                    <span className="sb-dot" style={{ background: s.c }} />
                    <span style={{ minWidth: 0 }}>
                      <b>{s.n}</b>
                      <span>
                        {s.note} · {faNum.format(s.price)} تومان
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="sb-sideseg">
              <button type="button" className={sauceSide ? "on" : ""} onClick={() => setSauceSide(true)}>
                سس جدا<small>خودت می‌ریزی، سالاد خیس نمی‌شود</small>
              </button>
              <button type="button" className={sauceSide ? "" : "on"} onClick={() => setSauceSide(false)}>
                روی سالاد بریزید<small>مخلوط و آماده تحویل می‌شود</small>
              </button>
            </div>
          </section>

          {/* ۴ سبد */}
          <section className="sb-block" id="sb-cart">
            <div className="sb-head">
              <span className="sb-n">۴</span>
              <div>
                <h2>سالادهای سفارش</h2>
                <p>چند سالاد برای چند نفر؟ هر کدام را جدا بساز و به سفارش اضافه کن.</p>
              </div>
            </div>
            {cart.length ? (
              <>
                <div className="sb-list">
                  {cart.map((s) => (
                    <div className="sb-row" key={s.key}>
                      <Svg className="sb-row-art" html={saladBowlSvg(s.items, s.sauces, s.weight / idx.size[s.size].cap, { simple: true, idx })} />
                      <span className="sb-row-main">
                        <b>{s.name}</b>
                        <span>
                          کاسهٔ {idx.size[s.size].name} · {Object.keys(s.items).map((id) => idx.ing[id]?.n).filter(Boolean).join("، ")}
                          {s.sauces.length ? ` · سس ${s.sauces.map((x) => idx.sauce[x]?.n).join(" و ")}` : ""}
                        </span>
                      </span>
                      <span className="sb-row-side">
                        <b>{money(s.price)}</b>
                        <span>
                          <button type="button" className="sb-iconbtn" aria-label="ویرایش" onClick={() => editSalad(s.key)}>
                            <Icon name="edit" className="ico" />
                          </button>
                          <button
                            type="button"
                            className="sb-iconbtn"
                            aria-label="یکی دیگر مثل این"
                            onClick={() => setCart((prev) => [...prev, { ...s, key: `${Date.now()}-${prev.length}`, name: `سالاد ${faNum.format(prev.length + 1)}` }])}
                          >
                            <Icon name="copy" className="ico" />
                          </button>
                          <button type="button" className="sb-iconbtn del" aria-label="حذف" onClick={() => setCart((prev) => prev.filter((x) => x.key !== s.key))}>
                            <Icon name="trash" className="ico" />
                          </button>
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="sb-total">
                  <span>{faNum.format(cart.length)} سالاد</span>
                  <b>{money(totals.sub)}</b>
                </div>
              </>
            ) : (
              <div className="sb-alert info">
                <Icon name="bowl" className="ico" />
                <span>
                  هنوز سالادی اضافه نشده. کاسه را بچین و «افزودن به سفارش» را بزن. برای چند نفر، چند سالاد جدا بساز.
                </span>
              </div>
            )}
          </section>

          {/* ۵ تحویل */}
          <section className="sb-block" id="sb-deliver">
            <div className="sb-head">
              <span className="sb-n">۵</span>
              <div>
                <h2>چطور تحویل بگیری؟</h2>
                <p>هم همین‌جا در شعبه می‌توانی منتظر بمانی، هم سفارش را برایت می‌فرستیم.</p>
              </div>
            </div>
            <div className="sb-ways">
              <button
                type="button"
                className={`sb-way${way === "pickup" ? " on" : ""}`}
                onClick={() => {
                  setWay("pickup");
                  setSlot("");
                }}
              >
                <span className="sb-way-tag">سریع‌ترین</span>
                <span className="sb-way-ico">
                  <Icon name="store" className="ico" />
                </span>
                <b>حضوری در شعبه</b>
                <p>همین‌جا منتظر می‌مانی، شمارهٔ سفارش می‌گیری و تا آماده شدن خبرت می‌کنیم.</p>
                <ul>
                  <li>آماده‌سازی حدود ۸ دقیقه</li>
                  <li>بدون هزینهٔ ارسال و بدون حداقل سفارش</li>
                </ul>
              </button>
              <button
                type="button"
                className={`sb-way${way === "delivery" ? " on" : ""}`}
                onClick={() => {
                  setWay("delivery");
                  setSlot("");
                }}
              >
                <span className="sb-way-ico">
                  <Icon name="truck" className="ico" />
                </span>
                <b>ارسال به خانه</b>
                <p>سالاد تازه چیده می‌شود و در بازهٔ انتخابی تو فرستاده می‌شود.</p>
                <ul>
                  <li>هزینهٔ ارسال {faNum.format(SALAD_DELIVERY_FEE)} تومان</li>
                  <li>حداقل سفارش {faNum.format(BRAND.minOrder)} تومان</li>
                </ul>
              </button>
            </div>

            {way ? (
              <div className="sb-fields">
                <div className="sb-two">
                  <div>
                    <label htmlFor="sb-name">{way === "pickup" ? "اسم روی کاسه" : "نام و نام خانوادگی"}</label>
                    <input id="sb-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً مهدی" />
                  </div>
                  <div>
                    <label htmlFor="sb-phone">شمارهٔ موبایل</label>
                    <input id="sb-phone" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="۰۹۱۳…" />
                  </div>
                </div>

                {way === "delivery" && (
                  <div>
                    <label htmlFor="sb-addr">آدرس</label>
                    <textarea id="sb-addr" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="کاشان، خیابان…" />
                  </div>
                )}

                <div>
                  <label>{way === "pickup" ? "چه زمانی تحویل می‌گیری؟" : "بازهٔ ارسال"}</label>
                  <div className="sb-slots">
                    {(way === "pickup" ? SALAD_PICKUP_SLOTS : SALAD_DELIVERY_SLOTS).map((s) => (
                      <button key={s.id} type="button" className={`sb-slot${slot === s.id ? " on" : ""}`} onClick={() => setSlot(s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {way === "pickup" ? (
                  <div className="sb-alert info">
                    <Icon name="info" className="ico" />
                    <span>
                      داخل فروشگاه روی هر میز و روی پیشخان سالاد بار یک بارکد هست؛ با اسکن آن مستقیم همین صفحه باز
                      می‌شود — بدون نوبت و بدون صف.
                    </span>
                  </div>
                ) : gap > 0 ? (
                  <div className="sb-alert warn">
                    <Icon name="info" className="ico" />
                    <span>
                      <b>{money(gap)}</b> تا حداقل سفارش ارسال مانده. یک سالاد دیگر اضافه کن، یا از{" "}
                      <Link href="/shop">فروشگاه</Link> چیزی سفارش بده. برای تحویل حضوری هیچ حداقلی لازم نیست.
                    </span>
                  </div>
                ) : (
                  <div className="sb-alert info">
                    <Icon name="info" className="ico" />
                    <span>حداقل سفارش ارسال رسیده. سس‌ها جدا بسته‌بندی می‌شوند تا سالاد خیس نشود.</span>
                  </div>
                )}

                <div>
                  <label htmlFor="sb-note">یادداشت</label>
                  <textarea id="sb-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="مثلاً: پیاز نریزید، سس خیلی کم" />
                </div>
              </div>
            ) : null}
          </section>

          <p className="sb-foot">
            پرودید — {BRAND.address}
          </p>
        </div>

        {/* ستون کاسه */}
        <aside className="sb-aside">
          <div className="sb-card" id="sb-bowl-card">
            <div className="sb-card-top">
              <h3>{itemCount ? `کاسهٔ ${idx.size[size].name}` : "کاسهٔ تو"}</h3>
              <p>
                {itemCount
                  ? `${faNum.format(itemCount)} ماده${sauces.length ? ` و ${faNum.format(sauces.length)} سس` : ""}`
                  : "هنوز خالی است"}
              </p>
              <div className="sb-bowl" ref={bowlRef}>
                <Svg className="sb-bowl-art" html={bowlSvg} />
                <span className="sb-floaters">
                  {floaters.map((id) =>
                    idx.ing[id] ? <Svg key={id} className="sb-floater" html={saladPieceSvg(idx.ing[id])} /> : null
                  )}
                </span>
                {!itemCount && (
                  <span className="sb-bowl-empty">
                    با یک برگ سبز شروع کن
                    <br />
                    کاهو، اسفناج یا کلم
                  </span>
                )}
              </div>
              <div className={`sb-cap${fill > 1 ? " over" : ""}`}>
                {!itemCount
                  ? ""
                  : fill > 1
                    ? "از ظرفیت کاسه بیشتر شده — کاسهٔ بزرگ‌تر بگیر"
                    : `${faNum.format(Math.round(calc.weight))} گرم · ${faNum.format(Math.round(fill * 100))}٪ پر`}
              </div>
              <button type="button" className="sb-tossbtn" disabled={itemCount < 2} onClick={doToss}>
                <Icon name="refresh" className="ico" /> هم بزن
              </button>
            </div>

            <div className="sb-stats">
              <div>
                <b>{faNum.format(Math.round(calc.weight))}</b>
                <span>گرم</span>
              </div>
              <div>
                <b>{faNum.format(calc.kcal)}</b>
                <span>کالری</span>
              </div>
              <div>
                <b>{faNum.format(calc.pro)}</b>
                <span>گرم پروتئین</span>
              </div>
            </div>

            <div className="sb-chips">
              {itemCount || sauces.length ? (
                <>
                  {Object.keys(items).map((id) => {
                    const i = idx.ing[id];
                    if (!i) return null;
                    return (
                      <span className="sb-chip" key={id}>
                        <s style={{ background: i.c }} />
                        {i.n}
                        <em>{saladAmountLabel(i, items[id])}</em>
                        <button type="button" aria-label={`حذف ${i.n}`} onClick={() => setQty(id, 0)}>
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  {sauces.map((sid) => {
                    const s = idx.sauce[sid];
                    if (!s) return null;
                    return (
                      <span className="sb-chip" key={sid}>
                        <s style={{ background: s.c }} />
                        سس {s.n}
                        <button type="button" aria-label="حذف سس" onClick={() => setSauces((prev) => prev.filter((x) => x !== sid))}>
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </>
              ) : (
                <span className="sb-chips-empty">هر ماده‌ای اضافه کنی اینجا فهرست می‌شود</span>
              )}
            </div>

            <div className="sb-bill">
              <div>
                <span>پایهٔ کاسهٔ {idx.size[size].name}</span>
                <b>{faNum.format(calc.base)}</b>
              </div>
              <div>
                <span>مواد ({faNum.format(itemCount)} قلم)</span>
                <b>{faNum.format(calc.itemsPrice)}</b>
              </div>
              <div>
                <span>سس</span>
                <b>{calc.saucePrice ? faNum.format(calc.saucePrice) : "—"}</b>
              </div>
              <div className="sb-bill-total">
                <span>این سالاد</span>
                <b>{money(calc.price)}</b>
              </div>
            </div>

            <div className="sb-acts">
              <button type="button" className="btn btn-primary btn-block" disabled={!canAdd} onClick={addToOrder}>
                {canAdd ? `افزودن به سفارش · ${money(calc.price)}` : !hasBase ? "اول یک برگ سبز انتخاب کن" : "حداقل دو ماده لازم است"}
              </button>
              <button
                type="button"
                className="btn btn-light btn-block btn-sm"
                onClick={() => {
                  setPop(null);
                  setItems({});
                  setSauces([]);
                }}
              >
                خالی کردن کاسه
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* نوار پایین */}
      <div className="sb-bottom">
        <div className="container sb-bottom-in">
          <div className="sb-bottom-info">
            <b>{cart.length ? money(totals.grand) : money(calc.price)}</b>
            <span>
              {cart.length
                ? `${faNum.format(cart.length)} سالاد${totals.fee ? " + ارسال" : ""}${way ? "" : " · روش تحویل را انتخاب کن"}`
                : itemCount
                  ? "سالاد در حال ساخت"
                  : "کاسه خالی است"}
            </span>
          </div>
          {cart.length ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={openReview}>
              بازبینی و ثبت
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" disabled={!canAdd} onClick={addToOrder}>
              افزودن به سفارش
            </button>
          )}
        </div>
      </div>

      {reviewOpen && way && (
        <AppModal title="بازبینی و ثبت سفارش" icon="bowl" wide onClose={() => setReviewOpen(false)}>
          <div className="sb-review">
            {cart.map((s) => (
              <div className="sb-sum" key={s.key}>
                <h4>
                  {s.name} — کاسهٔ {idx.size[s.size].name} · {faNum.format(Math.round(s.weight))} گرم ·{" "}
                  {faNum.format(s.kcal)} کالری · {faNum.format(s.pro)} گرم پروتئین
                </h4>
                <div className="sb-sum-line">
                  <span>پایهٔ کاسه</span>
                  <b>{faNum.format(idx.size[s.size].base)}</b>
                </div>
                {Object.keys(s.items).map((id) => {
                  const ing = idx.ing[id];
                  if (!ing) return null;
                  return (
                    <div className="sb-sum-line" key={id}>
                      <span>
                        {ing.n} <em>· {saladAmountLabel(ing, s.items[id])}</em>
                      </span>
                      <b>{faNum.format(ing.price * s.items[id])}</b>
                    </div>
                  );
                })}
                {s.sauces.map((x) => (
                  <div className="sb-sum-line" key={x}>
                    <span>
                      سس {idx.sauce[x]?.n}
                      {s.sauceSide ? " (جدا)" : ""}
                    </span>
                    <b>{faNum.format(idx.sauce[x]?.price || 0)}</b>
                  </div>
                ))}
                <div className="sb-sum-line strong">
                  <span>جمع این سالاد</span>
                  <b>{money(s.price)}</b>
                </div>
              </div>
            ))}
            <div className="sb-sum">
              <h4>تحویل</h4>
              <div className="sb-sum-line">
                <span>روش</span>
                <b>{way === "pickup" ? "حضوری در شعبهٔ کاشان" : "ارسال به آدرس"}</b>
              </div>
              <div className="sb-sum-line">
                <span>زمان</span>
                <b>{saladSlotLabel(way, slot)}</b>
              </div>
              <div className="sb-sum-line">
                <span>به نام</span>
                <b>{form.name}</b>
              </div>
              {way === "delivery" && (
                <div className="sb-sum-line">
                  <span>هزینهٔ ارسال</span>
                  <b>{faNum.format(SALAD_DELIVERY_FEE)}</b>
                </div>
              )}
            </div>
            <div className="sb-grand">
              <span>مبلغ قابل پرداخت</span>
              <b>{money(totals.grand)}</b>
            </div>
            <p className="sb-note">
              با زدن دکمهٔ زیر، سفارش در واتس‌اپ برای پرودید فرستاده می‌شود و همان‌جا تأیید می‌گیری. وزن نهایی سالاد پس از
              چیدن ممکن است چند گرم تفاوت کند.
            </p>
          </div>
          <div className="sb-modal-foot">
            <button type="button" className="btn btn-light" onClick={() => setReviewOpen(false)}>
              برگشت
            </button>
            <button type="button" className="btn btn-primary" onClick={sendOrder} disabled={sending}>
              <Icon name="chat" className="ico" /> {sending ? "در حال ثبت…" : "ثبت سفارش در واتس‌اپ"}
            </button>
          </div>
        </AppModal>
      )}

      {sent && (
        <AppModal title="سفارشت فرستاده شد" icon="check" onClose={() => setSent(false)}>
          <div className="sb-done">
            <p>
              سفارشت ثبت شد{orderNo ? ` و شمارهٔ آن ${orderNo} است` : ""}. صفحهٔ واتس‌اپ هم برای پرودید باز شد؛ اگر پیام
              ارسال نشد، آن صفحه را چک کن و دکمهٔ ارسال را بزن.
            </p>
            <p className="sb-note">شمارهٔ فروشگاه: {BRAND.phone}</p>
            <div className="sb-modal-foot">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setSent(false);
                }}
              >
                بستن
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setCart([]);
                  setWay(null);
                  setSlot("");
                  setSent(false);
                  toast("سفارش پاک شد — می‌توانی سالاد تازه بسازی");
                }}
              >
                شروع سفارش تازه
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </>
  );
}
