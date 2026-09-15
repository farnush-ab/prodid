"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";

/* اشتراک‌گذاری صفحه لینک‌ها؛ روی موبایل شیت اشتراک‌گذاری سیستم باز می‌شود
   و در غیر این صورت آدرس در کلیپ‌بورد کپی می‌شود. */
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "پرودید | همه لینک‌ها", url });
        return;
      } catch {
        /* کاربر اشتراک‌گذاری را لغو کرد — به کپی‌کردن برمی‌گردیم */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="lnk-share" onClick={share}>
      <Icon name={copied ? "check" : "send"} />
      {copied ? "آدرس کپی شد" : "اشتراک‌گذاری این صفحه"}
    </button>
  );
}
