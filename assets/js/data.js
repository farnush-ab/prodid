/* ---------------------------------------------------------
   پرودید — داده‌های فروشگاه
   قیمت‌ها به تومان است. برای محصولات وزنی (sale: "w") قیمت،
   «قیمت هر کیلوگرم» است و مبلغ نهایی پس از وزن‌کشی مشخص می‌شود.
   برای محصولات عددی (sale: "u") قیمت هر بسته/عدد است.
   --------------------------------------------------------- */

const BRAND = {
  name: "پرودید",
  slogan: "پروتئین هر خانه",
  city: "کاشان",
  address: "کاشان، خیابان امیرکبیر، روبه‌روی بیمارستان متینی",
  phone: "09130612019",
  phoneIntl: "989130612019",
  instagram: "PRODID1",
  instagramUrl: "https://www.instagram.com/prodid1/",
  minOrder: 300000,          // حداقل مبلغ سفارش (تومان)
  deliveryFeeNote: "هزینه ارسال جداگانه و بر اساس آدرس محاسبه می‌شود",
};

const CATEGORIES = [
  { id: "meat",     name: "گوشت و استیک",             emoji: "🥩", soon: false },
  { id: "kebab",    name: "کبابی و مزه‌دار",           emoji: "🍢", soon: false },
  { id: "chicken",  name: "مرغ و فرآورده‌های مرغی",    emoji: "🍗", soon: false },
  { id: "coldcuts", name: "سوسیس، کالباس و ژامبون",   emoji: "🥓", soon: false },
  { id: "burger",   name: "برگر و ساندویچ",           emoji: "🍔", soon: false },
  { id: "veg",      name: "سبزیجات نیمه‌آماده",        emoji: "🌿", soon: false },
  { id: "salad",    name: "سالاد و مخلفات",           emoji: "🥗", soon: false },
  { id: "fresh",    name: "پروتئینی تازه",             emoji: "🍖", soon: true },
  { id: "dairy",    name: "لبنیات",                    emoji: "🥛", soon: true },
  { id: "market",   name: "اقلام سوپرمارکتی",          emoji: "🛒", soon: true },
];

/*
  sale: "w" = وزنی (قیمت هر کیلو، مبلغ نهایی پس از وزن‌کشی)
  sale: "u" = عددی / بسته‌ای
  price: null = استعلام قیمت (تماس بگیرید)
*/
const PRODUCTS = [
  // ---- گوشت و استیک ----
  { id: "file-gosale",        name: "فیله گوساله",              cat: "meat",     price: 1420000, sale: "w", emoji: "🥩", desc: "فیله تازه گوساله، مناسب استیک و کباب برگ.", badge: "" },
  { id: "tbone-gosfandi",     name: "تی‌بون گوسفندی",           cat: "meat",     price: 1285000, sale: "w", emoji: "🥩", desc: "استیک تی‌بون گوسفندی تازه با برش حرفه‌ای.", badge: "" },
  { id: "ribeye-gosale",      name: "ریبای گوساله",             cat: "meat",     price: 1185000, sale: "w", emoji: "🥩", desc: "استیک ریبای گوساله، لطیف و خوش‌عطر.", badge: "" },
  { id: "tbone-gosale",       name: "تی‌بون گوساله",            cat: "meat",     price: 988000,  sale: "w", emoji: "🥩", desc: "استیک تی‌بون گوساله تازه.", badge: "" },

  // ---- کبابی و مزه‌دار ----
  { id: "chenje-gosfandi",    name: "چنجه گوسفندی",             cat: "kebab",    price: 1550000, sale: "w", emoji: "🍢", desc: "چنجه گوسفندی تازه، آماده سیخ و طبخ.", badge: "پرفروش" },
  { id: "shishlik-gosfandi",  name: "شیشلیک گوسفندی",           cat: "kebab",    price: 1250000, sale: "w", emoji: "🍢", desc: "شیشلیک گوسفندی ممتاز، مناسب مهمانی و مجالس.", badge: "" },
  { id: "kabab-koobideh",     name: "کباب کوبیده",              cat: "kebab",    price: 830000,  sale: "w", emoji: "🍢", desc: "مخلوط کوبیده مجاز و آماده طبخ.", badge: "پرفروش" },
  { id: "jooje-file",         name: "جوجه فیله طعم‌دار",         cat: "kebab",    price: 345000,  sale: "w", emoji: "🍗", desc: "فیله مرغ مزه‌دارشده، آماده کباب.", badge: "" },
  { id: "katf-bal",           name: "کتف و بال طعم‌دار",         cat: "kebab",    price: 230000,  sale: "w", emoji: "🍗", desc: "کتف و بال جوجه طعم‌دار، آماده گریل.", badge: "" },
  { id: "gharch-kababi",      name: "قارچ کبابی",               cat: "kebab",    price: 290000,  sale: "w", emoji: "🍄", desc: "قارچ مزه‌دارشده مخصوص کباب و گریل.", badge: "" },
  { id: "file-ran-zafarani",  name: "فیله ران مرغ زعفرانی",     cat: "kebab",    price: 272000,  sale: "w", emoji: "🍗", desc: "فیله ران مرغ با طعم زعفران، آماده طبخ.", badge: "" },

  // ---- مرغ و فرآورده‌های مرغی ----
  { id: "nugget-morgh",       name: "ناگت مرغ",                 cat: "chicken",  price: 526000,  sale: "w", emoji: "🍗", desc: "ناگت مرغ خانگی، مناسب کودکان و مهمانی.", badge: "" },
  { id: "schnitzel-morgh",    name: "شنیسل مرغ",                cat: "chicken",  price: 348000,  sale: "w", emoji: "🍗", desc: "شنیسل مرغ سوخاری‌شده، آماده سرخ کردن.", badge: "" },

  // ---- سوسیس، کالباس و ژامبون ----
  { id: "kalbas-martadella",  name: "کالباس مارتادلا",          cat: "coldcuts", price: 447000,  sale: "w", emoji: "🥓", desc: "کالباس مارتادلا با برش تازه در محل.", badge: "" },
  { id: "kalbas-pepperoni",   name: "کالباس پپرونی",            cat: "coldcuts", price: 448000,  sale: "w", emoji: "🥓", desc: "کالباس پپرونی تند، مناسب پیتزا و ساندویچ.", badge: "" },
  { id: "kalbas-lioner",      name: "کالباس لیونر",             cat: "coldcuts", price: 493000,  sale: "w", emoji: "🥓", desc: "کالباس لیونر ممتاز با طعم ملایم.", badge: "" },
  { id: "bacon-leberkase",    name: "بیکن لبرکزه",              cat: "coldcuts", price: 819000,  sale: "w", emoji: "🥓", desc: "بیکن لبرکزه ویژه با کیفیت ممتاز.", badge: "" },
  { id: "jambon-morgh",       name: "ژامبون مرغ",               cat: "coldcuts", price: 535000,  sale: "w", emoji: "🥓", desc: "ژامبون مرغ تازه با برش دلخواه شما.", badge: "" },
  { id: "jambon-morgh-gharch",name: "ژامبون مرغ و قارچ",        cat: "coldcuts", price: 512000,  sale: "w", emoji: "🥓", desc: "ژامبون مرغ و قارچ، خوش‌طعم و لطیف.", badge: "" },
  { id: "jambon-boghalamoon", name: "ژامبون بوقلمون",           cat: "coldcuts", price: 577000,  sale: "w", emoji: "🥓", desc: "ژامبون بوقلمون کم‌چرب و پرپروتئین.", badge: "" },
  { id: "jambon-gosfandi",    name: "ژامبون گوشت گوسفندی",      cat: "coldcuts", price: 937000,  sale: "w", emoji: "🥓", desc: "ژامبون گوشت گوسفندی ممتاز.", badge: "ویژه" },

  // ---- برگر و ساندویچ ----
  { id: "hamburger-gousht",   name: "همبرگر گوشت",              cat: "burger",   price: 980000,  sale: "w", emoji: "🍔", desc: "همبرگر دست‌ساز با گوشت خالص، آماده طبخ.", badge: "پرفروش" },
  { id: "hamburger-morgh",    name: "همبرگر مرغ",               cat: "burger",   price: 530000,  sale: "w", emoji: "🍔", desc: "برگر مرغ خانگی، لطیف و خوش‌طعم.", badge: "" },
  { id: "hamburger-shotor",   name: "همبرگر شتر",               cat: "burger",   price: 1140000, sale: "w", emoji: "🍔", desc: "برگر ویژه با گوشت شتر، کم‌چرب و مقوی.", badge: "ویژه" },
  { id: "bandari",            name: "بندری ۵۰۰ گرمی",           cat: "burger",   price: 218000,  sale: "u", emoji: "🌭", desc: "خوراک بندری آماده، بسته ۵۰۰ گرمی.", badge: "" },
  { id: "samboose",           name: "سمبوسه ۱۲ عددی",           cat: "burger",   price: 315000,  sale: "u", emoji: "🥟", desc: "سمبوسه خانگی، بسته ۱۲ عددی، آماده سرخ کردن.", badge: "" },
  { id: "falafel-sade",       name: "فلافل ساده ۲۲ عددی",       cat: "burger",   price: 110000,  sale: "u", emoji: "🧆", desc: "فلافل خانگی ساده، بسته ۲۲ عددی.", badge: "" },
  { id: "falafel-tamdar",     name: "فلافل طعم‌دار ۲۲ عددی",     cat: "burger",   price: 120000,  sale: "u", emoji: "🧆", desc: "فلافل طعم‌دار مخصوص، بسته ۲۲ عددی.", badge: "" },
  { id: "sandwich-sard",      name: "ساندویچ سرد",              cat: "burger",   price: null,    sale: "u", emoji: "🥪", desc: "انواع ساندویچ سرد؛ برای اطلاع از قیمت روز تماس بگیرید.", badge: "" },

  // ---- سبزیجات نیمه‌آماده ----
  { id: "piaz-dagh",          name: "پیاز داغ ۲۰۰ گرمی",        cat: "veg",      price: 176000,  sale: "u", emoji: "🧅", desc: "پیاز داغ خانگی با روغن کم، بسته ۲۰۰ گرمی.", badge: "" },
  { id: "baghala-sabz",       name: "باقلا سبز ۵۰۰ گرمی",       cat: "veg",      price: 190000,  sale: "u", emoji: "🫘", desc: "باقلا سبز پاک‌شده، بسته ۵۰۰ گرمی.", badge: "" },
  { id: "sabzi-kookooi",      name: "سبزی کوکویی ۵۰۰ گرمی",     cat: "veg",      price: 85000,   sale: "u", emoji: "🌿", desc: "سبزی کوکو خردشده و آماده، بسته ۵۰۰ گرمی.", badge: "" },
  { id: "sabzi-khoreshti",    name: "سبزی خورشتی ۵۰۰ گرمی",     cat: "veg",      price: 130000,  sale: "u", emoji: "🌿", desc: "سبزی خورشتی سرخ‌شده، بسته ۵۰۰ گرمی.", badge: "" },
  { id: "sabzi-polowi",       name: "سبزی پلویی ۵۰۰ گرمی",      cat: "veg",      price: 85000,   sale: "u", emoji: "🌿", desc: "سبزی پلویی خردشده، بسته ۵۰۰ گرمی.", badge: "" },

  // ---- سالاد و مخلفات ----
  { id: "salad-anvae",        name: "سالاد (انواع)",            cat: "salad",    price: 358000,  sale: "w", emoji: "🥗", desc: "انواع سالادهای آماده روز؛ الویه، ماکارونی و ...", badge: "" },
];

// همه محصولات فعلاً موجود هستند؛ برای ناموجود کردن: available: false
PRODUCTS.forEach((p) => { if (p.available === undefined) p.available = true; });
