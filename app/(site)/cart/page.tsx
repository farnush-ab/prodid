"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { type Product } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-store";
import { fmtPrice, toFa, parseIntFa, qtyLabel } from "@/lib/format";
import { pageHref } from "@/lib/page";
import { Cart, useCart, cartItems, cartTotal, cartHasWeightItems, step } from "@/lib/cart";
import { faNum } from "@/lib/format";
import { toast } from "@/lib/toast";
import { productImageSrc } from "@/lib/product-image";

function CartItemImg({ p }: { p: Product }) {
  const src = productImageSrc(p);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    setOk(true);
  }, [src]);
  return (
    <Link className="ci-img" href={`${pageHref("product")}?id=${p.id}`}>
      <Icon name={p.ic} />
      {ok && <img src={src} alt="" onError={() => setOk(false)} />}
    </Link>
  );
}

function CartStepper({ p, qty }: { p: Product; qty: number }) {
  const [text, setText] = useState<string | null>(null);

  if (p.sale === "w") {
    const grams = text !== null ? text : toFa(Math.round(qty * 1000));
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
            onBlur={(e) => {
              Cart.setGrams(p.id, parseIntFa(e.target.value));
              setText(null);
            }}
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

export default function CartPage() {
  const cart = useCart();
  const items = cartItems(cart);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="cart" /> سبد خرید
          </h1>
          <p>اقلام انتخابی خود را بررسی و سفارش را نهایی کنید</p>
        </div>
      </div>

      <main className="container">
        {!items.length ? (
          <div className="empty-state">
            <div className="e-ico">
              <Icon name="cart" />
            </div>
            <b>سبد خرید شما خالی است</b>
            از فروشگاه، محصولات تازه و خوشمزه انتخاب کنید.
            <div className="mt-2">
              <Link className="btn btn-primary" href={pageHref("shop")}>
                رفتن به فروشگاه
              </Link>
            </div>
          </div>
        ) : (
          <CartLayout items={items} total={cartTotal(cart)} hasWeight={cartHasWeightItems(cart)} />
        )}
      </main>
    </>
  );
}

function CartLayout({
  items,
  total,
  hasWeight,
}: {
  items: { p: Product; qty: number }[];
  total: number;
  hasWeight: boolean;
}) {
  const { brand, features } = useCatalog();
  const underMin = total < brand.minOrder;

  return (
    <div className="cart-layout">
      <div className="cart-list">
        {items.map(({ p, qty }) => (
          <div className="cart-item" key={p.id}>
            <CartItemImg p={p} />
            <div>
              <Link href={`${pageHref("product")}?id=${p.id}`}>
                <div className="ci-name">{p.name}</div>
              </Link>
              <div className="ci-unit">
                {p.sale === "w" ? `${fmtPrice(p.price!)} تومان / کیلو · وزنی` : `${fmtPrice(p.price!)} تومان / بسته`}
              </div>
              <div className="ci-price">
                {fmtPrice(p.price! * qty)} تومان{p.sale === "w" ? " (تقریبی)" : ""}
              </div>
            </div>
            <div className="ci-side">
              <CartStepper p={p} qty={qty} />
              <button className="ci-remove" onClick={() => Cart.remove(p.id)}>
                <Icon name="trash" />
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
      <aside className="summary-card">
        <h3>خلاصه سفارش</h3>
        <div className="sum-row">
          <span>تعداد اقلام</span>
          <span>{faNum.format(items.length)}</span>
        </div>
        <div className="sum-row total">
          <span>جمع کل{hasWeight ? " (تقریبی)" : ""}</span>
          <span>{fmtPrice(total)} تومان</span>
        </div>
        {hasWeight ? (
          <p className="sum-note">
            <Icon name="scale" />
            <span>سبد شما شامل محصولات وزنی است؛ مبلغ نهایی پس از وزن‌کشی دقیق مشخص می‌شود.</span>
          </p>
        ) : null}
        <p className="sum-note">
          <Icon name="truck" />
          <span>{brand.deliveryFeeNote}.</span>
        </p>
        {underMin ? (
          <div className="min-order-warn">
            حداقل مبلغ سفارش {fmtPrice(brand.minOrder)} تومان است. {fmtPrice(brand.minOrder - total)} تومان دیگر به
            سبد اضافه کنید.
          </div>
        ) : null}
        {features.maintenance ? (
          <p className="min-order-warn">فروشگاه موقتاً در حال به‌روزرسانی است؛ فعلا نمی‌توانید تسویه کنید.</p>
        ) : underMin ? (
          <a
            className="btn btn-primary btn-block disabled"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast("مبلغ سفارش به حداقل نرسیده است");
            }}
          >
            ادامه و تسویه حساب
          </a>
        ) : (
          <Link className="btn btn-primary btn-block" href={pageHref("checkout")}>
            ادامه و تسویه حساب
          </Link>
        )}
        <Link className="btn btn-light btn-block mt-1" href={pageHref("shop")}>
          ادامه خرید
        </Link>
      </aside>
    </div>
  );
}
