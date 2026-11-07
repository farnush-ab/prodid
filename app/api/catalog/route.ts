import { NextResponse } from "next/server";
import { getLiveCatalog, getStoreSettings } from "@/lib/catalog-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [catalog, settings] = await Promise.all([getLiveCatalog(), getStoreSettings()]);
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
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خواندن کاتالوگ انجام نشد" }, { status: 500 });
  }
}
