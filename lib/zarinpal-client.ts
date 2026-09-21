import type { CreateOrderInput, PublicOrder } from "@/lib/order";

export async function requestZarinpalCheckout(body: Partial<CreateOrderInput> & { orderNo?: string }) {
  const res = await fetch("/api/payments/zarinpal/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; paymentUrl?: string; order?: PublicOrder };
  if (!res.ok) {
    throw new Error(data.error || "اتصال به درگاه انجام نشد");
  }
  if (!data.paymentUrl || !data.order) {
    throw new Error("آدرس درگاه دریافت نشد");
  }
  return { paymentUrl: data.paymentUrl, order: data.order };
}
