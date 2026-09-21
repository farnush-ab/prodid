import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone } from "@/lib/phone";
import { generateOtp, getOtpLimits, hashOtp, logOtp } from "@/lib/otp";
import { Otp } from "@/models/Otp";
import { isPhoneBlocked } from "@/lib/blocklist";
import { IppanelError } from "@/lib/ippanel";
import { sendOtpSms } from "@/lib/sms";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone || "");
  if (!phone) {
    return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
  }

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ error: "اتصال به پایگاه داده برقرار نشد" }, { status: 503 });
  }

  if (await isPhoneBlocked(phone)) {
    await logOtp(phone, "blocked");
    return NextResponse.json({ error: "امکان ورود با این شماره وجود ندارد" }, { status: 403 });
  }

  const limits = await getOtpLimits();
  const now = Date.now();
  const existing = await Otp.findOne({ phone });

  if (existing) {
    if (now - existing.lastSentAt.getTime() < limits.resendMs) {
      const wait = Math.ceil((limits.resendMs - (now - existing.lastSentAt.getTime())) / 1000);
      return NextResponse.json({ error: `لطفا ${wait} ثانیه دیگر دوباره تلاش کنید`, wait }, { status: 429 });
    }

    const windowExpired = now - existing.windowStart.getTime() >= limits.windowMs;
    const sendCount = windowExpired ? 1 : existing.sendCount + 1;
    if (!windowExpired && sendCount > limits.maxSends) {
      await logOtp(phone, "blocked", sendCount);
      return NextResponse.json({ error: "تعداد درخواست کد برای این شماره بیش از حد مجاز است" }, { status: 429 });
    }

    const code = generateOtp();
    existing.codeHash = hashOtp(phone, code);
    existing.expiresAt = new Date(now + limits.ttlMs);
    existing.attempts = 0;
    existing.lastSentAt = new Date(now);
    existing.windowStart = windowExpired ? new Date(now) : existing.windowStart;
    existing.sendCount = sendCount;
    await existing.save();
    await logOtp(phone, "ok");

    const ttlMinutes = Math.round(limits.ttlMs / 60000);
    try {
      const sms = await sendOtpSms(phone, code, ttlMinutes);
      return NextResponse.json({ ok: true, expiresIn: limits.ttlMs / 1000, sms });
    } catch (err) {
      if (err instanceof IppanelError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  }

  const code = generateOtp();
  await Otp.create({
    phone,
    codeHash: hashOtp(phone, code),
    expiresAt: new Date(now + limits.ttlMs),
    attempts: 0,
    lastSentAt: new Date(now),
    windowStart: new Date(now),
    sendCount: 1,
  });
  await logOtp(phone, "ok");

  const ttlMinutes = Math.round(limits.ttlMs / 60000);
  try {
    const sms = await sendOtpSms(phone, code, ttlMinutes);
    return NextResponse.json({ ok: true, expiresIn: limits.ttlMs / 1000, sms });
  } catch (err) {
    if (err instanceof IppanelError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
