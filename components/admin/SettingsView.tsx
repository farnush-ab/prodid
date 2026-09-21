"use client";

import { useState } from "react";
import type { BrandInfo, StoreFeatures } from "@/lib/store-settings";

export function SettingsView({
  brand,
  features,
  onSaveBrand,
  onSaveFeatures,
}: {
  brand: BrandInfo;
  features: StoreFeatures;
  onSaveBrand: (brand: Partial<BrandInfo>) => void;
  onSaveFeatures: (features: StoreFeatures) => void;
}) {
  const [name, setName] = useState(brand.name);
  const [slogan, setSlogan] = useState(brand.slogan);
  const [city, setCity] = useState(brand.city);
  const [phone, setPhone] = useState(brand.phone);
  const [instagram, setInstagram] = useState(brand.instagram);
  const [address, setAddress] = useState(brand.address);

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>تنظیمات فروشگاه</h1>
          <p>اطلاعات برند و کلیدهای فعال/غیرفعال‌سازی امکانات سایت</p>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h3>اطلاعات برند</h3>
        </div>
        <form
          className="form-grid cols-2"
          style={{ padding: 18 }}
          onSubmit={(e) => {
            e.preventDefault();
            onSaveBrand({ name, slogan, city, phone, instagram, address });
          }}
        >
          <div>
            <label htmlFor="brand-name">نام فروشگاه</label>
            <input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="brand-slogan">شعار</label>
            <input id="brand-slogan" value={slogan} onChange={(e) => setSlogan(e.target.value)} />
          </div>
          <div>
            <label htmlFor="brand-city">شهر ارسال</label>
            <input id="brand-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label htmlFor="brand-phone">شماره تماس</label>
            <input id="brand-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label htmlFor="brand-insta">اینستاگرام</label>
            <input id="brand-insta" dir="ltr" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="brand-address">آدرس فروشگاه</label>
            <textarea id="brand-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <button type="submit" className="btn btn-primary btn-sm">
              ذخیره تغییرات
            </button>
          </div>
        </form>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h3>کلیدهای فعال‌سازی</h3>
        </div>
        <div className="acc-setting-row" style={{ margin: "0 18px" }}>
          <div>
            <b>حالت تعمیر و نگهداری</b>
            <span className="hint">غیرفعال‌کردن موقت خرید برای مشتریان، بدون حذف اطلاعات</span>
          </div>
          <label className="acc-switch">
            <input type="checkbox" checked={features.maintenance} onChange={(e) => onSaveFeatures({ ...features, maintenance: e.target.checked })} />
            <span className="track" />
            <span className="thumb" />
          </label>
        </div>
        <div className="acc-setting-row" style={{ margin: "0 18px" }}>
          <div>
            <b>نمایش اطلاعیه استفاده از VPN</b>
            <span className="hint">در صورت فیلترینگ به کاربران نمایش داده می‌شود</span>
          </div>
          <label className="acc-switch">
            <input type="checkbox" checked={features.vpnNotice} onChange={(e) => onSaveFeatures({ ...features, vpnNotice: e.target.checked })} />
            <span className="track" />
            <span className="thumb" />
          </label>
        </div>
        <div className="acc-setting-row" style={{ margin: "0 18px" }}>
          <div>
            <b>دستیار هوشمند شناور</b>
            <span className="hint">خاموش‌کردن کلی ویجت دستیار در تمام سایت</span>
          </div>
          <label className="acc-switch">
            <input type="checkbox" checked={features.assistantWidget} onChange={(e) => onSaveFeatures({ ...features, assistantWidget: e.target.checked })} />
            <span className="track" />
            <span className="thumb" />
          </label>
        </div>
        <div className="acc-setting-row" style={{ margin: "0 18px" }}>
          <div>
            <b>پرداخت آنلاین (زرین‌پال)</b>
            <span className="hint">گزینه پرداخت آنلاین در تسویه‌حساب دیده می‌شود؛ مرچنت‌آیدی زرین‌پال از env خوانده می‌شود</span>
          </div>
          <label className="acc-switch">
            <input type="checkbox" checked={features.onlinePay} onChange={(e) => onSaveFeatures({ ...features, onlinePay: e.target.checked })} />
            <span className="track" />
            <span className="thumb" />
          </label>
        </div>
      </div>
    </div>
  );
}
