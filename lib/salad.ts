/* ---------------------------------------------------------
   پرودید — سالاد بار
   داده و محاسبات سالادِ سفارشی. قیمت‌ها به تومان است و مقدار هر
   ماده بر حسب «واحد» ذخیره می‌شود (هر واحد = unit گرم، یا برای
   اقلام عددی مثل تخم‌مرغ، یک عدد).

   این داده فعلاً ثابت است و از پنل مدیریت خوانده نمی‌شود؛ وقتی
   فهرست واقعی سالاد بار نهایی شد باید مثل کاتالوگ به دیتابیس
   منتقل شود.
   --------------------------------------------------------- */

import { BRAND } from "./data";

export type SaladShape = "leaf" | "shred" | "ring" | "round" | "strip" | "cube" | "nut" | "crumb" | "kernel";
export type SaladVariant = "tomato" | "egg" | "corn" | "bacon" | "feta" | "berry";
export type SaladTag = "v" | "d" | "n" | "lowcal" | "highpro";

export interface SaladBowlSize {
  id: string;
  name: string;
  /** ظرفیت کاسه به گرم */
  cap: number;
  /** هزینه پایه سرویس به تومان */
  base: number;
}

export interface SaladIngredient {
  id: string;
  n: string;
  cat: string;
  /** مقدار هر واحد به گرم (برای اقلام عددی، تعداد) */
  unit: number;
  /** وزن واقعی هر واحد به گرم — برای محاسبه کالری و ظرفیت کاسه */
  g: number;
  price: number;
  kind: SaladShape;
  v?: SaladVariant;
  /** رنگ اصلی و رنگ کمکی برای رسم */
  c: string;
  c2: string;
  /** کالری و پروتئین هر ۱۰۰ گرم */
  kcal: number;
  pro: number;
  tags: SaladTag[];
  /** برای اقلام عددی: واحد شمارش، مثلا «عدد» */
  ulabel?: string;
}

export interface SaladSauce {
  id: string;
  n: string;
  price: number;
  c: string;
  kcal: number;
  pro: number;
  tags: SaladTag[];
  note: string;
}

export interface SaladPreset {
  n: string;
  d: string;
  size: string;
  items: Record<string, number>;
  sauces: string[];
}

/** یک سالادِ ساخته‌شده که به سفارش اضافه شده */
export interface BuiltSalad {
  key: string;
  name: string;
  size: string;
  items: Record<string, number>;
  sauces: string[];
  sauceSide: boolean;
  price: number;
  weight: number;
  kcal: number;
  pro: number;
}

export const SALAD_SIZES: SaladBowlSize[] = [
  { id: "s", name: "کوچک", cap: 350, base: 18000 },
  { id: "m", name: "متوسط", cap: 550, base: 24000 },
  { id: "l", name: "بزرگ", cap: 800, base: 30000 },
];

export const SALAD_CATS = [
  { id: "base", name: "برگ و پایه" },
  { id: "veg", name: "سبزیجات" },
  { id: "pro", name: "پروتئین" },
  { id: "cheese", name: "پنیر و لبنیات" },
  { id: "top", name: "تاپینگ و مغز" },
] as const;

export const SALAD_DIETS = [
  { id: "v", n: "گیاهی" },
  { id: "nodairy", n: "بدون لبنیات" },
  { id: "nonut", n: "بدون مغزها" },
  { id: "lowcal", n: "کم‌کالری" },
  { id: "highpro", n: "پرپروتئین" },
] as const;

export const SALAD_INGREDIENTS: SaladIngredient[] = [
  // برگ و پایه
  { id: "kahoo-pich", n: "کاهو پیچ", cat: "base", unit: 50, g: 50, price: 7000, kind: "leaf", c: "#8bbf63", c2: "#a8d27f", kcal: 15, pro: 1.4, tags: ["v", "lowcal"] },
  { id: "kahoo-rasmi", n: "کاهو رسمی", cat: "base", unit: 50, g: 50, price: 7000, kind: "leaf", c: "#6ba84a", c2: "#8ec264", kcal: 17, pro: 1.6, tags: ["v", "lowcal"] },
  { id: "esfenaj", n: "اسفناج بیبی", cat: "base", unit: 50, g: 50, price: 11000, kind: "leaf", c: "#3f7a34", c2: "#5c9a4a", kcal: 23, pro: 2.9, tags: ["v", "lowcal"] },
  { id: "kalam-banafsh", n: "کلم بنفش", cat: "base", unit: 50, g: 50, price: 8000, kind: "shred", c: "#8d5fa8", c2: "#b283c7", kcal: 31, pro: 1.4, tags: ["v", "lowcal"] },
  { id: "quinoa", n: "کینوا پخته", cat: "base", unit: 50, g: 50, price: 18000, kind: "kernel", c: "#d8c89a", c2: "#eadfc0", kcal: 120, pro: 4.4, tags: ["v", "highpro"] },

  // سبزیجات
  { id: "khiar", n: "خیار", cat: "veg", unit: 50, g: 50, price: 6000, kind: "ring", c: "#8cc46f", c2: "#e4f0cf", kcal: 15, pro: 0.7, tags: ["v", "lowcal"] },
  { id: "goje", n: "گوجه گیلاسی", cat: "veg", unit: 50, g: 50, price: 9000, kind: "round", v: "tomato", c: "#c8392b", c2: "#e8684f", kcal: 18, pro: 0.9, tags: ["v", "lowcal"] },
  { id: "zorrat", n: "ذرت شیرین", cat: "veg", unit: 50, g: 50, price: 10000, kind: "kernel", v: "corn", c: "#efb021", c2: "#ffd56b", kcal: 86, pro: 3.2, tags: ["v"] },
  { id: "havij", n: "هویج رنده", cat: "veg", unit: 50, g: 50, price: 6000, kind: "shred", c: "#e07a28", c2: "#f2a257", kcal: 41, pro: 0.9, tags: ["v", "lowcal"] },
  { id: "piaz", n: "پیاز قرمز", cat: "veg", unit: 30, g: 30, price: 5000, kind: "shred", c: "#b06a9a", c2: "#d79cc4", kcal: 40, pro: 1.1, tags: ["v", "lowcal"] },
  { id: "felfel", n: "فلفل دلمه رنگی", cat: "veg", unit: 50, g: 50, price: 9000, kind: "shred", c: "#e2562f", c2: "#f5c13d", kcal: 26, pro: 1, tags: ["v", "lowcal"] },
  { id: "zeytoon", n: "زیتون سیاه", cat: "veg", unit: 30, g: 30, price: 13000, kind: "ring", c: "#36322b", c2: "#7d735f", kcal: 115, pro: 0.8, tags: ["v"] },
  { id: "ghaarch", n: "قارچ تازه", cat: "veg", unit: 50, g: 50, price: 12000, kind: "ring", c: "#cdbb9c", c2: "#eee3cd", kcal: 22, pro: 3.1, tags: ["v", "lowcal"] },
  { id: "khiarshoor", n: "خیارشور", cat: "veg", unit: 50, g: 50, price: 7000, kind: "ring", c: "#7d9b4a", c2: "#cfdba6", kcal: 12, pro: 0.5, tags: ["v", "lowcal"] },

  // پروتئین
  { id: "morgh", n: "مرغ گریل", cat: "pro", unit: 50, g: 50, price: 28000, kind: "strip", c: "#d2a166", c2: "#9d6f3a", kcal: 165, pro: 31, tags: ["highpro"] },
  { id: "bacon", n: "بیکن گوشت", cat: "pro", unit: 30, g: 30, price: 32000, kind: "strip", v: "bacon", c: "#b64b36", c2: "#f0d3c3", kcal: 400, pro: 24, tags: ["highpro"] },
  { id: "tokhmemorgh", n: "تخم‌مرغ آب‌پز", cat: "pro", unit: 1, g: 55, price: 12000, kind: "round", v: "egg", c: "#f7f1e2", c2: "#edb934", kcal: 143, pro: 13, tags: ["highpro"], ulabel: "عدد" },
  { id: "ton", n: "تن ماهی", cat: "pro", unit: 50, g: 50, price: 30000, kind: "crumb", c: "#c9a37a", c2: "#a67e56", kcal: 132, pro: 28, tags: ["highpro"] },
  { id: "jambon", n: "ژامبون مرغ", cat: "pro", unit: 40, g: 40, price: 22000, kind: "cube", c: "#e8b9a8", c2: "#f6d9cd", kcal: 155, pro: 16, tags: [] },
  { id: "gusht", n: "گوشت ریش‌ریش", cat: "pro", unit: 50, g: 50, price: 38000, kind: "strip", c: "#9c5b3b", c2: "#6f3d26", kcal: 250, pro: 26, tags: ["highpro"] },
  { id: "loobia", n: "لوبیا چیتی", cat: "pro", unit: 50, g: 50, price: 9000, kind: "kernel", c: "#b07a53", c2: "#d5a179", kcal: 127, pro: 9, tags: ["v", "highpro"] },

  // پنیر و لبنیات
  { id: "parmezan", n: "پارمزان رنده", cat: "cheese", unit: 20, g: 20, price: 24000, kind: "shred", c: "#f2e2b6", c2: "#dcc48a", kcal: 420, pro: 38, tags: ["v", "d", "highpro"] },
  { id: "feta", n: "پنیر فتا", cat: "cheese", unit: 30, g: 30, price: 16000, kind: "cube", v: "feta", c: "#f8f3e6", c2: "#e8dfca", kcal: 264, pro: 14, tags: ["v", "d"] },
  { id: "mozarella", n: "موزارلا", cat: "cheese", unit: 30, g: 30, price: 20000, kind: "cube", c: "#fdf7e8", c2: "#eadfc4", kcal: 280, pro: 22, tags: ["v", "d", "highpro"] },

  // تاپینگ و مغز
  { id: "crouton", n: "نان کروتان", cat: "top", unit: 20, g: 20, price: 8000, kind: "crumb", c: "#cf9b53", c2: "#e8bd7c", kcal: 407, pro: 9, tags: ["v"] },
  { id: "gerdoo", n: "گردو", cat: "top", unit: 20, g: 20, price: 22000, kind: "nut", c: "#a9794f", c2: "#7e5634", kcal: 654, pro: 15, tags: ["v", "n"] },
  { id: "badam", n: "بادام خلال", cat: "top", unit: 20, g: 20, price: 20000, kind: "shred", c: "#e8d7b4", c2: "#cbb48a", kcal: 579, pro: 21, tags: ["v", "n"] },
  { id: "konjed", n: "کنجد برشته", cat: "top", unit: 10, g: 10, price: 6000, kind: "kernel", c: "#e3c98f", c2: "#c7a965", kcal: 573, pro: 17, tags: ["v", "n"] },
  { id: "tokhme", n: "تخمه آفتابگردان", cat: "top", unit: 15, g: 15, price: 9000, kind: "kernel", c: "#7a6342", c2: "#a98d61", kcal: 584, pro: 21, tags: ["v", "n"] },
  { id: "piaz-sookh", n: "پیاز سوخاری", cat: "top", unit: 15, g: 15, price: 9000, kind: "crumb", c: "#c8863c", c2: "#e0a75d", kcal: 480, pro: 5, tags: ["v"] },
  { id: "anar", n: "دانهٔ انار", cat: "top", unit: 30, g: 30, price: 14000, kind: "kernel", v: "berry", c: "#bb202a", c2: "#e04a50", kcal: 83, pro: 1.7, tags: ["v"] },
];

export const SALAD_SAUCES: SaladSauce[] = [
  { id: "caesar", n: "سزار", price: 12000, c: "#f0e2bd", kcal: 470, pro: 2, tags: ["d"], note: "خامه‌ای و کلاسیک" },
  { id: "thousand", n: "هزارجزیره", price: 11000, c: "#f0a98c", kcal: 430, pro: 1, tags: ["d"], note: "ملایم و کمی شیرین" },
  { id: "mast", n: "ماست و موسیر", price: 10000, c: "#fbf8ef", kcal: 120, pro: 3, tags: ["d"], note: "سبک و خنک" },
  { id: "balsamic", n: "بالزامیک و روغن زیتون", price: 13000, c: "#4a3a2a", kcal: 290, pro: 0, tags: ["v"], note: "ترش و تندمزه" },
  { id: "garlic", n: "سیر و پنیر", price: 13000, c: "#f6efd9", kcal: 450, pro: 3, tags: ["d"], note: "پرطعم، برای عاشقان سیر" },
  { id: "french", n: "فرانسوی", price: 11000, c: "#e9b14e", kcal: 380, pro: 1, tags: [], note: "شیرین و ملس" },
  { id: "lemon", n: "لیمو و زیتون", price: 8000, c: "#e2dc93", kcal: 90, pro: 0, tags: ["v", "lowcal"], note: "بدون چربی افزوده" },
];

export const SALAD_PRESETS: SaladPreset[] = [
  { n: "سزار کلاسیک", d: "کاهو، مرغ گریل، پارمزان و کروتان", size: "m", items: { "kahoo-pich": 2, morgh: 2, parmezan: 1, crouton: 1 }, sauces: ["caesar"] },
  { n: "یونانی", d: "خیار، گوجه، زیتون و فتا با بالزامیک", size: "m", items: { "kahoo-rasmi": 1, khiar: 1, goje: 1, piaz: 1, zeytoon: 1, feta: 1 }, sauces: ["balsamic"] },
  { n: "پروتئین ورزشکار", d: "اسفناج با مرغ، تخم‌مرغ و لوبیا", size: "l", items: { esfenaj: 2, morgh: 3, tokhmemorgh: 2, loobia: 1, zorrat: 1 }, sauces: ["lemon"] },
  { n: "سبزِ سبک", d: "کم‌کالری با کاهو، خیار و هویج", size: "s", items: { "kahoo-pich": 2, khiar: 1, havij: 1, "kalam-banafsh": 1, konjed: 1 }, sauces: ["lemon"] },
  { n: "تنِ تند", d: "تن ماهی با ذرت و خیارشور", size: "m", items: { "kahoo-rasmi": 1, ton: 2, zorrat: 1, khiarshoor: 1, piaz: 1 }, sauces: ["thousand"] },
];

/** حداکثر واحد هر ماده در یک کاسه */
export const SALAD_MAX_UNITS = 12;
/** هزینه ارسال سالاد (تومان) */
export const SALAD_DELIVERY_FEE = 35000;

export const saladById: Record<string, SaladIngredient> = Object.fromEntries(SALAD_INGREDIENTS.map((i) => [i.id, i]));
export const sauceById: Record<string, SaladSauce> = Object.fromEntries(SALAD_SAUCES.map((s) => [s.id, s]));
export const sizeById: Record<string, SaladBowlSize> = Object.fromEntries(SALAD_SIZES.map((s) => [s.id, s]));

export interface SaladCalc {
  weight: number;
  kcal: number;
  pro: number;
  itemsPrice: number;
  saucePrice: number;
  base: number;
  price: number;
}

export function saladCalc(items: Record<string, number>, sauces: string[], sizeId: string): SaladCalc {
  let weight = 0;
  let kcal = 0;
  let pro = 0;
  let itemsPrice = 0;
  for (const id of Object.keys(items)) {
    const ing = saladById[id];
    const q = items[id];
    if (!ing || !q) continue;
    const grams = ing.g * q;
    weight += grams;
    itemsPrice += ing.price * q;
    kcal += (ing.kcal * grams) / 100;
    pro += (ing.pro * grams) / 100;
  }
  let saucePrice = 0;
  for (const sid of sauces) {
    const s = sauceById[sid];
    if (!s) continue;
    saucePrice += s.price;
    weight += 30;
    kcal += (s.kcal * 30) / 100;
    pro += (s.pro * 30) / 100;
  }
  const base = (sizeById[sizeId] || SALAD_SIZES[1]).base;
  return {
    weight,
    kcal: Math.round(kcal),
    pro: Math.round(pro),
    itemsPrice,
    saucePrice,
    base,
    price: base + itemsPrice + saucePrice,
  };
}

/** مقدار یک ماده به صورت خوانا با رقم فارسی: «۱۰۰ گرم» یا «۲ عدد» */
export function saladAmountLabel(ing: SaladIngredient, q: number): string {
  return ing.ulabel
    ? `${q.toLocaleString("fa-IR")} ${ing.ulabel}`
    : `${Math.round(ing.g * q).toLocaleString("fa-IR")} گرم`;
}

export function dietAllows(diets: string[], tags: SaladTag[] | readonly SaladTag[]): boolean {
  return diets.every((d) => {
    if (d === "v") return tags.includes("v");
    if (d === "nodairy") return !tags.includes("d");
    if (d === "nonut") return !tags.includes("n");
    if (d === "lowcal") return tags.includes("lowcal");
    if (d === "highpro") return tags.includes("highpro");
    return true;
  });
}

export type SaladWay = "pickup" | "delivery";

export interface SaladOrderDraft {
  salads: BuiltSalad[];
  way: SaladWay;
  slot: string;
  name: string;
  phone: string;
  address?: string;
  note?: string;
}

export const SALAD_PICKUP_SLOTS = [
  { id: "now", label: "همین حالا، منتظرم" },
  { id: "20", label: "۲۰ دقیقهٔ دیگر می‌رسم" },
  { id: "45", label: "۴۵ دقیقهٔ دیگر" },
] as const;

export const SALAD_DELIVERY_SLOTS = [
  { id: "d1", label: "امروز ۱۲ تا ۱۴" },
  { id: "d2", label: "امروز ۱۷ تا ۲۰" },
  { id: "d3", label: "فردا ۱۰ تا ۱۳" },
] as const;

export function saladSlotLabel(way: SaladWay, id: string): string {
  const list = way === "pickup" ? SALAD_PICKUP_SLOTS : SALAD_DELIVERY_SLOTS;
  return list.find((s) => s.id === id)?.label || id;
}

export function saladOrderTotal(salads: BuiltSalad[], way: SaladWay) {
  const sub = salads.reduce((a, s) => a + s.price, 0);
  const fee = way === "delivery" && salads.length ? SALAD_DELIVERY_FEE : 0;
  return { sub, fee, grand: sub + fee, count: salads.length };
}

/** متن سفارش سالاد برای واتس‌اپ — همان کانالی که سفارش‌های فروشگاه با آن می‌آید */
export function saladWhatsappText(d: SaladOrderDraft): string {
  const t = saladOrderTotal(d.salads, d.way);
  const lines: string[] = [];
  lines.push("سفارش سالاد بار پرودید");
  lines.push("");
  d.salads.forEach((s, i) => {
    const size = sizeById[s.size];
    lines.push(`${i + 1}) ${s.name} — کاسهٔ ${size?.name || s.size} (${Math.round(s.weight)} گرم)`);
    for (const id of Object.keys(s.items)) {
      const ing = saladById[id];
      if (!ing) continue;
      lines.push(`   • ${ing.n}: ${saladAmountLabel(ing, s.items[id])}`);
    }
    for (const sid of s.sauces) {
      const sauce = sauceById[sid];
      if (!sauce) continue;
      lines.push(`   • سس ${sauce.n}${s.sauceSide ? " (جدا)" : " (روی سالاد)"}`);
    }
    lines.push(`   مبلغ: ${s.price.toLocaleString("fa-IR")} تومان`);
    lines.push("");
  });
  lines.push(d.way === "pickup" ? "تحویل: حضوری در شعبه" : "تحویل: ارسال به آدرس");
  lines.push(`زمان: ${saladSlotLabel(d.way, d.slot)}`);
  lines.push(`نام: ${d.name}`);
  lines.push(`موبایل: ${d.phone}`);
  if (d.way === "delivery" && d.address) lines.push(`آدرس: ${d.address}`);
  if (d.note) lines.push(`یادداشت: ${d.note}`);
  if (t.fee) lines.push(`هزینه ارسال: ${t.fee.toLocaleString("fa-IR")} تومان`);
  lines.push(`جمع کل: ${t.grand.toLocaleString("fa-IR")} تومان`);
  return lines.join("\n");
}

export function saladWhatsappUrl(d: SaladOrderDraft, phoneIntl: string = BRAND.phoneIntl): string {
  return `https://wa.me/${phoneIntl}?text=${encodeURIComponent(saladWhatsappText(d))}`;
}
