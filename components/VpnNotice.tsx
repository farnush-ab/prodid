"use client";

/* ---------------- اطلاعیه خاموش‌کردن VPN ----------------
   معادل showVpnNotice() در app.js */
import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { useCatalog } from "@/lib/catalog-store";

const VPN_NOTICE_KEY = "prodid_vpn_notice";

export function VpnNotice() {
  const { features } = useCatalog();
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!features.vpnNotice) return;
    try {
      if (sessionStorage.getItem(VPN_NOTICE_KEY)) return;
    } catch {
      /* noop */
    }
    setVisible(true);
    const raf = requestAnimationFrame(() => setShow(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [features.vpnNotice]);

  function close() {
    try {
      sessionStorage.setItem(VPN_NOTICE_KEY, "1");
    } catch {
      /* noop */
    }
    setShow(false);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible || !features.vpnNotice) return null;

  return (
    <div
      className={`vpn-overlay${show ? " show" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vpn-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="vpn-card" role="document">
        <button type="button" className="vpn-close" aria-label="بستن" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="vpn-ico">
          <Icon name="wifi" />
        </span>
        <h3 id="vpn-title">لطفاً VPN خود را خاموش کنید</h3>
        <p>
          برای تجربه‌ای روان‌تر و بارگذاری سریع‌تر سایت، پیشنهاد می‌کنیم فیلترشکن (VPN) خود را موقتاً خاموش کنید.
        </p>
        <button type="button" className="btn btn-primary btn-block vpn-ok" onClick={close}>
          <Icon name="check" /> متوجه شدم
        </button>
      </div>
    </div>
  );
}
