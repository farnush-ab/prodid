"use client";

import { useState } from "react";
import { AdminShell, type AdminView } from "@/components/admin/AdminShell";
import { DashboardView } from "@/components/admin/DashboardView";
import { OrdersView } from "@/components/admin/OrdersView";
import { ProductsView } from "@/components/admin/ProductsView";
import { CategoriesView } from "@/components/admin/CategoriesView";
import { CustomersView } from "@/components/admin/CustomersView";
import { PaymentsView } from "@/components/admin/PaymentsView";
import { DeliveryView } from "@/components/admin/DeliveryView";
import { AssistantView } from "@/components/admin/AssistantView";
import { SecurityView } from "@/components/admin/SecurityView";
import { TeamView } from "@/components/admin/TeamView";
import { SettingsView } from "@/components/admin/SettingsView";
import { ReportsView } from "@/components/admin/ReportsView";
import { toast } from "@/lib/toast";
import type { Category, Product } from "@/lib/data";
import type { OrderStatus } from "@/lib/order";
import {
  ADMIN_ORDERS,
  ADMIN_CUSTOMERS,
  ADMIN_TEAM,
  OTP_LOG,
  INITIAL_BLOCKED_PHONES,
  INITIAL_ZONES,
  cloneCategories,
  cloneProducts,
  cloneDeliveryDays,
  cloneDeliverySlots,
  type AdminOrder,
  type AdminCustomer,
  type TeamMember,
} from "@/lib/admin-data";
import { RECIPES, type RecipeTip } from "@/lib/assistant-content";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "delivering",
  delivering: "delivered",
};

export default function AdminPage() {
  const [view, setView] = useState<AdminView>("dashboard");

  const [orders, setOrders] = useState<AdminOrder[]>(() => ADMIN_ORDERS.map((o) => ({ ...o })));
  const [products, setProducts] = useState<(Product & { sold: number })[]>(() => cloneProducts());
  const [categories, setCategories] = useState<Category[]>(() => cloneCategories());
  const [customers, setCustomers] = useState<AdminCustomer[]>(() => ADMIN_CUSTOMERS.map((c) => ({ ...c })));
  const [zones, setZones] = useState(() => INITIAL_ZONES.map((z) => ({ ...z })));
  const [days, setDays] = useState(() => cloneDeliveryDays());
  const [slots, setSlots] = useState(() => cloneDeliverySlots());
  const [recipes, setRecipes] = useState<RecipeTip[]>(() => RECIPES.map((r) => ({ ...r })));
  const [blocked, setBlocked] = useState<string[]>(() => [...INITIAL_BLOCKED_PHONES]);
  const [team, setTeam] = useState<TeamMember[]>(() => ADMIN_TEAM.map((t) => ({ ...t })));
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [assistantDefaultOn, setAssistantDefaultOn] = useState(true);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  function advanceOrder(orderNo: string) {
    setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? { ...o, status: NEXT_STATUS[o.status] || o.status } : o)));
    toast(`وضعیت سفارش ${orderNo} به‌روزرسانی شد`);
  }
  function cancelOrder(orderNo: string) {
    setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? { ...o, status: "cancelled" } : o)));
    toast(`سفارش ${orderNo} لغو شد`);
  }
  function markOrderPaid(orderNo: string) {
    setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? { ...o, paymentStatus: "paid" } : o)));
    toast(`پرداخت سفارش ${orderNo} تایید شد`);
  }

  function saveProduct(product: Product & { sold: number }, isNew: boolean) {
    setProducts((prev) => (isNew ? [product, ...prev] : prev.map((p) => (p.id === product.id ? product : p))));
    toast(isNew ? "محصول جدید افزوده شد" : "محصول به‌روزرسانی شد");
  }
  function deleteProduct(id: string) {
    if (!confirm("این محصول حذف شود؟")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast("محصول حذف شد");
  }
  function toggleProductAvailable(id: string, value: boolean) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, available: value } : p)));
    toast(value ? "محصول موجود شد" : "محصول ناموجود شد");
  }

  function reorderCategory(from: number, to: number) {
    if (to < 0 || to >= categories.length) return;
    setCategories((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }
  function toggleCategorySoon(id: string, value: boolean) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, soon: value } : c)));
    toast(value ? "دسته به‌عنوان «به‌زودی» علامت خورد" : "دسته فعال شد");
  }
  function saveCategory(category: Category, isNew: boolean) {
    setCategories((prev) => (isNew ? [...prev, category] : prev.map((c) => (c.id === category.id ? category : c))));
    toast(isNew ? "دسته‌بندی جدید افزوده شد" : "دسته‌بندی به‌روزرسانی شد");
  }
  function deleteCategory(id: string) {
    if (!confirm("این دسته‌بندی حذف شود؟")) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast("دسته‌بندی حذف شد");
  }

  function toggleCustomerBlock(phone: string, value: boolean) {
    setCustomers((prev) => prev.map((c) => (c.phone === phone ? { ...c, status: value ? "blocked" : "active" } : c)));
    toast(value ? "حساب مسدود شد" : "حساب رفع مسدودی شد");
  }

  function toggleDay(id: string, value: boolean) {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, enabled: value } : d)));
  }
  function toggleSlot(id: string, value: boolean) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: value } : s)));
  }
  function addZone() {
    setZones((prev) => [...prev, { name: "منطقه جدید", fee: 0 }]);
    toast("منطقه جدید افزوده شد؛ نام و هزینه را ویرایش کنید");
  }
  function removeZone(index: number) {
    setZones((prev) => prev.filter((_, i) => i !== index));
  }

  function saveRecipe(recipe: RecipeTip, index: number | null) {
    setRecipes((prev) => (index === null ? [recipe, ...prev] : prev.map((r, i) => (i === index ? recipe : r))));
    toast("پیشنهاد ذخیره شد");
  }
  function deleteRecipe(index: number) {
    if (!confirm("این پیشنهاد حذف شود؟")) return;
    setRecipes((prev) => prev.filter((_, i) => i !== index));
  }

  function addBlockedPhone(phone: string) {
    setBlocked((prev) => [...prev, phone]);
    toast("شماره مسدود شد");
  }
  function removeBlockedPhone(index: number) {
    setBlocked((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTeamStatus(index: number) {
    setTeam((prev) => prev.map((t, i) => (i === index ? { ...t, status: t.status === "active" ? "suspended" : "active" } : t)));
  }
  function removeTeamMember(index: number) {
    if (!confirm("این عضو از تیم حذف شود؟")) return;
    setTeam((prev) => prev.filter((_, i) => i !== index));
  }
  function addTeamMember(member: TeamMember) {
    setTeam((prev) => [...prev, member]);
    toast("دعوت‌نامه ارسال شد");
  }

  function toggleMaintenance(value: boolean) {
    setMaintenanceOn(value);
    toast(value ? "حالت تعمیر و نگهداری فعال شد" : "حالت تعمیر و نگهداری غیرفعال شد");
  }

  function search(q: string) {
    const query = q.toLowerCase();
    const hits: { id: string; label: string; view: AdminView }[] = [];
    orders.forEach((o) => {
      if (o.orderNo.toLowerCase().includes(query) || o.customer.name.toLowerCase().includes(query) || o.customer.phone.includes(query))
        hits.push({ id: `o-${o.orderNo}`, label: `🧾 ${o.orderNo} — ${o.customer.name}`, view: "orders" });
    });
    products.forEach((p) => {
      if (p.name.toLowerCase().includes(query)) hits.push({ id: `p-${p.id}`, label: `📦 ${p.name}`, view: "products" });
    });
    customers.forEach((c) => {
      if (c.name.toLowerCase().includes(query) || c.phone.includes(query)) hits.push({ id: `c-${c.phone}`, label: `👤 ${c.name} — ${c.phone}`, view: "customers" });
    });
    return hits;
  }

  return (
    <AdminShell active={view} onNavigate={setView} pendingOrders={pendingOrders} maintenanceOn={maintenanceOn} onSearch={search}>
      {view === "dashboard" && <DashboardView orders={orders} products={products} onNavigate={setView} />}
      {view === "orders" && <OrdersView orders={orders} onAdvance={advanceOrder} onCancel={cancelOrder} onMarkPaid={markOrderPaid} />}
      {view === "payments" && <PaymentsView orders={orders} onMarkPaid={markOrderPaid} />}
      {view === "products" && (
        <ProductsView products={products} categories={categories} onSave={saveProduct} onDelete={deleteProduct} onToggleAvailable={toggleProductAvailable} />
      )}
      {view === "categories" && (
        <CategoriesView categories={categories} onReorder={reorderCategory} onToggleSoon={toggleCategorySoon} onSave={saveCategory} onDelete={deleteCategory} />
      )}
      {view === "customers" && <CustomersView customers={customers} orders={orders} onToggleBlock={toggleCustomerBlock} />}
      {view === "team" && <TeamView team={team} onToggleStatus={toggleTeamStatus} onRemove={removeTeamMember} onAdd={addTeamMember} />}
      {view === "delivery" && <DeliveryView days={days} slots={slots} zones={zones} onToggleDay={toggleDay} onToggleSlot={toggleSlot} onAddZone={addZone} onRemoveZone={removeZone} />}
      {view === "assistant" && (
        <AssistantView recipes={recipes} defaultOn={assistantDefaultOn} onToggleDefault={setAssistantDefaultOn} onSave={saveRecipe} onDelete={deleteRecipe} />
      )}
      {view === "security" && <SecurityView log={OTP_LOG} blocked={blocked} onAddBlocked={addBlockedPhone} onRemoveBlocked={removeBlockedPhone} />}
      {view === "settings" && <SettingsView maintenanceOn={maintenanceOn} onToggleMaintenance={toggleMaintenance} />}
      {view === "reports" && <ReportsView orders={orders} products={products} />}
    </AdminShell>
  );
}
