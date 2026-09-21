export const STAFF_ROLES = ["owner", "orders", "catalog", "support"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type UserRole = "customer" | StaffRole;

export const TEAM_ROLE_LABEL: Record<StaffRole, string> = {
  owner: "مالک — دسترسی کامل",
  orders: "مدیر سفارش‌ها",
  catalog: "مدیر کاتالوگ",
  support: "پشتیبانی",
};

export type AdminSection =
  | "dashboard"
  | "orders"
  | "payments"
  | "products"
  | "categories"
  | "customers"
  | "team"
  | "delivery"
  | "assistant"
  | "security"
  | "settings"
  | "reports"
  | "coupons";

const ALL_SECTIONS: AdminSection[] = [
  "dashboard",
  "orders",
  "payments",
  "products",
  "categories",
  "customers",
  "team",
  "delivery",
  "assistant",
  "security",
  "settings",
  "reports",
  "coupons",
];

export const ROLE_SECTIONS: Record<StaffRole, AdminSection[]> = {
  owner: ALL_SECTIONS,
  orders: ["dashboard", "orders", "payments", "customers", "delivery", "coupons", "reports"],
  catalog: ["dashboard", "products", "categories", "assistant", "reports"],
  support: ["dashboard", "orders", "customers", "assistant", "coupons", "reports"],
};

export function isStaffRole(role?: string | null): role is StaffRole {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

export function canAccessSection(role: StaffRole, section: AdminSection): boolean {
  return ROLE_SECTIONS[role].includes(section);
}

export function canMutate(
  role: StaffRole,
  action:
    | "orders"
    | "orders.cancel"
    | "products"
    | "categories"
    | "customers"
    | "team"
    | "delivery"
    | "assistant"
    | "security"
    | "settings"
    | "payments"
    | "coupons"
): boolean {
  if (role === "owner") return true;
  switch (action) {
    case "orders":
      return role === "orders" || role === "support";
    case "orders.cancel":
      return role === "orders";
    case "payments":
      return role === "orders";
    case "products":
    case "categories":
      return role === "catalog";
    case "customers":
      return role === "orders" || role === "support";
    case "coupons":
      return role === "orders";
    case "delivery":
      return role === "orders";
    case "assistant":
      return role === "catalog" || role === "support";
    case "team":
    case "security":
    case "settings":
      return false;
    default:
      return false;
  }
}
