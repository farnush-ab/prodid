"use client";

import { useEffect } from "react";
import { setCatalogSnapshot, type PublicCatalog } from "@/lib/catalog-store";

export function CatalogSync() {
  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicCatalog | null) => {
        if (!cancelled && data?.products && data?.categories && data?.brand) {
          setCatalogSnapshot(data);
        }
      })
      .catch(() => {
        /* فروشگاه روی دادهٔ استاتیک می‌ماند */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
