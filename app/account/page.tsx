"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { pageHref } from "@/lib/page";
import { Profile, Orders, type Order } from "@/lib/profile";
import { fmtPrice, faNum } from "@/lib/format";
import { toast } from "@/lib/toast";

export default function AccountPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const profile = Profile.read();
    setName(profile.name || "");
    setPhone(profile.phone || "");
    setAddress(profile.address || "");
    setOrders(Orders.read());
    setLoaded(true);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    Profile.write({ name: name.trim(), phone: phone.trim(), address: address.trim() });
    toast("اطلاعات شما ذخیره شد");
  }

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="user" /> حساب کاربری
          </h1>
          <p>اطلاعات شما فقط روی همین دستگاه ذخیره می‌شود و در خریدهای بعدی به‌صورت خودکار تکمیل می‌گردد</p>
        </div>
      </div>

      <main className="container">
        <div className="account-grid">
          <div className="form-card">
            <h3>
              <Icon name="note" /> اطلاعات من
            </h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div>
                  <label htmlFor="a-name">نام و نام خانوادگی</label>
                  <input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلا: علی محمدی" />
                </div>
                <div>
                  <label htmlFor="a-phone">شماره موبایل</label>
                  <input
                    id="a-phone"
                    dir="ltr"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0913xxxxxxx"
                  />
                </div>
                <div>
                  <label htmlFor="a-address">آدرس پیش‌فرض</label>
                  <textarea
                    id="a-address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="محله، خیابان، کوچه، پلاک"
                  />
                </div>
                <button type="submit" className="btn btn-dark">
                  ذخیره اطلاعات
                </button>
              </div>
            </form>
          </div>
          <div>
            <div className="section-head">
              <h2 className="section-title">سفارش‌های اخیر من</h2>
            </div>
            {loaded && !orders.length ? (
              <div className="empty-state">
                <div className="e-ico">
                  <Icon name="package" />
                </div>
                <b>هنوز سفارشی ثبت نکرده‌اید</b>
                <div className="mt-2">
                  <Link className="btn btn-primary" href={pageHref("shop")}>
                    اولین سفارش را ثبت کنید
                  </Link>
                </div>
              </div>
            ) : (
              orders.map((o, i) => (
                <div className="order-card" key={i}>
                  <div className="o-head">
                    <span className="o-total">{fmtPrice(o.total)} تومان</span>
                    <span className="o-date">
                      {new Date(o.date).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })} —{" "}
                      {o.day}، ساعت {o.slot}
                    </span>
                  </div>
                  <div className="o-items">{o.items.map((it) => `${it.name} (${faNum.format(it.qty)})`).join("، ")}</div>
                  <div className="muted" style={{ fontSize: ".75rem" }}>
                    پرداخت: {o.pay}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
