"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import type { Category } from "@/lib/data";
import { AppModal } from "@/components/AppModal";
import { PRODUCT_IMAGE_ACCEPT } from "@/lib/product-image";
import { categoryImageSrc, hasStoredCategoryImage } from "@/lib/category-image";
import { IconSelect } from "./shared";

type DraftImage = { kind: "stored"; url: string } | { kind: "file"; file: File; preview: string } | null;

async function uploadCategoryImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/categories/image", { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "آپلود عکس ناموفق بود");
  return data.url;
}

function CategoryThumb({ c }: { c: Category }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="adm-thumb">
      <Icon name={c.ic} />
      {ok ? <img key={categoryImageSrc(c)} src={categoryImageSrc(c)} alt="" onError={() => setOk(false)} /> : null}
    </div>
  );
}

export function CategoriesView({
  categories,
  onReorder,
  onToggleSoon,
  onSave,
  onDelete,
}: {
  categories: Category[];
  onReorder: (from: number, to: number) => void;
  onToggleSoon: (id: string, value: boolean) => void;
  onSave: (category: Category, isNew: boolean) => void | Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [photo, setPhoto] = useState<DraftImage>(null);
  const [saving, setSaving] = useState(false);
  const draft = editing === "new" ? null : editing;

  useEffect(() => {
    if (!editing) return;
    const c = editing === "new" ? null : editing;
    setPhoto(c && hasStoredCategoryImage(c) ? { kind: "stored", url: c.image || "" } : null);
    setSaving(false);
  }, [editing]);

  useEffect(() => {
    return () => {
      if (photo && photo.kind === "file") URL.revokeObjectURL(photo.preview);
    };
  }, [photo]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhoto((prev) => {
      if (prev && prev.kind === "file") URL.revokeObjectURL(prev.preview);
      return { kind: "file", file, preview: URL.createObjectURL(file) };
    });
  }
  function clearPhoto() {
    setPhoto((prev) => {
      if (prev && prev.kind === "file") URL.revokeObjectURL(prev.preview);
      return null;
    });
  }

  const shownPhoto = photo ? (photo.kind === "stored" ? categoryImageSrc({ id: draft?.id || "x", image: photo.url }) : photo.preview) : "";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const ic = (form.elements.namedItem("ic") as HTMLSelectElement).value.trim() || "box";
    const soon = (form.elements.namedItem("soon") as HTMLInputElement).checked;
    const isNew = editing === "new";
    setSaving(true);
    try {
      let image = "";
      if (photo) image = photo.kind === "stored" ? photo.url : await uploadCategoryImage(photo.file);
      await onSave(
        isNew
          ? { id: name.split(" ").join("-"), name, ic, soon, image }
          : { ...(draft as Category), name, ic, soon, image },
        isNew
      );
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>دسته‌بندی‌ها</h1>
          <p>ترتیب نمایش، عکس، و وضعیت «به‌زودی» هر دسته را اینجا مدیریت کنید</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
          + دسته‌بندی جدید
        </button>
      </div>

      <div className="adm-card">
        {categories.map((c, i) => (
          <div className="acc-setting-row" key={c.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "1px 5px" }} disabled={i === 0} onClick={() => onReorder(i, i - 1)}>
                  ▲
                </button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "1px 5px" }} disabled={i === categories.length - 1} onClick={() => onReorder(i, i + 1)}>
                  ▼
                </button>
              </div>
              <CategoryThumb c={c} />
              <div>
                <b>
                  {c.name} {c.soon ? <span className="soon-chip" style={{ marginInlineStart: 8 }}>به‌زودی</span> : null}
                </b>
                <span className="hint">{c.id}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span className="hint">به‌زودی</span>
              <label className="acc-switch">
                <input type="checkbox" checked={c.soon} onChange={(e) => onToggleSoon(c.id, e.target.checked)} />
                <span className="track" />
                <span className="thumb" />
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>
                ویرایش
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete(c.id)}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <AppModal title={editing === "new" ? "دسته‌بندی جدید" : "ویرایش دسته‌بندی"} icon="store" onClose={() => !saving && setEditing(null)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="adm-photo-field">
                <label>عکس دسته</label>
                <div className="adm-photo-row">
                  <div className={`adm-photo-preview${shownPhoto ? " has-img" : ""}`}>
                    {shownPhoto ? <img src={shownPhoto} alt="" /> : <span className="adm-photo-empty">عکس انتخاب نشده</span>}
                  </div>
                  <div className="adm-photo-actions">
                    <label className="btn btn-outline btn-sm">
                      {shownPhoto ? "تغییر عکس" : "آپلود عکس"}
                      <input
                        type="file"
                        accept={PRODUCT_IMAGE_ACCEPT}
                        hidden
                        disabled={saving}
                        onChange={(e) => {
                          pickPhoto(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {shownPhoto ? (
                      <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={clearPhoto}>
                        حذف عکس
                      </button>
                    ) : null}
                    <span className="hint">
                      JPEG، PNG یا WebP — حداکثر ۲ مگابایت. همین عکس روی کارت دسته در صفحه اصلی دیده می‌شود.
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="cf-name">نام دسته</label>
                <input id="cf-name" name="name" required defaultValue={draft?.name} />
              </div>
              <div>
                <label htmlFor="cf-ic">آیکن</label>
                <IconSelect id="cf-ic" name="ic" defaultValue={draft?.ic} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ margin: 0 }}>وضعیت «به‌زودی»</label>
                <label className="acc-switch">
                  <input type="checkbox" name="soon" defaultChecked={draft?.soon} />
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
                {saving ? "در حال ذخیره…" : "ذخیره"}
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}
    </div>
  );
}
