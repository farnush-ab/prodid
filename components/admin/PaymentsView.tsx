"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { fmtPrice, faNum } from "@/lib/format";
import { PAY_METHOD_LABEL } from "@/lib/order";
import type { AdminOrder } from "@/lib/admin-data";
import { isCreatedToday } from "@/lib/admin-data";
import { orderPayable } from "@/lib/coupon";
import type { PaymentDetails } from "@/lib/store-settings";
import { EmptyRow } from "./shared";

export function PaymentsView({
  orders,
  onMarkPaid,
  payments,
  onlinePay,
  onSavePayments,
}: {
  orders: AdminOrder[];
  onMarkPaid: (orderNo: string) => void;
  payments: PaymentDetails;
  onlinePay: boolean;
  onSavePayments: (payments: PaymentDetails, onlinePay: boolean) => void;
}) {
  const pending = orders.filter((o) => o.paymentMethod !== "cod" && o.paymentStatus === "unpaid" && o.status !== "cancelled");
  const paidToday = orders.filter((o) => isCreatedToday(o) && o.paymentStatus === "paid").reduce((s, o) => s + orderPayable(o), 0);

  const [holder, setHolder] = useState(payments.cardHolder);
  const [cardNumber, setCardNumber] = useState(payments.cardNumber);
  const [bank, setBank] = useState(payments.bankName);
  const [online, setOnline] = useState(onlinePay);

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1>پرداخت‌ها</h1>
          <p>پرداخت زرین‌پال بعد از بازگشت از درگاه خودکار تایید می‌شود؛ کارت‌به‌کارت را اینجا دستی تایید کنید</p>
        </div>
      </div>

      <div className="adm-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="adm-metric">
          <span className="m-ico" style={{ background: "var(--gold-tint)", color: "var(--gold-deep)" }}>
            <Icon name="clock" />
          </span>
          <span className="m-body">
            <span className="m-label">در انتظار تایید پرداخت</span>
            <span className="m-value">
              {faNum.format(pending.length)}
              <small>سفارش</small>
            </span>
          </span>
        </div>
        <div className="adm-metric">
          <span className="m-ico" style={{ background: "var(--brand-green-tint)", color: "var(--brand-green-deep)" }}>
            <Icon name="check" />
          </span>
          <span className="m-body">
            <span className="m-label">پرداخت‌شده امروز</span>
            <span className="m-value">
              {fmtPrice(paidToday)}
              <small>تومان</small>
            </span>
          </span>
        </div>
        <div className="adm-metric">
          <span className="m-ico" style={{ background: "#eee9dd", color: "#8d8172" }}>
            <Icon name="shield" />
          </span>
          <span className="m-body">
            <span className="m-label">درگاه آنلاین</span>
            <span className="m-value" style={{ fontSize: "0.95rem" }}>
              {onlinePay ? "فعال" : "خاموش"}
            </span>
          </span>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <h3>در انتظار تسویه</h3>
            <div className="sub">سفارش‌های کارت‌به‌کارت یا آنلاین که هنوز پرداختشان تایید نشده</div>
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>سفارش</th>
                <th>مشتری</th>
                <th>روش</th>
                <th>مبلغ</th>
                <th>ثبت‌شده</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.length ? (
                pending.map((o) => (
                  <tr key={o.orderNo}>
                    <td className="adm-cell-main">{o.orderNo}</td>
                    <td>{o.customer.name}</td>
                    <td>{PAY_METHOD_LABEL[o.paymentMethod]}</td>
                    <td className="amount">{fmtPrice(orderPayable(o))} تومان</td>
                    <td className="adm-cell-sub">{o.createdLabel}</td>
                    <td>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => onMarkPaid(o.orderNo)}>
                        تایید پرداخت
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={6} text="پرداخت معلقی وجود ندارد" />
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-grid-2-even">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>شماره کارت دریافت وجه</h3>
          </div>
          <form
            className="form-grid"
            style={{ padding: 18 }}
            onSubmit={(e) => {
              e.preventDefault();
              onSavePayments({ cardHolder: holder, cardNumber, bankName: bank }, online);
            }}
          >
            <div>
              <label htmlFor="pay-holder">نام صاحب حساب</label>
              <input id="pay-holder" value={holder} onChange={(e) => setHolder(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pay-card">شماره کارت</label>
              <input id="pay-card" dir="ltr" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pay-bank">نام بانک</label>
              <input id="pay-bank" value={bank} onChange={(e) => setBank(e.target.value)} />
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
            <h3>درگاه پرداخت آنلاین</h3>
          </div>
          <div className="acc-setting-row" style={{ margin: "0 18px" }}>
            <div>
              <b>فعال‌سازی زرین‌پال</b>
              <span className="hint">گزینه پرداخت آنلاین در تسویه‌حساب دیده می‌شود</span>
            </div>
            <label className="acc-switch">
              <input
                type="checkbox"
                checked={online}
                onChange={(e) => {
                  setOnline(e.target.checked);
                  onSavePayments({ cardHolder: holder, cardNumber, bankName: bank }, e.target.checked);
                }}
              />
              <span className="track" />
              <span className="thumb" />
            </label>
          </div>
          <p className="hint" style={{ padding: "0 18px 18px" }}>
            با روشن کردن این گزینه، «پرداخت آنلاین» در تسویه‌حساب دیده می‌شود. مرچنت‌آیدی و حالت سندباکس را در متغیرهای محیطی سرور تنظیم کنید.
          </p>
        </div>
      </div>
    </div>
  );
}
