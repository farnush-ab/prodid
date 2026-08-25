"use client";

/* ---------------- افکت سه‌بعدی (تیلت با موس) ----------------
   معادل init3D() در app.js */
import { useEffect } from "react";

export function TiltProvider() {
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const MAX = 7; // حداکثر زاویه چرخش (درجه)

    function onMove(e: PointerEvent) {
      const el = (e.target as HTMLElement)?.closest?.(".tilt") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      el.style.transition = "transform 0.08s linear";
      el.style.transform =
        `perspective(900px) rotateX(${((0.5 - py) * MAX).toFixed(2)}deg)` +
        ` rotateY(${((px - 0.5) * MAX).toFixed(2)}deg) translateY(-4px)`;
    }
    function onOut(e: PointerEvent) {
      const el = (e.target as HTMLElement)?.closest?.(".tilt") as HTMLElement | null;
      if (el && !el.contains(e.relatedTarget as Node)) {
        el.style.transition = "";
        el.style.transform = "";
      }
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onOut);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
