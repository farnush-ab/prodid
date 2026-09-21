import { toFa } from "@/lib/format";
import type { OrderStatus } from "@/lib/order";
import type { PublicOrder } from "@/lib/order";
import type { AdminOrder } from "@/lib/admin-data";

export function slugifyId(name: string, fallbackPrefix = "item"): string {
  const trimmed = name.trim().replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "");
  const base = trimmed.slice(0, 40) || fallbackPrefix;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase();
}

export function relativeFaDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startToday - startThat) / 86400000);
  const time = d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `دیروز ${time}`;
  if (diffDays < 7) return `${toFa(diffDays)} روز پیش`;
  return d.toLocaleDateString("fa-IR");
}

export function lastSeenLabel(at: Date | string | null | undefined): string {
  if (!at) return "هنوز وارد نشده";
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return "—";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 2) return "اکنون";
  if (mins < 60) return `${toFa(mins)} دقیقه پیش`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${toFa(hours)} ساعت پیش`;
  return relativeFaDate(d);
}

export function toAdminOrder(order: PublicOrder): AdminOrder {
  return { ...order, createdLabel: relativeFaDate(order.createdAt) };
}

export function isOrderToday(createdAt: string): boolean {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "delivering",
  delivering: "delivered",
};

export const CATALOG_ICON_OPTIONS = [
  "steak",
  "skewer",
  "drumstick",
  "sausage",
  "burger",
  "leaf",
  "bowl",
  "milk",
  "basket",
  "falafel",
  "fish",
  "box",
  "package",
  "flame",
] as const;
