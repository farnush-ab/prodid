import type { Metadata, Viewport } from "next";
import "./globals.css";
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
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
