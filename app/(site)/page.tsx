"use client";

import { Icon } from "@/lib/icons";
import { pageHref } from "@/lib/page";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCard } from "@/components/CategoryCard";
import { useReveal } from "@/components/Reveal";
import { useCatalog } from "@/lib/catalog-store";
import Link from "next/link";

export default function HomePage() {
  const { products, categories, brand } = useCatalog();
  const BEST = products
    .filter((p) => p.badge === "پرفروش")
    .concat(products.filter((p) => p.badge === "ویژه"))
    .slice(0, 4);
  const FRESH = products.filter((p) => ["veg", "kebab"].includes(p.cat)).slice(0, 4);
  const catsHead = useReveal<HTMLDivElement>();
  const bestHead = useReveal<HTMLDivElement>();
  const banner = useReveal<HTMLDivElement>();
  const freshHead = useReveal<HTMLDivElement>();
  const trustHead = useReveal<HTMLDivElement>();
  const trustCard = useReveal<HTMLDivElement>();

  return (
    <>
      {/* هیرو */}
      <section className="hero">
        <div className="container">
          <div className="hero-media tilt">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/assets/img/hero-poster.jpg"
              aria-label="ویدیوی معرفی فروشگاه پرودید"
            >
              <source src="/assets/img/hero.webm" type="video/webm" />
              <source src="/assets/img/hero.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="hero-copy">
            <span className="hero-kicker">فروشگاه تخصصی پروتئین در کاشان</span>
            <h1>
              پروتئینِ <span className="accent">هر خانه</span>
            </h1>
            <div className="hero-rule"></div>
            <p>
              گوشت و استیک تازه، کبابی و مزه‌دار، سوسیس و کالباس ممتاز و برگرهای دست‌ساز — هر روز تازه آماده
              می‌شود، شما فقط سفارش دهید؛ همان روز درب منزل تحویل بگیرید.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href={pageHref("shop")}>
                <Icon name="basket" /> سفارش آنلاین
              </Link>
              <a className="btn btn-outline-light" href={`tel:${brand.phone}`}>
                <Icon name="phone" /> سفارش تلفنی
              </a>
            </div>
            <div className="hero-marks">
              <span className="hero-mark">
                <Icon name="truck" /> ارسال همان‌روز در کاشان
              </span>
              <span className="hero-mark">
                <Icon name="award" /> کیفیت تضمینی
              </span>
              <span className="hero-mark">
                <Icon name="pin" /> {brand.address}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* دسته‌بندی‌ها */}
      <section className="section container">
        <div ref={catsHead.ref} className={`section-head ${catsHead.revealClass}`}>
          <span className="section-eyebrow">چه چیزی میل دارید؟</span>
          <h2 className="section-title">دسته‌بندی محصولات</h2>
        </div>
        <div className="cats-grid">
          {categories.map((c, i) => (
            <CategoryCard key={c.id} c={c} index={i} />
          ))}
        </div>
      </section>

      {/* پرفروش‌ها */}
      <section className="section container">
        <div ref={bestHead.ref} className={`section-head ${bestHead.revealClass}`}>
          <span className="section-eyebrow">انتخاب مشتریان</span>
          <h2 className="section-title">پرفروش‌های پرودید</h2>
          <div>
            <Link className="section-link" href={pageHref("shop")}>
              مشاهده همه محصولات <Icon name="arrow" />
            </Link>
          </div>
        </div>
        <div className="products-grid">
          {BEST.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </section>

      {/* بنر ارسال */}
      <div className="container">
        <div ref={banner.ref} className={`banner ${banner.revealClass}`}>
          <div>
            <h3>
              <Icon name="truck" /> ارسال همان‌روز در کاشان
            </h3>
            <p>سفارش‌های امروز، همان روز درب منزل شما — بازه زمانی تحویل را خودتان انتخاب کنید.</p>
          </div>
          <Link className="btn btn-primary" href={pageHref("shipping")}>
            شرایط ارسال
          </Link>
        </div>
      </div>

      {/* تازه‌ها */}
      <section className="section container">
        <div ref={freshHead.ref} className={`section-head ${freshHead.revealClass}`}>
          <span className="section-eyebrow">هر روز، تازه</span>
          <h2 className="section-title">تازه‌های امروز</h2>
        </div>
        <div className="products-grid">
          {FRESH.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </section>

      {/* اعتمادسازی */}
      <section className="section container">
        <div ref={trustHead.ref} className={`section-head ${trustHead.revealClass}`}>
          <span className="section-eyebrow">با خیال راحت خرید کنید</span>
          <h2 className="section-title">چرا پرودید؟</h2>
        </div>
        <div ref={trustCard.ref} className={`trust-card ${trustCard.revealClass}`}>
          <div className="trust-item">
            <span className="t-ico">
              <Icon name="store" />
            </span>
            <div>
              <b>فروشگاه حضوری در کاشان</b>
              <span>{brand.address}</span>
            </div>
          </div>
          <div className="trust-item">
            <span className="t-ico">
              <Icon name="headset" />
            </span>
            <div>
              <b>پاسخگویی سریع</b>
              <a href={`tel:${brand.phone}`} className="num">
                {brand.phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}
              </a>
            </div>
          </div>
          <div className="trust-item">
            <span className="t-ico">
              <Icon name="instagram" />
            </span>
            <div>
              <b>ما را دنبال کنید</b>
              <a href={brand.instagramUrl} target="_blank" rel="noopener">
                اینستاگرام {brand.instagram}@
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* نوار ویژگی‌ها */}
      <div className="features-band">
        <div className="container">
          <div className="features-grid">
            <div className="feature">
              <span className="f-ico">
                <Icon name="award" />
              </span>
              <span>
                کیفیت تضمینی
                <small>محصولات انتخاب‌شده و تازه</small>
              </span>
            </div>
            <div className="feature">
              <span className="f-ico">
                <Icon name="truck" />
              </span>
              <span>
                ارسال سریع
                <small>همان‌روز در شهر کاشان</small>
              </span>
            </div>
            <div className="feature">
              <span className="f-ico">
                <Icon name="snowflake" />
              </span>
              <span>
                بسته‌بندی بهداشتی
                <small>حفظ تازگی و کیفیت</small>
              </span>
            </div>
            <div className="feature">
              <span className="f-ico">
                <Icon name="leaf" />
              </span>
              <span>
                ۱۰۰٪ طبیعی
                <small>بدون مواد نگهدارنده</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
