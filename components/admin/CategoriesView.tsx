"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import type { Category } from "@/lib/data";
import { AppModal } from "@/components/AppModal";

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
  onSave: (category: Category, isNew: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const draft = editing === "new" ? null : editing;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const soon = (form.elements.namedItem("soon") as HTMLInputElement).checked;
    const isNew = editing === "new";
    onSave(isNew ? { id: name.split(" ").join("-"), name, ic: "box", soon } : { ...(draft as Category), name, soon }, isNew);
    setEditing(null);
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>دسته‌بندی‌ها</h1>
          <p>ترتیب نمایش دسته‌ها در فروشگاه و وضعیت «به‌زودی» را مدیریت کنید</p>
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
              <Icon name={c.ic} className="ico" />
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
        <AppModal title={editing === "new" ? "دسته‌بندی جدید" : "ویرایش دسته‌بندی"} icon="store" onClose={() => setEditing(null)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div>
                <label htmlFor="cf-name">نام دسته</label>
                <input id="cf-name" name="name" required defaultValue={draft?.name} />
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
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                انصراف
              </button>
              <button type="submit" className="btn btn-primary">
                ذخیره
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}
    </div>
  );
}
