import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فروشگاه | پرودید",
  description: "لیست کامل محصولات پروتئینی پرودید کاشان؛ گوشت، کبابی، کالباس، برگر و سبزیجات نیمه‌آماده.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
