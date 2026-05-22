import { NextResponse } from "next/server";
import { clearOwnerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearOwnerCookie(res);
}
