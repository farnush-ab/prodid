"use client";

import type { Category, Product } from "@/lib/data";
import { fmtPrice } from "@/lib/format";

const CAT_COLOR: Record<string, string> = {
  meat: "#2a78d6",
  kebab: "#eb6834",
  chicken: "#1baf7a",
  coldcuts: "#eda100",
  burger: "#e87ba4",
  veg: "#008300",
  salad: "#4a3aa7",
};

export function CategoryBars({ products, categories = [] }: { products: (Product & { sold: number })[]; categories?: Category[] }) {
  const totals = new Map<string, number>();
  products.forEach((p) => {
    totals.set(p.cat, (totals.get(p.cat) || 0) + p.sold * (p.price || 0));
  });
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;

  return (
    <div style={{ paddingTop: 6 }}>
      {rows.map(([catId, value]) => {
        const cat = categories.find((c) => c.id === catId);
        const color = CAT_COLOR[catId] || "#8d8172";
        return (
          <div className="adm-bar-row" key={catId}>
            <span className="lbl">
              <span className="adm-swatch" style={{ background: color }} />
              {cat?.name || catId}
            </span>
            <div className="adm-bar-track">
              <div className="adm-bar-fill" style={{ width: `${Math.round((value / max) * 100)}%`, background: color }} />
            </div>
            <span className="amt">{fmtPrice(Math.round(value / 1000))} هزار</span>
          </div>
        );
      })}
    </div>
  );
}
