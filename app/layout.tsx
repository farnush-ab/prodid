import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { Assistant } from "@/components/Assistant";
import { VpnNotice } from "@/components/VpnNotice";
import { TiltProvider } from "@/components/TiltProvider";
import { ToastHost } from "@/lib/toast";

export const metadata: Metadata = {
  title: "پرودید | پروتئین هر خانه — فروشگاه پروتئینی در کاشان",
  description:
    "پرودید؛ فروشگاه تخصصی مواد پروتئینی در کاشان. گوشت و استیک تازه، کبابی و مزه‌دار، سوسیس و کالباس، برگر خانگی و سبزیجات نیمه‌آماده با ارسال همان‌روز.",
  icons: { icon: "/assets/img/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Header />
        {children}
        <BottomNav />
        <Footer />
        <Assistant />
        <VpnNotice />
        <TiltProvider />
        <ToastHost />
      </body>
    </html>
  );
}
