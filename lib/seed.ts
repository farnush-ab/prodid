import { dbConnect } from "@/lib/mongodb";
import { CATEGORIES, PRODUCTS } from "@/lib/data";
import { DEFAULT_SETTINGS } from "@/lib/store-settings";
import { normalizePhone } from "@/lib/phone";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { Settings } from "@/models/Settings";
import { User } from "@/models/User";

let seeding: Promise<void> | null = null;

async function seedOnce() {
  await dbConnect();

  if ((await Category.countDocuments()) === 0) {
    await Category.insertMany(CATEGORIES.map((c, i) => ({ ...c, sort: i })));
  }
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(PRODUCTS.map((p, i) => ({ ...p, sort: i })));
  }
  if (!(await Settings.findOne({ key: "store" }))) {
    await Settings.create({ key: "store", ...DEFAULT_SETTINGS });
  }

  const raw = process.env.ADMIN_PHONES || "";
  const phones = raw
    .split(/[,\s]+/)
    .map((p) => normalizePhone(p))
    .filter((p): p is string => !!p);

  for (const phone of phones) {
    const existing = await User.findOne({ phone });
    if (!existing) {
      await User.create({ phone, name: "", address: "", birthDate: "", role: "owner", staffActive: true, blocked: false });
    } else if (existing.role === "customer") {
      existing.role = "owner";
      existing.staffActive = true;
      await existing.save();
    }
  }
}

export async function ensureSeeded() {
  if (!seeding) {
    seeding = seedOnce().catch((err) => {
      seeding = null;
      throw err;
    });
  }
  await seeding;
}
