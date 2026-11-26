"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { fmtPrice, faNum, qtyLabelBySale } from "@/lib/format";
import { toast } from "@/lib/toast";
import { adminFetch } from "@/lib/admin-client";
import { orderPayable } from "@/lib/coupon";
import { AppModal } from "@/components/AppModal";
import type { AdminCustomer, AdminOrder } from "@/lib/admin-data";
import {
  SEGMENT_HINT,
  SEGMENT_LABEL,
  WEEKDAYS_FA,
  fmtDays,
  type ContactRecord,
  type CustomerInsight,
  type Segment,
} from "@/lib/insights";
import { WALLET_TXN_LABEL, type PublicWalletTxn } from "@/lib/wallet";
import { slotLabel } from "@/lib/order";
import { RevenueChart } from "./RevenueChart";
import { EmptyRow, MetricCard, StatusPill } from "./shared";
import { NudgeDialog, type NudgeTarget } from "./NudgeDialog";

export const SEGMENT_PILL: Record<Segment, string> = {
  new: "adm-pill-progress",
  active: "adm-pill-done",
  loyal: "adm-pill-done",
  at_risk: "adm-pill-wait",
  lost: "adm-pill-danger",
  one_time: "adm-pill-wait",
};

export function SegmentPill({ segment }: { segment: Segment }) {
  return (
    <span className={`adm-pill ${SEGMENT_PILL[segment]}`} title={SEGMENT_HINT[segment]}>
      <span className="dot" />
      {SEGMENT_LABEL[segment]}
    </span>
  );
}

const faDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" }) : "—");
const CONTACT_LABEL: Record<ContactRecord["kind"], string> = { winback: "کد تخفیف", reminder: "یادآوری", call: "تماس تلفنی" };

interface InsightPayload {
  insight: CustomerInsight;
  contacts: ContactRecord[];
  smsReady: { winback: boolean; reminder: boolean };
  defaults: { percent: number; validDays: number; cooldownDays: number };
}

interface WalletPayload {
  balance: number;
  txns: PublicWalletTxn[];
  reconcile: { ok: boolean; balance: number; ledger: number };
}

/** پروندهٔ کامل یک مشتری: الگوی خرید با نمودار، هشدارها، پیام بازگشت و کیف پول */
export function CustomerProfile({
  customer,
  orders,
  canWallet,
  canNudge,
  canBlock,
  onBack,
  onToggleBlock,
}: {
  customer: AdminCustomer;
  orders: AdminOrder[];
  canWallet: boolean;
  canNudge: boolean;
  canBlock: boolean;
  onBack: () => void;
  onToggleBlock: (phone: string, value: boolean) => void;
}) {
  const [ins, setIns] = useState<InsightPayload | null>(null);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [err, setErr] = useState("");
  const [nudge, setNudge] = useState<NudgeTarget | null>(null);
  const [adjust, setAdjust] = useState<"credit" | "debit" | null>(null);

  const phone = customer.phone;
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        adminFetch<InsightPayload>(`/api/admin/customers/${encodeURIComponent(phone)}/insights`),
        adminFetch<WalletPayload>(`/api/admin/customers/${encodeURIComponent(phone)}/wallet`),
      ]);
      setIns(a);
      setWallet(b);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خواندن پرونده انجام نشد");
    }
  }, [phone]);

  useEffect(() => {
    load();
  }, [load]);

  const i = ins?.insight;
  const history = orders.filter((o) => o.customer.phone === phone);
  const maxProd = Math.max(1, ...(i?.products.map((p) => p.orders) || [1]));
  const maxWd = Math.max(1, ...(i?.weekday || [1]));
  const slotRows = i ? Object.entries(i.slots).sort((a, b) => b[1] - a[1]) : [];
  const lastContact = ins?.contacts[0];
  const cooling =
    !!lastContact && !!ins && Date.now() - new Date(lastContact.createdAt).getTime() < ins.defaults.cooldownDays * 86400000;

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <button type="button" className="btn btn-ghost btn-sm adm-ins-back" onClick={onBack}>
            <Icon name="arrow" /> بازگشت به فهرست
          </button>
          <h1>
            {customer.name} {i ? <SegmentPill segment={i.segment} /> : null}
          </h1>
          <p dir="ltr" style={{ textAlign: "right" }}>
            {phone}
          </p>
        </div>
        {canNudge ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setNudge({ phone, name: customer.name, alert: i?.alerts[0] || null })}>
            <Icon name="send" /> پیام به مشتری
          </button>
        ) : null}
      </div>

      {err ? <p className="min-order-warn">{err}</p> : null}

      <div className="adm-stat-grid">
        <MetricCard icon="package" label="تعداد سفارش" value={faNum.format(customer.orders)} unit="سفارش" bg="var(--wine-tint)" fg="var(--wine)" />
        <MetricCard icon="wallet" label="مجموع خرید" value={fmtPrice(customer.spent)} unit="تومان" bg="var(--brand-green-tint)" fg="var(--brand-green-deep)" />
        <MetricCard icon="chart" label="میانگین هر سفارش" value={i ? fmtPrice(i.avgOrder) : "—"} unit="تومان" bg="var(--brand-orange-tint)" fg="var(--brand-orange-deep)" />
        <MetricCard
          icon="clock"
          label="آخرین خرید"
          value={i && i.lastAt ? fmtDays(i.daysSince) : "—"}
          unit={i && i.lastAt ? "پیش" : ""}
          bg="var(--line)" fg="var(--ink-2)"
          sub={i?.gapDays ? `معمولاً هر ${fmtDays(i.gapDays)}` : undefined}
        />
      </div>

      {i?.alerts.length ? (
        <div className="adm-card adm-ins-alerts">
          <div className="adm-card-head">
            <div>
              <h3>نیاز به توجه</h3>
              <div className="sub">
                {cooling && lastContact
                  ? `آخرین پیام: ${CONTACT_LABEL[lastContact.kind]} در ${faDate(lastContact.createdAt)} — هنوز در دورهٔ صبر ${faNum.format(ins!.defaults.cooldownDays)} روزه است`
                  : "این مشتری از روال همیشگی خریدش عقب افتاده"}
              </div>
            </div>
          </div>
          {i.alerts.map((a) => (
            <div className="adm-ins-alert" key={a.productId || a.kind}>
              <span className="adm-ins-alert-ico" aria-hidden="true">
                <Icon name="bell" />
              </span>
              <span className="grow">{a.message}</span>
              {canNudge ? (
                <button type="button" className="btn btn-light btn-sm" onClick={() => setNudge({ phone, name: customer.name, alert: a })}>
                  <Icon name="send" /> پیام
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>بیشتر چه می‌خرد</h3>
              <div className="sub">تعداد سفارش‌هایی که هر محصول در آن بوده</div>
            </div>
          </div>
          {i?.products.length ? (
            <div style={{ paddingBlock: 6 }}>
              {i.products.slice(0, 8).map((p) => (
                <div className="adm-bar-row adm-ins-prod" key={p.productId}>
                  <span className="lbl" title={p.name}>
                    {p.late ? <span className="adm-swatch" style={{ background: "var(--gold-deep, #b7791f)" }} /> : <span className="adm-swatch" style={{ background: "var(--brand-orange-solid)" }} />}
                    <span className="adm-ins-ellipsis">{p.name}</span>
                  </span>
                  <div className="adm-ins-bar-col">
                    <div className="adm-bar-track">
                      <div className="adm-bar-fill" style={{ width: `${Math.round((p.orders / maxProd) * 100)}%`, background: p.late ? "var(--gold-deep, #b7791f)" : "var(--brand-orange-solid)" }} />
                    </div>
                    <span className="adm-cell-sub">
                      {p.gapDays ? `هر ${fmtDays(p.gapDays)}` : "یک بار"}
                      {p.weekday !== null ? ` · بیشتر ${WEEKDAYS_FA[p.weekday]}` : ""}
                      {` · آخرین: ${fmtDays(p.daysSince)} پیش`}
                    </span>
                  </div>
                  <span className="amt">{faNum.format(p.orders)} بار</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="hint adm-card-pad">{ins ? "هنوز خریدی ثبت نشده" : "در حال خواندن…"}</p>
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>کدام روزها خرید می‌کند</h3>
              <div className="sub">بر اساس روز تحویل</div>
            </div>
          </div>
          <div style={{ paddingBlock: 6 }}>
            {WEEKDAYS_FA.map((d, idx) => (
              <div className="adm-bar-row" key={d}>
                <span className="lbl">{d}</span>
                <div className="adm-bar-track">
                  <div className="adm-bar-fill" style={{ width: `${Math.round(((i?.weekday[idx] || 0) / maxWd) * 100)}%`, background: "#2a78d6" }} />
                </div>
                <span className="amt">{faNum.format(i?.weekday[idx] || 0)} سفارش</span>
              </div>
            ))}
          </div>
          {slotRows.length ? (
            <p className="hint adm-card-pad" style={{ paddingTop: 0 }}>
              ساعت دلخواه: {slotRows.slice(0, 2).map(([s, n]) => `${slotLabel(s)} (${faNum.format(n)} بار)`).join("، ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>خرید ماه به ماه</h3>
              <div className="sub">۱۲ ماه اخیر — تومان</div>
            </div>
          </div>
          {i ? <RevenueChart data={i.monthly.map((m) => m.spent)} labels={i.monthly.map((m) => `${m.label} (${faNum.format(m.orders)} سفارش)`)} height={190} /> : null}
          {i ? (
            <div className="adm-ins-months">
              {i.monthly.map((m, idx) => (idx % 2 === 1 || idx === i.monthly.length - 1 ? <span key={m.key}>{m.label}</span> : <span key={m.key} />))}
            </div>
          ) : null}
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>کیف پول</h3>
              <div className="sub">{wallet && !wallet.reconcile.ok ? "⚠ موجودی با جمع دفتر نمی‌خواند" : "موجودی و گردش حساب"}</div>
            </div>
            <b className="amount">{wallet ? `${fmtPrice(wallet.balance)} تومان` : "—"}</b>
          </div>
          {canWallet ? (
            <div className="adm-toolbar">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdjust("credit")}>
                <Icon name="plus" /> افزایش موجودی
              </button>
              <button type="button" className="btn btn-light btn-sm" onClick={() => setAdjust("debit")}>
                <Icon name="minus" /> کسر موجودی
              </button>
            </div>
          ) : null}
          <div className="adm-table-wrap adm-ins-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>شرح</th>
                  <th>مبلغ</th>
                  <th>مانده</th>
                </tr>
              </thead>
              <tbody>
                {wallet?.txns.length ? (
                  wallet.txns.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="adm-cell-main">{WALLET_TXN_LABEL[t.type]}</div>
                        <div className="adm-cell-sub">
                          {faDate(t.createdAt)}
                          {t.orderNo ? ` · ${t.orderNo}` : ""}
                          {t.note && t.type.startsWith("admin") ? ` · ${t.note}` : ""}
                        </div>
                      </td>
                      <td className="amount" style={{ color: t.amount > 0 ? "var(--brand-green-deep)" : "var(--wine)" }}>
                        {t.amount > 0 ? "+" : "−"}
                        {fmtPrice(Math.abs(t.amount))}
                      </td>
                      <td className="amount">{fmtPrice(t.balanceAfter)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={3} text={wallet ? "تراکنشی ثبت نشده" : "در حال خواندن…"} icon="wallet" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>سفارش‌ها</h3>
          </div>
          <div className="adm-table-wrap adm-ins-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>سفارش</th>
                  <th>اقلام</th>
                  <th>وضعیت</th>
                  <th>مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {history.length ? (
                  history.map((o) => (
                    <tr key={o.orderNo}>
                      <td>
                        <div className="adm-cell-main" dir="ltr" style={{ textAlign: "right" }}>
                          {o.orderNo}
                        </div>
                        <div className="adm-cell-sub">{o.createdLabel}</div>
                      </td>
                      <td className="adm-cell-sub">{o.items.map((it) => `${it.name} ${qtyLabelBySale(it.sale, it.qty)}`).join("، ")}</td>
                      <td>
                        <StatusPill status={o.status} />
                      </td>
                      <td className="amount">{fmtPrice(orderPayable(o))}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={4} text="سفارشی در ۳۰۰ سفارش اخیر نیست" icon="package" />
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>پیام‌ها و پیگیری‌ها</h3>
              <div className="sub">«خرید کرد» یعنی تا ۳۰ روز بعد از پیام سفارش داده</div>
            </div>
          </div>
          {ins?.contacts.length ? (
            <div className="adm-card-pad">
              {ins.contacts.map((c) => (
                <div className="adm-item-line" key={c.createdAt}>
                  <span>
                    <b>{CONTACT_LABEL[c.kind]}</b>
                    {c.productName ? ` — ${c.productName}` : ""}
                    {c.code ? ` — ${c.code} (${faNum.format(c.percent)}٪)` : ""}
                    <span className="adm-cell-sub" style={{ display: "block" }}>
                      {faDate(c.createdAt)}
                      {c.kind !== "call" && !c.sent ? " · پیامک نرفت" : ""}
                      {c.note ? ` · ${c.note}` : ""}
                    </span>
                  </span>
                  {c.converted ? <span className="adm-pill adm-pill-done">خرید کرد</span> : <span className="adm-pill adm-pill-wait">هنوز نه</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="hint adm-card-pad">هنوز پیامی برای این مشتری ثبت نشده</p>
          )}

          <div className="adm-card-pad" style={{ borderTop: "1px solid var(--line)" }}>
            <div className="adm-dgrid">
              <div className="adm-dblock">
                <label>اولین خرید</label>
                <div className="val">{i ? faDate(i.firstAt) : "—"}</div>
              </div>
              <div className="adm-dblock">
                <label>خرید بعدی (طبق روال)</label>
                <div className="val">{i?.expectedNextAt ? faDate(i.expectedNextAt) : "—"}</div>
              </div>
              <div className="adm-dblock">
                <label>تاریخ تولد</label>
                <div className="val">{customer.birthDate || "ثبت نشده"}</div>
              </div>
              <div className="adm-dblock" style={{ gridColumn: "1 / -1" }}>
                <label>آدرس</label>
                <div className="val" style={{ fontWeight: 500, fontSize: "0.8rem", lineHeight: 1.9 }}>
                  {customer.address || "—"}
                </div>
              </div>
            </div>
            {canBlock ? (
              <div className="acc-setting-row" style={{ padding: "16px 0 0" }}>
                <div>
                  <b>مسدودسازی حساب</b>
                  <span className="hint">در صورت فعال بودن، امکان ورود و سفارش جدید ندارد</span>
                </div>
                <label className="acc-switch">
                  <input type="checkbox" checked={customer.status === "blocked"} onChange={(e) => onToggleBlock(phone, e.target.checked)} />
                  <span className="track" />
                  <span className="thumb" />
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {nudge && ins ? (
        <NudgeDialog
          target={nudge}
          defaults={ins.defaults}
          smsReady={ins.smsReady}
          onClose={() => setNudge(null)}
          onSent={(c) => setIns((prev) => (prev ? { ...prev, contacts: [c, ...prev.contacts] } : prev))}
        />
      ) : null}

      {adjust ? (
        <WalletAdjustDialog
          phone={phone}
          name={customer.name}
          direction={adjust}
          balance={wallet?.balance ?? 0}
          onClose={() => setAdjust(null)}
          onDone={() => {
            setAdjust(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}


export function WalletAdjustDialog({
  phone,
  name,
  direction,
  balance,
  onClose,
  onDone,
}: {
  phone: string;
  name: string;
  direction: "credit" | "debit";
  balance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sms, setSms] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const data = await adminFetch<{ balance: number }>(`/api/admin/customers/${encodeURIComponent(phone)}/wallet`, {
        method: "POST",
        body: JSON.stringify({ direction, amount, note, sms }),
      });
      toast(`موجودی جدید ${name}: ${fmtPrice(data.balance)} تومان`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "ثبت انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal
      title={direction === "credit" ? "افزایش موجودی کیف پول" : "کسر از کیف پول"}
      subtitle={`${name} — موجودی فعلی ${fmtPrice(balance)} تومان`}
      icon="wallet"
      onClose={onClose}
    >
      <form className="form-grid" onSubmit={submit}>
        <div>
          <label htmlFor="wa-amount">مبلغ (تومان)</label>
          <input id="wa-amount" dir="ltr" inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثلا 50000" />
        </div>
        <div>
          <label htmlFor="wa-note">دلیل</label>
          <input
            id="wa-note"
            required
            minLength={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={direction === "credit" ? "مثلا: جبران تاخیر ارسال / هدیه مشتری وفادار" : "مثلا: تسویه نقدی / اصلاح اشتباه"}
          />
          <span className="hint">در گردش حساب مشتری و پیامک او نوشته می‌شود؛ نام شما هم کنار تراکنش ثبت می‌شود.</span>
        </div>
        <label className="acc-setting-row" style={{ padding: 0 }}>
          <div>
            <b>پیامک به مشتری</b>
            <span className="hint">اطلاع مبلغ، دلیل و موجودی جدید</span>
          </div>
          <span className="acc-switch">
            <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
            <span className="track" />
            <span className="thumb" />
          </span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "در حال ثبت…" : direction === "credit" ? "افزودن به کیف پول" : "کسر از کیف پول"}
        </button>
      </form>
    </AppModal>
  );
}
