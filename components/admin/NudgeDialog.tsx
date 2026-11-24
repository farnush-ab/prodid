"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { toFa } from "@/lib/format";
import { toast } from "@/lib/toast";
import { adminFetch } from "@/lib/admin-client";
import { AppModal } from "@/components/AppModal";
import type { ContactRecord, InsightAlert } from "@/lib/insights";

export interface NudgeTarget {
  phone: string;
  name: string;
  alert?: InsightAlert | null;
}

/**
 * پیام بازگشت به یک مشتری: کد تخفیف شخصی + پیامک، یا یادآوری ساده،
 * یا فقط ثبت «تماس گرفتم». هیچ پیامی بدون زدن دکمه توسط مدیر نمی‌رود.
 */
export function NudgeDialog({
  target,
  defaults,
  smsReady,
  onClose,
  onSent,
}: {
  target: NudgeTarget;
  defaults: { percent: number; validDays: number };
  smsReady: { winback: boolean; reminder: boolean };
  onClose: () => void;
  onSent: (contact: ContactRecord) => void;
}) {
  const [kind, setKind] = useState<"winback" | "reminder" | "call">("winback");
  const [percent, setPercent] = useState(String(defaults.percent));
  const [validDays, setValidDays] = useState(String(defaults.validDays));
  const [productName, setProductName] = useState(target.alert?.productName || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = kind === "call" || (kind === "winback" ? smsReady.winback : smsReady.reminder);
  const first = target.name && target.name !== "بدون نام" ? target.name : "مشتری عزیز";
  const preview =
    kind === "winback"
      ? `${first}، دلمان برایتان تنگ شده! ${productName ? `«${productName}» ` : ""}با ${toFa(percent || "0")}٪ تخفیف با کد ••••• تا ${toFa(validDays || "0")} روز — پرودید`
      : kind === "reminder"
        ? `${first}، مدتی است از پرودید${productName ? ` «${productName}»` : ""} سفارش نداده‌اید. اگر مشکلی بوده خوشحال می‌شویم بشنویم — پرودید`
        : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const data = await adminFetch<{ contact: ContactRecord; sent: boolean; reason?: string; code?: string }>(
        `/api/admin/customers/${encodeURIComponent(target.phone)}/nudge`,
        {
          method: "POST",
          body: JSON.stringify({
            kind,
            productId: target.alert?.productId || "",
            productName,
            percent: Number(percent),
            validDays: Number(validDays),
            note,
          }),
        }
      );
      if (kind === "call") toast("تماس ثبت شد");
      else if (data.sent) toast(data.code ? `پیامک با کد ${data.code} فرستاده شد` : "پیامک یادآوری فرستاده شد");
      else toast(`${data.code ? `کد ${data.code} ساخته شد ولی ` : ""}پیامک نرفت: ${data.reason || "خطا"}`);
      onSent(data.contact);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "ارسال انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal title={`پیام به ${target.name || target.phone}`} subtitle={target.alert?.message || target.phone} icon="send" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="adm-chips" role="radiogroup" aria-label="نوع پیام">
          {(
            [
              ["winback", "کد تخفیف شخصی"],
              ["reminder", "پیامک یادآوری"],
              ["call", "ثبت تماس تلفنی"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={kind === id} className={`adm-chip${kind === id ? " active" : ""}`} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="nd-product">محصول مورد نظر</label>
          <input id="nd-product" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="مثلا جوجه زعفرانی (اختیاری)" />
          <span className="hint">در متن پیامک می‌آید. خالی بماند پیام کلی است.</span>
        </div>

        {kind === "winback" ? (
          <div className="form-grid cols-2">
            <div>
              <label htmlFor="nd-pct">درصد تخفیف</label>
              <input id="nd-pct" dir="ltr" inputMode="numeric" value={percent} onChange={(e) => setPercent(e.target.value.replace(/[^\d۰-۹]/g, ""))} />
            </div>
            <div>
              <label htmlFor="nd-days">اعتبار (روز)</label>
              <input id="nd-days" dir="ltr" inputMode="numeric" value={validDays} onChange={(e) => setValidDays(e.target.value.replace(/[^\d۰-۹]/g, ""))} />
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="nd-note">یادداشت داخلی</label>
          <input id="nd-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "call" ? "مثلا: گفت این ماه سفر بوده" : "اختیاری"} />
        </div>

        {preview ? (
          <div className="adm-ins-preview">
            <span className="hint">پیش‌نمایش تقریبی (متن دقیق همان پترن ثبت‌شده در پنل پیامک است)</span>
            <p>{preview}</p>
          </div>
        ) : null}

        {!ready ? (
          <p className="min-order-warn">
            پترن این پیامک روی سرور تنظیم نشده؛ {kind === "winback" ? "کد تخفیف ساخته و ثبت می‌شود ولی پیامک نمی‌رود." : "فقط در سوابق ثبت می‌شود."} راهنما: docs/sms-patterns.md
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Icon name={kind === "call" ? "phone" : "send"} />{" "}
          {busy ? "در حال ارسال…" : kind === "winback" ? "ساخت کد و ارسال پیامک" : kind === "reminder" ? "ارسال یادآوری" : "ثبت تماس"}
        </button>
      </form>
    </AppModal>
  );
}
