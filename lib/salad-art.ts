/* ---------------------------------------------------------
   پرودید — موتور تصویری سالاد بار
   هر ماده با یک «واژگان شکلی» رسم می‌شود (برگ چین‌دار، رشته،
   حلقه، نوار گریل‌خورده، مکعب پنیر، دانه، خرده، مغز) و همان شکل
   هم در کاشی انتخاب و هم داخل کاسه استفاده می‌شود. هیچ عکسی لازم
   نیست؛ هر مادهٔ تازه فقط یک رنگ و یک نوع شکل می‌خواهد.

   جای قطعه‌ها با بذر ثابت تعیین می‌شود تا با کم و زیاد کردن مقدار
   یک ماده، بقیهٔ قطعه‌ها در کاسه جابه‌جا نشوند.

   خروجی همه رشتهٔ SVG است (ساختهٔ خودِ این فایل، بدون ورودی کاربر)
   و با dangerouslySetInnerHTML رندر می‌شود.
   --------------------------------------------------------- */

import type { SaladIngredient, SaladSauce } from "./salad";
import { saladById, sauceById } from "./salad";

/* ---------- شناسهٔ یکتا برای هر SVG ----------
   چند SVG روی یک صفحه نباید شناسهٔ یکسان تعریف کنند؛ مرورگر اولی را
   برمی‌دارد و اگر آن اولی داخل المانی با display:none باشد بقیه رنگ و
   فیلترشان را از دست می‌دهند. */
let UID = 0;
function nsid() {
  return "s" + ++UID;
}

/* ---------- تصادفِ تکرارپذیر ---------- */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* اسلات‌های ثابت داخل دیسک — مارپیچ طلایی، بعد شافل با بذر ثابت */
const NSLOT = 300;
const SLOTS = (() => {
  const pts: { x: number; y: number }[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NSLOT; i++) {
    const r = Math.sqrt((i + 0.5) / NSLOT);
    const a = i * ga;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  const rnd = mulberry(90210);
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
})();

/* per = چند قطعه به ازای هر واحد. سخاوتمند بسته شده چون کاسهٔ سالادِ
   واقعی پر است؛ با عددهای کم، کاسه خلوت و بی‌اشتها دیده می‌شد. */
interface KindSpec {
  r: number;
  per: number;
  layer: number;
  spread: number;
}
export const SALAD_KIND: Record<string, KindSpec> = {
  leaf: { r: 19, per: 7, layer: 0, spread: 1.0 },
  shred: { r: 13, per: 9, layer: 1, spread: 0.92 },
  ring: { r: 10, per: 5, layer: 2, spread: 0.88 },
  round: { r: 9, per: 4, layer: 2, spread: 0.86 },
  strip: { r: 10, per: 4, layer: 3, spread: 0.82 },
  cube: { r: 7.5, per: 7, layer: 3, spread: 0.84 },
  nut: { r: 7, per: 5, layer: 4, spread: 0.78 },
  crumb: { r: 6, per: 9, layer: 4, spread: 0.8 },
  kernel: { r: 4.6, per: 14, layer: 4, spread: 0.82 },
};

/* ---------- رنگ ---------- */
function hex2rgb(h: string): [number, number, number] {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function rgb2hex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function light(h: string, a: number): string {
  const p = hex2rgb(h);
  return rgb2hex(p[0] + (255 - p[0]) * a, p[1] + (255 - p[1]) * a, p[2] + (255 - p[2]) * a);
}
function dark(h: string, a: number): string {
  const p = hex2rgb(h);
  return rgb2hex(p[0] * (1 - a), p[1] * (1 - a), p[2] * (1 - a));
}

/** گرادیان هر ماده: روشن در بالا-چپ، تیره در پایین-راست → حجم و نور */
function defsFor(used: SaladIngredient[], ns: string): string {
  let d = "";
  for (const ing of used) {
    d +=
      `<radialGradient id="g-${ns}-${ing.id}" cx="34%" cy="27%" r="80%">` +
      `<stop offset="0" stop-color="${light(ing.c, 0.4)}"/>` +
      `<stop offset=".48" stop-color="${ing.c}"/>` +
      `<stop offset="1" stop-color="${dark(ing.c, 0.3)}"/></radialGradient>` +
      `<linearGradient id="l-${ns}-${ing.id}" x1="0.1" y1="0" x2="0.35" y2="1">` +
      `<stop offset="0" stop-color="${light(ing.c, 0.36)}"/>` +
      `<stop offset=".5" stop-color="${ing.c}"/>` +
      `<stop offset="1" stop-color="${dark(ing.c, 0.34)}"/></linearGradient>`;
  }
  return d;
}

/* نویز آشفتگی لبه‌ها را نامنظم می‌کند (برگ‌ها بیشتر، بقیه کمتر) و سایهٔ
   نرم زیر هر لایه عمق می‌دهد. */
function filtDefs(ns: string): string {
  return (
    `<filter id="orgL-${ns}" x="-28%" y="-28%" width="156%" height="156%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="n1"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n1" scale="6" xChannelSelector="R" yChannelSelector="G" result="d1"/>` +
    `<feDropShadow in="d1" dx="0" dy="2" stdDeviation="1.9" flood-color="#241d14" flood-opacity=".34"/></filter>` +
    `<filter id="orgS-${ns}" x="-28%" y="-28%" width="156%" height="156%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.13" numOctaves="2" seed="5" result="n2"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n2" scale="1.9" xChannelSelector="R" yChannelSelector="G" result="d2"/>` +
    `<feDropShadow in="d2" dx="0" dy="1.4" stdDeviation="1.3" flood-color="#241d14" flood-opacity=".32"/></filter>`
  );
}

/* ---------- شکل‌ها ---------- */
function shape(ing: SaladIngredient, r: number, rnd: () => number, simple: boolean, ns: string): string {
  const c = ing.c;
  const c2 = ing.c2;
  const v = ing.v || "";
  const G = `url(#g-${ns}-${ing.id})`;
  const L = `url(#l-${ns}-${ing.id})`;
  const f = (n: number) => n.toFixed(1);

  switch (ing.kind) {
    case "leaf": {
      const n = simple ? 9 : 13;
      const pt = (i: number): [number, number] => {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (i % 2 ? 0.63 : 1) * (0.82 + rnd() * 0.32);
        return [Math.cos(a) * rr, Math.sin(a) * rr];
      };
      const s0 = pt(0);
      let d = `M${f(s0[0])} ${f(s0[1])}`;
      for (let i = 1; i <= n; i++) {
        const p = pt(i % n);
        const am = ((i - 0.5) / n) * Math.PI * 2;
        const rm = r * 1.08 * (0.76 + rnd() * 0.36);
        d += `Q${f(Math.cos(am) * rm)} ${f(Math.sin(am) * rm)} ${f(p[0])} ${f(p[1])}`;
      }
      d += "Z";
      let o = `<path d="${d}" fill="${G}"/>`;
      if (simple) return o;
      o += `<path d="${d}" fill="${light(c, 0.55)}" opacity=".2" transform="translate(${f(-r * 0.1)} ${f(-r * 0.13)}) scale(.56)"/>`;
      for (let k = -1; k <= 1; k++)
        o += `<path d="M${f(-r * 0.64)} ${f(r * 0.12 + k * r * 0.3)}Q${f(-r * 0.04)} ${f(-r * 0.18 + k * r * 0.34)} ${f(r * 0.68)} ${f(k * r * 0.24)}" stroke="${light(c, 0.62)}" stroke-width="${f(r * 0.075)}" fill="none" stroke-linecap="round" opacity="${k ? 0.3 : 0.5}"/>`;
      o += `<path d="M${f(-r * 0.66)} ${f(-r * 0.45)}Q${f(-r * 0.06)} ${f(-r * 0.96)} ${f(r * 0.5)} ${f(-r * 0.58)}" stroke="${light(c, 0.85)}" stroke-width="${f(r * 0.11)}" fill="none" opacity=".4" stroke-linecap="round"/>`;
      return o;
    }

    case "shred": {
      const w = r * 2.1;
      const th = r * 0.44;
      const d =
        `M${f(-w / 2)} 0` +
        `Q${f(-w * 0.22)} ${f(-th * 1.55)} 0 ${f(-th * 0.55)}` +
        `Q${f(w * 0.24)} ${f(th * 0.3)} ${f(w / 2)} ${f(-th * 0.12)}` +
        `Q${f(w * 0.2)} ${f(th * 1.15)} 0 ${f(th * 0.66)}` +
        `Q${f(-w * 0.2)} ${f(th * 0.2)} ${f(-w / 2)} 0Z`;
      let o = `<path d="${d}" fill="${L}"/>`;
      if (simple) return o;
      o += `<path d="M${f(-w * 0.36)} ${f(-th * 0.26)}Q0 ${f(-th * 0.82)} ${f(w * 0.36)} ${f(-th * 0.3)}" stroke="${light(c, 0.68)}" stroke-width="${f(th * 0.2)}" fill="none" stroke-linecap="round" opacity=".6"/>`;
      return o;
    }

    case "ring": {
      let o = `<circle r="${f(r)}" fill="${G}"/><circle r="${f(r * 0.78)}" fill="${light(c2, 0.1)}"/>`;
      if (simple) return o;
      for (let i = 0; i < 7; i++) {
        const a = rnd() * 6.283;
        const rr = r * (0.18 + rnd() * 0.46);
        const sx = Math.cos(a) * rr;
        const sy = Math.sin(a) * rr;
        o += `<ellipse cx="${f(sx)}" cy="${f(sy)}" rx="${f(r * 0.1)}" ry="${f(r * 0.15)}" fill="${dark(c2, 0.22)}" opacity=".4" transform="rotate(${f(a * 57.3)} ${f(sx)} ${f(sy)})"/>`;
      }
      o += `<circle r="${f(r * 0.78)}" fill="none" stroke="${light(c2, 0.75)}" stroke-width="${f(r * 0.065)}" opacity=".5"/>`;
      o += `<path d="M${f(-r * 0.7)} ${f(-r * 0.42)}A${f(r * 0.84)} ${f(r * 0.84)} 0 0 1 ${f(-r * 0.08)} ${f(-r * 0.83)}" stroke="#fff" stroke-width="${f(r * 0.13)}" fill="none" opacity=".4" stroke-linecap="round"/>`;
      return o;
    }

    case "round": {
      if (v === "egg") {
        let o = `<circle r="${f(r)}" fill="${G}"/><circle r="${f(r * 0.5)}" fill="${c2}"/>`;
        if (!simple) {
          o += `<circle r="${f(r * 0.5)}" fill="none" stroke="${dark(c2, 0.2)}" stroke-width="${f(r * 0.055)}" opacity=".45"/>`;
          o += `<ellipse cx="${f(-r * 0.17)}" cy="${f(-r * 0.21)}" rx="${f(r * 0.15)}" ry="${f(r * 0.1)}" fill="#fff" opacity=".55"/>`;
          o += `<path d="M${f(-r * 0.62)} ${f(-r * 0.5)}A${f(r * 0.8)} ${f(r * 0.8)} 0 0 1 ${f(r * 0.05)} ${f(-r * 0.8)}" stroke="#fff" stroke-width="${f(r * 0.12)}" fill="none" opacity=".4" stroke-linecap="round"/>`;
        }
        return o;
      }
      if (v === "tomato") {
        /* مقطع گوجهٔ گیلاسیِ نصف‌شده: پوست، گوشت، و دو حفرهٔ دانه */
        let o = `<circle r="${f(r)}" fill="${G}"/><circle r="${f(r * 0.84)}" fill="${light(c, 0.26)}"/>`;
        if (!simple) {
          for (const s of [-1, 1]) {
            o += `<ellipse cx="${f(s * r * 0.37)}" cy="0" rx="${f(r * 0.24)}" ry="${f(r * 0.42)}" fill="${light(c, 0.56)}" opacity=".85"/>`;
            o += `<ellipse cx="${f(s * r * 0.37)}" cy="${f(-r * 0.13)}" rx="${f(r * 0.09)}" ry="${f(r * 0.12)}" fill="${light(c, 0.84)}" opacity=".9"/>`;
            o += `<ellipse cx="${f(s * r * 0.37)}" cy="${f(r * 0.15)}" rx="${f(r * 0.08)}" ry="${f(r * 0.11)}" fill="${light(c, 0.84)}" opacity=".9"/>`;
          }
          o += `<ellipse rx="${f(r * 0.07)}" ry="${f(r * 0.5)}" fill="${light(c, 0.4)}" opacity=".7"/>`;
          o += `<path d="M${f(-r * 0.58)} ${f(-r * 0.54)}A${f(r * 0.8)} ${f(r * 0.8)} 0 0 1 ${f(-r * 0.04)} ${f(-r * 0.79)}" stroke="#fff" stroke-width="${f(r * 0.1)}" fill="none" opacity=".28" stroke-linecap="round"/>`;
        }
        return o;
      }
      let o = `<circle r="${f(r)}" fill="${G}"/>`;
      if (!simple) o += `<ellipse cx="${f(-r * 0.3)}" cy="${f(-r * 0.34)}" rx="${f(r * 0.28)}" ry="${f(r * 0.2)}" fill="#fff" opacity=".3"/>`;
      return o;
    }

    case "strip": {
      const w = r * 2.4;
      const h = r * 0.95;
      if (v === "bacon") {
        const d =
          `M${f(-w / 2)} ${f(-h * 0.25)}` +
          `Q${f(-w * 0.24)} ${f(-h * 1.15)} ${f(w * 0.02)} ${f(-h * 0.3)}` +
          `Q${f(w * 0.26)} ${f(h * 0.55)} ${f(w / 2)} ${f(-h * 0.18)}` +
          `L${f(w / 2)} ${f(h * 0.72)}` +
          `Q${f(w * 0.26)} ${f(h * 1.45)} ${f(w * 0.02)} ${f(h * 0.6)}` +
          `Q${f(-w * 0.24)} ${f(-h * 0.25)} ${f(-w / 2)} ${f(h * 0.65)}Z`;
        let o = `<path d="${d}" fill="${L}"/>`;
        if (!simple)
          o += `<path d="M${f(-w * 0.42)} ${f(h * 0.06)}Q${f(-w * 0.18)} ${f(-h * 0.6)} ${f(w * 0.04)} ${f(h * 0.04)}Q${f(w * 0.28)} ${f(h * 0.66)} ${f(w * 0.42)} ${f(h * 0.04)}" stroke="${light(c, 0.68)}" stroke-width="${f(h * 0.26)}" fill="none" stroke-linecap="round" opacity=".85"/>`;
        return o;
      }
      /* نوار پهن و کم‌ارتفاع با لبهٔ نامنظم — نه استوانهٔ چوبی */
      const d =
        `M${f(-w / 2)} ${f(-h * 0.38)}` +
        `Q${f(-w * 0.46)} ${f(-h * 0.56)} ${f(-w * 0.3)} ${f(-h * 0.5)}` +
        `Q0 ${f(-h * 0.62)} ${f(w * 0.32)} ${f(-h * 0.48)}` +
        `Q${f(w * 0.47)} ${f(-h * 0.54)} ${f(w / 2)} ${f(-h * 0.34)}` +
        `L${f(w / 2)} ${f(h * 0.36)}` +
        `Q${f(w * 0.46)} ${f(h * 0.56)} ${f(w * 0.3)} ${f(h * 0.5)}` +
        `Q0 ${f(h * 0.62)} ${f(-w * 0.32)} ${f(h * 0.48)}` +
        `Q${f(-w * 0.47)} ${f(h * 0.54)} ${f(-w / 2)} ${f(h * 0.34)}Z`;
      let o = `<path d="${d}" fill="${L}"/>`;
      if (simple) return o;
      for (let i = -1; i <= 1; i += 2)
        o += `<path d="M${f(i * w * 0.2)} ${f(-h * 0.28)}Q${f(i * w * 0.2 + h * 0.22)} 0 ${f(i * w * 0.2)} ${f(h * 0.28)}" stroke="${dark(c, 0.3)}" stroke-width="${f(h * 0.13)}" fill="none" opacity=".4" stroke-linecap="round"/>`;
      o += `<path d="M${f(-w * 0.36)} ${f(-h * 0.22)}Q0 ${f(-h * 0.4)} ${f(w * 0.36)} ${f(-h * 0.22)}" stroke="${light(c, 0.72)}" stroke-width="${f(h * 0.15)}" fill="none" opacity=".5" stroke-linecap="round"/>`;
      return o;
    }

    case "cube": {
      const s = r * 1.8;
      const k = s * 0.24;
      let o = `<path d="M${f(-s / 2)} ${f(-s / 2 + k)}L${f(-s / 2 + k)} ${f(-s / 2)}L${f(s / 2)} ${f(-s / 2)}L${f(s / 2)} ${f(s / 2 - k)}L${f(s / 2 - k)} ${f(s / 2)}L${f(-s / 2)} ${f(s / 2)}Z" fill="${L}"/>`;
      o += `<path d="M${f(-s / 2)} ${f(-s / 2 + k)}L${f(-s / 2 + k)} ${f(-s / 2)}L${f(s / 2)} ${f(-s / 2)}L${f(s / 2 - k)} ${f(-s / 2 + k)}Z" fill="${light(c, 0.5)}" opacity=".75"/>`;
      if (simple) return o;
      if (v === "feta") {
        for (let i = 0; i < 6; i++)
          o += `<circle cx="${f((rnd() - 0.5) * s * 0.72)}" cy="${f((rnd() - 0.5) * s * 0.72)}" r="${f(s * 0.05)}" fill="${dark(c, 0.16)}" opacity=".55"/>`;
      }
      o += `<path d="M${f(-s / 2 + k * 0.6)} ${f(s / 2 - k * 0.1)}L${f(s / 2 - k * 0.1)} ${f(s / 2 - k * 0.1)}" stroke="${dark(c, 0.2)}" stroke-width="${f(s * 0.05)}" opacity=".4" stroke-linecap="round"/>`;
      return o;
    }

    case "nut": {
      let o = `<circle r="${f(r)}" fill="${G}"/>`;
      if (simple) return o;
      o += `<path d="M0 ${f(-r * 0.9)}Q${f(r * 0.22)} 0 0 ${f(r * 0.9)}" stroke="${dark(c, 0.34)}" stroke-width="${f(r * 0.15)}" fill="none" stroke-linecap="round"/>`;
      o += `<path d="M${f(-r * 0.66)} ${f(-r * 0.46)}Q${f(-r * 0.08)} 0 ${f(-r * 0.66)} ${f(r * 0.46)}" stroke="${dark(c, 0.27)}" stroke-width="${f(r * 0.12)}" fill="none" stroke-linecap="round" opacity=".85"/>`;
      o += `<path d="M${f(r * 0.66)} ${f(-r * 0.46)}Q${f(r * 0.08)} 0 ${f(r * 0.66)} ${f(r * 0.46)}" stroke="${dark(c, 0.27)}" stroke-width="${f(r * 0.12)}" fill="none" stroke-linecap="round" opacity=".85"/>`;
      o += `<path d="M${f(-r * 0.5)} ${f(-r * 0.62)}A${f(r * 0.82)} ${f(r * 0.82)} 0 0 1 ${f(r * 0.3)} ${f(-r * 0.74)}" stroke="${light(c, 0.62)}" stroke-width="${f(r * 0.11)}" fill="none" opacity=".38" stroke-linecap="round"/>`;
      return o;
    }

    case "crumb": {
      const n = 7;
      let d = "";
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (0.64 + rnd() * 0.58);
        d += (i ? "L" : "M") + f(Math.cos(a) * rr) + " " + f(Math.sin(a) * rr);
      }
      d += "Z";
      let o = `<path d="${d}" fill="${G}"/>`;
      if (simple) return o;
      o += `<path d="${d}" fill="${light(c, 0.52)}" opacity=".4" transform="translate(${f(-r * 0.1)} ${f(-r * 0.14)}) scale(.58)"/>`;
      for (let i = 0; i < 4; i++)
        o += `<circle cx="${f((rnd() - 0.5) * r * 1.15)}" cy="${f((rnd() - 0.5) * r * 1.15)}" r="${f(r * 0.085)}" fill="${dark(c, 0.32)}" opacity=".5"/>`;
      return o;
    }

    default: {
      // kernel
      if (v === "corn") {
        const d =
          `M0 ${f(-r * 0.92)}` +
          `Q${f(r * 0.95)} ${f(-r * 0.48)} ${f(r * 0.58)} ${f(r * 0.62)}` +
          `Q0 ${f(r * 1.05)} ${f(-r * 0.58)} ${f(r * 0.62)}` +
          `Q${f(-r * 0.95)} ${f(-r * 0.48)} 0 ${f(-r * 0.92)}Z`;
        let o = `<path d="${d}" fill="${G}"/>`;
        if (!simple) o += `<ellipse cx="${f(-r * 0.16)}" cy="${f(-r * 0.2)}" rx="${f(r * 0.25)}" ry="${f(r * 0.19)}" fill="#fff" opacity=".42"/>`;
        return o;
      }
      let o = `<ellipse rx="${f(r)}" ry="${f(r * 0.68)}" fill="${G}"/>`;
      if (!simple) o += `<ellipse cx="${f(-r * 0.22)}" cy="${f(-r * 0.21)}" rx="${f(r * 0.3)}" ry="${f(r * 0.17)}" fill="#fff" opacity="${v === "berry" ? 0.6 : 0.32}"/>`;
      return o;
    }
  }
}

export interface BowlOptions {
  /** نسخهٔ سبک برای کاسه‌های کوچک (پیشنهادها، سبد) */
  simple?: boolean;
  /** قطعه‌های تازه‌اضافه‌شده با تأخیر «پاپ» می‌شوند */
  pop?: { id: string; from: number } | null;
  /** با هر «هم زدن» جای همهٔ قطعه‌ها عوض می‌شود */
  toss?: number;
}

/** نمای از بالای کاسه به صورت رشتهٔ SVG */
export function saladBowlSvg(
  items: Record<string, number>,
  sauces: string[],
  fill: number,
  opts: BowlOptions = {}
): string {
  const simple = !!opts.simple;
  const ns = nsid();
  const R = 100;
  const CX = 120;
  const CY = 120;
  const used: SaladIngredient[] = [];
  const pieces: { ing: SaladIngredient; k: KindSpec; idx: number; slot: { x: number; y: number }; rnd: () => number }[] = [];

  for (const id of Object.keys(items)) {
    const ing = saladById[id];
    if (!ing || !items[id]) continue;
    used.push(ing);
    const k = SALAD_KIND[ing.kind] || SALAD_KIND.kernel;
    let count = Math.round(items[id] * k.per * (simple ? 0.6 : 1));
    count = Math.max(1, Math.min(count, simple ? 18 : 52));
    const base = (hash(id) + (opts.toss || 0) * 53) % NSLOT;
    for (let i = 0; i < count; i++) {
      pieces.push({ ing, k, idx: i, slot: SLOTS[(base + i * 11) % NSLOT], rnd: mulberry(hash(id + "#" + i)) });
    }
  }

  /* لایه‌بندی: برگ‌ها کف کاسه، بعد رشته‌ها، حلقه‌ها، پروتئین، و دانه‌ها رو */
  const layers: Record<string, string[]> = {};
  pieces
    .sort((a, b) => a.k.layer - b.k.layer)
    .forEach((p) => {
      const rnd = p.rnd;
      const sp = p.k.spread * R * 0.9;
      const x = CX + p.slot.x * sp;
      const y = CY + p.slot.y * sp * 0.97;
      const rot = Math.floor(rnd() * 360);
      const sc = (0.82 + rnd() * 0.34).toFixed(2);
      const body = shape(p.ing, p.k.r, rnd, simple, ns);
      const lay = (p.ing.kind === "leaf" ? "L" : "S") + p.k.layer;
      /* پوستهٔ میانی transform ندارد تا انیمیشن CSS با transform موقعیت تداخل نکند */
      const pf = opts.pop && opts.pop.id === p.ing.id ? opts.pop.from : Infinity;
      const inner =
        p.idx >= pf ? `<g class="sb-pcwrap" style="animation-delay:${470 + (p.idx - pf) * 26}ms">${body}</g>` : body;
      (layers[lay] = layers[lay] || []).push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${sc})">${inner}</g>`
      );
    });

  let g = "";
  Object.keys(layers)
    .sort((a, b) => +a.slice(-1) - +b.slice(-1))
    .forEach((k) => {
      const fl = simple ? "" : k[0] === "L" ? ` filter="url(#orgL-${ns})"` : ` filter="url(#orgS-${ns})"`;
      g += `<g${fl}>${layers[k].join("")}</g>`;
    });

  /* سس روی همه «ریخته» می‌شود: چند خط نازکِ موج‌دار، نه یک نوار کلفت */
  let sg = "";
  sauces.forEach((sid, si) => {
    const s: SaladSauce | undefined = sauceById[sid];
    if (!s) return;
    const rnd = mulberry(hash(sid) + si * 7);
    let d = "";
    for (let k = 0; k < 3; k++) {
      const y0 = CY + (k - 1) * 32 + (si ? 13 : -7);
      d += `M${(CX - R * 0.78).toFixed(0)} ${y0.toFixed(0)}`;
      for (let i = 1; i <= 5; i++) {
        const px = CX - R * 0.78 + ((R * 1.56) / 5) * i;
        const py = y0 + Math.sin(i * 2.1 + si * 1.3 + k) * 12 * (rnd() * 0.5 + 0.8);
        d += `Q${(px - R * 0.14).toFixed(0)} ${(py - 15).toFixed(0)} ${px.toFixed(0)} ${py.toFixed(0)}`;
      }
    }
    sg += `<path d="${d}" stroke="${s.c}" stroke-width="${simple ? 5 : 4.2}" fill="none" stroke-linecap="round" opacity=".88"/>`;
  });

  const C = 2 * Math.PI * 112;
  const pct = Math.max(0, Math.min(fill || 0, 1));
  const ringCol = fill > 1 ? "#d99a2b" : "#5f9f4a";

  return (
    '<svg viewBox="0 0 240 240" role="img" aria-label="نمای کاسهٔ سالاد">' +
    "<defs>" +
    (simple ? "" : filtDefs(ns)) +
    defsFor(used, ns) +
    `<radialGradient id="bw-${ns}" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset=".62" stop-color="#f7f1e5"/><stop offset="1" stop-color="#e3d8c3"/></radialGradient>` +
    `<radialGradient id="bi-${ns}" cx="44%" cy="36%" r="70%"><stop offset="0" stop-color="#f0e8d8"/><stop offset=".75" stop-color="#ded2bb"/><stop offset="1" stop-color="#cdbfa4"/></radialGradient>` +
    `<clipPath id="bc-${ns}"><circle cx="120" cy="120" r="100"/></clipPath>` +
    "</defs>" +
    '<circle cx="120" cy="120" r="112" fill="none" stroke="#e7dfcf" stroke-width="3.6"/>' +
    `<circle cx="120" cy="120" r="112" fill="none" stroke="${ringCol}" stroke-width="3.6" stroke-linecap="round"` +
    ` stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 120 120)" opacity=".9"/>` +
    `<circle cx="120" cy="120" r="104" fill="url(#bw-${ns})"/>` +
    `<circle cx="120" cy="120" r="100" fill="url(#bi-${ns})"/>` +
    '<circle cx="120" cy="120" r="88" fill="none" stroke="rgba(38,32,25,.07)" stroke-width="12"/>' +
    `<g clip-path="url(#bc-${ns})">${g}${sg}</g>` +
    '<circle cx="120" cy="120" r="100" fill="none" stroke="rgba(38,32,25,.12)" stroke-width="2"/>' +
    '<path d="M44 68A104 104 0 0 1 104 26" stroke="rgba(255,255,255,.8)" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    "</svg>"
  );
}

/** یک قطعهٔ تنها و بزرگ — برای موادِ شناور دور کاسه و قطعهٔ در حال پرواز */
export function saladPieceSvg(ing: SaladIngredient): string {
  const k = SALAD_KIND[ing.kind] || SALAD_KIND.kernel;
  const ns = nsid();
  let g = "";
  if (k.r >= 9) {
    const rnd = mulberry(hash(ing.id + "fl"));
    const sc = (19 / (k.r * 0.5)).toFixed(2);
    g = `<g transform="translate(24 24) rotate(${Math.floor(rnd() * 70 - 35)}) scale(${sc})">${shape(ing, k.r * 0.5, rnd, false, ns)}</g>`;
  } else {
    /* چیزهای ریز (دانه، خرده) تک‌تکی بی‌معنی‌اند، پس سه‌تایی می‌آیند */
    const base = 9 / (k.r * 0.5);
    ([[18, 20, 1], [31, 22, 0.88], [24, 32, 0.95]] as const).forEach((p, i) => {
      const rnd = mulberry(hash(ing.id + "fl" + i));
      g += `<g transform="translate(${p[0]} ${p[1]}) rotate(${Math.floor(rnd() * 360)}) scale(${(base * p[2]).toFixed(2)})">${shape(ing, k.r * 0.5, rnd, false, ns)}</g>`;
    });
  }
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><defs>${defsFor([ing], ns)}</defs>${g}</svg>`;
}

/** آیکن کاشی هر ماده — تودهٔ کوچکی از همان قطعه‌ها با سایهٔ تماس */
export function saladIconSvg(ing: SaladIngredient): string {
  const k = SALAD_KIND[ing.kind] || SALAD_KIND.kernel;
  const ns = nsid();
  const pos: readonly (readonly [number, number, number])[] =
    ing.kind === "leaf"
      ? ([[25, 24, 1.2], [17, 31, 0.78]] as const)
      : ing.kind === "strip"
        ? ([[24, 18, 1], [23, 28, 0.95], [25, 37, 0.85]] as const)
        : ing.kind === "shred"
          ? ([[24, 19, 1], [22, 27, 0.92], [26, 34, 0.88], [23, 41, 0.7]] as const)
          : ([[18, 19, 1], [31, 18, 0.86], [24, 28, 1], [34, 31, 0.76], [14, 31, 0.74], [24, 39, 0.62]] as const);
  let g = "";
  for (let i = 0; i < pos.length; i++) {
    const p = pos[i];
    const rnd = mulberry(hash(ing.id + "ic" + i));
    const base = ing.kind === "leaf" ? 0.95 : ing.kind === "kernel" ? 1.85 : ing.kind === "crumb" ? 1.5 : 1.3;
    const sc = (base * p[2]).toFixed(2);
    g += `<g transform="translate(${p[0]} ${p[1]}) rotate(${Math.floor(rnd() * 360)}) scale(${sc})">${shape(ing, k.r * 0.5, rnd, false, ns)}</g>`;
  }
  return (
    '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    "<defs>" +
    defsFor([ing], ns) +
    `<filter id="icd-${ns}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy=".8" stdDeviation=".7" flood-color="#241d14" flood-opacity=".3"/></filter>` +
    `<radialGradient id="sh-${ns}"><stop offset="0" stop-color="#2a2318" stop-opacity=".3"/><stop offset=".6" stop-color="#2a2318" stop-opacity=".12"/><stop offset="1" stop-color="#2a2318" stop-opacity="0"/></radialGradient>` +
    "</defs>" +
    `<ellipse cx="24" cy="42.5" rx="15" ry="3.6" fill="url(#sh-${ns})"/>` +
    `<g filter="url(#icd-${ns})">${g}</g></svg>`
  );
}
