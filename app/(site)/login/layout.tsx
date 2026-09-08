import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ورود به حساب | پرودید",
  description: "ورود به حساب کاربری پرودید با شماره موبایل و کد تایید.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
