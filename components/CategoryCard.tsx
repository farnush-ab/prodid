"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import type { Category } from "@/lib/data";
import { pageHref } from "@/lib/page";
import { toast } from "@/lib/toast";
import { useReveal, staggerDelay } from "@/components/Reveal";

export function CategoryCard({ c, index }: { c: Category; index?: number }) {
  const [imgOk, setImgOk] = useState(true);
  const { ref, revealClass } = useReveal<HTMLAnchorElement>();
  const style = { transitionDelay: `${staggerDelay(index ?? 0)}ms` };

  if (c.soon) {
    return (
      <a
        ref={ref}
        className={`cat-card tilt ${revealClass}`}
        style={style}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          toast("این دسته به‌زودی تکمیل می‌شود");
        }}
      >
        <span className="soon-tag">به‌زودی</span>
        <span className="c-img">
          <Icon name={c.ic} />
          {imgOk && (
            <img
              src={`/assets/img/categories/${c.id}.jpg`}
              alt={c.name}
              loading="lazy"
              onError={() => setImgOk(false)}
            />
          )}
        </span>
        <span className="c-name">{c.name}</span>
      </a>
    );
  }

  return (
    <Link ref={ref} className={`cat-card tilt ${revealClass}`} style={style} href={`${pageHref("shop")}?cat=${c.id}`}>
      <span className="c-img">
        <Icon name={c.ic} />
        {imgOk && (
          <img
            src={`/assets/img/categories/${c.id}.jpg`}
            alt={c.name}
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        )}
      </span>
      <span className="c-name">{c.name}</span>
    </Link>
  );
}
