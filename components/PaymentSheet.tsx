"use client";

import { Icon } from "@/lib/icons";
import { fmtPrice, qtyLabel, toFa } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { Product } from "@/lib/data";

export function PaymentSheet({
  items,
  total,
  hasWeight,
  phone,
}: {
  items: { p: Product; qty: number }[];
  total: number;
  hasWeight: boolean;
  phone?: string;
}) {
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
      </div>

      {phone ? (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          پرداخت با حساب <b className="num" dir="ltr">{toFa(phone)}</b>
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => toast("درگاه زرین‌پال به‌زودی به همین صفحه وصل می‌شود")}
      >
        <Icon name="card" /> پرداخت از طریق زرین‌پال
      </button>
      <p className="muted text-center mt-1">فعلا درگاه فعال نیست؛ اتصال بعدی روی همین مرحله انجام می‌شود.</p>
    </div>
  );
}
