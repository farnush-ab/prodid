"use client";

import { useState } from "react";
import type { TeamMember, TeamRole } from "@/lib/admin-data";
import { TEAM_ROLE_LABEL } from "@/lib/admin-data";
import { AppModal } from "@/components/AppModal";

export function TeamView({
  team,
  onToggleStatus,
  onRemove,
  onAdd,
}: {
  team: TeamMember[];
  onToggleStatus: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: (member: TeamMember) => void;
}) {
  const [inviting, setInviting] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value.trim();
    const role = (form.elements.namedItem("role") as HTMLSelectElement).value as TeamRole;
    onAdd({ name, phone, role, active: "هنوز وارد نشده", status: "active" });
    setInviting(false);
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>تیم ادمین</h1>
          <p>دسترسی افرادی که در مدیریت سفارش و فروشگاه کمک می‌کنند</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setInviting(true)}>
          + دعوت عضو جدید
        </button>
      </div>

      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>موبایل</th>
                <th>نقش</th>
                <th>آخرین فعالیت</th>
                <th>وضعیت</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {team.map((t, i) => (
                <tr key={t.phone}>
                  <td className="adm-cell-main">{t.name}</td>
                  <td dir="ltr">{t.phone}</td>
                  <td>{TEAM_ROLE_LABEL[t.role]}</td>
                  <td className="adm-cell-sub">{t.active}</td>
                  <td>{t.status === "active" ? <span className="adm-pill adm-pill-done">فعال</span> : <span className="adm-pill adm-pill-off">غیرفعال</span>}</td>
                  <td>
                    {t.role !== "owner" ? (
                      <div className="adm-row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onToggleStatus(i)}>
                          {t.status === "active" ? "غیرفعال کردن" : "فعال کردن"}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRemove(i)}>
                          حذف
                        </button>
                      </div>
                    ) : (
                      <span className="adm-cell-sub">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {inviting ? (
        <AppModal title="دعوت عضو تیم" icon="shield" onClose={() => setInviting(false)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div>
                <label htmlFor="tf-name">نام و نام خانوادگی</label>
                <input id="tf-name" name="name" required />
              </div>
              <div>
                <label htmlFor="tf-phone">شماره موبایل</label>
                <input id="tf-phone" name="phone" dir="ltr" required placeholder="09xxxxxxxxx" />
              </div>
              <div>
                <label htmlFor="tf-role">نقش</label>
                <select id="tf-role" name="role" defaultValue="orders">
                  <option value="orders">مدیر سفارش‌ها — سفارش، پرداخت، مشتری</option>
                  <option value="catalog">مدیر کاتالوگ — محصول و دسته‌بندی</option>
                  <option value="support">پشتیبانی — فقط مشاهده</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setInviting(false)}>
                انصراف
              </button>
              <button type="submit" className="btn btn-primary">
                ارسال دعوت
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}
    </div>
  );
}
