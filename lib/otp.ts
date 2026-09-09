import { createHash, randomInt, timingSafeEqual } from "crypto";

const OTP_TTL_MS = 2 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;

export const OTP = {
  ttlMs: OTP_TTL_MS,
  resendMs: RESEND_MS,
  windowMs: WINDOW_MS,
  maxSends: MAX_SENDS,
  maxAttempts: MAX_ATTEMPTS,
};

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
