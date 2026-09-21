import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone, toEnDigits } from "@/lib/phone";
import { getOtpLimits, logOtp, otpMatches } from "@/lib/otp";
import { isStaffRole } from "@/lib/roles";
import { User } from "@/models/User";
import { Otp } from "@/models/Otp";
import { ensureSeeded } from "@/lib/seed";
import { isPhoneBlocked } from "@/lib/blocklist";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "phone-otp",
      name: "ورود با موبایل",
      credentials: {
        phone: { label: "موبایل", type: "text" },
        code: { label: "کد تایید", type: "text" },
      },
      async authorize(credentials) {
        const phone = normalizePhone(credentials?.phone || "");
        const code = toEnDigits(String(credentials?.code || "")).replace(/\D/g, "");
        if (!phone || !/^\d{6}$/.test(code)) return null;

        await dbConnect();
        await ensureSeeded();
        if (await isPhoneBlocked(phone)) {
          await logOtp(phone, "blocked");
          return null;
        }

        const limits = await getOtpLimits();
        const otp = await Otp.findOne({ phone });
        if (!otp) return null;
        if (otp.expiresAt.getTime() < Date.now()) {
          await logOtp(phone, "expired", otp.attempts);
          await Otp.deleteOne({ _id: otp._id });
          return null;
        }
        if (otp.attempts >= limits.maxAttempts) {
          await logOtp(phone, "blocked", otp.attempts);
          return null;
        }

        if (!otpMatches(phone, code, otp.codeHash)) {
          otp.attempts += 1;
          await otp.save();
          await logOtp(phone, otp.attempts >= limits.maxAttempts ? "blocked" : "fail", otp.attempts);
          return null;
        }

        await Otp.deleteOne({ _id: otp._id });
        await logOtp(phone, "ok", otp.attempts + 1);

        const user = await User.findOneAndUpdate(
          { phone },
          { $set: { lastLoginAt: new Date() }, $setOnInsert: { phone, name: "", address: "", birthDate: "", role: "customer", blocked: false, staffActive: true } },
          { upsert: true, new: true }
        );

        if (user.blocked) return null;

        return {
          id: String(user._id),
          phone: user.phone,
          name: user.name || null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.name = user.name;
        token.role = user.role && isStaffRole(user.role) ? user.role : "customer";
      }
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        phone: token.phone,
        name: token.name,
        role: token.role,
      };
      return session;
    },
  },
};
