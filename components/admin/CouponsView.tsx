"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { faNum, toFa } from "@/lib/format";
import {
  COUPON_KIND_LABEL,
  DEFAULT_LOYALTY_MIN_ORDERS,
  type CouponKind,
  type CouponRecord,
} from "@/lib/coupon";
import { AppModal } from "@/components/AppModal";
import { EmptyRow } from "./shared";

function expiresLabel(iso: string | null) {
  if (!iso) return "بدون انقضا";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR");
}

function emptyDraft(): Omit<CouponRecord, "usageCount" | "createdAt"> {
  return {
    code: "",
    percent: 10,
    kind: "public",
    expiresAt: null,
    minOrders: DEFAULT_LOYALTY_MIN_ORDERS,
    active: true,
    note: "",
  };
}

export function CouponsView({
  coupons,
  canEdit = true,
  onSave,
  onDelete,
  onToggleActive,
}: {
  coupons: CouponRecord[];
  canEdit?: boolean;
  onSave: (coupon: CouponRecord, isNew: boolean) => void | Promise<void>;
  onDelete: (code: string) => void;
  onToggleActive: (code: string, active: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<CouponKind | "all">("all");
  const [editing, setEditing] = useState<CouponRecord | "new" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (kindFilter !== "all" && c.kind !== kindFilter) return false;
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || c.note.toLowerCase().includes(q);
    });
  }, [coupons, search, kindFilter]);

  function openNew() {
    setDraft(emptyDraft());
    setEditing("new");
  }

  function openEdit(c: CouponRecord) {
    setDraft({
      code: c.code,
      percent: c.percent,
      kind: c.kind,
      expiresAt: c.expiresAt,
      minOrders: c.minOrders,
      active: c.active,
      note: c.note,
    });
    setEditing(c);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const isNew = editing === "new";
    const existing = isNew ? null : editing;
    await onSave(
      {
        code: existing ? existing.code : draft.code,
        percent: draft.percent,
        kind: draft.kind,
        expiresAt: draft.expiresAt,
        minOrders: draft.minOrders,
        active: draft.active,
        note: draft.note,
        usageCount: existing?.usageCount ?? 0,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      },
      isNew
    );
    setEditing(null);
  }

  const expireInput =
    draft.expiresAt && /^\d{4}-\d{2}-\d{2}/.test(draft.expiresAt) ? draft.expiresAt.slice(0, 10) : draft.expiresAt ? new Date(draft.expiresAt).toISOString().slice(0, 10) : "";

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>تخفیف‌ها</h1>
          <p>کدهای عمومی، مشتری ثابت و هدیه تولد — همان فیلدهای code، percent و expiresAt</p>
        </div>
        {canEdit ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
            <Icon name="plus" /> کد جدید
          </button>
        ) : null}
      </div>

      <div className="adm-card">
        <div className="adm-toolbar">
          <div className="grow">
            <input type="text" placeholder="جستجو با کد یا توضیح…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as CouponKind | "all")}>
            <option value="all">همه انواع</option>
            <option value="public">{COUPON_KIND_LABEL.public}</option>
            <option value="loyalty">{COUPON_KIND_LABEL.loyalty}</option>
            <option value="birthday">{COUPON_KIND_LABEL.birthday}</option>
          </select>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>کد</th>
                <th>نوع</th>
                <th>درصد</th>
                <th>انقضا</th>
                <th>استفاده</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((c) => (
                  <tr key={c.code} className="clickable" onClick={() => openEdit(c)}>
                    <td className="adm-cell-main" dir="ltr" style={{ textAlign: "right" }}>
                      {c.code}
                    </td>
                    <td>{COUPON_KIND_LABEL[c.kind]}</td>
                    <td className="amount">{faNum.format(c.percent)}٪</td>
                    <td>{expiresLabel(c.expiresAt)}</td>
                    <td className="amount">{faNum.format(c.usageCount)}</td>
                    <td>
                      {c.active ? <span className="adm-pill adm-pill-done">فعال</span> : <span className="adm-pill adm-pill-danger">خاموش</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={6} text="کد تخفیفی ثبت نشده" />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <AppModal
          title={editing === "new" ? "کد تخفیف جدید" : "ویرایش کد تخفیف"}
          subtitle={editing === "new" ? "پس از ثبت، کد را در پیامک یا تسویه استفاده کنید" : editing.code}
          icon="award"
          onClose={() => setEditing(null)}
        >
          <form className="form-grid" onSubmit={submit}>
            <div>
              <label htmlFor="cp-code">کد (code)</label>
              <input
                id="cp-code"
                dir="ltr"
                value={draft.code}
                disabled={editing !== "new"}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="مثلا SAVE10"
                required
              />
            </div>
            <div className="form-grid cols-2">
              <div>
                <label htmlFor="cp-percent">درصد (percent)</label>
                <input
                  id="cp-percent"
                  dir="ltr"
                  inputMode="numeric"
                  value={draft.percent}
                  onChange={(e) => setDraft({ ...draft, percent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label htmlFor="cp-kind">نوع</label>
                <select id="cp-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CouponKind })}>
                  <option value="public">{COUPON_KIND_LABEL.public}</option>
                  <option value="loyalty">{COUPON_KIND_LABEL.loyalty}</option>
                  <option value="birthday">{COUPON_KIND_LABEL.birthday}</option>
                </select>
              </div>
            </div>
            {draft.kind === "loyalty" ? (
              <div>
                <label htmlFor="cp-min">حداقل سفارش تاییدشده (minOrders)</label>
                <input
                  id="cp-min"
                  dir="ltr"
                  inputMode="numeric"
                  value={draft.minOrders}
                  onChange={(e) => setDraft({ ...draft, minOrders: Number(e.target.value) || 0 })}
                />
              </div>
            ) : null}
            <div>
              <label htmlFor="cp-exp">تاریخ انقضا (expiresAt)</label>
              <input id="cp-exp" type="date" dir="ltr" value={expireInput} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || null })} />
              <span className="hint">خالی = بدون انقضا. اعتبار تا پایان همان روز به وقت ایران است.</span>
            </div>
            <div>
              <label htmlFor="cp-note">توضیح داخلی</label>
              <input id="cp-note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="مثلا کمپین عید" />
            </div>
            <label className="acc-setting-row" style={{ padding: 0 }}>
              <div>
                <b>فعال</b>
                <span className="hint">کدهای خاموش در تسویه پذیرفته نمی‌شوند</span>
              </div>
              <span className="acc-switch">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                <span className="track" />
                <span className="thumb" />
              </span>
            </label>
            {canEdit ? (
              <div className="form-grid cols-2">
                <button type="submit" className="btn btn-primary">
                  ذخیره
                </button>
                {editing !== "new" ? (
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => {
                      if (confirm("این کد حذف شود؟")) onDelete(editing.code);
                      setEditing(null);
                    }}
                  >
                    حذف
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="hint">فقط مشاهده — برای ویرایش به مالک یا مدیر سفارش نیاز است.</p>
            )}
          </form>
          {editing !== "new" && canEdit ? (
            <p className="hint" style={{ marginTop: 12 }}>
              وضعیت فعلی: {draft.active ? "فعال" : "خاموش"} — برای تغییر سریع از جدول، روی ردیف بزنید. استفاده: {toFa(editing.usageCount)}
              {" · "}
              <button type="button" className="section-link" style={{ marginTop: 0, display: "inline" }} onClick={() => onToggleActive(editing.code, !editing.active)}>
                {editing.active ? "خاموش کردن" : "روشن کردن"}
              </button>
            </p>
          ) : null}
        </AppModal>
      ) : null}
    </div>
  );
}
