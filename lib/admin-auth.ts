import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { dbConnect } from "@/lib/mongodb";
import { User, type UserDoc } from "@/models/User";
import { canMutate, isStaffRole, type StaffRole } from "@/lib/roles";
import { ensureSeeded } from "@/lib/seed";

export class AdminError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type StaffUser = UserDoc & { id: string; role: StaffRole };

export async function requireStaff(): Promise<StaffUser> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new AdminError("وارد حساب نشده‌اید", 401);
  }
  await dbConnect();
  await ensureSeeded();
  const user = await User.findById(session.user.id);
  if (!user) throw new AdminError("حساب پیدا نشد", 401);
  if (user.blocked) throw new AdminError("این حساب مسدود است", 403);
  if (!isStaffRole(user.role) || user.staffActive === false) {
    throw new AdminError("به پنل مدیریت دسترسی ندارید", 403);
  }
  return Object.assign(user, { id: String(user._id), role: user.role });
}

export function requireCan(user: StaffUser, action: Parameters<typeof canMutate>[1]) {
  if (!canMutate(user.role, action)) {
    throw new AdminError("برای این بخش دسترسی ندارید", 403);
  }
}

export function adminErrorResponse(err: unknown) {
  if (err instanceof AdminError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
}
