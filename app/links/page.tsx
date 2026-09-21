import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { ShareButton } from "@/components/ShareButton";

export const metadata: Metadata = {
  title: "پرودید | همه لینک‌ها",
  description: `${BRAND.name} — ${BRAND.slogan}. سفارش آنلاین، واتس‌اپ، اینستاگرام، تماس و آدرس فروشگاه در ${BRAND.city}.`,
  openGraph: {
    title: `${BRAND.name} | همه لینک‌ها`,
    description: `${BRAND.slogan} — فروشگاه تخصصی مواد پروتئینی در ${BRAND.city}`,
    images: ["/assets/img/logo.png"],
    type: "website",
  },
};

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`;
const whatsappUrl = `https://wa.me/${BRAND.phoneIntl}?text=${encodeURIComponent("سلام! از طریق سایت پرودید پیام می‌دهم 👋")}`;

interface LinkRow {
  href: string;
  icon: string;
  label: string;
  sub: string;
  external?: boolean;
  /* شناسه‌های لاتین (شماره تماس، آیدی اینستاگرام) باید چپ‌به‌راست بمانند
     وگرنه «@» و ارقام در متن راست‌چین جابه‌جا نمایش داده می‌شوند */
  ltrSub?: boolean;
}

const contactLinks: LinkRow[] = [
  { href: whatsappUrl, icon: "chat", label: "سفارش و پشتیبانی در واتس‌اپ", sub: "سریع‌ترین راه ارتباط با ما", external: true },
  { href: `tel:${BRAND.phone}`, icon: "phone", label: "تماس تلفنی", sub: BRAND.phone, external: true, ltrSub: true },
  { href: BRAND.instagramUrl, icon: "instagram", label: "اینستاگرام", sub: `@${BRAND.instagram}`, external: true, ltrSub: true },
];

const siteLinks: LinkRow[] = [
  { href: "/shipping", icon: "truck", label: "ارسال و سفارش", sub: "روش‌های ارسال و زمان تحویل" },
  { href: "/faq", icon: "info", label: "سوالات متداول", sub: "پاسخ پرتکرارترین پرسش‌ها" },
  { href: "/about", icon: "award", label: "درباره پرودید", sub: "ما چه کسانی هستیم" },
];

function LinkCard({ row }: { row: LinkRow }) {
  const content = (
    <>
      <span className="lnk-ico">
        <Icon name={row.icon} />
      </span>
      <span className="lnk-text">
        <b>{row.label}</b>
        <span dir={row.ltrSub ? "ltr" : undefined} style={row.ltrSub ? { textAlign: "right" } : undefined}>
          {row.sub}
        </span>
      </span>
      <Icon name="chevron" className="lnk-go" />
    </>
  );

  if (row.external) {
    return (
      <a className="lnk-row" href={row.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link className="lnk-row" href={row.href}>
      {content}
    </Link>
  );
}

export default function LinksPage() {
  return (
    <div className="lnk-page">
      <main className="lnk-wrap">
        <header className="lnk-head">
          <img className="lnk-logo" src="/assets/img/logo.png" alt={BRAND.name} width={537} height={240} />
          <h1 className="lnk-sr">{BRAND.name}</h1>
          <p className="lnk-slogan">{BRAND.slogan}</p>
          <span className="lnk-city">
            <Icon name="pin" /> فروشگاه تخصصی مواد پروتئینی در {BRAND.city}
          </span>
        </header>

        <Link className="lnk-cta" href="/shop">
          <Icon name="store" />
          <span>
            <b>سفارش آنلاین از فروشگاه</b>
            <small>گوشت، کبابی، مرغ، برگر و سبزیجات آماده</small>
          </span>
          <Icon name="chevron" className="lnk-go" />
        </Link>

        <section className="lnk-group" aria-label="راه‌های ارتباطی">
          {contactLinks.map((row) => (
            <LinkCard key={row.label} row={row} />
          ))}
        </section>

        <section className="lnk-group" aria-label="صفحات سایت">
          {siteLinks.map((row) => (
            <LinkCard key={row.label} row={row} />
          ))}
        </section>

        <a className="lnk-address" href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <span className="lnk-ico">
            <Icon name="pin" />
          </span>
          <span className="lnk-text">
            <b>آدرس فروشگاه</b>
            <span>{BRAND.address}</span>
          </span>
        </a>

        <ShareButton />

        <footer className="lnk-foot">
          <Link href="/">پرودید — {BRAND.slogan}</Link>
        </footer>
      </main>
    </div>
  );
}
