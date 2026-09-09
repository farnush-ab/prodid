"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { pageHref } from "@/lib/page";
import { toFa } from "@/lib/format";
import { Profile } from "@/lib/profile";
import { toast } from "@/lib/toast";
import { toEnDigits } from "@/lib/phone";

const RESEND_SEC = 60;

async function syncLocalProfile() {
  const local = Profile.read();
  const meRes = await fetch("/api/me").catch(() => null);
  const me = meRes && meRes.ok ? await meRes.json() : {};
  const patch: { name?: string; address?: string } = {};
  if (!me.name && local.name) patch.name = local.name;
  if (!me.address && local.address) patch.address = local.address;
  if (patch.name || patch.address) {
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }
}

export function LoginPanel({
  embedded = false,
  initialPhone = "",
  redirectTo,
  onSuccess,
}: {
  embedded?: boolean;
  initialPhone?: string;
  redirectTo?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { update } = useSession();
  const idPrefix = embedded ? "modal-" : "";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const verifying = useRef(false);

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "ارسال کد با خطا مواجه شد");
        if (typeof data.wait === "number") setWait(data.wait);
        return;
      }
      setStep("otp");
      setCode("");
      setWait(RESEND_SEC);
      toast("کد تایید در کنسول سرور ثبت شد");
    } catch {
      toast("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e?: React.FormEvent, raw?: string) {
    e?.preventDefault();
    if (verifying.current || busy) return;
    const otp = toEnDigits(raw ?? code).replace(/\D/g, "");
    if (otp.length !== 6) {
      toast("کد تایید ۶ رقمی را وارد کنید");
      return;
    }
    verifying.current = true;
    setBusy(true);
    try {
      const res = await signIn("phone-otp", { phone, code: otp, redirect: false });
      if (!res?.ok) {
        toast("کد تایید نادرست یا منقضی شده است");
        return;
      }
      await syncLocalProfile();
      await update();
      toast("با موفقیت وارد شدید");
      if (onSuccess) {
        onSuccess();
        return;
      }
      router.push(redirectTo || pageHref("account"));
      router.refresh();
    } catch {
      toast("ورود انجام نشد");
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  }

  const inner = (
    <>
      {step === "phone" ? (
        <div className={embedded ? "" : "form-card"}>
          <h3>
            <span className="step-num">۱</span> شماره موبایل
          </h3>
          <form className="form-grid" onSubmit={requestCode} noValidate>
            <div>
              <label htmlFor={`${idPrefix}login-phone`}>شماره موبایل</label>
              <input
                id={`${idPrefix}login-phone`}
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0913xxxxxxx"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              <Icon name="chat" /> {busy ? "در حال ارسال…" : "دریافت کد تایید"}
            </button>
          </form>
          <p className="muted mt-2">اولین ورود، حساب شما را می‌سازد. ثبت‌نام جدا لازم نیست.</p>
        </div>
      ) : (
        <div className={embedded ? "" : "form-card"}>
          <h3>
            <span className="step-num">۲</span> کد تایید
          </h3>
          <p className="muted mb-2">
            کد ۶ رقمی برای شماره <b className="num">{toFa(phone)}</b> صادر شد.
          </p>
          <form className="form-grid" onSubmit={verifyCode} noValidate>
            <div>
              <label htmlFor={`${idPrefix}login-otp`}>کد تایید</label>
              <input
                id={`${idPrefix}login-otp`}
                className="otp-field"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const next = toEnDigits(e.target.value).replace(/\D/g, "").slice(0, 6);
                  setCode(next);
                  if (next.length === 6) void verifyCode(undefined, next);
                }}
                placeholder="------"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
              <Icon name="check" /> {busy ? "در حال ورود…" : "ورود"}
            </button>
          </form>
          <div className="auth-actions">
            <button type="button" className="section-link" disabled={busy || wait > 0} onClick={() => requestCode()}>
              {wait > 0 ? `ارسال مجدد (${toFa(wait)})` : "ارسال مجدد کد"}
            </button>
            <button
              type="button"
              className="section-link"
              onClick={() => {
                setStep("phone");
                setCode("");
              }}
            >
              تغییر شماره
            </button>
          </div>
          <p className="muted mt-2">فعلا پیامک ارسال نمی‌شود؛ کد در کنسول سرور (ترمینال Next.js) چاپ می‌شود.</p>
        </div>
      )}

      <p className="text-center muted mt-2">
        با ورود،{" "}
        <Link href={pageHref("terms")} style={{ color: "var(--wine)" }}>
          <b>قوانین فروشگاه</b>
        </Link>{" "}
        را می‌پذیرید.
      </p>
    </>
  );

  if (embedded) return inner;
  return <div className="auth-wrap">{inner}</div>;
}
