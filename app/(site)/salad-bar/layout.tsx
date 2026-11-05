import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سالاد بار | پرودید",
  description:
    "سالادت را خودت بچین: کاسه را انتخاب کن، مواد تازه را با مقدار دلخواه اضافه کن و همان لحظه ببین سالادت چه شکلی می‌شود. تحویل حضوری در شعبه کاشان یا ارسال به خانه.",
};

export default function SaladBarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
