"use client";

import { useEffect, useState } from "react";
import { fmtPrice } from "@/lib/format";
import type { DeliveryZone } from "@/lib/admin-data";

interface ToggleItem {
  id: string;
  label: string;
  enabled: boolean;
}

export function DeliveryView({
  days,
  slots,
  zones,
  minOrder,
  deliveryNote,
  onToggleDay,
  onToggleSlot,
  onSaveZones,
  onSaveLimits,
}: {
  days: ToggleItem[];
  slots: ToggleItem[];
  zones: DeliveryZone[];
  minOrder: number;
  deliveryNote: string;
  onToggleDay: (id: string, value: boolean) => void;
  onToggleSlot: (id: string, value: boolean) => void;
  onSaveZones: (zones: DeliveryZone[]) => void;
  onSaveLimits: (minOrder: number, note: string) => void;
}) {
  const [draftZones, setDraftZones] = useState(zones);
  const [min, setMin] = useState(String(minOrder));
  const [note, setNote] = useState(deliveryNote);

  useEffect(() => {
    setDraftZones(zones);
    setMin(String(minOrder));
    setNote(deliveryNote);
  }, [zones, minOrder, deliveryNote]);

  function syncZones(next: DeliveryZone[]) {
    setDraftZones(next);
  }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>ارسال و تحویل</h1>
          <p>روزها و بازه‌های زمانی تحویل، حداقل مبلغ سفارش و هزینه ارسال را تنظیم کنید</p>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>روزهای تحویل</h3>
          </div>
          {days.map((d) => (
            <div className="acc-setting-row" style={{ margin: "0 18px" }} key={d.id}>
              <b>{d.label}</b>
              <label className="acc-switch">
                <input type="checkbox" checked={d.enabled} onChange={(e) => onToggleDay(d.id, e.target.checked)} />
                <span className="track" />
                <span className="thumb" />
              </label>
            </div>
          ))}
        </div>
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>بازه‌های زمانی</h3>
          </div>
          {slots.map((s) => (
            <div className="acc-setting-row" style={{ margin: "0 18px" }} key={s.id}>
              <b>{s.label}</b>
              <label className="acc-switch">
                <input type="checkbox" checked={s.enabled} onChange={(e) => onToggleSlot(s.id, e.target.checked)} />
                <span className="track" />
                <span className="thumb" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>مناطق و هزینه ارسال</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => syncZones([...draftZones, { name: "منطقه جدید", fee: 0 }])}
            >
              + افزودن منطقه
            </button>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>منطقه</th>
                  <th>هزینه ارسال (تومان)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {draftZones.map((z, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        value={z.name}
                        onChange={(e) => syncZones(draftZones.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))}
                      />
                    </td>
                    <td>
                      <input
                        dir="ltr"
                        value={z.fee}
                        onChange={(e) =>
                          syncZones(draftZones.map((row, idx) => (idx === i ? { ...row, fee: Number(e.target.value.replace(/[^\d]/g, "")) || 0 } : row)))
                        }
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => syncZones(draftZones.filter((_, idx) => idx !== i))}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 18 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onSaveZones(draftZones)}>
              ذخیره مناطق
            </button>
          </div>
        </div>
        <div className="adm-card adm-card-pad">
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveLimits(Number(min.replace(/[^\d]/g, "")) || 0, note.trim());
            }}
          >
            <div>
              <label htmlFor="min-order">حداقل مبلغ سفارش (تومان)</label>
              <input id="min-order" dir="ltr" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div>
              <label htmlFor="delivery-note">یادداشت هزینه ارسال</label>
              <textarea id="delivery-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div>
              <button type="submit" className="btn btn-primary btn-sm">
                ذخیره
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
