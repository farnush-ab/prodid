"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { faNum } from "@/lib/format";
import { pageHref } from "@/lib/page";
import { useReveal } from "@/components/Reveal";
import { saladBowlSvg } from "@/lib/salad-art";
import { SALAD_INGREDIENTS, SALAD_PRESETS, SALAD_SIZES, saladCalc } from "@/lib/salad";

/* هر چند ثانیه یک سالاد دیگر در کاسه ساخته می‌شود تا کاربر تنوع را ببیند
   و کاسه «زنده» به نظر برسد. با prefers-reduced-motion فقط اولی می‌ماند. */
const ROTATE_MS = 3400;

export function SaladTeaser() {
  const box = useReveal<HTMLDivElement>();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % SALAD_PRESETS.length), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const preset = SALAD_PRESETS[i];
  const bowl = useMemo(() => {
    const calc = saladCalc(preset.items, preset.sauces, preset.size);
    const cap = SALAD_SIZES.find((s) => s.id === preset.size)?.cap || 550;
    return saladBowlSvg(preset.items, preset.sauces, Math.min(1, calc.weight / cap), { simple: true });
  }, [preset]);

  const cheapest = useMemo(() => Math.min(...SALAD_SIZES.map((s) => s.base)), []);

  return (
    <div className="container">
      <section ref={box.ref} className={`sbt ${box.revealClass}`} aria-labelledby="sbt-title">
        <div className="sbt-copy">
          <span className="sbt-eyebrow">
            <Icon name="leaf" className="ico" /> تازه در پرودید
          </span>
          <h2 id="sbt-title">
            سالادت را <em>خودت</em> بچین
          </h2>
          <p>
            کاهو تا مرغ گریل، ذرت تا فتا — هر مادهٔ تازه‌ای که دوست داری، هر مقدار که دوست داری. همان لحظه می‌بینی
            کاسه‌ات دارد چه شکلی می‌شود. نه بیشتر، نه کمتر؛ دقیقا همان سالادی که می‌خواستی.
          </p>
          <div className="sbt-marks">
            <span>
              <Icon name="leaf" className="ico" /> {faNum.format(SALAD_INGREDIENTS.length)} مادهٔ تازه
            </span>
            <span>
              <Icon name="scale" className="ico" /> مقدارش با خودت
            </span>
            <span>
              <Icon name="clock" className="ico" /> آماده در ۸ دقیقه
            </span>
          </div>
          <div className="sbt-cta">
            <Link className="btn btn-primary" href={pageHref("salad-bar")}>
              بزن بریم سالاد بار <Icon name="arrow" />
            </Link>
            <span className="sbt-from">
              از {faNum.format(cheapest)} تومان
              <i>+ هر ماده جداگانه</i>
            </span>
          </div>
        </div>

        <div className="sbt-art" aria-hidden="true">
          <Link href={pageHref("salad-bar")} className="sbt-bowl" tabIndex={-1} aria-hidden="true">
            <span key={preset.n} dangerouslySetInnerHTML={{ __html: bowl }} />
          </Link>
          <span className="sbt-tag" key={`t-${preset.n}`}>
            <b>{preset.n}</b>
            {preset.d}
          </span>
        </div>
      </section>
    </div>
  );
}
