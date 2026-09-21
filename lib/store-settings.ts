import { BRAND } from "@/lib/data";
import { DELIVERY_DAYS, DELIVERY_SLOTS } from "@/lib/order";
import { GREET_MSG, INTRO_MSG, PEEK_MSG, RECIPES, type RecipeTip } from "@/lib/assistant-content";
import { OTP_DEFAULTS, type OtpLimits } from "@/lib/otp-config";
import type { DeliveryDay, DeliverySlot } from "@/lib/order";

export interface BrandInfo {
  name: string;
  slogan: string;
  city: string;
  address: string;
  phone: string;
  phoneIntl: string;
  instagram: string;
  instagramUrl: string;
  minOrder: number;
  deliveryFeeNote: string;
}

export interface DeliveryToggle {
  id: string;
  label: string;
  enabled: boolean;
}

export interface DeliveryZone {
  name: string;
  fee: number;
}

export interface StoreFeatures {
  maintenance: boolean;
  vpnNotice: boolean;
  assistantWidget: boolean;
  onlinePay: boolean;
}

export interface PaymentDetails {
  cardHolder: string;
  cardNumber: string;
  bankName: string;
}

export interface AssistantSettings {
  intro: string;
  greet: string;
  peek: string;
  defaultOn: boolean;
  recipes: RecipeTip[];
}

export interface StoreSettings {
  brand: BrandInfo;
  delivery: {
    days: DeliveryToggle[];
    slots: DeliveryToggle[];
    zones: DeliveryZone[];
  };
  assistant: AssistantSettings;
  otp: OtpLimits;
  features: StoreFeatures;
  payments: PaymentDetails;
  blockedPhones: string[];
}

export const DEFAULT_SETTINGS: StoreSettings = {
  brand: { ...BRAND },
  delivery: {
    days: DELIVERY_DAYS.map((d) => ({ id: d.id, label: d.label, enabled: true })),
    slots: DELIVERY_SLOTS.map((s) => ({ id: s.id, label: s.label, enabled: true })),
    zones: [
      { name: "داخل محدوده کاشان", fee: 25000 },
      { name: "حومه و شهرک‌های اطراف", fee: 45000 },
    ],
  },
  assistant: {
    intro: INTRO_MSG,
    greet: GREET_MSG,
    peek: PEEK_MSG,
    defaultOn: true,
    recipes: RECIPES.map((r) => ({ ...r, keys: [...r.keys], products: [...r.products] })),
  },
  otp: { ...OTP_DEFAULTS },
  features: {
    maintenance: false,
    vpnNotice: true,
    assistantWidget: true,
    onlinePay: false,
  },
  payments: {
    cardHolder: "",
    cardNumber: "",
    bankName: "",
  },
  blockedPhones: [],
};

export function deriveBrandFields(brand: Partial<BrandInfo> & Pick<BrandInfo, "phone" | "instagram">): Pick<BrandInfo, "phoneIntl" | "instagramUrl"> {
  const digits = String(brand.phone || "").replace(/\D/g, "");
  let phoneIntl = brand.phoneIntl || "";
  if (!phoneIntl) {
    const local = digits.startsWith("98") ? digits : digits.startsWith("0") ? `98${digits.slice(1)}` : digits;
    phoneIntl = local;
  }
  const handle = String(brand.instagram || "").replace(/^@/, "").trim();
  return {
    phoneIntl,
    instagramUrl: handle ? `https://www.instagram.com/${handle.replace(/\/+$/, "")}/` : "",
  };
}

export function isEnabledDay(settings: StoreSettings, id: string): id is DeliveryDay {
  return settings.delivery.days.some((d) => d.id === id && d.enabled);
}

export function isEnabledSlot(settings: StoreSettings, id: string): id is DeliverySlot {
  return settings.delivery.slots.some((s) => s.id === id && s.enabled);
}
