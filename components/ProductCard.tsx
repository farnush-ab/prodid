"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import type { Product } from "@/lib/data";
import { BRAND } from "@/lib/data";
import { fmtPrice, unitLabel, qtyLabel, toFa, parseIntFa } from "@/lib/format";
import { pageHref } from "@/lib/page";
import { Cart, useCart, cartQty, step } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { useReveal, staggerDelay } from "@/components/Reveal";

function ProductImg({ p, cls = "p-img" }: { p: Product; cls?: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={cls}>
      <Icon name={p.ic} className="p-ico" />
      {ok && (
        <img
          src={`/assets/img/products/${p.id}.jpg`}
          alt={p.name}
          loading="lazy"
          onError={() => setOk(false)}
        />
      )}
    </div>
  );
}

function SaleBadge({ p }: { p: Product }) {
  if (!p.available) return <span className="badge badge-out">ناموجود</span>;
  return p.sale === "w" ? (
    <span className="badge badge-weight">
      <Icon name="scale" />
      وزنی
    </span>
  ) : (
    <span className="badge badge-unit">
      <Icon name="package" />
      عددی
    </span>
  );
}

function PriceHTML({ p }: { p: Product }) {
  if (p.price === null) return <span className="p-price-call">استعلام قیمت</span>;
  return (
    <>
      <span className="p-price">{fmtPrice(p.price)}</span>
      <span className="p-price-unit">{unitLabel(p)}</span>
    </>
  );
}

function WeightStepper({ p, qty }: { p: Product; qty: number }) {
  const [text, setText] = useState<string | null>(null);
  const grams = text !== null ? text : toFa(Math.round(qty * 1000));

  function commit(val: string) {
    Cart.setGrams(p.id, parseIntFa(val));
    setText(null);
  }

  return (
    <div className="p-stepper wgt">
      <button type="button" aria-label="افزایش ۱۰۰ گرم" onClick={() => Cart.add(p.id, step(p))}>
        <Icon name="plus" />
      </button>
      <span className="st-wgt">
        <input
          className="st-inp"
          type="text"
          inputMode="numeric"
          value={grams}
          aria-label="وزن به گرم"
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="st-unit">گرم</span>
      </span>
      <button type="button" aria-label="کاهش ۱۰۰ گرم" onClick={() => Cart.add(p.id, -step(p))}>
        <Icon name="minus" />
      </button>
    </div>
  );
}

function UnitStepper({ p, qty }: { p: Product; qty: number }) {
  return (
    <div className="p-stepper">
      <button type="button" aria-label="افزایش" onClick={() => Cart.add(p.id, step(p))}>
        <Icon name="plus" />
      </button>
      <span className="st-val">{qtyLabel(p, qty)}</span>
      <button type="button" aria-label="کاهش" onClick={() => Cart.add(p.id, -step(p))}>
        <Icon name="minus" />
      </button>
    </div>
  );
}

function CardAction({ p }: { p: Product }) {
  const inCart = cartQty(useCart(), p.id);
  if (!p.available) {
    return (
      <button className="p-add out" disabled title="ناموجود">
        <Icon name="close" />
      </button>
    );
  }
  if (p.price === null) {
    return (
      <a className="p-add" href={`tel:${BRAND.phone}`} title="تماس برای سفارش">
        <Icon name="phone" />
      </a>
    );
  }
  if (inCart > 0) return p.sale === "w" ? <WeightStepper p={p} qty={inCart} /> : <UnitStepper p={p} qty={inCart} />;
  return (
    <button
      className="p-add"
      title="افزودن به سبد"
      onClick={() => {
        Cart.add(p.id);
        toast(`«${p.name}» به سبد اضافه شد`);
      }}
    >
      <Icon name="plus" />
    </button>
  );
}

export function ProductCard({ p, index }: { p: Product; index?: number }) {
  const href = `${pageHref("product")}?id=${p.id}`;
  const { ref, revealClass } = useReveal<HTMLElement>();
  return (
    <article
      ref={ref}
      className={`p-card tilt ${revealClass}`}
      style={index !== undefined ? { transitionDelay: `${staggerDelay(index)}ms` } : undefined}
    >
      <Link href={href} aria-label={p.name}>
        <div className="p-badges">
          {p.badge ? <span className="badge badge-gold">{p.badge}</span> : null}
          <SaleBadge p={p} />
        </div>
        <ProductImg p={p} />
      </Link>
      <div className="p-body">
        <Link href={href}>
          <h3 className="p-name">{p.name}</h3>
        </Link>
        <div className="p-foot">
          <div className="p-price-row">
            <PriceHTML p={p} />
          </div>
          <div className="card-action">
            <CardAction p={p} />
          </div>
        </div>
      </div>
    </article>
  );
}
