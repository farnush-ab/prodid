/** ارقام فارسی/عربی → انگلیسی */
export function toEnDigits(input: string): string {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** نرمال‌سازی شماره موبایل ایران به فرمت ۰۹xxxxxxxxx */
export function normalizePhone(input: string): string | null {
  let phone = toEnDigits(input).replace(/\D/g, "");
  if (phone.startsWith("0098")) phone = phone.slice(4);
  else if (phone.startsWith("98")) phone = phone.slice(2);
  if (phone.startsWith("9") && phone.length === 10) phone = `0${phone}`;
  if (/^09\d{9}$/.test(phone)) return phone;
  return null;
}
