"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { BRAND } from "@/lib/data";
import { toFa } from "@/lib/format";
import { NAV_LINKS } from "@/lib/nav";
import { pageHref } from "@/lib/page";

export function Footer() {
  const [year, setYear] = useState("");

  useEffect(() => {
    setYear(new Date().toLocaleDateString("fa-IR", { year: "numeric" }));
  }, []);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>
              پرودید | {BRAND.slogan}
            </h4>
            <p className="footer-about">
              فروشگاه تخصصی مواد پروتئینی و فودشاپ در {BRAND.city}؛ گوشت و استیک تازه، محصولات کبابی و مزه‌دار،
              سوسیس و کالباس، برگر خانگی و سبزیجات نیمه‌آماده — با ارسال سریع در سطح شهر {BRAND.city}.
            </p>
          </div>
          <div>
            <h4>دسترسی سریع</h4>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
              <li>
                <Link href={pageHref("terms")}>قوانین و مقررات</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>تماس با ما</h4>
            <div className="footer-contact-line">
              <Icon name="pin" />
              <span>{BRAND.address}</span>
            </div>
            <div className="footer-contact-line">
              <Icon name="phone" />
              <a href={`tel:${BRAND.phone}`} className="num">
                {toFa(BRAND.phone)}
              </a>
            </div>
            <div className="footer-contact-line">
              <Icon name="instagram" />
              <a href={BRAND.instagramUrl} target="_blank" rel="noopener">
                اینستاگرام {BRAND.instagram}@
              </a>
            </div>
            <div className="footer-contact-line">
              <Icon name="chat" />
              <a href={`https://wa.me/${BRAND.phoneIntl}`} target="_blank" rel="noopener">
                سفارش در واتس‌اپ
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">© {toFa(year)} پرودید — تمامی حقوق محفوظ است.</div>
      </div>
    </footer>
  );
}
