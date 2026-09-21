"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import type { Product } from "@/lib/data";
import { fmtPrice, toFa, parseIntFa, qtyLabel } from "@/lib/format";
import { pageHref } from "@/lib/page";
import { Cart, useCart, cartQty, step } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog-store";
import { productImageSrc } from "@/lib/product-image";

const WEIGHT_CHIPS = [250, 500, 1000];

function WeightControl({ p, inCart }: { p: Product; inCart: number }) {
  const [grams, setGrams] = useState(inCart > 0 ? Math.round(inCart * 1000) : 500);
  const [text, setText] = useState<string | null>(null);
  const MIN = 100;
  const inCartNow = inCart > 0;

  const clamp = (g: number) => Math.max(MIN, Math.round(g / 10) * 10);
  const price = Math.round(((p.price || 0) * grams) / 1000);
  const value = text !== null ? text : toFa(grams);

  function commitText(v: string) {
    const g = clamp(parseIntFa(v) || MIN);
    setGrams(g);
    setText(null);
    if (inCartNow) Cart.setGrams(p.id, g);
  }

  return (
    <div className="wctl">
      <span className="wctl-label">
        <Icon name="scale" /> وزن دلخواه خود را وارد کنید
      </span>
      <div className="wctl-row">
        <div className="qty-stepper wgt">
          <button
            type="button"
            aria-label="افزایش ۱۰۰ گرم"
            onClick={() => {
              const g = clamp(grams + 100);
              setGrams(g);
              setText(null);
              if (inCartNow) Cart.setGrams(p.id, g);
            }}
          >
            <Icon name="plus" />
          </button>
          <span className="qty-val">
            <input
              className="wctl-inp"
              type="text"
              inputMode="numeric"
              value={value}
              aria-label="وزن به گرم"
              onChange={(e) => setText(e.target.value)}
              onBlur={(e) => commitText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
            <span className="wctl-unit">گرم</span>
          </span>
          <button
            type="button"
            aria-label="کاهش ۱۰۰ گرم"
            onClick={() => {
              const g = clamp(grams - 100);
              setGrams(g);
              setText(null);
              if (inCartNow) Cart.setGrams(p.id, g);
            }}
          >
            <Icon name="minus" />
          </button>
        </div>
        <div className="wctl-price">
          قیمت تقریبی
          <br />
          <b>{fmtPrice(price)}</b> تومان
        </div>
      </div>
      <div className="wchips">
        {WEIGHT_CHIPS.map((g) => (
          <button
            key={g}
            type="button"
            className={`wchip${g === grams ? " active" : ""}`}
            onClick={() => {
              setGrams(g);
              setText(null);
              if (inCartNow) Cart.setGrams(p.id, g);
            }}
          >
            {g >= 1000 ? `${toFa(g / 1000)} کیلو` : `${toFa(g)} گرم`}
          </button>
        ))}
      </div>
      {inCartNow ? (
        <Link className="btn btn-primary btn-block" href={pageHref("cart")}>
          <Icon name="cart" /> مشاهده سبد و ادامه خرید
        </Link>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            const g = clamp(grams);
            Cart.setGrams(p.id, g);
            toast(`«${p.name}» (${qtyLabel(p, g / 1000)}) به سبد اضافه شد`);
          }}
        >
          <Icon name="cart" /> افزودن به سبد خرید
        </button>
      )}
      <p className="wctl-hint">
        <Icon name="scale" /> حداقل سفارش ۱۰۰ گرم؛ مبلغ نهایی پس از وزن‌کشی دقیق مشخص و اطلاع‌رسانی می‌شود.
      </p>
    </div>
  );
}

function ProductAction({ p }: { p: Product }) {
  const inCart = cartQty(useCart(), p.id);
  const { brand, features } = useCatalog();
  if (features.maintenance) {
    return (
      <button className="btn btn-block" disabled style={{ background: "#eee9dd", color: "#a39a89" }}>
        فروشگاه در حال به‌روزرسانی است
      </button>
    );
  }
  if (!p.available) {
    return (
      <button className="btn btn-block" disabled style={{ background: "#eee9dd", color: "#a39a89" }}>
        ناموجود
      </button>
    );
  }
  if (p.price === null) {
    return (
      <a className="btn btn-primary btn-block" href={`tel:${brand.phone}`}>
        <Icon name="phone" /> تماس برای سفارش
      </a>
    );
  }
  if (p.sale === "w") return <WeightControl p={p} inCart={inCart} />;

  if (inCart > 0) {
    return (
      <div className="qty-row">
        <div className="qty-stepper">
          <button type="button" onClick={() => Cart.add(p.id, step(p))}>
            <Icon name="plus" />
          </button>
          <span className="qty-val">{qtyLabel(p, inCart)}</span>
          <button type="button" onClick={() => Cart.add(p.id, -step(p))}>
            <Icon name="minus" />
          </button>
        </div>
        <Link className="btn btn-primary" style={{ flex: 1 }} href={pageHref("cart")}>
          مشاهده سبد و ادامه خرید
        </Link>
      </div>
    );
  }
  return (
    <button
      className="btn btn-primary btn-block"
      onClick={() => {
        Cart.add(p.id);
        toast(`«${p.name}» به سبد اضافه شد`);
      }}
    >
      <Icon name="cart" /> افزودن به سبد خرید
    </button>
  );
}

function ProductContent() {
  const id = useSearchParams()?.get("id");
  const { products, categories, brand } = useCatalog();
  const p = products.find((x) => x.id === id);

  useEffect(() => {
    if (p) document.title = `${p.name} | پرودید`;
  }, [p]);

  if (!p) {
    return (
      <main className="container mt-2">
        <div className="empty-state">
          <div className="e-ico">
            <Icon name="search" />
          </div>
          <b>محصول پیدا نشد</b>
          <div className="mt-2">
            <Link className="btn btn-primary" href={pageHref("shop")}>
              رفتن به فروشگاه
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const cat = categories.find((c) => c.id === p.cat);
  const related = products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  return (
    <main className="container mt-2">
      <nav className="breadcrumb" aria-label="مسیر">
        <Link href={pageHref("index")}>خانه</Link> ‹ <Link href={pageHref("shop")}>فروشگاه</Link> ‹{" "}
        <Link href={`${pageHref("shop")}?cat=${p.cat}`}>{cat?.name || p.cat}</Link> ‹ {p.name}
      </nav>
      <div className="product-layout">
        <div className="product-gallery">
          <Icon name={p.ic} className="p-ico" />
          <ProductGalleryImg p={p} />
        </div>
        <div className="product-info">
          <div className="p-meta">
            {p.badge ? <span className="badge badge-gold">{p.badge}</span> : null}
            {!p.available ? (
              <span className="badge badge-out">ناموجود</span>
            ) : p.sale === "w" ? (
              <span className="badge badge-weight">
                <Icon name="scale" />
                وزنی
              </span>
            ) : (
              <span className="badge badge-unit">
                <Icon name="package" />
                عددی
              </span>
            )}
            <span className="badge" style={{ background: "var(--wine-tint)", color: "var(--wine)" }}>
              {cat?.name || p.cat}
            </span>
          </div>
          <h1>{p.name}</h1>
          <p className="product-desc">{p.desc}</p>
          <div className="price-box">
            <div className="p-price-row">
              {p.price === null ? (
                <span className="p-price-call">استعلام قیمت</span>
              ) : (
                <>
                  <span className="p-price">{fmtPrice(p.price)}</span>
                  <span className="p-price-unit">{p.sale === "w" ? "تومان / هر کیلو" : "تومان"}</span>
                </>
              )}
            </div>
            {p.sale === "w" && p.price !== null ? (
              <div className="note-box">
                <Icon name="scale" />
                <span>
                  این محصول <b>وزنی</b> است؛ قیمت بالا برای هر کیلوگرم است و مبلغ نهایی سفارش شما پس از
                  وزن‌کشی دقیق مشخص و اطلاع‌رسانی می‌شود.
                </span>
              </div>
            ) : null}
            {p.price === null ? (
              <div className="note-box">
                <Icon name="phone" />
                <span>
                  قیمت این محصول روزانه تغییر می‌کند؛ برای استعلام و سفارش با{" "}
                  <a href={`tel:${brand.phone}`} className="num">
                    <b>{toFa(brand.phone)}</b>
                  </a>{" "}
                  تماس بگیرید.
                </span>
              </div>
            ) : null}
          </div>
          <ProductAction p={p} />
          <a className="btn btn-outline btn-block mt-2" href={`tel:${brand.phone}`}>
            <Icon name="headset" /> سوال دارید؟ تماس بگیرید
          </a>
        </div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">محصولات مرتبط</h2>
        </div>
        <div className="products-grid">
          {related.map((rp, i) => (
            <ProductCard key={rp.id} p={rp} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductGalleryImg({ p }: { p: Product }) {
  const src = productImageSrc(p);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    setOk(true);
  }, [src]);
  if (!ok) return null;
  return <img src={src} alt={p.name} onError={() => setOk(false)} />;
}

export default function ProductPage() {
  return (
    <Suspense>
      <ProductContent />
    </Suspense>
  );
}
