"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/lib/icons";
import { type SaleType } from "@/lib/data";
import { faNum } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog-store";

type SortKey = "default" | "price-asc" | "price-desc" | "name";

function ShopContent() {
  const { products, categories } = useCatalog();
  const CATS = [{ id: "all", name: "همه" }, ...categories.filter((c) => !c.soon)];
  const params = useSearchParams();
  const [cat, setCat] = useState(params?.get("cat") || "all");
  const [q] = useState(params?.get("q") || "");
  const [type, setType] = useState<"all" | SaleType>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const list = useMemo(() => {
    let l = products.slice();
    if (cat !== "all") l = l.filter((p) => p.cat === cat);
    if (q) {
      const query = q.trim();
      l = l.filter((p) => p.name.includes(query) || (p.desc || "").includes(query));
    }
    if (type !== "all") l = l.filter((p) => p.sale === type);
    if (onlyAvailable) l = l.filter((p) => p.available);

    if (sort === "price-asc") l.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === "price-desc") l.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (sort === "name") l.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    return l;
  }, [cat, q, type, sort, onlyAvailable, products]);

  return (
    <>
      <main className="container">
        <div className="shop-toolbar">
          <div className="chips" role="tablist" aria-label="دسته‌بندی‌ها">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${cat === c.id ? " active" : ""}`}
                onClick={() => setCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="shop-controls">
            <select aria-label="نوع فروش" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="all">همه انواع</option>
              <option value="w">وزنی (قیمت هر کیلو)</option>
              <option value="u">عددی / بسته‌ای</option>
            </select>
            <select aria-label="مرتب‌سازی" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="default">مرتب‌سازی پیش‌فرض</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
              <option value="name">حروف الفبا</option>
            </select>
            <label className="check">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />{" "}
              فقط موجود
            </label>
            <span className="results-count">{list.length ? `${faNum.format(list.length)} محصول` : ""}</span>
          </div>
        </div>
        <div className="products-grid">
          {list.length ? (
            list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)
          ) : (
            <div className="empty-state" style={{ gridColumn: "1/-1" }}>
              <div className="e-ico">
                <Icon name="search" />
              </div>
              <b>محصولی پیدا نشد</b>
              جست‌وجو یا فیلترها را تغییر دهید.
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function ShopPage() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="store" /> فروشگاه پرودید
          </h1>
          <p>همه محصولات تازه و پروتئینی، آماده سفارش با ارسال همان‌روز در کاشان</p>
        </div>
      </div>
      <Suspense>
        <ShopContent />
      </Suspense>
    </>
  );
}
