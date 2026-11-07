/** مقادیر پیش‌فرض OTP — بدون وابستگی به crypto تا در کلاینت هم قابل استفاده باشد */
export const OTP_DEFAULTS = {
  ttlMinutes: 2,
  resendSeconds: 60,
  windowHours: 1,
  maxSends: 5,
  maxAttempts: 5,
};

export type OtpLimits = typeof OTP_DEFAULTS;
