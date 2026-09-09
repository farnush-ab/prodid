"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";

export function AppModal({
  title,
  subtitle,
  icon = "user",
  wide,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      className={`app-overlay${show ? " show" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`app-modal${wide ? " wide" : ""}`} role="document">
        <button type="button" className="vpn-close" aria-label="بستن" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="app-modal-head">
          <span className="vpn-ico">
            <Icon name={icon} />
          </span>
          <h3 id="app-modal-title">{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
