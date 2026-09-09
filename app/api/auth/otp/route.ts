import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone } from "@/lib/phone";
import { OTP, generateOtp, hashOtp } from "@/lib/otp";
import { Otp } from "@/models/Otp";

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

  const now = Date.now();
  const existing = await Otp.findOne({ phone });

  if (existing) {
    if (now - existing.lastSentAt.getTime() < OTP.resendMs) {
      const wait = Math.ceil((OTP.resendMs - (now - existing.lastSentAt.getTime())) / 1000);
      return NextResponse.json({ error: `لطفا ${wait} ثانیه دیگر دوباره تلاش کنید`, wait }, { status: 429 });
    }

    const windowExpired = now - existing.windowStart.getTime() >= OTP.windowMs;
    const sendCount = windowExpired ? 1 : existing.sendCount + 1;
    if (!windowExpired && sendCount > OTP.maxSends) {
      return NextResponse.json({ error: "تعداد درخواست کد برای این شماره بیش از حد مجاز است" }, { status: 429 });
    }

    const code = generateOtp();
    existing.codeHash = hashOtp(phone, code);
    existing.expiresAt = new Date(now + OTP.ttlMs);
    existing.attempts = 0;
    existing.lastSentAt = new Date(now);
    existing.windowStart = windowExpired ? new Date(now) : existing.windowStart;
    existing.sendCount = sendCount;
    await existing.save();

    console.log(`[پرودید OTP] ${phone} → ${code}  (اعتبار ۲ دقیقه)`);
    return NextResponse.json({ ok: true, expiresIn: OTP.ttlMs / 1000 });
  }

  const code = generateOtp();
  await Otp.create({
    phone,
    codeHash: hashOtp(phone, code),
    expiresAt: new Date(now + OTP.ttlMs),
    attempts: 0,
    lastSentAt: new Date(now),
    windowStart: new Date(now),
    sendCount: 1,
  });

  console.log(`[پرودید OTP] ${phone} → ${code}  (اعتبار ۲ دقیقه)`);
  return NextResponse.json({ ok: true, expiresIn: OTP.ttlMs / 1000 });
}
