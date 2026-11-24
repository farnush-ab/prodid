"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { fmtPrice, toFa } from "@/lib/format";
import { toEnDigits } from "@/lib/phone";
import { toast } from "@/lib/toast";
import { pageHref } from "@/lib/page";
import { WALLET_TXN_LABEL, type WalletSummary } from "@/lib/wallet";

function txnDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR", { month: "long", day: "numeric" }) + " — " + d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

/** تب «کیف پول» در حساب کاربری: موجودی، شارژ آنلاین و گردش حساب */
export function WalletPanel({ wallet, loaded }: { wallet: WalletSummary | null; loaded: boolean }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  if (loaded && !wallet) {
    return (
      <div className="empty-state">
        <div className="e-ico">
          <Icon name="wallet" />
        </div>
        <b>اطلاعات کیف پول خوانده نشد</b>
        لطفا چند لحظه بعد دوباره صفحه را باز کنید.
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const chosen = amount ?? (Number(toEnDigits(custom).replace(/[^\d]/g, "")) || 0);
  const room = wallet ? Math.max(0, wallet.maxBalance - balance) : 0;

  async function topup(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || busy) return;
    if (chosen < wallet.minTopup) {
      toast(`کمترین مبلغ شارژ ${fmtPrice(wallet.minTopup)} تومان است`);
      return;
    }
    if (chosen > room) {
      toast(`با این مبلغ از سقف ${fmtPrice(wallet.maxBalance)} تومانی کیف پول بالاتر می‌روید`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: chosen }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; paymentUrl?: string };
      if (!res.ok || !data.paymentUrl) throw new Error(data.error || "اتصال به درگاه انجام نشد");
      window.location.href = data.paymentUrl;
    } catch (err) {
      toast(err instanceof Error ? err.message : "اتصال به درگاه انجام نشد");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="acc-panel-head">
        <h2>کیف پول</h2>
      </div>

      <div className="wl-balance">
        <div>
          <span className="wl-balance-label">موجودی قابل استفاده</span>
          <b className="wl-balance-value">
            {loaded ? fmtPrice(balance) : "—"}
            <small>تومان</small>
          </b>
          <span className="wl-balance-hint">
            موقع ثبت سفارش با یک تیک، مبلغ از همین موجودی کم می‌شود؛ اگر کافی نبود باقی را با روش دیگری می‌پردازید.
          </span>
        </div>
        <span className="wl-balance-ico" aria-hidden="true">
          <Icon name="wallet" />
        </span>
      </div>

      {wallet && !wallet.enabled ? (
        <p className="min-order-warn">کیف پول فعلا از طرف فروشگاه غیرفعال است. موجودی شما محفوظ می‌ماند.</p>
      ) : null}

      {wallet?.enabled && wallet.cashbackPercent > 0 ? (
        <p className="wl-perk">
          <Icon name="award" />
          <span>
            بعد از تحویل هر سفارش، {toFa(wallet.cashbackPercent)}٪ مبلغ آن به‌عنوان هدیه به همین کیف پول برمی‌گردد.
          </span>
        </p>
      ) : null}

      {wallet?.enabled ? (
        <div className="form-card">
          <h3>
            <Icon name="card" /> شارژ کیف پول
          </h3>
          {wallet.canTopup ? (
            <form onSubmit={topup}>
              <label>مبلغ شارژ</label>
              <div className="wl-presets">
                {wallet.presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`slot${amount === p ? " active" : ""}`}
                    onClick={() => {
                      setAmount(p);
                      setCustom("");
                    }}
                  >
                    {fmtPrice(p)} تومان
                  </button>
                ))}
              </div>
              <div className="mt-1">
                <label htmlFor="wl-custom">یا مبلغ دلخواه (تومان)</label>
                <input
                  id="wl-custom"
                  dir="ltr"
                  inputMode="numeric"
                  value={custom}
                  placeholder={`حداقل ${fmtPrice(wallet.minTopup)}`}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    setAmount(null);
                  }}
                />
                <span className="hint">
                  حداقل {fmtPrice(wallet.minTopup)} تومان · سقف موجودی کیف پول {fmtPrice(wallet.maxBalance)} تومان
                </span>
              </div>
              <button type="submit" className="btn btn-primary btn-block mt-2" disabled={busy || !chosen}>
                <Icon name="card" /> {busy ? "در حال انتقال به درگاه…" : chosen ? `پرداخت ${fmtPrice(chosen)} تومان` : "مبلغ را انتخاب کنید"}
              </button>
              <p className="hint mt-1">پرداخت از طریق درگاه امن آقای پرداخت انجام می‌شود و بلافاصله پس از تایید بانک به موجودی اضافه می‌شود.</p>
            </form>
          ) : (
            <p className="hint">شارژ آنلاین به‌زودی فعال می‌شود. تا آن موقع برای شارژ با پشتیبانی تماس بگیرید.</p>
          )}
        </div>
      ) : null}

      <div className="acc-panel-head">
        <h2>گردش حساب</h2>
      </div>
      {loaded && wallet && !wallet.txns.length ? (
        <div className="empty-state">
          <div className="e-ico">
            <Icon name="wallet" />
          </div>
          <b>هنوز تراکنشی ندارید</b>
          بعد از اولین شارژ یا خرید با کیف پول، همه‌چیز این‌جا ثبت می‌شود.
          <div className="mt-2">
            <Link className="btn btn-light" href={pageHref("shop")}>
              رفتن به فروشگاه
            </Link>
          </div>
        </div>
      ) : (
        <ul className="wl-txns">
          {(wallet?.txns || []).map((t) => (
            <li key={t.id} className="wl-txn">
              <span className={`wl-txn-ico ${t.amount > 0 ? "in" : "out"}`} aria-hidden="true">
                <Icon name={t.amount > 0 ? "plus" : "minus"} />
              </span>
              <span className="wl-txn-main">
                <b>{WALLET_TXN_LABEL[t.type]}</b>
                <span>
                  {txnDate(t.createdAt)}
                  {t.orderNo ? (
                    <>
                      {" · "}
                      <span dir="ltr">{t.orderNo}</span>
                    </>
                  ) : null}
                </span>
                {t.note && t.type.startsWith("admin") ? <span>{t.note}</span> : null}
              </span>
              <span className="wl-txn-amt">
                <b className={t.amount > 0 ? "in" : "out"}>
                  {t.amount > 0 ? "+" : "−"}
                  {fmtPrice(Math.abs(t.amount))}
                </b>
                <span>مانده {fmtPrice(t.balanceAfter)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
