import type { Metadata } from "next";
import { Icon } from "@/lib/icons";
import { BRAND } from "@/lib/data";
import { toFa } from "@/lib/format";

export const metadata: Metadata = {
  title: "تماس با ما | پرودید",
  description: "راه‌های ارتباط با فروشگاه پرودید کاشان؛ تلفن، واتس‌اپ، اینستاگرام و آدرس فروشگاه.",
};

export default function ContactPage() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="phone" /> تماس با ما
          </h1>
          <p>هر سوالی دارید، در خدمت شما هستیم</p>
        </div>
      </div>

      <main className="container">
        <div className="contact-grid">
          <div className="content-card">
            <h2>راه‌های ارتباطی</h2>
            <div className="contact-line">
              <span className="cl-ico">
                <Icon name="pin" />
              </span>
              <div>
                <b>آدرس فروشگاه</b>
                <span>{BRAND.address}</span>
              </div>
            </div>
            <div className="contact-line">
              <span className="cl-ico">
                <Icon name="phone" />
              </span>
              <div>
                <b>تلفن سفارش</b>
                <a href={`tel:${BRAND.phone}`}>{toFa(BRAND.phone)}</a>
              </div>
            </div>
            <div className="contact-line">
              <span className="cl-ico">
                <Icon name="chat" />
              </span>
              <div>
                <b>واتس‌اپ</b>
                <a href={`https://wa.me/${BRAND.phoneIntl}`} target="_blank" rel="noopener">
                  ارسال پیام در واتس‌اپ
                </a>
              </div>
            </div>
            <div className="contact-line">
              <span className="cl-ico">
                <Icon name="instagram" />
              </span>
              <div>
                <b>اینستاگرام</b>
                <a href={BRAND.instagramUrl} target="_blank" rel="noopener">
                  {BRAND.instagram}@
                </a>
              </div>
            </div>
            <div className="contact-line">
              <span className="cl-ico">
                <Icon name="clock" />
              </span>
              <div>
                <b>ساعت کاری</b>
                <span>همه‌روزه، صبح تا شب (برای هماهنگی تماس بگیرید)</span>
              </div>
            </div>
            <div className="mt-2">
              <a className="btn btn-primary btn-block" href={`tel:${BRAND.phone}`}>
                <Icon name="phone" /> تماس مستقیم
              </a>
              <a className="btn btn-outline btn-block mt-1" href={`https://wa.me/${BRAND.phoneIntl}`} target="_blank" rel="noopener">
                <Icon name="chat" /> پیام در واتس‌اپ
              </a>
            </div>
          </div>
          <div className="map-box">
            <div>
              <div className="m-ico">
                <Icon name="pin" />
              </div>
              <b>فروشگاه پرودید</b>
              <p>{BRAND.address}</p>
              <a
                className="btn btn-dark mt-2"
                target="_blank"
                rel="noopener"
                href="https://www.google.com/maps/search/?api=1&query=%DA%A9%D8%A7%D8%B4%D8%A7%D9%86%20%D9%85%DB%8C%D8%AF%D8%A7%D9%86%20%D8%B9%D8%A7%D9%85%D8%B1%DB%8C%D9%87%20%D8%AE%DB%8C%D8%A7%D8%A8%D8%A7%D9%86%20%D8%A7%D9%85%DB%8C%D8%B1%DA%A9%D8%A8%DB%8C%D8%B1%20%D9%85%D8%AD%D9%88%D8%B1%20%DA%86%D9%87%D8%A7%D8%B1%D8%A8%D8%A7%D9%86%D8%AF%D9%87"
              >
                مسیریابی در نقشه
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
