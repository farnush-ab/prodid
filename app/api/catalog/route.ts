import { NextResponse } from "next/server";
import { getLiveCatalog, getStoreSettings } from "@/lib/catalog-server";
import { getSaladCatalog } from "@/lib/salad-catalog-server";

export const runtime = "nodejs";
/* بدون این، Next این مسیر را در زمان بیلد اجرا و نتیجه را ثابت می‌کند؛
   یعنی هر تغییری که ادمین در پنل می‌دهد تا بیلد بعدی روی سایت دیده
   نمی‌شود — نه محصول، نه دسته، نه مواد سالاد. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [catalog, settings, salad] = await Promise.all([getLiveCatalog(), getStoreSettings(), getSaladCatalog()]);
    return NextResponse.json({
      products: catalog.products,
      categories: catalog.categories,
      brand: settings.brand,
      features: settings.features,
      delivery: {
        days: settings.delivery.days,
        slots: settings.delivery.slots,
        zones: settings.delivery.zones,
      },
      assistant: settings.assistant,
      salad,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خواندن کاتالوگ انجام نشد" }, { status: 500 });
  }
}
