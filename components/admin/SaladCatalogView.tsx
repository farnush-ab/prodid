"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { faNum } from "@/lib/format";
import { AppModal } from "@/components/AppModal";
import { saladImageSrc } from "@/lib/salad-image";
import { saladCalc, indexSalad, type SaladCatalog, type SaladIngredient, type SaladPreset, type SaladSauce } from "@/lib/salad";
import { EmptyRow } from "./shared";

const money = (n: number) => `${faNum.format(Math.round(n))} تومان`;

const SHAPES: { id: string; name: string }[] = [
  { id: "leaf", name: "برگ (کاهو، اسفناج)" },
  { id: "shred", name: "رشته‌ای (کلم)" },
  { id: "ring", name: "حلقه‌ای (پیاز، خیارشور)" },
  { id: "round", name: "گرد (گوجه، زیتون)" },
  { id: "strip", name: "نواری (مرغ، بیکن)" },
  { id: "cube", name: "مکعبی (فتا، نان)" },
  { id: "nut", name: "مغز (گردو، بادام)" },
  { id: "crumb", name: "خرده (پنیر رنده)" },
  { id: "kernel", name: "دانه (ذرت، کنجد)" },
];

const TAGS: { id: string; name: string }[] = [
  { id: "v", name: "گیاهی" },
  { id: "d", name: "لبنیات دارد" },
  { id: "n", name: "مغز دارد" },
  { id: "lowcal", name: "کم‌کالری" },
  { id: "highpro", name: "پرپروتئین" },
];

type Tab = "ingredients" | "presets" | "cats" | "sauces";

function emptyIngredient(cat: string): SaladIngredient {
  return {
    id: "", n: "", cat, unit: 50, g: 50, price: 0, kind: "kernel",
    c: "#8bb45a", c2: "#6f9544", kcal: 0, pro: 0, tags: [], ulabel: "", image: "", available: true,
  };
}

function emptyPreset(): SaladPreset {
  return { id: "", n: "", d: "", size: "m", items: {}, sauces: [], price: null, image: "", available: true };
}

function emptySauce(): SaladSauce {
  return { id: "", n: "", price: 0, c: "#e8d9a8", kcal: 0, pro: 0, tags: [], note: "", available: true };
}

/** آپلود عکس و برگرداندن آدرس ذخیره‌شده */
async function uploadSaladImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/salad/image", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "آپلود عکس انجام نشد");
  return String(data.url || "");
}

function ImageField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const src = saladImageSrc(value);
  return (
    <div>
      <label>{label}</label>
      <div className="sbc-image">
        {src ? <img src={src} alt="" /> : <span className="sbc-image-empty">بدون عکس</span>}
        <div className="sbc-image-acts">
          <button type="button" className="btn btn-light btn-sm" disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? "در حال آپلود…" : src ? "تغییر عکس" : "آپلود عکس"}
          </button>
          {src ? (
            <button type="button" className="btn btn-light btn-sm" onClick={() => onChange("")}>
              حذف عکس
            </button>
          ) : null}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setErr("");
            try {
              onChange(await uploadSaladImage(file));
            } catch (ex) {
              setErr(ex instanceof Error ? ex.message : "آپلود نشد");
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      {err ? <span className="hint" style={{ color: "var(--danger)" }}>{err}</span> : null}
      <span className="hint">عکس نگذاری، همان طرح گرافیکی خودمان نشان داده می‌شود.</span>
    </div>
  );
}

export function SaladCatalogView({
  catalog,
  canEdit = true,
  onSaveIngredient,
  onDeleteIngredient,
  onSavePreset,
  onDeletePreset,
  onSaveCategory,
  onDeleteCategory,
  onSaveSauce,
  onDeleteSauce,
}: {
  catalog: SaladCatalog;
  canEdit?: boolean;
  onSaveIngredient: (v: SaladIngredient, isNew: boolean) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  onSavePreset: (v: SaladPreset, isNew: boolean) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  onSaveCategory: (v: { id: string; name: string }, isNew: boolean) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSaveSauce: (v: SaladSauce, isNew: boolean) => Promise<void>;
  onDeleteSauce: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("ingredients");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const [ingDraft, setIngDraft] = useState<SaladIngredient | null>(null);
  const [ingIsNew, setIngIsNew] = useState(false);
  const [presetDraft, setPresetDraft] = useState<SaladPreset | null>(null);
  const [presetIsNew, setPresetIsNew] = useState(false);
  const [catDraft, setCatDraft] = useState<{ id: string; name: string } | null>(null);
  const [catIsNew, setCatIsNew] = useState(false);
  const [sauceDraft, setSauceDraft] = useState<SaladSauce | null>(null);
  const [sauceIsNew, setSauceIsNew] = useState(false);

  const catName = useMemo(
    () => Object.fromEntries(catalog.cats.map((c) => [c.id, c.name])),
    [catalog.cats]
  );
  const idx = useMemo(() => indexSalad(catalog), [catalog]);

  const ingredients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.ingredients.filter((i) => {
      if (catFilter !== "all" && i.cat !== catFilter) return false;
      return !q || i.n.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
    });
  }, [catalog.ingredients, search, catFilter]);

  async function guard(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>مواد و سالادهای سالاد بار</h1>
          <p>هرچه این‌جا بسازی، همان لحظه در صفحهٔ سالاد بار سایت دیده می‌شود</p>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (tab === "ingredients") {
                setIngDraft(emptyIngredient(catalog.cats[0]?.id || "base"));
                setIngIsNew(true);
              } else if (tab === "presets") {
                setPresetDraft(emptyPreset());
                setPresetIsNew(true);
              } else if (tab === "sauces") {
                setSauceDraft(emptySauce());
                setSauceIsNew(true);
              } else {
                setCatDraft({ id: "", name: "" });
                setCatIsNew(true);
              }
            }}
          >
            <Icon name="plus" />{" "}
            {tab === "ingredients" ? "مادهٔ جدید" : tab === "presets" ? "سالاد آمادهٔ جدید" : tab === "sauces" ? "سس جدید" : "دستهٔ جدید"}
          </button>
        ) : null}
      </div>

      <div className="sbc-tabs">
        {([
          ["ingredients", `مواد (${faNum.format(catalog.ingredients.length)})`],
          ["presets", `سالادهای آماده (${faNum.format(catalog.presets.length)})`],
          ["sauces", `سس‌ها (${faNum.format(catalog.sauces.length)})`],
          ["cats", `دسته‌ها (${faNum.format(catalog.cats.length)})`],
        ] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* ---------------- مواد ---------------- */}
      {tab === "ingredients" ? (
        <div className="adm-card">
          <div className="adm-toolbar">
            <div className="grow">
              <input type="text" placeholder="جستجوی ماده…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">همهٔ دسته‌ها</option>
              {catalog.cats.map((c) => (
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
                  <th>ماده</th>
                  <th>دسته</th>
                  <th>هر واحد</th>
                  <th>قیمت واحد</th>
                  <th>کالری/پروتئین</th>
                  <th>وضعیت</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ingredients.length ? (
                  ingredients.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="sbc-name">
                          {i.image ? <img src={saladImageSrc(i.image)} alt="" /> : <span className="sbc-dot" style={{ background: i.c }} />}
                          <div>
                            <div className="adm-cell-main">{i.n}</div>
                            <div className="adm-cell-sub">{i.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{catName[i.cat] || i.cat}</td>
                      <td>{i.ulabel ? `۱ ${i.ulabel} (${faNum.format(i.g)} گرم)` : `${faNum.format(i.g)} گرم`}</td>
                      <td className="amount">{money(i.price)}</td>
                      <td className="adm-cell-sub">
                        {faNum.format(i.kcal)} / {faNum.format(i.pro)} در ۱۰۰ گرم
                      </td>
                      <td>
                        <span className={`adm-pill ${i.available === false ? "adm-pill-danger" : "adm-pill-done"}`}>
                          <span className="dot" />
                          {i.available === false ? "غیرفعال" : "فعال"}
                        </span>
                      </td>
                      <td>
                        {canEdit ? (
                          <div className="adm-actions-row">
                            <button type="button" className="btn btn-light btn-sm" onClick={() => { setIngDraft({ ...i }); setIngIsNew(false); }}>
                              ویرایش
                            </button>
                            <button
                              type="button"
                              className="btn btn-light btn-sm adm-destructive"
                              onClick={() => guard(() => onDeleteIngredient(i.id))}
                            >
                              حذف
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={7} text="ماده‌ای با این فیلتر نیست" icon="bowl" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ---------------- سالادهای آماده ---------------- */}
      {tab === "presets" ? (
        <div className="sbc-presets">
          {catalog.presets.length ? (
            catalog.presets.map((p) => {
              const c = saladCalc(p.items, p.sauces, p.size, idx);
              return (
                <div className="sbc-preset" key={p.id || p.n}>
                  <div className="sbc-preset-img">
                    {p.image ? <img src={saladImageSrc(p.image)} alt="" /> : <span>بدون عکس</span>}
                  </div>
                  <div className="sbc-preset-body">
                    <b>{p.n}</b>
                    <p>{p.d || "—"}</p>
                    <span className="adm-cell-sub">
                      کاسهٔ {idx.size[p.size]?.name || p.size} · {faNum.format(Object.keys(p.items).length)} ماده ·{" "}
                      {faNum.format(c.kcal)} کالری
                    </span>
                    <span className="sbc-preset-price">
                      {money(p.price ?? c.price)}
                      {p.price != null ? <i>قیمت دستی</i> : <i>از روی مواد</i>}
                    </span>
                    {p.available === false ? <span className="adm-pill adm-pill-danger"><span className="dot" />غیرفعال</span> : null}
                  </div>
                  {canEdit ? (
                    <div className="sbc-preset-acts">
                      <button type="button" className="btn btn-light btn-sm" onClick={() => { setPresetDraft({ ...p, items: { ...p.items }, sauces: [...p.sauces] }); setPresetIsNew(false); }}>
                        ویرایش
                      </button>
                      <button type="button" className="btn btn-light btn-sm adm-destructive" onClick={() => guard(() => onDeletePreset(p.id || ""))}>
                        حذف
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="adm-card" style={{ padding: 24, textAlign: "center", color: "var(--ink-2)" }}>
              هنوز سالاد آماده‌ای نساخته‌ای.
            </div>
          )}
        </div>
      ) : null}

      {/* ---------------- سس‌ها ---------------- */}
      {tab === "sauces" ? (
        <div className="adm-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>سس</th>
                  <th>قیمت</th>
                  <th>کالری/پروتئین</th>
                  <th>توضیح</th>
                  <th>وضعیت</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {catalog.sauces.length ? (
                  catalog.sauces.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="sbc-name">
                          <span className="sbc-dot" style={{ background: s.c }} />
                          <div>
                            <div className="adm-cell-main">{s.n}</div>
                            <div className="adm-cell-sub">{s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="amount">{money(s.price)}</td>
                      <td className="adm-cell-sub">
                        {faNum.format(s.kcal)} / {faNum.format(s.pro)}
                      </td>
                      <td className="adm-cell-sub">{s.note || "—"}</td>
                      <td>
                        <span className={`adm-pill ${s.available === false ? "adm-pill-danger" : "adm-pill-done"}`}>
                          <span className="dot" />
                          {s.available === false ? "غیرفعال" : "فعال"}
                        </span>
                      </td>
                      <td>
                        {canEdit ? (
                          <div className="adm-actions-row">
                            <button type="button" className="btn btn-light btn-sm" onClick={() => { setSauceDraft({ ...s }); setSauceIsNew(false); }}>
                              ویرایش
                            </button>
                            <button type="button" className="btn btn-light btn-sm adm-destructive" onClick={() => guard(() => onDeleteSauce(s.id))}>
                              حذف
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={6} text="سسی ثبت نشده" icon="bowl" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ---------------- دسته‌ها ---------------- */}
      {tab === "cats" ? (
        <div className="adm-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>دسته</th>
                  <th>شناسه</th>
                  <th>تعداد ماده</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {catalog.cats.length ? (
                  catalog.cats.map((c) => {
                    const n = catalog.ingredients.filter((i) => i.cat === c.id).length;
                    return (
                      <tr key={c.id}>
                        <td className="adm-cell-main">{c.name}</td>
                        <td className="adm-cell-sub">{c.id}</td>
                        <td>{faNum.format(n)}</td>
                        <td>
                          {canEdit ? (
                            <div className="adm-actions-row">
                              <button type="button" className="btn btn-light btn-sm" onClick={() => { setCatDraft({ ...c }); setCatIsNew(false); }}>
                                ویرایش
                              </button>
                              <button type="button" className="btn btn-light btn-sm adm-destructive" onClick={() => guard(() => onDeleteCategory(c.id))}>
                                حذف
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <EmptyRow colSpan={4} text="دسته‌ای ثبت نشده" icon="bowl" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ---------------- فرم ماده ---------------- */}
      {ingDraft ? (
        <AppModal title={ingIsNew ? "مادهٔ جدید" : `ویرایش ${ingDraft.n}`} icon="bowl" onClose={() => setIngDraft(null)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              guard(async () => {
                await onSaveIngredient(ingDraft, ingIsNew);
                setIngDraft(null);
              });
            }}
          >
            <div className="sbc-two">
              <div>
                <label htmlFor="ing-n">نام ماده</label>
                <input id="ing-n" value={ingDraft.n} onChange={(e) => setIngDraft({ ...ingDraft, n: e.target.value })} placeholder="مثلاً آووکادو" />
              </div>
              <div>
                <label htmlFor="ing-cat">دسته</label>
                <select id="ing-cat" value={ingDraft.cat} onChange={(e) => setIngDraft({ ...ingDraft, cat: e.target.value })}>
                  {catalog.cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sbc-two">
              <div>
                <label htmlFor="ing-g">وزن هر واحد (گرم)</label>
                <input id="ing-g" type="number" min={1} value={ingDraft.g} onChange={(e) => setIngDraft({ ...ingDraft, g: Number(e.target.value), unit: Number(e.target.value) })} />
                <span className="hint">مشتری با هر بار زدن +، یک واحد اضافه می‌کند.</span>
              </div>
              <div>
                <label htmlFor="ing-price">قیمت هر واحد (تومان)</label>
                <input id="ing-price" type="number" min={0} value={ingDraft.price} onChange={(e) => setIngDraft({ ...ingDraft, price: Number(e.target.value) })} />
              </div>
            </div>

            <div className="sbc-two">
              <div>
                <label htmlFor="ing-kcal">کالری هر ۱۰۰ گرم</label>
                <input id="ing-kcal" type="number" min={0} value={ingDraft.kcal} onChange={(e) => setIngDraft({ ...ingDraft, kcal: Number(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="ing-pro">پروتئین هر ۱۰۰ گرم</label>
                <input id="ing-pro" type="number" min={0} value={ingDraft.pro} onChange={(e) => setIngDraft({ ...ingDraft, pro: Number(e.target.value) })} />
              </div>
            </div>

            <div className="sbc-two">
              <div>
                <label htmlFor="ing-ulabel">واحد شمارش (اختیاری)</label>
                <input id="ing-ulabel" value={ingDraft.ulabel || ""} onChange={(e) => setIngDraft({ ...ingDraft, ulabel: e.target.value })} placeholder="مثلاً عدد" />
                <span className="hint">برای چیزهایی مثل تخم‌مرغ که عددی‌اند، نه گرمی.</span>
              </div>
              <div>
                <label htmlFor="ing-kind">شکل در کاسه</label>
                <select id="ing-kind" value={ingDraft.kind} onChange={(e) => setIngDraft({ ...ingDraft, kind: e.target.value as SaladIngredient["kind"] })}>
                  {SHAPES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="hint">وقتی عکس نداری، کاسه با همین شکل و رنگ کشیده می‌شود.</span>
              </div>
            </div>

            <div className="sbc-two">
              <div>
                <label htmlFor="ing-c">رنگ اصلی</label>
                <input id="ing-c" type="color" value={ingDraft.c} onChange={(e) => setIngDraft({ ...ingDraft, c: e.target.value })} />
              </div>
              <div>
                <label htmlFor="ing-c2">رنگ کمکی</label>
                <input id="ing-c2" type="color" value={ingDraft.c2} onChange={(e) => setIngDraft({ ...ingDraft, c2: e.target.value })} />
              </div>
            </div>

            <div>
              <label>برچسب‌های رژیمی</label>
              <div className="sbc-tags">
                {TAGS.map((t) => {
                  const on = (ingDraft.tags || []).includes(t.id as never);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={on ? "on" : ""}
                      onClick={() =>
                        setIngDraft({
                          ...ingDraft,
                          tags: on
                            ? ingDraft.tags.filter((x) => x !== t.id)
                            : ([...ingDraft.tags, t.id] as SaladIngredient["tags"]),
                        })
                      }
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
              <span className="hint">فیلترهای «گیاهی»، «بدون لبنیات» و… در سایت از روی همین‌ها کار می‌کنند.</span>
            </div>

            <ImageField label="عکس ماده" value={ingDraft.image || ""} onChange={(url) => setIngDraft({ ...ingDraft, image: url })} />

            <div className="acc-setting-row" style={{ padding: "6px 0" }}>
              <div>
                <b>در سایت نشان داده شود</b>
                <span className="hint">خاموش کنی، از سالاد بار حذف می‌شود ولی داده‌اش می‌ماند</span>
              </div>
              <label className="acc-switch">
                <input type="checkbox" checked={ingDraft.available !== false} onChange={(e) => setIngDraft({ ...ingDraft, available: e.target.checked })} />
                <span className="track" />
                <span className="thumb" />
              </label>
            </div>

            <div className="adm-actions-row">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "در حال ذخیره…" : "ذخیره"}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setIngDraft(null)}>
                انصراف
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}

      {/* ---------------- فرم سالاد آماده ---------------- */}
      {presetDraft ? (
        <AppModal title={presetIsNew ? "سالاد آمادهٔ جدید" : `ویرایش ${presetDraft.n}`} icon="bowl" onClose={() => setPresetDraft(null)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              guard(async () => {
                await onSavePreset(presetDraft, presetIsNew);
                setPresetDraft(null);
              });
            }}
          >
            <div className="sbc-two">
              <div>
                <label htmlFor="pr-n">نام سالاد</label>
                <input id="pr-n" value={presetDraft.n} onChange={(e) => setPresetDraft({ ...presetDraft, n: e.target.value })} placeholder="مثلاً سزار کلاسیک" />
              </div>
              <div>
                <label htmlFor="pr-size">اندازهٔ کاسه</label>
                <select id="pr-size" value={presetDraft.size} onChange={(e) => setPresetDraft({ ...presetDraft, size: e.target.value })}>
                  {catalog.sizes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="pr-d">توضیح</label>
              <textarea id="pr-d" rows={2} value={presetDraft.d} onChange={(e) => setPresetDraft({ ...presetDraft, d: e.target.value })} placeholder="کاهو، مرغ گریل، پارمزان و کروتان" />
            </div>

            <div>
              <label htmlFor="pr-price">قیمت (تومان)</label>
              <input
                id="pr-price"
                type="number"
                min={0}
                value={presetDraft.price ?? ""}
                onChange={(e) => setPresetDraft({ ...presetDraft, price: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="خالی بگذار تا از روی مواد حساب شود"
              />
              <span className="hint">
                خالی = قیمت خودکار از روی مواد ({money(saladCalc(presetDraft.items, presetDraft.sauces, presetDraft.size, idx).price)}).
              </span>
            </div>

            <div>
              <label>مواد این سالاد</label>
              <div className="sbc-picker">
                {catalog.ingredients.map((i) => {
                  const q = presetDraft.items[i.id] || 0;
                  return (
                    <div key={i.id} className={`sbc-pick${q ? " on" : ""}`}>
                      <span>{i.n}</span>
                      <div className="sbc-pick-ctl">
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...presetDraft.items };
                            if (q <= 1) delete next[i.id];
                            else next[i.id] = q - 1;
                            setPresetDraft({ ...presetDraft, items: next });
                          }}
                          disabled={!q}
                          aria-label={`کمتر کردن ${i.n}`}
                        >
                          −
                        </button>
                        <b>{q ? faNum.format(q) : "۰"}</b>
                        <button
                          type="button"
                          onClick={() => setPresetDraft({ ...presetDraft, items: { ...presetDraft.items, [i.id]: Math.min(12, q + 1) } })}
                          aria-label={`بیشتر کردن ${i.n}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label>سس‌ها</label>
              <div className="sbc-tags">
                {catalog.sauces.map((s) => {
                  const on = presetDraft.sauces.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={on ? "on" : ""}
                      onClick={() =>
                        setPresetDraft({
                          ...presetDraft,
                          sauces: on ? presetDraft.sauces.filter((x) => x !== s.id) : [...presetDraft.sauces, s.id],
                        })
                      }
                    >
                      {s.n}
                    </button>
                  );
                })}
              </div>
            </div>

            <ImageField label="عکس سالاد" value={presetDraft.image || ""} onChange={(url) => setPresetDraft({ ...presetDraft, image: url })} />

            <div className="acc-setting-row" style={{ padding: "6px 0" }}>
              <div>
                <b>در سایت نشان داده شود</b>
              </div>
              <label className="acc-switch">
                <input type="checkbox" checked={presetDraft.available !== false} onChange={(e) => setPresetDraft({ ...presetDraft, available: e.target.checked })} />
                <span className="track" />
                <span className="thumb" />
              </label>
            </div>

            <div className="adm-actions-row">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "در حال ذخیره…" : "ذخیره"}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setPresetDraft(null)}>
                انصراف
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}

      {/* ---------------- فرم سس ---------------- */}
      {sauceDraft ? (
        <AppModal title={sauceIsNew ? "سس جدید" : `ویرایش ${sauceDraft.n}`} icon="bowl" onClose={() => setSauceDraft(null)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              guard(async () => {
                await onSaveSauce(sauceDraft, sauceIsNew);
                setSauceDraft(null);
              });
            }}
          >
            <div className="sbc-two">
              <div>
                <label htmlFor="sa-n">نام سس</label>
                <input id="sa-n" value={sauceDraft.n} onChange={(e) => setSauceDraft({ ...sauceDraft, n: e.target.value })} />
              </div>
              <div>
                <label htmlFor="sa-price">قیمت (تومان)</label>
                <input id="sa-price" type="number" min={0} value={sauceDraft.price} onChange={(e) => setSauceDraft({ ...sauceDraft, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="sbc-two">
              <div>
                <label htmlFor="sa-kcal">کالری هر ۱۰۰ گرم</label>
                <input id="sa-kcal" type="number" min={0} value={sauceDraft.kcal} onChange={(e) => setSauceDraft({ ...sauceDraft, kcal: Number(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="sa-c">رنگ</label>
                <input id="sa-c" type="color" value={sauceDraft.c} onChange={(e) => setSauceDraft({ ...sauceDraft, c: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="sa-note">توضیح کوتاه</label>
              <input id="sa-note" value={sauceDraft.note} onChange={(e) => setSauceDraft({ ...sauceDraft, note: e.target.value })} placeholder="مثلاً تند و خامه‌ای" />
            </div>
            <div className="acc-setting-row" style={{ padding: "6px 0" }}>
              <div>
                <b>در سایت نشان داده شود</b>
              </div>
              <label className="acc-switch">
                <input type="checkbox" checked={sauceDraft.available !== false} onChange={(e) => setSauceDraft({ ...sauceDraft, available: e.target.checked })} />
                <span className="track" />
                <span className="thumb" />
              </label>
            </div>
            <div className="adm-actions-row">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "در حال ذخیره…" : "ذخیره"}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setSauceDraft(null)}>
                انصراف
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}

      {/* ---------------- فرم دسته ---------------- */}
      {catDraft ? (
        <AppModal title={catIsNew ? "دستهٔ جدید" : `ویرایش ${catDraft.name}`} icon="bowl" onClose={() => setCatDraft(null)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              guard(async () => {
                await onSaveCategory(catDraft, catIsNew);
                setCatDraft(null);
              });
            }}
          >
            <div>
              <label htmlFor="sc-name">نام دسته</label>
              <input id="sc-name" value={catDraft.name} onChange={(e) => setCatDraft({ ...catDraft, name: e.target.value })} placeholder="مثلاً میوه‌ها" />
              <span className="hint">دسته‌ها همان تب‌هایی هستند که مشتری بالای فهرست مواد می‌بیند.</span>
            </div>
            <div className="adm-actions-row">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "در حال ذخیره…" : "ذخیره"}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setCatDraft(null)}>
                انصراف
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}
    </div>
  );
}
