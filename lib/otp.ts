import { createHash, randomInt, timingSafeEqual } from "crypto";
import { OTP_DEFAULTS } from "@/lib/otp-config";
import { getStoreSettings } from "@/lib/catalog-server";
import { OtpLog, type OtpLogResult } from "@/models/OtpLog";

export { OTP_DEFAULTS };

export const OTP = {
  ttlMs: OTP_DEFAULTS.ttlMinutes * 60 * 1000,
  resendMs: OTP_DEFAULTS.resendSeconds * 1000,
  windowMs: OTP_DEFAULTS.windowHours * 60 * 60 * 1000,
  maxSends: OTP_DEFAULTS.maxSends,
  maxAttempts: OTP_DEFAULTS.maxAttempts,
};

export async function getOtpLimits() {
  try {
    const settings = await getStoreSettings();
    const otp = settings.otp;
    return {
      ttlMs: Math.max(1, otp.ttlMinutes) * 60 * 1000,
      resendMs: Math.max(10, otp.resendSeconds) * 1000,
      windowMs: Math.max(1, otp.windowHours) * 60 * 60 * 1000,
      maxSends: Math.max(1, otp.maxSends),
      maxAttempts: Math.max(1, otp.maxAttempts),
    };
  } catch {
    return {
      ttlMs: OTP.ttlMs,
      resendMs: OTP.resendMs,
      windowMs: OTP.windowMs,
      maxSends: OTP.maxSends,
      maxAttempts: OTP.maxAttempts,
    };
  }
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(phone: string, code: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "prodid-otp";
  return createHash("sha256").update(`${phone}:${code}:${secret}`).digest("hex");
}

export function otpMatches(phone: string, code: string, codeHash: string): boolean {
  const next = Buffer.from(hashOtp(phone, code));
  const prev = Buffer.from(codeHash);
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export async function logOtp(phone: string, result: OtpLogResult, attempts = 1) {
  try {
    await OtpLog.create({ phone, result, attempts });
  } catch (err) {
    console.error("[otp-log]", err);
  }
}
