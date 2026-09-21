"use client";

import { useState } from "react";
import type { RecipeTip } from "@/lib/assistant-content";
import type { Product } from "@/lib/data";
import { AppModal } from "@/components/AppModal";

export function AssistantView({
  recipes,
  defaultOn,
  intro: introProp,
  greet: greetProp,
  peek: peekProp,
  products,
  onToggleDefault,
  onSaveMessages,
  onSave,
  onDelete,
}: {
  recipes: RecipeTip[];
  defaultOn: boolean;
  intro: string;
  greet: string;
  peek: string;
  products: Product[];
  onToggleDefault: (value: boolean) => void;
  onSaveMessages: (intro: string, greet: string, peek: string) => void;
  onSave: (recipe: RecipeTip, index: number | null) => void;
  onDelete: (index: number) => void;
}) {
  const [intro, setIntro] = useState(introProp);
  const [greet, setGreet] = useState(greetProp);
  const [peek, setPeek] = useState(peekProp);
  const [editing, setEditing] = useState<{ index: number | null; recipe: RecipeTip } | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const keysRaw = (form.elements.namedItem("keys") as HTMLInputElement).value.trim();
    const text = (form.elements.namedItem("text") as HTMLTextAreaElement).value.trim();
    const selected = new FormData(form).getAll("products").map(String);
    onSave({ title, keys: keysRaw.split(/[،,]/).map((s) => s.trim()).filter(Boolean), text, products: selected }, editing?.index ?? null);
    setEditing(null);
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>دستیار هوشمند</h1>
          <p>پیشنهادهای آشپزی و پاسخ‌های دستیار شناور سایت را ویرایش کنید</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ index: null, recipe: { title: "", keys: [], text: "", products: [] } })}>
          + افزودن پیشنهاد
        </button>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h3>پیام‌های پیش‌فرض</h3>
        </div>
        <form
          className="form-grid"
          style={{ padding: 18 }}
          onSubmit={(e) => {
            e.preventDefault();
            onSaveMessages(intro, greet, peek);
          }}
        >
          <div>
            <label htmlFor="as-intro">پیام خوش‌آمد اول ورود</label>
            <input id="as-intro" value={intro} onChange={(e) => setIntro(e.target.value)} />
          </div>
          <div>
            <label htmlFor="as-greet">پیام دعوت دوباره</label>
            <input id="as-greet" value={greet} onChange={(e) => setGreet(e.target.value)} />
          </div>
          <div>
            <label htmlFor="as-peek">پیام حضور در گوشه صفحه</label>
            <input id="as-peek" value={peek} onChange={(e) => setPeek(e.target.value)} />
          </div>
          <div className="acc-setting-row" style={{ padding: "6px 0" }}>
            <div>
              <b>فعال بودن پیش‌فرض برای کاربران جدید</b>
              <span className="hint">کاربر می‌تواند از تنظیمات حساب خودش آن را خاموش کند</span>
            </div>
            <label className="acc-switch">
              <input type="checkbox" checked={defaultOn} onChange={(e) => onToggleDefault(e.target.checked)} />
              <span className="track" />
              <span className="thumb" />
            </label>
          </div>
          <div>
            <button type="submit" className="btn btn-primary btn-sm">
              ذخیره پیام‌ها
            </button>
          </div>
        </form>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <h3>پیشنهادهای آشپزی و پاسخ سریع</h3>
            <div className="sub">بر اساس کلیدواژه‌های پیام مشتری فعال می‌شود</div>
          </div>
        </div>
        {recipes.map((r, i) => (
          <div className="acc-setting-row" style={{ alignItems: "flex-start" }} key={`${r.title}-${i}`}>
            <div style={{ maxWidth: "80%" }}>
              <b>{r.title}</b>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                {r.keys.map((k) => (
                  <span className="adm-pill adm-pill-off" key={k}>
                    {k}
                  </span>
                ))}
              </div>
              <span className="hint" style={{ display: "block", lineHeight: 1.7 }}>
                {r.text}
              </span>
              {r.products.length ? (
                <span className="hint" style={{ display: "block", marginTop: 6 }}>
                  محصولات پیشنهادی: {r.products.map((id) => products.find((p) => p.id === id)?.name || id).join("، ")}
                </span>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing({ index: i, recipe: r })}>
                ویرایش
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete(i)}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <AppModal title={editing.index === null ? "افزودن پیشنهاد آشپزی" : "ویرایش پیشنهاد"} icon="chat" onClose={() => setEditing(null)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div>
                <label htmlFor="rf-title">عنوان</label>
                <input id="rf-title" name="title" required defaultValue={editing.recipe.title} placeholder="مثلا: کباب برای جمع" />
              </div>
              <div>
                <label htmlFor="rf-keys">کلیدواژه‌های محرک (با ویرگول جدا کنید)</label>
                <input id="rf-keys" name="keys" required defaultValue={editing.recipe.keys.join("، ")} placeholder="کباب، کوبیده، مهمانی" />
              </div>
              <div>
                <label htmlFor="rf-text">متن پاسخ دستیار</label>
                <textarea id="rf-text" name="text" required defaultValue={editing.recipe.text} style={{ minHeight: 100 }} />
              </div>
              <div>
                <label>محصولات پیشنهادی</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 180, overflow: "auto", paddingTop: 6 }}>
                  {products.map((p) => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}>
                      <input type="checkbox" name="products" value={p.id} defaultChecked={editing.recipe.products.includes(p.id)} style={{ width: "auto" }} />
                      {p.name}
                    </label>
                  ))}
                </div>
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
