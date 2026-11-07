"use client";

import { Icon } from "@/lib/icons";
import { useCatalog } from "@/lib/catalog-store";

export function MaintenanceBanner() {
  const { features } = useCatalog();
  if (!features.maintenance) return null;
  return (
    <div className="adm-maintenance-banner" style={{ position: "sticky", top: 0, zIndex: 40 }}>
      <Icon name="info" /> فروشگاه موقتاً در حال به‌روزرسانی است؛ ثبت سفارش اینترنتی فعلا ممکن نیست.
    </div>
  );
}
