import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/session";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isStaffRole } from "@/lib/roles";
import { ensureSeeded } from "@/lib/seed";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "پنل مدیریت | پرودید",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  await dbConnect();
  await ensureSeeded();
  const user = await User.findById(session.user.id);
  if (!user || user.blocked || !isStaffRole(user.role) || user.staffActive === false) {
    redirect("/?admin=denied");
  }

  return <AuthProvider>{children}</AuthProvider>;
}
