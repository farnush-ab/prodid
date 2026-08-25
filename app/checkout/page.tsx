"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { BRAND } from "@/lib/data";
import { fmtPrice, qtyLabel, faNum } from "@/lib/format";
import { pageHref } from "@/lib/page";
import { Cart, useCart, cartItems, cartTotal, cartHasWeightItems } from "@/lib/cart";
import { Profile, Orders } from "@/lib/profile";
import { toast } from "@/lib/toast";

const SLOTS = ["۹ تا ۱۲", "۱۲ تا ۱۵", "۱۵ تا ۱۸", "۱۸ تا ۲۱"];

function SuccessBox() {
  return (
    <div className="success-box">
      <div className="s-ico">
        <Icon name="check" />
      </div>
      <h2>سفارش شما ثبت شد!</h2>
      <p>
        جزئیات سفارش در واتس‌اپ برای فروشگاه ارسال شد. همکاران ما به‌زودی برای تایید نهایی و اعلام مبلغ دقیق
        (محصولات وزنی) با شما تماس می‌گیرند.
      </p>
      <Link className="btn btn-primary btn-block" href={pageHref("shop")}>
        بازگشت به فروشگاه
      </Link>
      <Link className="btn btn-light btn-block mt-1" href={pageHref("account")}>
        مشاهده سفارش‌های من
      </Link>
    </div>
  );
}

function CheckoutForm() {
  const cart = useCart();
  const router = useRouter();
  const items = cartItems(cart);
  const total = cartTotal(cart);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [day, setDay] = useState("امروز (ارسال همان‌روز)");
  const [slot, setSlot] = useState(SLOTS[0]);
  const [pay, setPay] = useState("کارت به کارت");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const profile = Profile.read();
    if (profile.name) setName(profile.name);
    if (profile.phone) setPhone(profile.phone);
    if (profile.address) setAddress(profile.address);
  }, []);

  if (!items.length) {
    return (
      <div className="empty-state">
        <div className="e-ico">
          <Icon name="cart" />
        </div>
        <b>سبدی برای تسویه وجود ندارد</b>
        <div className="mt-2">
          <Link className="btn btn-primary" href={pageHref("shop")}>
            رفتن به فروشگاه
          </Link>
        </div>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const ph = phone.trim();
    const addr = address.trim();
    if (!n || !ph || !addr) {
      toast("لطفا نام، موبایل و آدرس را کامل کنید");
      return;
    }
    if (!/^0?9\d{9}$/.test(ph.replace(/[^\d]/g, ""))) {
      toast("شماره موبایل معتبر نیست");
      return;
    }

    Profile.write({ name: n, phone: ph, address: addr });

    const lines = [
      "*سفارش جدید از سایت پرودید*",
      "──────────────",
      ...items.map(
        ({ p, qty }, i) =>
          `${faNum.format(i + 1)}. ${p.name} — ${qtyLabel(p, qty)} — ${fmtPrice(p.price! * qty)} تومان${
            p.sale === "w" ? " (تقریبی)" : ""
          }`
      ),
      "──────────────",
      `جمع کل${cartHasWeightItems(cart) ? " (تقریبی)" : ""}: ${fmtPrice(total)} تومان`,
      `گیرنده: ${n}`,
      `موبایل: ${ph}`,
      `آدرس: ${addr}`,
      `زمان تحویل: ${day} — ساعت ${slot}`,
      `روش پرداخت: ${pay}`,
      notes.trim() ? `توضیحات: ${notes.trim()}` : "",
    ].filter(Boolean);

    Orders.add({
      date: new Date().toISOString(),
      items: items.map(({ p, qty }) => ({ id: p.id, name: p.name, qty, price: p.price })),
      total,
      day,
      slot,
      pay,
    });

    const url = `https://wa.me/${BRAND.phoneIntl}?text=${encodeURIComponent(lines.join("\n"))}`;
    Cart.clear();
    window.open(url, "_blank");
    router.push(`${pageHref("checkout")}?done=1`);
  }

  return (
    <form className="checkout-grid" noValidate onSubmit={submit}>
      <div>
        <div className="form-card">
          <h3>
            <span className="step-num">۱</span> مشخصات گیرنده
          </h3>
          <div className="form-grid cols-2">
            <div>
              <label htmlFor="f-name">نام و نام خانوادگی *</label>
              <input id="f-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلا: علی محمدی" />
            </div>
            <div>
              <label htmlFor="f-phone">شماره موبایل *</label>
              <input
                id="f-phone"
                required
                inputMode="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0913xxxxxxx"
              />
            </div>
          </div>
        </div>

        <div className="form-card">
          <h3>
            <span className="step-num">۲</span> آدرس تحویل (فقط {BRAND.city})
          </h3>
          <div className="form-grid">
            <div>
              <label htmlFor="f-address">آدرس دقیق *</label>
              <textarea
                id="f-address"
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="محله، خیابان، کوچه، پلاک، واحد"
              />
            </div>
          </div>
          <p className="muted mt-1">
            ارسال فقط در محدوده شهر {BRAND.city} انجام می‌شود؛ {BRAND.deliveryFeeNote}.
          </p>
        </div>

        <div className="form-card">
          <h3>
            <span className="step-num">۳</span> زمان تحویل
          </h3>
          <div className="form-grid cols-2 mb-2">
            <div>
              <label htmlFor="f-day">روز تحویل</label>
              <select id="f-day" value={day} onChange={(e) => setDay(e.target.value)}>
                <option value="امروز (ارسال همان‌روز)">امروز (ارسال همان‌روز)</option>
                <option value="فردا">فردا</option>
              </select>
            </div>
          </div>
          <label>بازه زمانی</label>
          <div className="slot-grid">
            {SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`slot${slot === s ? " active" : ""}`}
                onClick={() => setSlot(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="form-card">
          <h3>
            <span className="step-num">۴</span> روش پرداخت
          </h3>
          <label className="pay-option">
            <input type="radio" name="pay" value="کارت به کارت" checked={pay === "کارت به کارت"} onChange={() => setPay("کارت به کارت")} />
            <span>
              <b>
                <Icon name="card" /> کارت به کارت
              </b>
              <span>شماره کارت پس از تایید سفارش برای شما ارسال می‌شود.</span>
            </span>
          </label>
          <label className="pay-option">
            <input type="radio" name="pay" value="پرداخت در محل" checked={pay === "پرداخت در محل"} onChange={() => setPay("پرداخت در محل")} />
            <span>
              <b>
                <Icon name="wallet" /> پرداخت در محل تحویل
              </b>
              <span>پرداخت با کارت‌خوان سیار یا نقدی هنگام تحویل.</span>
            </span>
          </label>
          <label className="pay-option" style={{ opacity: 0.55 }}>
            <input type="radio" name="pay" value="پرداخت آنلاین" disabled />
            <span>
              <b>
                <Icon name="card" /> پرداخت آنلاین <span className="soon-chip">به‌زودی</span>
              </b>
              <span>اتصال به درگاه پرداخت اینترنتی در حال راه‌اندازی است.</span>
            </span>
          </label>
        </div>

        <div className="form-card">
          <h3>
            <span className="step-num">۵</span> توضیحات سفارش (اختیاری)
          </h3>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثلا: کوبیده‌ها را سیخ‌شده آماده کنید / گوشت کم‌چرب باشد"
          />
        </div>
      </div>

      <aside className="summary-card">
        <h3>خلاصه سفارش</h3>
        {items.map(({ p, qty }) => (
          <div className="sum-row" key={p.id}>
            <span>
              {p.name} × {qtyLabel(p, qty)}
            </span>
            <span>{fmtPrice(p.price! * qty)}</span>
          </div>
        ))}
        <div className="sum-row total">
          <span>جمع کل{cartHasWeightItems(cart) ? " (تقریبی)" : ""}</span>
          <span>{fmtPrice(total)} تومان</span>
        </div>
        {cartHasWeightItems(cart) ? (
          <p className="sum-note">
            <Icon name="scale" />
            <span>مبلغ نهایی محصولات وزنی پس از وزن‌کشی مشخص و پیش از ارسال به شما اطلاع داده می‌شود.</span>
          </p>
        ) : null}
        <p className="sum-note">
          <Icon name="truck" />
          <span>{BRAND.deliveryFeeNote}.</span>
        </p>
        <button type="submit" className="btn btn-primary btn-block">
          <Icon name="chat" /> ثبت نهایی سفارش در واتس‌اپ
        </button>
        <a className="btn btn-outline btn-block mt-1" href={`tel:${BRAND.phone}`}>
          <Icon name="phone" /> ثبت سفارش با تماس
        </a>
        <p className="sum-note text-center" style={{ display: "block" }}>
          با ثبت سفارش،{" "}
          <Link href={pageHref("terms")} style={{ color: "var(--wine)" }}>
            <b>قوانین فروشگاه</b>
          </Link>{" "}
          را می‌پذیرید.
        </p>
      </aside>
    </form>
  );
}

function CheckoutContent() {
  const done = useSearchParams()?.get("done") === "1";
  return <main className="container" id="checkout-wrap">{done ? <SuccessBox /> : <CheckoutForm />}</main>;
}

export default function CheckoutPage() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="check" /> تسویه حساب
          </h1>
          <p>چند قدم کوتاه تا تکمیل سفارش شما</p>
        </div>
      </div>
      <Suspense>
        <CheckoutContent />
      </Suspense>
    </>
  );
}
