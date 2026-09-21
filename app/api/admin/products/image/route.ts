import { NextResponse } from "next/server";
import { adminErrorResponse, requireCan, requireStaff } from "@/lib/admin-auth";
import { saveProductImageFile } from "@/lib/product-image-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    requireCan(user, "products");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "فایل عکس ارسال نشده" }, { status: 400 });
    }
    const url = await saveProductImageFile(file);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof Error && /عکس|JPEG|PNG|WebP|مگابایت|فایل/.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return adminErrorResponse(err);
  }
}
