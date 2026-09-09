"use client";

import { useState } from "react";
import { faNum } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { OtpLogEntry } from "@/lib/admin-data";
import { OTP_DEFAULTS } from "@/lib/admin-data";

const RESULT_PILL: Record<OtpLogEntry["result"], string> = {
  ok: "adm-pill-done",
  blocked: "adm-pill-danger",
  expired: "adm-pill-wait",
};
const RESULT_LABEL: Record<OtpLogEntry["result"], string> = {
  ok: "ارسال موفق",
  blocked: "مسدود شد",
  expired: "منقضی شد",
};

export function SecurityView({
  log,
  blocked,
  onAddBlocked,
  onRemoveBlocked,
}: {
  log: OtpLogEntry[];
  blocked: string[];
  onAddBlocked: (phone: string) => void;
  onRemoveBlocked: (index: number) => void;
}) {
  const [settings, setSettings] = useState({
    ttlMinutes: String(OTP_DEFAULTS.ttlMinutes),
    resendSeconds: String(OTP_DEFAULTS.resendSeconds),
    windowHours: String(OTP_DEFAULTS.windowHours),
    maxSends: String(OTP_DEFAULTS.maxSends),
    maxAttempts: String(OTP_DEFAULTS.maxAttempts),
  });
  const [logSearch, setLogSearch] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  const filteredLog = log.filter((r) => !logSearch.trim() || r.phone.includes(logSearch.trim()));

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>ورود و OTP</h1>
          <p>تنظیمات کد یک‌بارمصرف پیامکی و بررسی رفتار مشکوک ورود</p>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>محدودیت‌های ارسال کد</h3>
          </div>
          <form
            className="form-grid cols-2"
            style={{ padding: 18 }}
            onSubmit={(e) => {
              e.preventDefault();
              toast("تنظیمات OTP ذخیره شد");
            }}
          >
            <div>
              <label htmlFor="otp-ttl">اعتبار کد (دقیقه)</label>
              <input id="otp-ttl" dir="ltr" value={settings.ttlMinutes} onChange={(e) => setSettings({ ...settings, ttlMinutes: e.target.value })} />
            </div>
            <div>
              <label htmlFor="otp-resend">فاصله ارسال مجدد (ثانیه)</label>
              <input id="otp-resend" dir="ltr" value={settings.resendSeconds} onChange={(e) => setSettings({ ...settings, resendSeconds: e.target.value })} />
            </div>
            <div>
              <label htmlFor="otp-window">بازه شمارش درخواست‌ها (ساعت)</label>
              <input id="otp-window" dir="ltr" value={settings.windowHours} onChange={(e) => setSettings({ ...settings, windowHours: e.target.value })} />
            </div>
            <div>
              <label htmlFor="otp-sends">حداکثر ارسال در بازه</label>
              <input id="otp-sends" dir="ltr" value={settings.maxSends} onChange={(e) => setSettings({ ...settings, maxSends: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="otp-attempts">حداکثر تلاش اشتباه کد</label>
              <input id="otp-attempts" dir="ltr" style={{ maxWidth: 140 }} value={settings.maxAttempts} onChange={(e) => setSettings({ ...settings, maxAttempts: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn btn-primary btn-sm">
                ذخیره تنظیمات
              </button>
            </div>
          </form>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h3>شماره‌های مسدود</h3>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "18px 18px 10px" }}>
            <input type="text" dir="ltr" placeholder="09xxxxxxxxx" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} style={{ flex: 1 }} />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                if (!/^09\d{9}$/.test(phoneInput)) {
                  toast("شماره موبایل معتبر نیست");
                  return;
                }
                onAddBlocked(phoneInput);
                setPhoneInput("");
              }}
            >
              مسدود کن
            </button>
          </div>
          {blocked.length ? (
            blocked.map((p, i) => (
              <div className="adm-item-line" style={{ padding: "9px 18px" }} key={p}>
                <span dir="ltr">{p}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRemoveBlocked(i)}>
                  رفع مسدودی
                </button>
              </div>
            ))
          ) : (
            <p className="hint" style={{ padding: 18 }}>
              شماره مسدودی وجود ندارد
            </p>
          )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <h3>گزارش درخواست‌های کد</h3>
            <div className="sub">۲۴ ساعت اخیر</div>
          </div>
          <input type="text" placeholder="جستجوی شماره موبایل…" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} style={{ width: 220 }} />
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>موبایل</th>
                <th>زمان درخواست</th>
                <th>تلاش‌ها</th>
                <th>نتیجه</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.map((r, i) => (
                <tr key={i}>
                  <td dir="ltr">{r.phone}</td>
                  <td>{r.time}</td>
                  <td>{faNum.format(r.attempts)}</td>
                  <td>
                    <span className={`adm-pill ${RESULT_PILL[r.result]}`}>
                      <span className="dot" />
                      {RESULT_LABEL[r.result]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
