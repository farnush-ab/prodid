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
};
