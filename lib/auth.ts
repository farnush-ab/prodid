import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbConnect } from "@/lib/mongodb";
import { normalizePhone, toEnDigits } from "@/lib/phone";
import { OTP, otpMatches } from "@/lib/otp";
import { User } from "@/models/User";
import { Otp } from "@/models/Otp";

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
        const otp = await Otp.findOne({ phone });
        if (!otp) return null;
        if (otp.expiresAt.getTime() < Date.now()) {
          await Otp.deleteOne({ _id: otp._id });
          return null;
        }
        if (otp.attempts >= OTP.maxAttempts) return null;

        if (!otpMatches(phone, code, otp.codeHash)) {
          otp.attempts += 1;
          await otp.save();
          return null;
        }

        await Otp.deleteOne({ _id: otp._id });

        const user = await User.findOneAndUpdate(
          { phone },
          { $set: { lastLoginAt: new Date() }, $setOnInsert: { phone, name: "", address: "" } },
          { upsert: true, new: true }
        );

        return {
          id: String(user._id),
          phone: user.phone,
          name: user.name || null,
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
      };
      return session;
    },
  },
};
