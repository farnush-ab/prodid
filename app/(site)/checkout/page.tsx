"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@/lib/icons";
import { BRAND } from "@/lib/data";
import { fmtPrice, qtyLabel } from "@/lib/format";
import { pageHref } from "@/lib/page";
import { Cart, useCart, cartItems, cartTotal, cartHasWeightItems } from "@/lib/cart";
import { Profile } from "@/lib/profile";
import { toast } from "@/lib/toast";
import { normalizePhone } from "@/lib/phone";
import { AppModal } from "@/components/AppModal";
import { LoginPanel } from "@/components/LoginPanel";
import { PaymentSheet } from "@/components/PaymentSheet";
import {
  DELIVERY_DAYS,
  DELIVERY_SLOTS,
  LAST_ORDER_KEY,
  PAY_METHODS,
  dayLabel,
  orderWhatsappUrl,
  slotLabel,
  type PayMethod,
  type PublicOrder,
} from "@/lib/order";

function SuccessBox({ order }: { order: PublicOrder | null }) {
  if (!order) {
    return (
      <div className="success-box">
        <div className="s-ico">
          <Icon name="check" />
        </div>
        <h2>سفارش شما ثبت شد!</h2>
        <p>جزئیات سفارش برای فروشگاه ارسال شد. همکاران ما به‌زودی برای تایید نهایی با شما تماس می‌گیرند.</p>
        <Link className="btn btn-primary btn-block" href={pageHref("shop")}>
          بازگشت به فروشگاه
        </Link>
        <Link className="btn btn-light btn-block mt-1" href={pageHref("account")}>
          مشاهده سفارش‌های من
        </Link>
      </div>
    );
  }

  return (
    <div className="success-box">
      <div className="s-ico">
        <Icon name="check" />
      </div>
      <h2>سفارش شما ثبت شد!</h2>
      <p>
        شماره سفارش <b className="num" dir="ltr">{order.orderNo}</b>
        {order.hasWeightItems ? " — مبلغ نهایی محصولات وزنی پس از وزن‌کشی اعلام می‌شود." : ""}
      </p>
      <p className="muted" style={{ marginTop: "-12px" }}>
        {dayLabel(order.day)} — ساعت {slotLabel(order.slot)}
      </p>
      <Link className="btn btn-primary btn-block" href={pageHref("shop")}>
        بازگشت به فروشگاه
      </Link>
      <Link className="btn btn-light btn-block mt-1" href={pageHref("account")}>
        مشاهده سفارش‌های من
      </Link>
      <a className="btn btn-outline btn-block mt-1" href={orderWhatsappUrl(order, "track")} target="_blank" rel="noopener">
        <Icon name="chat" /> پیگیری در واتس‌اپ
      </a>
    </div>
  );
}

function CheckoutForm() {
  const cart = useCart();
  const router = useRouter();
  const { data: session } = useSession();
  const items = cartItems(cart);
  const total = cartTotal(cart);
  const underMin = total < BRAND.minOrder;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [day, setDay] = useState<(typeof DELIVERY_DAYS)[number]["id"]>("today");
  const [slot, setSlot] = useState<(typeof DELIVERY_SLOTS)[number]["id"]>(DELIVERY_SLOTS[0].id);
  const [pay, setPay] = useState<PayMethod>("card");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | "login" | "pay">(null);
  const loginNext = useRef<"stay" | "pay">("stay");

  useEffect(() => {
    const local = Profile.read();
    let cancelled = false;
    (async () => {
      if (session?.user) {
        try {
          const res = await fetch("/api/me");
          if (res.ok) {
            const me = await res.json();
            if (cancelled) return;
            setName(me.name || local.name || "");
            setPhone(me.phone || session.user.phone || local.phone || "");
            setAddress(me.address || local.address || "");
            return;
          }
        } catch {
          /* fallback below */
        }
      }
      if (cancelled) return;
      if (local.name) setName(local.name);
      if (local.phone) setPhone(local.phone);
      if (local.address) setAddress(local.address);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const n = name.trim();
    const ph = normalizePhone(phone);
    const addr = address.trim();
    if (!n || !ph || !addr) {
      toast("لطفا نام، موبایل و آدرس را کامل کنید");
      return;
    }
    if (underMin) {
      toast("مبلغ سفارش به حداقل نرسیده است");
      return;
    }

    if (pay === "online") {
      if (!session?.user) {
        loginNext.current = "pay";
        setModal("login");
        return;
      }
      setModal("pay");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ p, qty }) => ({ id: p.id, qty })),
          name: n,
          phone: ph,
          address: addr,
          day,
          slot,
          pay,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "ثبت سفارش انجام نشد");
        return;
      }

      const order = data.order as PublicOrder;
      Profile.write({ name: n, phone: ph, address: addr });
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      } catch {
        /* ignore */
      }
      Cart.clear();
      if (data.whatsappUrl) window.open(data.whatsappUrl, "_blank");
      const q = new URLSearchParams({ done: "1", no: order.orderNo });
      if (order.viewToken) q.set("t", order.viewToken);
      router.push(`${pageHref("checkout")}?${q.toString()}`);
    } catch {
      toast("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
          {!session?.user ? (
            <p className="muted mt-1">
              برای ذخیره مشخصات در حساب،{" "}
              <button
                type="button"
                className="section-link"
                style={{ marginTop: 0, display: "inline" }}
                onClick={() => {
                  loginNext.current = "stay";
                  setModal("login");
                }}
              >
                با موبایل وارد شوید
              </button>
              . خرید مهمان هم ممکن است.
            </p>
          ) : null}
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
              <select id="f-day" value={day} onChange={(e) => setDay(e.target.value as typeof day)}>
                {DELIVERY_DAYS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label>بازه زمانی</label>
          <div className="slot-grid">
            {DELIVERY_SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`slot${slot === s.id ? " active" : ""}`}
                onClick={() => setSlot(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-card">
          <h3>
            <span className="step-num">۴</span> روش پرداخت
          </h3>
          {PAY_METHODS.map((m) => (
            <label className="pay-option" key={m.id}>
              <input type="radio" name="pay" value={m.id} checked={pay === m.id} onChange={() => setPay(m.id)} />
              <span>
                <b>
                  <Icon name={m.icon} /> {m.label}
                </b>
                <span>{m.hint}</span>
              </span>
            </label>
          ))}
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
        {underMin ? (
          <p className="min-order-warn">
            حداقل مبلغ سفارش {fmtPrice(BRAND.minOrder)} تومان است. {fmtPrice(BRAND.minOrder - total)} تومان دیگر به سبد
            اضافه کنید.
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || underMin}>
          <Icon name={pay === "online" ? "card" : "check"} />{" "}
          {busy ? "در حال ثبت…" : pay === "online" ? "ادامه و پرداخت" : "ثبت سفارش"}
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

    {modal === "login" ? (
      <AppModal
        title={loginNext.current === "pay" ? "ورود برای پرداخت" : "ورود به حساب"}
        subtitle={
          loginNext.current === "pay"
            ? "با شماره موبایل وارد شوید؛ بعد از ورود صفحه پرداخت همین‌جا باز می‌شود"
            : "با شماره موبایل وارد شوید؛ ثبت‌نام جدا لازم نیست"
        }
        icon="user"
        onClose={() => setModal(null)}
      >
        <LoginPanel
          embedded
          initialPhone={phone}
          onSuccess={() => {
            if (loginNext.current === "pay") setModal("pay");
            else setModal(null);
          }}
        />
      </AppModal>
    ) : null}

    {modal === "pay" ? (
      <AppModal
        title="پرداخت آنلاین"
        subtitle="درگاه زرین‌پال روی همین مرحله وصل می‌شود"
        icon="card"
        wide
        onClose={() => setModal(null)}
      >
        <PaymentSheet items={items} total={total} hasWeight={cartHasWeightItems(cart)} phone={session?.user.phone || phone} />
      </AppModal>
    ) : null}
    </>
  );
}

function CheckoutContent() {
  const params = useSearchParams();
  const done = params.get("done") === "1";
  const no = params.get("no");
  const token = params.get("t");
  const [order, setOrder] = useState<PublicOrder | null>(null);

  useEffect(() => {
    if (!done) return;
    try {
      const cached = sessionStorage.getItem(LAST_ORDER_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as PublicOrder;
        if (!no || parsed.orderNo === no) setOrder(parsed);
      }
    } catch {
      /* ignore */
    }
    if (!no) return;
    const q = token ? `?t=${encodeURIComponent(token)}` : "";
    fetch(`/api/orders/${encodeURIComponent(no)}${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.order) setOrder(data.order);
      })
      .catch(() => {});
  }, [done, no, token]);

  return <main className="container" id="checkout-wrap">{done ? <SuccessBox order={order} /> : <CheckoutForm />}</main>;
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
