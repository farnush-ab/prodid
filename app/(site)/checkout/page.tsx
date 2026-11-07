"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@/lib/icons";
import { useCatalog } from "@/lib/catalog-store";
import {
  LAST_ORDER_KEY,
  PAY_METHODS,
  canPayOnlineOrder,
  dayLabel,
  orderWhatsappUrl,
  slotLabel,
  type PayMethod,
  type PublicOrder,
} from "@/lib/order";
import { requestZarinpalCheckout } from "@/lib/zarinpal-client";
import { fmtPrice, qtyLabel } from "@/lib/format";
import { pageHref } from "@/lib/page";
import { Cart, useCart, cartItems, cartTotal, cartHasWeightItems } from "@/lib/cart";
import { Profile } from "@/lib/profile";
import { toast } from "@/lib/toast";
import { normalizePhone } from "@/lib/phone";
import { couponDiscountAmount, COUPON_KIND_LABEL, type CouponOffer } from "@/lib/coupon";
import { AppModal } from "@/components/AppModal";
import { LoginPanel } from "@/components/LoginPanel";
import { PaymentSheet } from "@/components/PaymentSheet";

function SuccessBox({ order, paid }: { order: PublicOrder | null; paid?: boolean }) {
  const onlinePaid = paid || order?.paymentStatus === "paid";
  if (!order) {
    return (
      <div className="success-box">
        <div className="s-ico">
          <Icon name="check" />
        </div>
        <h2>{onlinePaid ? "پرداخت انجام شد" : "سفارش شما ثبت شد!"}</h2>
        <p>
          {onlinePaid
            ? "پرداخت آنلاین تایید شد. همکاران ما به‌زودی سفارش را بررسی می‌کنند."
            : "جزئیات سفارش برای فروشگاه ارسال شد. همکاران ما به‌زودی برای تایید نهایی با شما تماس می‌گیرند."}
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

  return (
    <div className="success-box">
      <div className="s-ico">
        <Icon name="check" />
      </div>
      <h2>{onlinePaid && order.paymentMethod === "online" ? "پرداخت انجام شد" : "سفارش شما ثبت شد!"}</h2>
      <p>
        شماره سفارش <b className="num" dir="ltr">{order.orderNo}</b>
        {order.hasWeightItems ? " — مبلغ نهایی محصولات وزنی پس از وزن‌کشی اعلام می‌شود." : ""}
      </p>
      {order.paymentMethod === "online" ? (
        <p className="muted" style={{ marginTop: "-12px" }}>
          {onlinePaid ? "پرداخت آنلاین با موفقیت تایید شد." : "سفارش ثبت شده؛ پرداخت هنوز تکمیل نشده است."}
        </p>
      ) : null}
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
  const { brand, features, delivery } = useCatalog();
  const items = cartItems(cart);
  const total = cartTotal(cart);
  const underMin = total < brand.minOrder;
  const days = delivery.days.filter((d) => d.enabled);
  const slots = delivery.slots.filter((s) => s.enabled);
  const payMethods = PAY_METHODS.filter((m) => m.id !== "online" || features.onlinePay);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [day, setDay] = useState(days[0]?.id || "today");
  const [slot, setSlot] = useState(slots[0]?.id || "9-12");
  const [pay, setPay] = useState<PayMethod>("card");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | "login" | "pay">(null);
  const loginNext = useRef<"stay" | "pay">("stay");
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<CouponOffer | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [offers, setOffers] = useState<CouponOffer[]>([]);
  const discount = applied ? couponDiscountAmount(total, applied.percent) : 0;
  const payable = Math.max(0, total - discount);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/coupons");
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setOffers(Array.isArray(data.coupons) ? data.coupons : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function applyCoupon(code: string) {
    const raw = code.trim();
    if (!raw || couponBusy) return;
    setCouponBusy(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: raw, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "کد تخفیف اعمال نشد");
        return;
      }
      setApplied(data.coupon);
      setCouponInput(data.coupon.code);
      toast(`${data.coupon.percent} درصد تخفیف اعمال شد`);
    } catch {
      toast("بررسی کد تخفیف انجام نشد");
    } finally {
      setCouponBusy(false);
    }
  }

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
          couponCode: applied?.code,
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

  async function startOnlinePayment() {
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
    if (!session?.user) {
      loginNext.current = "pay";
      setModal("login");
      return;
    }

    setBusy(true);
    try {
      const { paymentUrl, order } = await requestZarinpalCheckout({
        items: items.map(({ p, qty }) => ({ id: p.id, qty })),
        name: n,
        phone: ph,
        address: addr,
        day,
        slot,
        pay: "online",
        notes,
        couponCode: applied?.code,
      });
      Profile.write({ name: n, phone: ph, address: addr });
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      } catch {
        /* ignore */
      }
      Cart.clear();
      window.location.href = paymentUrl;
    } catch (err) {
      toast(err instanceof Error ? err.message : "اتصال به درگاه انجام نشد");
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
            <span className="step-num">۲</span> آدرس تحویل (فقط {brand.city})
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
            ارسال فقط در محدوده شهر {brand.city} انجام می‌شود؛ {brand.deliveryFeeNote}.
          </p>
          {delivery.zones.length ? (
            <ul className="muted mt-1" style={{ paddingInlineStart: 18 }}>
              {delivery.zones.map((z) => (
                <li key={z.name}>
                  {z.name}
                  {z.fee ? ` — ${fmtPrice(z.fee)} تومان` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="form-card">
          <h3>
            <span className="step-num">۳</span> زمان تحویل
          </h3>
          <div className="form-grid cols-2 mb-2">
            <div>
              <label htmlFor="f-day">روز تحویل</label>
              <select id="f-day" value={day} onChange={(e) => setDay(e.target.value)}>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label>بازه زمانی</label>
          <div className="slot-grid">
            {slots.map((s) => (
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
          {payMethods.map((m) => (
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
        <div className="coupon-box">
          <label htmlFor="f-coupon">کد تخفیف</label>
          {applied ? (
            <div className="coupon-applied">
              <span>
                {applied.code} — {applied.percent}٪ {COUPON_KIND_LABEL[applied.kind]}
              </span>
              <button type="button" className="section-link" onClick={() => setApplied(null)}>
                حذف
              </button>
            </div>
          ) : (
            <div className="coupon-row">
              <input
                id="f-coupon"
                dir="ltr"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="مثلا SAVE10"
              />
              <button type="button" className="btn btn-light btn-sm" disabled={couponBusy || !couponInput.trim()} onClick={() => applyCoupon(couponInput)}>
                {couponBusy ? "…" : "اعمال"}
              </button>
            </div>
          )}
          {offers.filter((o) => o.eligible && o.code !== applied?.code).length ? (
            <div className="coupon-chips">
              {offers
                .filter((o) => o.eligible && o.code !== applied?.code)
                .map((o) => (
                  <button type="button" key={o.code} className="slot" onClick={() => applyCoupon(o.code)}>
                    {o.code} · {o.percent}٪
                  </button>
                ))}
            </div>
          ) : null}
        </div>
        {applied && discount ? (
          <div className="sum-row discount">
            <span>تخفیف {applied.percent}٪</span>
            <span>−{fmtPrice(discount)} تومان</span>
          </div>
        ) : null}
        {applied ? (
          <div className="sum-row total">
            <span>قابل پرداخت</span>
            <span>{fmtPrice(payable)} تومان</span>
          </div>
        ) : null}
        {cartHasWeightItems(cart) ? (
          <p className="sum-note">
            <Icon name="scale" />
            <span>مبلغ نهایی محصولات وزنی پس از وزن‌کشی مشخص و پیش از ارسال به شما اطلاع داده می‌شود.</span>
          </p>
        ) : null}
        <p className="sum-note">
          <Icon name="truck" />
          <span>{brand.deliveryFeeNote}.</span>
        </p>
        {features.maintenance ? (
          <p className="min-order-warn">فروشگاه موقتاً در حال به‌روزرسانی است؛ ثبت سفارش اینترنتی ممکن نیست.</p>
        ) : null}
        {underMin ? (
          <p className="min-order-warn">
            حداقل مبلغ سفارش {fmtPrice(brand.minOrder)} تومان است. {fmtPrice(brand.minOrder - total)} تومان دیگر به سبد
            اضافه کنید.
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || underMin || features.maintenance}>
          <Icon name={pay === "online" ? "card" : "check"} />{" "}
          {busy ? "در حال ثبت…" : pay === "online" ? "ادامه و پرداخت" : "ثبت سفارش"}
        </button>
        <a className="btn btn-outline btn-block mt-1" href={`tel:${brand.phone}`}>
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
        subtitle="با تایید، به درگاه امن زرین‌پال منتقل می‌شوید"
        icon="card"
        wide
        onClose={() => {
          if (!busy) setModal(null);
        }}
      >
        <PaymentSheet
          items={items}
          total={payable}
          subtotal={total}
          coupon={applied}
          hasWeight={cartHasWeightItems(cart)}
          phone={session?.user.phone || phone}
          busy={busy}
          onPay={startOnlinePayment}
        />
      </AppModal>
    ) : null}
    </>
  );
}

function PayFailedBox({
  order,
  onRetry,
  busy,
}: {
  order: PublicOrder | null;
  onRetry: () => void;
  busy: boolean;
}) {
  return (
    <div className="success-box">
      <div className="s-ico" style={{ background: "var(--wine-tint, #f3e6e6)", color: "var(--wine)" }}>
        <Icon name="close" />
      </div>
      <h2>پرداخت انجام نشد</h2>
      <p>
        {order ? (
          <>
            سفارش <b className="num" dir="ltr">{order.orderNo}</b> ثبت شده است. می‌توانید دوباره پرداخت کنید یا بعداً از حساب کاربری اقدام کنید.
          </>
        ) : (
          "پرداخت لغو شد یا تایید نشد. اگر مبلغی کم شده باشد، معمولاً ظرف مدت کوتاهی به حساب برمی‌گردد."
        )}
      </p>
      {order && canPayOnlineOrder(order) ? (
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={onRetry}>
          <Icon name="card" /> {busy ? "در حال انتقال…" : "تلاش دوباره پرداخت"}
        </button>
      ) : null}
      <Link className="btn btn-light btn-block mt-1" href={pageHref("account")}>
        مشاهده سفارش‌های من
      </Link>
      <Link className="btn btn-outline btn-block mt-1" href={pageHref("shop")}>
        بازگشت به فروشگاه
      </Link>
    </div>
  );
}

function CheckoutContent() {
  const params = useSearchParams();
  const done = params.get("done") === "1";
  const payFailed = params.get("pay") === "failed";
  const paid = params.get("paid") === "1";
  const no = params.get("no");
  const token = params.get("t");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!done && !payFailed) return;
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
  }, [done, payFailed, no, token]);

  async function retryPayment() {
    if (!order || retrying) return;
    setRetrying(true);
    try {
      const result = await requestZarinpalCheckout({ orderNo: order.orderNo });
      window.location.href = result.paymentUrl;
    } catch (err) {
      toast(err instanceof Error ? err.message : "اتصال به درگاه انجام نشد");
      setRetrying(false);
    }
  }

  return (
    <main className="container" id="checkout-wrap">
      {done ? (
        <SuccessBox order={order} paid={paid} />
      ) : payFailed ? (
        <PayFailedBox order={order} busy={retrying} onRetry={retryPayment} />
      ) : (
        <CheckoutForm />
      )}
    </main>
  );
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
