import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getStoreSettings } from "@/lib/catalog-server";

export async function isPhoneBlocked(phone: string): Promise<boolean> {
  await dbConnect();
  const user = await User.findOne({ phone }).select("blocked").lean();
  if (user?.blocked) return true;
  const settings = await getStoreSettings();
  return settings.blockedPhones.includes(phone);
}
