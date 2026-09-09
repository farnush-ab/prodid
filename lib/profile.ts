"use client";

/* ---------------- پروفایل کاربر و تاریخچه سفارش (localStorage) ---------------- */

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number | null;
}

export interface Order {
  date: string;
  items: OrderItem[];
  total: number;
  day: string;
  slot: string;
  pay: string;
}

export interface ProfileData {
  name?: string;
  phone?: string;
  address?: string;
}

const PROFILE_KEY = "prodid_profile";
const ORDERS_KEY = "prodid_orders";

export const Profile = {
  read(): ProfileData {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  },
  write(p: ProfileData) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  },
  clear() {
    localStorage.removeItem(PROFILE_KEY);
  },
};

export const Orders = {
  read(): Order[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]") || [];
    } catch {
      return [];
    }
  },
  add(order: Order) {
    const list = Orders.read();
    list.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
  },
  clear() {
    localStorage.removeItem(ORDERS_KEY);
  },
};

/* ---------------- تنظیمات دستیار هوشمند (localStorage) ---------------- */
const ASSISTANT_KEY = "prodid_assistant";

export const AssistantPrefs = {
  isDisabled(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return !!JSON.parse(localStorage.getItem(ASSISTANT_KEY) || "{}")?.disabled;
    } catch {
      return false;
    }
  },
  setDisabled(disabled: boolean) {
    let state: Record<string, unknown> = {};
    try {
      state = JSON.parse(localStorage.getItem(ASSISTANT_KEY) || "{}") || {};
    } catch {
      state = {};
    }
    if (disabled) state.disabled = true;
    else delete state.disabled;
    localStorage.setItem(ASSISTANT_KEY, JSON.stringify(state));
  },
};
