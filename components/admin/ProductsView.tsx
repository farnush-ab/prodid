"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtPrice } from "@/lib/format";
import { Icon } from "@/lib/icons";
import type { Category, Product, SaleType } from "@/lib/data";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MIMES,
  PRODUCT_IMAGES_MAX,
  hasStoredProductImage,
  productImageSrc,
  productImagesSrc,
  storedProductImages,
} from "@/lib/product-image";
import { toast } from "@/lib/toast";
import { AppModal } from "@/components/AppModal";
import { EmptyRow } from "./shared";

type AdminProduct = Product & { sold: number };

type DraftPhoto =
  | { key: string; kind: "stored"; url: string }
  | { key: string; kind: "file"; file: File; preview: string };

async function uploadProductImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/products/image", { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "آپلود عکس ناموفق بود");
  return data.url;
}

function AdminThumb({ p }: { p: Product }) {
  const src = hasStoredProductImage(p) ? productImageSrc(p) : "";
  return (
    <div className="adm-thumb">
      <Icon name={p.ic} />
      {src ? <img key={src} src={src} alt="" onError={(e) => e.currentTarget.remove()} /> : null}
    </div>
  );
}

function draftFromProduct(p: Product | null): DraftPhoto[] {
  if (!p) return [];
  return storedProductImages(p).map((url, i) => ({
    key: `stored-${i}-${url}`,
    kind: "stored" as const,
    url,
  }));
}

export function ProductsView({
  products,
  categories,
  onSave,
  onDelete,
  onToggleAvailable,
}: {
  products: AdminProduct[];
  categories: Category[];
  onSave: (product: AdminProduct, isNew: boolean) => void | Promise<void>;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string, value: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [saving, setSaving] = useState(false);

  const sellable = categories.filter((c) => !c.soon);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name || id;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => (catFilter === "all" || p.cat === catFilter) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, search, catFilter]);

  const draft = editing === "new" ? null : editing;

  useEffect(() => {
    setPhotos((prev) => {
      for (const ph of prev) {
        if (ph.kind === "file") URL.revokeObjectURL(ph.preview);
      }
      return draftFromProduct(editing === "new" || !editing ? null : editing);
    });
    setSaving(false);
  }, [editing]);

  function pickPhotos(files: FileList | File[] | null | undefined) {
    if (!files?.length) return;
    const room = PRODUCT_IMAGES_MAX - photos.length;
    if (room <= 0) {
      toast(`حداکثر ${PRODUCT_IMAGES_MAX} عکس مجاز است`);
      return;
    }
    const next: DraftPhoto[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (!PRODUCT_IMAGE_MIMES.includes(file.type as (typeof PRODUCT_IMAGE_MIMES)[number])) {
        toast("فقط فایل JPEG، PNG یا WebP مجاز است");
        continue;
      }
      if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        toast("حجم هر عکس حداکثر ۲ مگابایت است");
        continue;
      }
      next.push({
        key: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: "file",
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (next.length) setPhotos((prev) => [...prev, ...next].slice(0, PRODUCT_IMAGES_MAX));
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.kind === "file") URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.key !== key);
    });
  }

  function makeCover(key: string) {
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.key === key);
      if (i <= 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(i, 1);
      copy.unshift(item);
      return copy;
    });
  }

  function movePhoto(key: string, dir: -1 | 1) {
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const cat = (form.elements.namedItem("cat") as HTMLSelectElement).value;
    const sale = (form.elements.namedItem("sale") as RadioNodeList).value as SaleType;
    const priceRaw = (form.elements.namedItem("price") as HTMLInputElement).value.trim();
    const badge = (form.elements.namedItem("badge") as HTMLInputElement).value.trim();
    const desc = (form.elements.namedItem("desc") as HTMLTextAreaElement).value.trim();
    const available = (form.elements.namedItem("available") as HTMLInputElement).checked;
    const ic = categories.find((c) => c.id === cat)?.ic || draft?.ic || "box";

    const isNew = editing === "new";
    const idRaw = isNew ? (form.elements.namedItem("id") as HTMLInputElement | null)?.value.trim() : "";
    setSaving(true);
    try {
      const images: string[] = [];
      for (const ph of photos) {
        if (ph.kind === "stored") images.push(ph.url);
        else images.push(await uploadProductImage(ph.file));
      }
      const image = images[0] || "";
      const base: AdminProduct = isNew
        ? {
            id: idRaw || `${name.split(" ").join("-")}-${Math.random().toString(36).slice(2, 5)}`,
            ic,
            image,
            images,
            sold: 0,
            name,
            cat,
            sale,
            price: priceRaw ? Number(priceRaw.replace(/[^\d]/g, "")) : null,
            badge,
            desc,
            available,
          }
        : { ...(draft as AdminProduct), name, cat, sale, ic, image, images, price: priceRaw ? Number(priceRaw.replace(/[^\d]/g, "")) : null, badge, desc, available };

      await Promise.resolve(onSave(base, isNew));
      setEditing(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "آپلود عکس ناموفق بود");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>محصولات</h1>
          <p>کاتالوگ فروشگاه؛ عکس، قیمت، نوع فروش (وزنی/عددی)، موجودی و برچسب‌ها را از همین‌جا مدیریت کنید</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
          + افزودن محصول
        </button>
      </div>

      <div className="adm-card">
        <div className="adm-toolbar">
          <div className="grow">
            <input type="text" placeholder="جستجوی نام محصول…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="all">همه دسته‌ها</option>
            {sellable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>محصول</th>
                <th>دسته</th>
                <th>نوع فروش</th>
                <th>قیمت</th>
                <th>برچسب</th>
                <th>موجودی</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="adm-prod-cell">
                        <AdminThumb p={p} />
                        <div>
                          <div className="adm-cell-main">{p.name}</div>
                          <div className="adm-cell-sub">
                            {p.id}
                            {storedProductImages(p).length > 1 ? ` · ${storedProductImages(p).length} عکس` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{catName(p.cat)}</td>
                    <td>{p.sale === "w" ? "وزنی (کیلو)" : "عددی (بسته)"}</td>
                    <td className="amount">{p.price === null ? "استعلامی" : `${fmtPrice(p.price)} تومان`}</td>
                    <td>{p.badge ? <span className="adm-pill adm-pill-progress">{p.badge}</span> : "—"}</td>
                    <td>
                      <label className="acc-switch">
                        <input type="checkbox" checked={p.available} onChange={(e) => onToggleAvailable(p.id, e.target.checked)} />
                        <span className="track" />
                        <span className="thumb" />
                      </label>
                    </td>
                    <td>
                      <div className="adm-row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>
                          ویرایش
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete(p.id)}>
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={7} text="محصولی پیدا نشد" />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <AppModal title={editing === "new" ? "افزودن محصول" : "ویرایش محصول"} icon="box" wide onClose={() => !saving && setEditing(null)}>
          <form onSubmit={submit}>
            <div className="form-grid cols-2">
              <div className="adm-photo-field">
                <label>عکس‌های محصول</label>
                <div className="adm-photo-grid">
                  {photos.map((ph, i) => {
                    const src = ph.kind === "stored" ? productImagesSrc({ id: draft?.id || "x", image: ph.url, images: [ph.url] })[0] : ph.preview;
                    return (
                      <div key={ph.key} className={`adm-photo-tile${i === 0 ? " is-cover" : ""}`}>
                        <img src={src} alt="" />
                        {i === 0 ? <span className="adm-photo-cover-tag">کاور</span> : null}
                        <div className="adm-photo-tile-actions">
                          {i > 0 ? (
                            <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => makeCover(ph.key)}>
                              کاور
                            </button>
                          ) : null}
                          <button type="button" className="btn btn-ghost btn-sm" disabled={saving || i === 0} onClick={() => movePhoto(ph.key, -1)} title="جابه‌جایی">
                            ‹
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" disabled={saving || i === photos.length - 1} onClick={() => movePhoto(ph.key, 1)} title="جابه‌جایی">
                            ›
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => removePhoto(ph.key)}>
                            حذف
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {photos.length < PRODUCT_IMAGES_MAX ? (
                    <label className="adm-photo-add">
                      <span>+ افزودن عکس</span>
                      <input
                        type="file"
                        accept={PRODUCT_IMAGE_ACCEPT}
                        multiple
                        hidden
                        disabled={saving}
                        onChange={(e) => {
                          pickPhotos(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </div>
                <span className="hint">
                  حداکثر {PRODUCT_IMAGES_MAX} عکس — JPEG، PNG یا WebP — هر کدام تا ۲ مگابایت. اولین عکس کاور است و در کارت‌ها و سبد نمایش داده می‌شود.
                </span>
              </div>
              <div>
                <label htmlFor="pf-name">نام محصول</label>
                <input id="pf-name" name="name" required defaultValue={draft?.name} />
              </div>
              <div>
                <label htmlFor="pf-cat">دسته‌بندی</label>
                <select id="pf-cat" name="cat" defaultValue={draft?.cat || sellable[0]?.id || categories[0]?.id}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.soon ? " (به‌زودی)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {editing === "new" ? (
                <div>
                  <label htmlFor="pf-id">شناسه انگلیسی (اختیاری)</label>
                  <input id="pf-id" name="id" dir="ltr" placeholder="مثلا kebab-koobideh" />
                  <span className="hint">اگر خالی بماند خودکار ساخته می‌شود</span>
                </div>
              ) : null}
              <div>
                <label htmlFor="pf-badge">برچسب (اختیاری)</label>
                <input id="pf-badge" name="badge" placeholder="مثلا: پرفروش" defaultValue={draft?.badge} />
              </div>
              <div>
                <label htmlFor="pf-price">قیمت (تومان) — خالی یعنی استعلامی</label>
                <input id="pf-price" name="price" dir="ltr" placeholder="مثلا 830000" defaultValue={draft?.price ?? ""} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>نوع فروش</label>
                <div style={{ display: "flex", gap: 18, paddingTop: 4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 500 }}>
                    <input type="radio" name="sale" value="w" defaultChecked={!draft || draft.sale === "w"} style={{ width: "auto" }} /> وزنی (کیلوگرم)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 500 }}>
                    <input type="radio" name="sale" value="u" defaultChecked={draft?.sale === "u"} style={{ width: "auto" }} /> عددی (بسته)
                  </label>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="pf-desc">توضیحات</label>
                <textarea id="pf-desc" name="desc" defaultValue={draft?.desc} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ margin: 0 }}>موجود برای فروش</label>
                <label className="acc-switch">
                  <input type="checkbox" name="available" defaultChecked={draft?.available ?? true} />
                  <span className="track" />
                  <span className="thumb" />
                </label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setEditing(null)}>
                انصراف
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "در حال ذخیره…" : "ذخیره محصول"}
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}
    </div>
  );
}
