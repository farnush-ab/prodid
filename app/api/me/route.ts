import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isValidBirthDate } from "@/lib/coupon";

export const runtime = "nodejs";

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await dbConnect();
  return User.findById(session.user.id);
}

function publicMe(user: { phone: string; name: string; address: string; birthDate?: string }) {
  return {
    phone: user.phone,
    name: user.name || "",
    address: user.address || "",
    birthDate: user.birthDate || "",
  };
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "وارد حساب نشده‌اید" }, { status: 401 });
  return NextResponse.json(publicMe(user));
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "وارد حساب نشده‌اید" }, { status: 401 });

  let body: { name?: string; address?: string; birthDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  if (typeof body.name === "string") user.name = body.name.trim().slice(0, 80);
  if (typeof body.address === "string") user.address = body.address.trim().slice(0, 400);
  if (typeof body.birthDate === "string") {
    const raw = body.birthDate.trim().slice(0, 10);
    if (raw && !isValidBirthDate(raw)) {
      return NextResponse.json({ error: "تاریخ تولد نامعتبر است" }, { status: 400 });
    }
    user.birthDate = raw;
  }
  await user.save();

  return NextResponse.json(publicMe(user));
}
