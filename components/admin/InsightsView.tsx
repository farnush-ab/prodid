"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { fmtPrice, faNum } from "@/lib/format";
import { toast } from "@/lib/toast";
import { adminFetch } from "@/lib/admin-client";
import { SEGMENT_HINT, SEGMENT_LABEL, WEEKDAYS_FA, fmtDays, type InsightSettings, type InsightsOverview, type Segment } from "@/lib/insights";
import { RevenueChart } from "./RevenueChart";
import { EmptyRow, MetricCard } from "./shared";
import { SegmentPill } from "./CustomerProfile";
import { NudgeDialog, type NudgeTarget } from "./NudgeDialog";

type Overview = InsightsOverview & { smsReady: { winback: boolean; reminder: boolean } };

const SEG_COLOR: Record<Segment, string> = {
  loyal: "#1baf7a",
  active: "#2a78d6",
  new: "#4a3aa7",
  at_risk: "#eda100",
  lost: "#d64533",
  one_time: "#8d8172",
};
const SEG_ORDER: Segment[] = ["loyal", "active", "new", "at_risk", "lost", "one_time"];
const KIND_LABEL = { winback: "کد تخفیف", reminder: "یادآوری", call: "تماس" } as const;
const faShort = (iso: string) => new Date(iso).toLocaleDateString("fa-IR", { month: "long", day: "numeric" });

export function InsightsView({
  settings,
  canNudge,
  canSettings,
  onOpenCustomer,
  onSaveSettings,
}: {
  settings: InsightSettings;
  canNudge: boolean;
  canSettings: boolean;
  onOpenCustomer: (phone: string) => void;
  onSaveSettings: (next: InsightSettings) => Promise<void>;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"ready" | "cooling" | "all">("ready");
  const [nudge, setNudge] = useState<NudgeTarget | null>(null);
  const [draft, setDraft] = useState(settings);

  const load = useCallback(async () => {
    setErr("");
    try {
      setData(await adminFetch<Overview>("/api/admin/insights"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خواندن گزارش انجام نشد");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setDraft(settings), [settings]);

  const queue = useMemo(() => {
    const q = data?.queue || [];
    if (filter === "ready") return q.filter((x) => !x.cooling);
    if (filter === "cooling") return q.filter((x) => x.cooling);
    return q;
  }, [data, filter]);

  const segMax = Math.max(1, ...SEG_ORDER.map((s) => data?.segments[s].count || 0));
  const wdMax = Math.max(1, ...(data?.weekday.map((w) => w.orders) || [1]));
  const nrMax = Math.max(1, ...(data?.monthly.map((m) => m.newCustomers + m.returning) || [1]));
  const readyCount = data?.queue.filter((x) => !x.cooling).length || 0;
  const coolingCount = (data?.queue.length || 0) - readyCount;
  const convRate = data && data.contacts.total30 ? Math.round((data.contacts.converted30 / data.contacts.total30) * 100) : 0;

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>شناخت مشتری</h1>
          <p>
            الگوی خرید همهٔ مشتری‌ها، و فهرست کسانی که از روال همیشگی‌شان عقب افتاده‌اند — با یک کلیک کد تخفیف شخصی یا پیامک یادآوری
            بفرستید.
          </p>
        </div>
        <button type="button" className="btn btn-light btn-sm" onClick={load}>
          <Icon name="refresh" /> به‌روزرسانی
        </button>
      </div>

      {err ? <p className="min-order-warn">{err}</p> : null}

      <div className="adm-stat-grid">
        <MetricCard icon="users" label="مشتری با خرید" value={data ? faNum.format(data.customers) : "—"} unit="نفر" bg="var(--wine-tint)" fg="var(--wine)" />
        <MetricCard
          icon="refresh"
          label="خرید دوباره"
          value={data ? faNum.format(Math.round(data.repeatRate * 100)) : "—"}
          unit="درصد"
          bg="var(--brand-green-tint)"
          fg="var(--brand-green-deep)"
          sub="سهم مشتری‌هایی که بیش از یک بار خریده‌اند"
        />
        <MetricCard
          icon="clock"
          label="فاصلهٔ معمول بین خریدها"
          value={data?.avgGapDays ? fmtDays(data.avgGapDays) : "—"}
          unit=""
          bg="var(--brand-orange-tint)"
          fg="var(--brand-orange-deep)"
        />
        <MetricCard icon="bell" label="منتظر پیام" value={data ? faNum.format(readyCount) : "—"} unit="مشتری" bg="rgba(214, 69, 51, 0.1)" fg="var(--danger)" />
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <div>
            <h3>نیاز به توجه</h3>
            <div className="sub">مشتری‌هایی که از روال خریدشان عقب افتاده‌اند؛ باارزش‌ترها بالاتر</div>
          </div>
          <div className="adm-chips">
            <button type="button" className={`adm-chip${filter === "ready" ? " active" : ""}`} onClick={() => setFilter("ready")}>
              آمادهٔ پیام <span className="n">{faNum.format(readyCount)}</span>
            </button>
            <button type="button" className={`adm-chip${filter === "cooling" ? " active" : ""}`} onClick={() => setFilter("cooling")}>
              پیام گرفته‌اند <span className="n">{faNum.format(coolingCount)}</span>
            </button>
            <button type="button" className={`adm-chip${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
              همه
            </button>
          </div>
        </div>
        {data && !data.smsReady.winback ? (
          <p className="hint adm-card-pad" style={{ paddingBottom: 0 }}>
            پترن پیامک «کد تخفیف بازگشت» هنوز روی سرور تنظیم نشده؛ کد ساخته می‌شود ولی پیامک نمی‌رود (docs/sms-patterns.md).
          </p>
        ) : null}
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>مشتری</th>
                <th>وضعیت</th>
                <th>چه شده</th>
                <th>مجموع خرید</th>
                <th>آخرین پیام</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {queue.length ? (
                queue.map((q) => (
                  <tr key={q.phone}>
                    <td>
                      <button type="button" className="adm-ins-link" onClick={() => onOpenCustomer(q.phone)}>
                        <span className="adm-cell-main">{q.name}</span>
                        <span className="adm-cell-sub" dir="ltr">
                          {q.phone}
                        </span>
                      </button>
                    </td>
                    <td>
                      <SegmentPill segment={q.segment} />
                    </td>
                    <td className="adm-ins-reason">{q.alert.message}</td>
                    <td className="amount">{fmtPrice(q.spent)}</td>
                    <td className="adm-cell-sub">
                      {q.lastContact ? `${KIND_LABEL[q.lastContact.kind]} · ${faShort(q.lastContact.createdAt)}` : "—"}
                    </td>
                    <td>
                      {canNudge ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setNudge({ phone: q.phone, name: q.name, alert: q.alert })}>
                          <Icon name="send" /> پیام
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow
                  colSpan={6}
                  icon="check"
                  text={data ? (filter === "ready" ? "فعلا کسی منتظر پیام نیست — همه طبق روال خرید می‌کنند" : "موردی نیست") : "در حال تحلیل سفارش‌ها…"}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>مشتری‌ها در یک نگاه</h3>
              <div className="sub">دسته‌بندی بر اساس روال خرید هر نفر</div>
            </div>
          </div>
          <div style={{ paddingBlock: 6 }}>
            {SEG_ORDER.map((s) => (
              <div className="adm-bar-row" key={s} title={SEGMENT_HINT[s]}>
                <span className="lbl">
                  <span className="adm-swatch" style={{ background: SEG_COLOR[s] }} />
                  {SEGMENT_LABEL[s]}
                </span>
                <div className="adm-bar-track">
                  <div className="adm-bar-fill" style={{ width: `${Math.round(((data?.segments[s].count || 0) / segMax) * 100)}%`, background: SEG_COLOR[s] }} />
                </div>
                <span className="amt">{faNum.format(data?.segments[s].count || 0)} نفر</span>
              </div>
            ))}
          </div>
          <p className="hint adm-card-pad" style={{ paddingTop: 0 }}>
            «در خطر رفتن» یعنی از فاصلهٔ همیشگی خریدش عقب افتاده — بهترین زمان برای پیام. «از دست رفته» بیش از سه برابر روال همیشه خرید نکرده.
          </p>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>روزهای پرفروش هفته</h3>
              <div className="sub">همهٔ سفارش‌ها، بر اساس روز تحویل</div>
            </div>
          </div>
          <div style={{ paddingBlock: 6 }}>
            {WEEKDAYS_FA.map((d, idx) => (
              <div className="adm-bar-row" key={d}>
                <span className="lbl">{d}</span>
                <div className="adm-bar-track">
                  <div className="adm-bar-fill" style={{ width: `${Math.round(((data?.weekday[idx].orders || 0) / wdMax) * 100)}%`, background: "#2a78d6" }} />
                </div>
                <span className="amt">{faNum.format(data?.weekday[idx].orders || 0)} سفارش</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>فروش ماه به ماه</h3>
              <div className="sub">۱۲ ماه اخیر — تومان</div>
            </div>
          </div>
          {data ? (
            <RevenueChart data={data.monthly.map((m) => m.revenue)} labels={data.monthly.map((m) => `${m.label} (${faNum.format(m.orders)} سفارش)`)} height={190} />
          ) : null}
          <div className="adm-card-pad" style={{ paddingTop: 8 }}>
            <div className="adm-cell-sub" style={{ marginBottom: 8 }}>
              مشتری تازه در برابر مشتری برگشتی، هر ماه
            </div>
            {(data?.monthly || []).slice(-6).map((m) => {
              const tot = m.newCustomers + m.returning;
              return (
                <div className="adm-bar-row" key={m.key} style={{ paddingInline: 0 }}>
                  <span className="lbl">{m.label}</span>
                  <div className="adm-bar-track adm-ins-stack" style={{ width: `${Math.round((tot / nrMax) * 100)}%` }}>
                    <div className="adm-bar-fill" style={{ width: tot ? `${(m.returning / tot) * 100}%` : 0, background: "#1baf7a" }} />
                    <div className="adm-bar-fill" style={{ width: tot ? `${(m.newCustomers / tot) * 100}%` : 0, background: "#4a3aa7" }} />
                  </div>
                  <span className="amt">
                    {faNum.format(m.returning)} + {faNum.format(m.newCustomers)}
                  </span>
                </div>
              );
            })}
            <p className="hint adm-ins-legend" style={{ marginTop: 6 }}>
              <span className="adm-swatch" style={{ background: "#1baf7a" }} /> برگشتی &nbsp; <span className="adm-swatch" style={{ background: "#4a3aa7" }} /> تازه
            </p>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>محصولاتی که مشتری را برمی‌گردانند</h3>
              <div className="sub">«عادت» = مشتری‌هایی که دست‌کم {faNum.format(settings.habitMinOrders)} بار همین را خریده‌اند</div>
            </div>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>محصول</th>
                  <th>مشتری</th>
                  <th>عادت</th>
                  <th>درآمد</th>
                </tr>
              </thead>
              <tbody>
                {data?.topProducts.length ? (
                  data.topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td className="adm-cell-main">{p.name}</td>
                      <td className="amount">{faNum.format(p.customers)}</td>
                      <td className="amount">{faNum.format(p.habitual)}</td>
                      <td className="amount">{fmtPrice(p.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={4} text={data ? "هنوز فروشی ثبت نشده" : "در حال خواندن…"} icon="box" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>باارزش‌ترین مشتری‌ها</h3>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>مشتری</th>
                  <th>سفارش</th>
                  <th>مجموع</th>
                  <th>آخرین خرید</th>
                </tr>
              </thead>
              <tbody>
                {data?.topCustomers.length ? (
                  data.topCustomers.map((c) => (
                    <tr key={c.phone} className="clickable" onClick={() => onOpenCustomer(c.phone)}>
                      <td>
                        <div className="adm-cell-main">{c.name}</div>
                        <SegmentPill segment={c.segment} />
                      </td>
                      <td className="amount">{faNum.format(c.orders)}</td>
                      <td className="amount">{fmtPrice(c.spent)}</td>
                      <td className="adm-cell-sub">{fmtDays(c.daysSince)} پیش</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={4} text={data ? "هنوز مشتری‌ای نیست" : "در حال خواندن…"} icon="users" />
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>اثر پیام‌ها</h3>
              <div className="sub">۳۰ روز اخیر — «خرید کرد» یعنی تا ۳۰ روز بعد از پیام سفارش داده</div>
            </div>
            <b className="amount">{data ? `${faNum.format(convRate)}٪` : "—"}</b>
          </div>
          <div className="adm-card-pad">
            <p className="adm-cell-sub" style={{ marginBottom: 10 }}>
              {data ? `${faNum.format(data.contacts.total30)} پیام، ${faNum.format(data.contacts.converted30)} خرید بعدش` : ""}
            </p>
            {data?.contacts.recent.length ? (
              data.contacts.recent.slice(0, 10).map((c) => (
                <div className="adm-item-line" key={c.phone + c.createdAt}>
                  <span>
                    <button type="button" className="adm-ins-link" onClick={() => onOpenCustomer(c.phone)}>
                      <b>{c.name || c.phone}</b>
                    </button>
                    <span className="adm-cell-sub" style={{ display: "block" }}>
                      {KIND_LABEL[c.kind]}
                      {c.productName ? ` — ${c.productName}` : ""} · {faShort(c.createdAt)}
                      {c.kind !== "call" && !c.sent ? " · پیامک نرفت" : ""}
                    </span>
                  </span>
                  {c.converted ? <span className="adm-pill adm-pill-done">خرید کرد</span> : <span className="adm-pill adm-pill-wait">هنوز نه</span>}
                </div>
              ))
            ) : (
              <p className="hint">هنوز پیامی فرستاده نشده</p>
            )}
          </div>
        </div>
      </div>

      <div className="adm-card adm-card-pad">
        <h3 style={{ marginBottom: 4, fontSize: "0.92rem" }}>قواعد تشخیص</h3>
        <p className="hint" style={{ marginBottom: 14 }}>
          مثال با مقادیر فعلی: کسی که معمولاً هر ۷ روز جوجه می‌خرد، اگر {faNum.format(Math.max(Math.round(7 * draft.lateFactor), 7 + draft.minLateDays))} روز
          نخرد در این فهرست می‌آید.
        </p>
        <form
          className="form-grid cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSaveSettings(draft);
            load();
          }}
        >
          <NumField id="is-habit" label="از چند خرید «عادت» حساب شود" value={draft.habitMinOrders} onChange={(v) => setDraft({ ...draft, habitMinOrders: v })} disabled={!canSettings} />
          <NumField id="is-factor" label="ضریب دیرکرد (× فاصلهٔ معمول)" value={draft.lateFactor} step onChange={(v) => setDraft({ ...draft, lateFactor: v })} disabled={!canSettings} />
          <NumField id="is-min" label="دست‌کم چند روز بیشتر از معمول" value={draft.minLateDays} onChange={(v) => setDraft({ ...draft, minLateDays: v })} disabled={!canSettings} />
          <NumField id="is-cool" label="فاصلهٔ بین دو پیام به یک نفر (روز)" value={draft.cooldownDays} onChange={(v) => setDraft({ ...draft, cooldownDays: v })} disabled={!canSettings} />
          <NumField id="is-pct" label="درصد پیش‌فرض کد بازگشت" value={draft.defaultPercent} onChange={(v) => setDraft({ ...draft, defaultPercent: v })} disabled={!canSettings} />
          <NumField id="is-days" label="اعتبار پیش‌فرض کد (روز)" value={draft.defaultValidDays} onChange={(v) => setDraft({ ...draft, defaultValidDays: v })} disabled={!canSettings} />
          {canSettings ? (
            <button type="submit" className="btn btn-primary">
              ذخیرهٔ قواعد
            </button>
          ) : (
            <p className="hint">فقط مشاهده — تغییر قواعد با مالک فروشگاه است.</p>
          )}
        </form>
      </div>

      {nudge && data ? (
        <NudgeDialog
          target={nudge}
          defaults={{ percent: settings.defaultPercent, validDays: settings.defaultValidDays }}
          smsReady={data.smsReady}
          onClose={() => setNudge(null)}
          onSent={() => {
            toast("در سوابق مشتری ثبت شد");
            load();
          }}
        />
      ) : null}
    </div>
  );
}


export function NumField({
  id,
  label,
  value,
  onChange,
  disabled,
  step,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  step?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        dir="ltr"
        type="number"
        inputMode={step ? "decimal" : "numeric"}
        step={step ? 0.1 : 1}
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
