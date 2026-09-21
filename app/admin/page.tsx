"use client";

import { useCallback, useEffect, useState } from "react";
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
import { CouponsView } from "@/components/admin/CouponsView";
import { toast } from "@/lib/toast";
import { adminFetch } from "@/lib/admin-client";
import { canAccessSection, canMutate, type StaffRole } from "@/lib/roles";
import type { Category, Product } from "@/lib/data";
import type { OrderStatus } from "@/lib/order";
import type { AdminCustomer, AdminOrder, OtpLogEntry, TeamMember } from "@/lib/admin-data";
import type { RecipeTip } from "@/lib/assistant-content";
import type { StoreSettings } from "@/lib/store-settings";
import { DEFAULT_SETTINGS } from "@/lib/store-settings";
import type { AdminMe, AdminNotification, AdminState } from "@/lib/admin-state";
import type { CouponRecord } from "@/lib/coupon";

type AdminProduct = Product & { sold: number };

export default function AdminPage() {
  const [view, setView] = useState<AdminView>("dashboard");
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [me, setMe] = useState<AdminMe>({ name: "", phone: "", role: "support" });
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [otpLog, setOtpLog] = useState<OtpLogEntry[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<number[]>(Array(14).fill(0));
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);

  const applyState = useCallback((state: AdminState) => {
    setMe(state.me);
    setOrders(state.orders);
    setProducts(state.products);
    setCategories(state.categories);
    setCustomers(state.customers);
    setTeam(state.team);
    setSettings(state.settings);
    setOtpLog(state.otpLog);
    setRevenueSeries(state.revenueSeries);
    setNotifications(state.notifications);
    setCoupons(state.coupons);
  }, []);

  const reload = useCallback(async () => {
    const state = await adminFetch<AdminState>("/api/admin/state");
    applyState(state);
    return state;
  }, [applyState]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await adminFetch<AdminState>("/api/admin/state");
        if (cancelled) return;
        setMe(state.me);
        setOrders(state.orders);
        setProducts(state.products);
        setCategories(state.categories);
        setCustomers(state.customers);
        setTeam(state.team);
        setSettings(state.settings);
        setOtpLog(state.otpLog);
        setRevenueSeries(state.revenueSeries);
        setNotifications(state.notifications);
        setCoupons(state.coupons);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "بارگذاری پنل انجام نشد");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(label: string, fn: () => Promise<void>) {
    try {
      await fn();
      toast(label);
    } catch (err) {
      toast(err instanceof Error ? err.message : "عملیات انجام نشد");
    }
  }

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const role: StaffRole = me.role;

  function go(next: AdminView) {
    if (!canAccessSection(role, next)) {
      toast("به این بخش دسترسی ندارید");
      return;
    }
    setView(next);
  }

  async function patchOrder(orderNo: string, body: Record<string, unknown>, msg: string) {
    await run(msg, async () => {
      const data = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${encodeURIComponent(orderNo)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? data.order : o)));
    });
  }

  if (loading) {
    return (
      <div className="adm-shell">
        <div className="adm-main">
          <main className="adm-viewport">
            <div className="adm-empty">
              <b>در حال بارگذاری پنل…</b>
              <p>سفارش‌ها و کاتالوگ از سرور خوانده می‌شود.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adm-shell">
        <div className="adm-main">
          <main className="adm-viewport">
            <div className="adm-empty">
              <b>{error}</b>
              <p>اگر مالک فروشگاه هستید، شماره شما باید در ADMIN_PHONES تنظیم شده باشد.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => location.reload()}>
                تلاش دوباره
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      active={view}
      onNavigate={go}
      pendingOrders={pendingOrders}
      maintenanceOn={settings.features.maintenance}
      role={role}
      me={me}
      notifications={notifications}
      onSearch={(q) => {
        const query = q.toLowerCase();
        const hits: { id: string; label: string; kind: string; icon: string; view: AdminView }[] = [];
        orders.forEach((o) => {
          if (o.orderNo.toLowerCase().includes(query) || o.customer.name.toLowerCase().includes(query) || o.customer.phone.includes(query))
            hits.push({ id: `o-${o.orderNo}`, label: `${o.orderNo} — ${o.customer.name}`, kind: "سفارش", icon: "package", view: "orders" });
        });
        products.forEach((p) => {
          if (p.name.toLowerCase().includes(query)) hits.push({ id: `p-${p.id}`, label: p.name, kind: "محصول", icon: "box", view: "products" });
        });
        customers.forEach((c) => {
          if (c.name.toLowerCase().includes(query) || c.phone.includes(query))
            hits.push({ id: `c-${c.phone}`, label: `${c.name} — ${c.phone}`, kind: "مشتری", icon: "users", view: "customers" });
        });
        coupons.forEach((c) => {
          if (c.code.toLowerCase().includes(query) || c.note.toLowerCase().includes(query))
            hits.push({ id: `cp-${c.code}`, label: `${c.code} — ${c.percent}٪`, kind: "تخفیف", icon: "award", view: "coupons" });
        });
        return hits.filter((h) => canAccessSection(role, h.view));
      }}
    >
      {view === "dashboard" && (
        <DashboardView
          orders={orders}
          products={products}
          revenueSeries={revenueSeries}
          greetingName={me.name}
          categories={categories}
          onNavigate={go}
          onDrillToOrders={(status) => {
            setOrderStatusFilter(status);
            go("orders");
          }}
        />
      )}
      {view === "orders" && (
        <OrdersView
          orders={orders}
          statusFilter={orderStatusFilter}
          onStatusFilter={setOrderStatusFilter}
          onAdvance={(orderNo) => patchOrder(orderNo, { action: "advance" }, `وضعیت سفارش ${orderNo} به‌روزرسانی شد`)}
          onCancel={(orderNo) => patchOrder(orderNo, { action: "cancel" }, `سفارش ${orderNo} لغو شد`)}
          onMarkPaid={(orderNo) => patchOrder(orderNo, { action: "markPaid" }, `پرداخت سفارش ${orderNo} تایید شد`)}
          onSaveTotals={(orderNo, finalTotal, deliveryFee) =>
            patchOrder(orderNo, { finalTotal, deliveryFee }, `مبلغ نهایی سفارش ${orderNo} ذخیره شد`)
          }
        />
      )}
      {view === "payments" && (
        <PaymentsView
          orders={orders}
          payments={settings.payments}
          onlinePay={settings.features.onlinePay}
          onMarkPaid={(orderNo) => patchOrder(orderNo, { action: "markPaid" }, `پرداخت سفارش ${orderNo} تایید شد`)}
          onSavePayments={async (payments, onlinePay) => {
            await run("اطلاعات پرداخت ذخیره شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "payments", payments, features: { ...settings.features, onlinePay } }),
              });
              setSettings(data.settings);
            });
          }}
        />
      )}
      {view === "coupons" && (
        <CouponsView
          coupons={coupons}
          canEdit={canMutate(role, "coupons")}
          onSave={async (coupon, isNew) => {
            await run(isNew ? "کد تخفیف افزوده شد" : "کد تخفیف به‌روزرسانی شد", async () => {
              if (isNew) {
                const data = await adminFetch<{ coupon: CouponRecord }>("/api/admin/coupons", {
                  method: "POST",
                  body: JSON.stringify(coupon),
                });
                setCoupons((prev) => [data.coupon, ...prev]);
              } else {
                const data = await adminFetch<{ coupon: CouponRecord }>(`/api/admin/coupons/${encodeURIComponent(coupon.code)}`, {
                  method: "PATCH",
                  body: JSON.stringify(coupon),
                });
                setCoupons((prev) => prev.map((c) => (c.code === coupon.code ? data.coupon : c)));
              }
            });
          }}
          onDelete={async (code) => {
            await run("کد تخفیف حذف شد", async () => {
              await adminFetch(`/api/admin/coupons/${encodeURIComponent(code)}`, { method: "DELETE" });
              setCoupons((prev) => prev.filter((c) => c.code !== code));
            });
          }}
          onToggleActive={async (code, active) => {
            await run(active ? "کد تخفیف فعال شد" : "کد تخفیف خاموش شد", async () => {
              const data = await adminFetch<{ coupon: CouponRecord }>(`/api/admin/coupons/${encodeURIComponent(code)}`, {
                method: "PATCH",
                body: JSON.stringify({ active }),
              });
              setCoupons((prev) => prev.map((c) => (c.code === code ? data.coupon : c)));
            });
          }}
        />
      )}
      {view === "products" && (
        <ProductsView
          products={products}
          categories={categories}
          onSave={async (product, isNew) => {
            await run(isNew ? "محصول جدید افزوده شد" : "محصول به‌روزرسانی شد", async () => {
              if (isNew) {
                const data = await adminFetch<{ product: AdminProduct }>("/api/admin/products", {
                  method: "POST",
                  body: JSON.stringify(product),
                });
                setProducts((prev) => [data.product, ...prev]);
              } else {
                const data = await adminFetch<{ product: Product }>(`/api/admin/products/${encodeURIComponent(product.id)}`, {
                  method: "PATCH",
                  body: JSON.stringify(product),
                });
                setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...data.product } : p)));
              }
            });
          }}
          onDelete={async (id) => {
            if (!confirm("این محصول حذف شود؟")) return;
            await run("محصول حذف شد", async () => {
              await adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
              setProducts((prev) => prev.filter((p) => p.id !== id));
            });
          }}
          onToggleAvailable={async (id, value) => {
            await run(value ? "محصول موجود شد" : "محصول ناموجود شد", async () => {
              await adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
                method: "PATCH",
                body: JSON.stringify({ available: value }),
              });
              setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, available: value } : p)));
            });
          }}
        />
      )}
      {view === "categories" && (
        <CategoriesView
          categories={categories}
          onReorder={async (from, to) => {
            if (to < 0 || to >= categories.length) return;
            const next = [...categories];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            setCategories(next);
            try {
              await adminFetch("/api/admin/categories", { method: "PUT", body: JSON.stringify({ ids: next.map((c) => c.id) }) });
            } catch (err) {
              toast(err instanceof Error ? err.message : "جابه‌جایی ذخیره نشد");
              await reload();
            }
          }}
          onToggleSoon={async (id, value) => {
            await run(value ? "دسته به‌عنوان «به‌زودی» علامت خورد" : "دسته فعال شد", async () => {
              await adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
                method: "PATCH",
                body: JSON.stringify({ soon: value }),
              });
              setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, soon: value } : c)));
            });
          }}
          onSave={async (category, isNew) => {
            await run(isNew ? "دسته‌بندی جدید افزوده شد" : "دسته‌بندی به‌روزرسانی شد", async () => {
              if (isNew) {
                const data = await adminFetch<{ category: Category }>("/api/admin/categories", {
                  method: "POST",
                  body: JSON.stringify(category),
                });
                setCategories((prev) => [...prev, data.category]);
              } else {
                const data = await adminFetch<{ category: Category }>(`/api/admin/categories/${encodeURIComponent(category.id)}`, {
                  method: "PATCH",
                  body: JSON.stringify(category),
                });
                setCategories((prev) => prev.map((c) => (c.id === category.id ? data.category : c)));
              }
            });
          }}
          onDelete={async (id) => {
            if (!confirm("این دسته‌بندی حذف شود؟")) return;
            await run("دسته‌بندی حذف شد", async () => {
              await adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
              setCategories((prev) => prev.filter((c) => c.id !== id));
            });
          }}
        />
      )}
      {view === "customers" && (
        <CustomersView
          customers={customers}
          orders={orders}
          onToggleBlock={async (phone, value) => {
            await run(value ? "حساب مسدود شد" : "حساب رفع مسدودی شد", async () => {
              await adminFetch(`/api/admin/customers/${encodeURIComponent(phone)}`, {
                method: "PATCH",
                body: JSON.stringify({ blocked: value }),
              });
              setCustomers((prev) => prev.map((c) => (c.phone === phone ? { ...c, status: value ? "blocked" : "active" } : c)));
              setSettings((prev) => {
                const set = new Set(prev.blockedPhones);
                if (value) set.add(phone);
                else set.delete(phone);
                return { ...prev, blockedPhones: [...set] };
              });
            });
          }}
        />
      )}
      {view === "team" && (
        <TeamView
          team={team}
          onToggleStatus={async (phone) => {
            const member = team.find((t) => t.phone === phone);
            if (!member) return;
            const nextActive = member.status !== "active";
            await run(nextActive ? "عضو فعال شد" : "عضو غیرفعال شد", async () => {
              await adminFetch(`/api/admin/team/${encodeURIComponent(phone)}`, {
                method: "PATCH",
                body: JSON.stringify({ staffActive: nextActive }),
              });
              setTeam((prev) => prev.map((t) => (t.phone === phone ? { ...t, status: nextActive ? "active" : "suspended" } : t)));
            });
          }}
          onRemove={async (phone) => {
            if (!confirm("این عضو از تیم حذف شود؟")) return;
            await run("عضو از تیم حذف شد", async () => {
              await adminFetch(`/api/admin/team/${encodeURIComponent(phone)}`, { method: "DELETE" });
              setTeam((prev) => prev.filter((t) => t.phone !== phone));
            });
          }}
          onAdd={async (member) => {
            await run("عضو به تیم اضافه شد — با همان شماره وارد پنل می‌شود", async () => {
              const data = await adminFetch<{ member: TeamMember }>("/api/admin/team", {
                method: "POST",
                body: JSON.stringify(member),
              });
              setTeam((prev) => [...prev, data.member]);
            });
          }}
        />
      )}
      {view === "delivery" && (
        <DeliveryView
          days={settings.delivery.days}
          slots={settings.delivery.slots}
          zones={settings.delivery.zones}
          minOrder={settings.brand.minOrder}
          deliveryNote={settings.brand.deliveryFeeNote}
          onToggleDay={async (id, value) => {
            const days = settings.delivery.days.map((d) => (d.id === id ? { ...d, enabled: value } : d));
            await run(value ? "روز تحویل فعال شد" : "روز تحویل غیرفعال شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "delivery", delivery: { ...settings.delivery, days } }),
              });
              setSettings(data.settings);
            });
          }}
          onToggleSlot={async (id, value) => {
            const slots = settings.delivery.slots.map((s) => (s.id === id ? { ...s, enabled: value } : s));
            await run(value ? "بازه زمانی فعال شد" : "بازه زمانی غیرفعال شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "delivery", delivery: { ...settings.delivery, slots } }),
              });
              setSettings(data.settings);
            });
          }}
          onSaveZones={async (zones) => {
            await run("مناطق ارسال ذخیره شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "delivery", delivery: { ...settings.delivery, zones } }),
              });
              setSettings(data.settings);
            });
          }}
          onSaveLimits={async (minOrder, deliveryFeeNote) => {
            await run("تنظیمات ارسال ذخیره شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({
                  section: "delivery",
                  delivery: settings.delivery,
                  brand: { minOrder, deliveryFeeNote },
                }),
              });
              setSettings(data.settings);
            });
          }}
        />
      )}
      {view === "assistant" && (
        <AssistantView
          recipes={settings.assistant.recipes}
          defaultOn={settings.assistant.defaultOn}
          intro={settings.assistant.intro}
          greet={settings.assistant.greet}
          peek={settings.assistant.peek}
          products={products}
          onToggleDefault={async (value) => {
            await run(value ? "دستیار برای کاربران جدید روشن است" : "دستیار برای کاربران جدید خاموش است", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "assistant", assistant: { ...settings.assistant, defaultOn: value } }),
              });
              setSettings(data.settings);
            });
          }}
          onSaveMessages={async (intro, greet, peek) => {
            await run("پیام‌های دستیار ذخیره شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "assistant", assistant: { ...settings.assistant, intro, greet, peek } }),
              });
              setSettings(data.settings);
            });
          }}
          onSave={async (recipe: RecipeTip, index: number | null) => {
            await run("پیشنهاد ذخیره شد", async () => {
              const recipes =
                index === null
                  ? [recipe, ...settings.assistant.recipes]
                  : settings.assistant.recipes.map((r, i) => (i === index ? recipe : r));
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "assistant", assistant: { ...settings.assistant, recipes } }),
              });
              setSettings(data.settings);
            });
          }}
          onDelete={async (index) => {
            if (!confirm("این پیشنهاد حذف شود؟")) return;
            await run("پیشنهاد حذف شد", async () => {
              const recipes = settings.assistant.recipes.filter((_, i) => i !== index);
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "assistant", assistant: { ...settings.assistant, recipes } }),
              });
              setSettings(data.settings);
            });
          }}
        />
      )}
      {view === "security" && (
        <SecurityView
          log={otpLog}
          blocked={settings.blockedPhones}
          otp={settings.otp}
          onSaveOtp={async (otp) => {
            await run("تنظیمات OTP ذخیره شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "otp", otp }),
              });
              setSettings(data.settings);
            });
          }}
          onAddBlocked={async (phone) => {
            if (settings.blockedPhones.includes(phone)) {
              toast("این شماره از قبل مسدود است");
              return;
            }
            await run("شماره مسدود شد", async () => {
              await adminFetch(`/api/admin/customers/${encodeURIComponent(phone)}`, {
                method: "PATCH",
                body: JSON.stringify({ blocked: true }),
              });
              setSettings((prev) => ({ ...prev, blockedPhones: [...prev.blockedPhones, phone] }));
              setCustomers((prev) => prev.map((c) => (c.phone === phone ? { ...c, status: "blocked" } : c)));
            });
          }}
          onRemoveBlocked={async (phone) => {
            await run("رفع مسدودی انجام شد", async () => {
              await adminFetch(`/api/admin/customers/${encodeURIComponent(phone)}`, {
                method: "PATCH",
                body: JSON.stringify({ blocked: false }),
              });
              setSettings((prev) => ({ ...prev, blockedPhones: prev.blockedPhones.filter((p) => p !== phone) }));
              setCustomers((prev) => prev.map((c) => (c.phone === phone ? { ...c, status: "active" } : c)));
            });
          }}
        />
      )}
      {view === "settings" && (
        <SettingsView
          brand={settings.brand}
          features={settings.features}
          onSaveBrand={async (brand) => {
            await run("اطلاعات فروشگاه ذخیره شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "settings", brand: { ...settings.brand, ...brand } }),
              });
              setSettings(data.settings);
            });
          }}
          onSaveFeatures={async (features) => {
            await run("تنظیمات امکانات ذخیره شد", async () => {
              const data = await adminFetch<{ settings: StoreSettings }>("/api/admin/settings", {
                method: "PATCH",
                body: JSON.stringify({ section: "settings", features }),
              });
              setSettings(data.settings);
            });
          }}
        />
      )}
      {view === "reports" && <ReportsView orders={orders} products={products} revenueSeries={revenueSeries} categories={categories} />}
    </AdminShell>
  );
}
