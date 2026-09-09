/* مسیر صفحات (معادل تابع PAGE() در نسخه استاتیک؛ در Next.js همه مسیرها ریشه‌ای‌اند) */
export function pageHref(id: string): string {
  return id === "index" ? "/" : `/${id}`;
}
