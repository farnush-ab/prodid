"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { fmtPrice, faNum } from "@/lib/format";
import { toast } from "@/lib/toast";
import { adminFetch } from "@/lib/admin-client";
import {
  WALLET_TXN_LABEL,
  WALLET_TXN_TYPES,
  type PublicTopup,
  type PublicWalletTxn,
  type WalletSettings,
  type WalletTxnType,
} from "@/lib/wallet";
import { EmptyRow, MetricCard } from "./shared";
import { NumField } from "./InsightsView";

type Recent = PublicWalletTxn & { phone: string; name: string; by: string };
interface Overview {
  totalBalance: number;
  holders: number;
  last30: Partial<Record<WalletTxnType, { sum: number; n: number }>>;
  recent: Recent[];
  topups: PublicTopup[];
  gateway: { configured: boolean; sandbox: boolean };
  sms: { credit: boolean; debit: boolean };
}

const faDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fa-IR", { month: "long", day: "numeric" })} ${d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`;
};
const TOPUP_PILL = { paid: ["adm-pill-done", "موفق"], pending: ["adm-pill-wait", "در انتظار"], failed: ["adm-pill-danger", "ناموفق"] } as const;

export function WalletView({
  settings,
  canEdit,
  canSettings,
  onOpenCustomer,
  onSaveSettings,
}: {
  settings: WalletSettings;
  canEdit: boolean;
  canSettings: boolean;
  onOpenCustomer: (phone: string) => void;
  onSaveSettings: (next: WalletSettings) => Promise<void>;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [type, setType] = useState<WalletTxnType | "all">("all");
  const [checking, setChecking] = useState<string | null>(null);
  const [draft, setDraft] = useState(settings);
  const [presetText, setPresetText] = useState(settings.presets.join("، "));

  const load = useCallback(async () => {
    setErr("");
    try {
      setData(await adminFetch<Overview>("/api/admin/wallet"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خواندن کیف پول‌ها انجام نشد");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setDraft(settings);
    setPresetText(settings.presets.join("، "));
  }, [settings]);

  const rows = useMemo(() => (data?.recent || []).filter((r) => type === "all" || r.type === type), [data, type]);
  const sum = (t: WalletTxnType) => Math.abs(data?.last30[t]?.sum || 0);

  async function recheck(t: PublicTopup) {
    setChecking(t.id);
    try {
      const r = await adminFetch<{ paid: boolean }>(`/api/admin/wallet/topups/${t.id}`, { method: "PATCH" });
      toast(r.paid ? "پرداخت تایید شد و کیف پول شارژ شد" : "درگاه پرداخت این تراکنش را تایید نکرد");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "بررسی انجام نشد");
    } finally {
      setChecking(null);
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>کیف پول مشتریان</h1>
          <p>موجودی کل، شارژهای آنلاین و همهٔ تراکنش‌ها. برای شارژ یا کسر دستی، پروندهٔ همان مشتری را باز کنید.</p>
        </div>
        <button type="button" className="btn btn-light btn-sm" onClick={load}>
          <Icon name="refresh" /> به‌روزرسانی
        </button>
      </div>

      {err ? <p className="min-order-warn">{err}</p> : null}
      {data && !data.gateway.configured ? (
        <p className="min-order-warn">
          درگاه آقای پرداخت روی سرور تنظیم نشده؛ مشتری‌ها فعلا نمی‌توانند آنلاین شارژ کنند. AQAYEPARDAKHT_PIN را در فایل .env سرور بگذارید.
        </p>
      ) : null}
      {data?.gateway.sandbox ? <p className="min-order-warn">درگاه در حالت آزمایشی (sandbox) است؛ پول واقعی جابه‌جا نمی‌شود.</p> : null}

      <div className="adm-stat-grid">
        <MetricCard icon="wallet" label="موجودی کل کیف پول‌ها" value={data ? fmtPrice(data.totalBalance) : "—"} unit="تومان" bg="var(--brand-green-tint)" fg="var(--brand-green-deep)" />
        <MetricCard icon="users" label="کیف پول با موجودی" value={data ? faNum.format(data.holders) : "—"} unit="مشتری" bg="var(--wine-tint)" fg="var(--wine)" />
        <MetricCard icon="card" label="شارژ آنلاین ۳۰ روز" value={data ? fmtPrice(sum("topup")) : "—"} unit="تومان" bg="var(--brand-orange-tint)" fg="var(--brand-orange-deep)" />
        <MetricCard icon="package" label="خرج‌شده در سفارش ۳۰ روز" value={data ? fmtPrice(sum("order")) : "—"} unit="تومان" bg="rgba(42, 120, 214, 0.1)" fg="#2a78d6" />
      </div>
      <p className="hint" style={{ marginTop: -6, marginBottom: 16 }}>
        «موجودی کل» پولی است که مشتری‌ها نزد فروشگاه دارند و هر وقت بخواهند می‌توانند خرج کنند.
        {data ? ` در ۳۰ روز اخیر: برگشت وجه ${fmtPrice(sum("refund"))}، هدیهٔ خرید ${fmtPrice(sum("cashback"))}، افزایش دستی ${fmtPrice(sum("admin_credit"))} و کسر دستی ${fmtPrice(sum("admin_debit"))} تومان.` : ""}
      </p>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-toolbar">
          <select value={type} onChange={(e) => setType(e.target.value as WalletTxnType | "all")} aria-label="نوع تراکنش">
            <option value="all">همهٔ تراکنش‌ها</option>
            {WALLET_TXN_TYPES.map((t) => (
              <option key={t} value={t}>
                {WALLET_TXN_LABEL[t]}
              </option>
            ))}
          </select>
          <span className="adm-cell-sub">۸۰ تراکنش آخر</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>مشتری</th>
                <th>نوع</th>
                <th>شرح</th>
                <th>مبلغ</th>
                <th>مانده</th>
                <th>زمان</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => onOpenCustomer(r.phone)}>
                    <td>
                      <div className="adm-cell-main">{r.name || "بدون نام"}</div>
                      <div className="adm-cell-sub" dir="ltr" style={{ textAlign: "right" }}>
                        {r.phone}
                      </div>
                    </td>
                    <td>{WALLET_TXN_LABEL[r.type]}</td>
                    <td className="adm-cell-sub">
                      {r.note || r.orderNo || r.ref || "—"}
                      {r.by ? ` · ثبت: ${r.by}` : ""}
                    </td>
                    <td className="amount" style={{ color: r.amount > 0 ? "var(--brand-green-deep)" : "var(--wine)" }}>
                      {r.amount > 0 ? "+" : "−"}
                      {fmtPrice(Math.abs(r.amount))}
                    </td>
                    <td className="amount">{fmtPrice(r.balanceAfter)}</td>
                    <td className="adm-cell-sub">{faDateTime(r.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={6} icon="wallet" text={data ? "تراکنشی نیست" : "در حال خواندن…"} />
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>شارژهای آنلاین</h3>
              <div className="sub">اگر مشتری پرداخت کرده ولی «ناموفق» مانده، «بررسی دوباره» از خود درگاه می‌پرسد</div>
            </div>
          </div>
          <div className="adm-table-wrap adm-ins-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>مشتری</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.topups.length ? (
                  data.topups.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="adm-cell-main">{t.name || t.phone}</div>
                        <div className="adm-cell-sub">
                          {faDateTime(t.createdAt)}
                          {t.trackingNumber ? ` · رهگیری ${t.trackingNumber}` : ""}
                        </div>
                      </td>
                      <td className="amount">{fmtPrice(t.amount)}</td>
                      <td>
                        <span className={`adm-pill ${TOPUP_PILL[t.status][0]}`}>
                          <span className="dot" />
                          {TOPUP_PILL[t.status][1]}
                        </span>
                      </td>
                      <td>
                        {canEdit && t.status !== "paid" ? (
                          <button type="button" className="btn btn-ghost btn-sm" disabled={checking === t.id} onClick={() => recheck(t)}>
                            {checking === t.id ? "…" : "بررسی دوباره"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={4} icon="card" text={data ? "هنوز شارژ آنلاینی نشده" : "در حال خواندن…"} />
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-card adm-card-pad">
          <h3 style={{ marginBottom: 12, fontSize: "0.92rem" }}>تنظیمات کیف پول</h3>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const presets = presetText
                .split(/[،,\s]+/)
                .map((x) => Number(x.replace(/[^\d۰-۹]/g, "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))))
                .filter((n) => n > 0);
              await onSaveSettings({ ...draft, presets });
            }}
          >
            <label className="acc-setting-row" style={{ padding: 0 }}>
              <div>
                <b>کیف پول فعال</b>
                <span className="hint">خاموش: نه شارژ می‌شود نه در پرداخت پیشنهاد می‌شود؛ موجودی‌ها می‌مانند</span>
              </div>
              <span className="acc-switch">
                <input type="checkbox" checked={draft.enabled} disabled={!canSettings} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
                <span className="track" />
                <span className="thumb" />
              </span>
            </label>
            <div className="form-grid cols-2">
              <NumField id="ws-min" label="کمترین مبلغ شارژ (تومان)" value={draft.minTopup} onChange={(v) => setDraft({ ...draft, minTopup: v })} disabled={!canSettings} />
              <NumField id="ws-max" label="سقف موجودی هر نفر (تومان)" value={draft.maxBalance} onChange={(v) => setDraft({ ...draft, maxBalance: v })} disabled={!canSettings} />
            </div>
            <div>
              <label htmlFor="ws-presets">مبلغ‌های آماده (با ویرگول جدا کنید)</label>
              <input id="ws-presets" dir="ltr" value={presetText} disabled={!canSettings} onChange={(e) => setPresetText(e.target.value)} />
            </div>
            <div className="form-grid cols-2">
              <NumField
                id="ws-cb"
                label="هدیهٔ خرید (درصد)"
                value={draft.cashbackPercent}
                onChange={(v) => setDraft({ ...draft, cashbackPercent: v })}
                disabled={!canSettings}
                hint="بعد از تحویل سفارش به کیف پول مشتری؛ ۰ = خاموش"
              />
              <NumField
                id="ws-cbmax"
                label="سقف هدیه برای هر سفارش"
                value={draft.cashbackMax}
                onChange={(v) => setDraft({ ...draft, cashbackMax: v })}
                disabled={!canSettings}
                hint="تومان؛ ۰ = بدون سقف"
              />
            </div>
            {data && (!data.sms.credit || !data.sms.debit) ? (
              <p className="hint">پیامک واریز/برداشت کیف پول تا تنظیم پترن‌هایش روی سرور فرستاده نمی‌شود (docs/sms-patterns.md).</p>
            ) : null}
            {canSettings ? (
              <button type="submit" className="btn btn-primary">
                ذخیرهٔ تنظیمات
              </button>
            ) : (
              <p className="hint">فقط مشاهده — تغییر تنظیمات با مالک فروشگاه است.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

