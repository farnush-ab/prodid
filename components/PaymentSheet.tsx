"use client";

import { Icon } from "@/lib/icons";
import { fmtPrice, qtyLabel, toFa } from "@/lib/format";
import type { Product } from "@/lib/data";

export function PaymentSheet({
  items,
  total,
  hasWeight,
  phone,
  busy,
  coupon,
  subtotal,
  onPay,
}: {
  items: { p: Product; qty: number }[];
  total: number;
  hasWeight: boolean;
  phone?: string;
  busy?: boolean;
  coupon?: { code: string; percent: number } | null;
  subtotal?: number;
  onPay: () => void;
}) {
  const discount = coupon && subtotal != null ? Math.max(0, subtotal - total) : 0;
  return (
    <div className="pay-sheet">
      <div className="pay-amount-box">
        <span>مبلغ قابل پرداخت</span>
        <b>
          {fmtPrice(total)} <small>تومان</small>
        </b>
        {hasWeight ? <em>مبلغ محصولات وزنی تقریبی است</em> : null}
      </div>

      <div className="pay-sheet-items">
        {items.map(({ p, qty }) => (
          <div className="pay-sheet-row" key={p.id}>
            <span>
              {p.name} × {qtyLabel(p, qty)}
            </span>
            <span>{fmtPrice(p.price! * qty)}</span>
          </div>
        ))}
        {coupon && discount ? (
          <div className="pay-sheet-row">
            <span>
              تخفیف {coupon.percent}٪ ({coupon.code})
            </span>
            <span>−{fmtPrice(discount)}</span>
          </div>
        ) : null}
      </div>

      {phone ? (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          پرداخت با حساب <b className="num" dir="ltr">{toFa(phone)}</b>
        </p>
      ) : null}

      <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={onPay}>
        <Icon name="card" /> {busy ? "در حال انتقال به درگاه…" : "پرداخت از طریق زرین‌پال"}
      </button>
      <p className="muted text-center mt-1">پس از پرداخت، به‌صورت خودکار به همین صفحه برمی‌گردید.</p>
    </div>
  );
}
