import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { productImageFilename, resolveProductImageFile } from "@/lib/product-image-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const name = productImageFilename("/api/media/products/" + decodeURIComponent(params.file || ""));
  if (!name) return new NextResponse("Not found", { status: 404 });
  const full = await resolveProductImageFile(name);
  if (!full) return new NextResponse("Not found", { status: 404 });
  const ext = name.split(".").pop()?.toLowerCase() || "jpg";
  const buf = await readFile(full);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
