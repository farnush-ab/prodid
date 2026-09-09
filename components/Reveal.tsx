"use client";

/* ---------------- انیمیشن ورود هنگام اسکرول ----------------
   معادل reveal/observeReveals/staggerReveal در app.js.
   کلاس reveal باید مستقیما روی خودِ المان (نه یک wrapper) باشد
   تا transform/opacity درست اعمال شود؛ برای همین به‌صورت هوک
   ارائه می‌شود تا هر کامپوننت روی ریشه خودش استفاده کند. */
import { useEffect, useRef, useState } from "react";

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, revealClass: `reveal${inView ? " in" : ""}` };
}

/** تاخیر پلکانی برای فرزندان یک گرید (معادل staggerReveal) */
export function staggerDelay(index: number) {
  return Math.min(index * 60, 360);
}
