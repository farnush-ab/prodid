import { listAllOrders } from "@/lib/order-server";
import { getLiveCatalog, getStoreSettings } from "@/lib/catalog-server";
import { lastSeenLabel, relativeFaDate, toAdminOrder } from "@/lib/admin-format";
import { isStaffRole, type StaffRole } from "@/lib/roles";
import { User } from "@/models/User";
import { OtpLog } from "@/models/OtpLog";
import { Order } from "@/models/Order";
import type { AdminCustomer, AdminOrder, OtpLogEntry, TeamMember } from "@/lib/admin-data";
import type { Product } from "@/lib/data";
import type { StoreSettings } from "@/lib/store-settings";
import type { AdminSection } from "@/lib/roles";
import type { CouponRecord } from "@/lib/coupon";
import { orderPayable } from "@/lib/coupon";
import { listAllCoupons } from "@/lib/coupon-server";

export interface AdminNotification {
  icon: string;
  title: string;
  time: string;
  view?: AdminSection;
}

export interface AdminMe {
  name: string;
  phone: string;
  role: StaffRole;
}

export interface AdminState {
  me: AdminMe;
  orders: AdminOrder[];
  products: (Product & { sold: number })[];
  categories: { id: string; name: string; ic: string; soon: boolean }[];
  customers: AdminCustomer[];
  team: TeamMember[];
  settings: StoreSettings;
  otpLog: OtpLogEntry[];
  revenueSeries: number[];
  notifications: AdminNotification[];
  coupons: CouponRecord[];
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function lastNDaysRevenue(orders: AdminOrder[], n = 14): number[] {
  const days = Array.from({ length: n }, () => 0);
  const today = startOfDay(new Date());
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const d = startOfDay(new Date(o.createdAt));
    const diff = Math.round((today - d) / 86400000);
    const idx = n - 1 - diff;
    if (idx >= 0 && idx < n) days[idx] += orderPayable(o);
  }
  return days;
}

export async function buildAdminState(me: { name: string; phone: string; role: StaffRole }): Promise<AdminState> {
  const [rawOrders, catalog, settings, users, logs, coupons] = await Promise.all([
    listAllOrders(300),
    getLiveCatalog(),
    getStoreSettings(),
    User.find().sort({ createdAt: -1 }).limit(500).lean(),
    OtpLog.find().sort({ createdAt: -1 }).limit(80).lean(),
    listAllCoupons(),
  ]);

  const orders = rawOrders.map(toAdminOrder);

  const sold = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const it of o.items) {
      sold.set(it.productId, (sold.get(it.productId) || 0) + it.qty);
    }
  }
  const products = catalog.products.map((p) => ({ ...p, sold: Math.round((sold.get(p.id) || 0) * 1000) / 1000 }));

  const ordersByPhone = new Map<string, AdminOrder[]>();
  for (const o of orders) {
    const list = ordersByPhone.get(o.customer.phone) || [];
    list.push(o);
    ordersByPhone.set(o.customer.phone, list);
  }

  const customerMap = new Map<string, AdminCustomer>();
  for (const u of users) {
    const hist = ordersByPhone.get(u.phone) || [];
    const spent = hist.filter((o) => o.status !== "cancelled").reduce((s, o) => s + orderPayable(o), 0);
    customerMap.set(u.phone, {
      name: u.name || hist[0]?.customer.name || "بدون نام",
      phone: u.phone,
      address: u.address || hist[0]?.customer.address || "",
      birthDate: u.birthDate || "",
      orders: hist.length,
      spent,
      last: hist[0] ? relativeFaDate(hist[0].createdAt) : "—",
      status: u.blocked || settings.blockedPhones.includes(u.phone) ? "blocked" : "active",
    });
  }
  for (const [phone, hist] of ordersByPhone) {
    if (customerMap.has(phone)) continue;
    const spent = hist.filter((o) => o.status !== "cancelled").reduce((s, o) => s + orderPayable(o), 0);
    customerMap.set(phone, {
      name: hist[0].customer.name,
      phone,
      address: hist[0].customer.address,
      birthDate: "",
      orders: hist.length,
      spent,
      last: relativeFaDate(hist[0].createdAt),
      status: settings.blockedPhones.includes(phone) ? "blocked" : "active",
    });
  }
  const customers = [...customerMap.values()].sort((a, b) => b.orders - a.orders || b.spent - a.spent);

  const team: TeamMember[] = users
    .filter((u) => isStaffRole(u.role))
    .map((u) => ({
      name: u.name || "بدون نام",
      phone: u.phone,
      role: u.role as StaffRole,
      active: lastSeenLabel(u.lastLoginAt),
      status: u.staffActive === false ? "suspended" : "active",
    }));

  const otpLog: OtpLogEntry[] = logs.map((l) => ({
    phone: l.phone,
    time: relativeFaDate(l.createdAt),
    attempts: l.attempts,
    result: l.result,
  }));

  const pending = await Order.countDocuments({ status: "pending" });
  const unpaid = await Order.countDocuments({
    status: { $nin: ["cancelled"] },
    paymentStatus: "unpaid",
    paymentMethod: { $ne: "cod" },
  });
  const notifications: AdminNotification[] = [];
  if (pending)
    notifications.push({
      icon: "package",
      title: `${pending} سفارش در انتظار تایید است`,
      time: "همین حالا",
      view: "orders",
    });
  if (unpaid)
    notifications.push({
      icon: "wallet",
      title: `${unpaid} پرداخت نیاز به تایید دستی دارد`,
      time: "همین حالا",
      view: "payments",
    });
  const unavailable = products.filter((p) => !p.available).length;
  if (unavailable)
    notifications.push({
      icon: "box",
      title: `${unavailable} محصول ناموجود است`,
      time: "کاتالوگ",
      view: "products",
    });
  if (settings.features.maintenance)
    notifications.push({
      icon: "info",
      title: "حالت تعمیر و نگهداری فعال است",
      time: "تنظیمات",
      view: "settings",
    });

  return {
    me: { name: me.name || "مدیر", phone: me.phone, role: me.role },
    orders,
    products,
    categories: catalog.categories,
    customers,
    team,
    settings,
    otpLog,
    revenueSeries: lastNDaysRevenue(orders),
    notifications,
    coupons,
  };
}
