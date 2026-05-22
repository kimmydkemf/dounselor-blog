import { NextResponse } from "next/server";
import { isOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  return NextResponse.json({ role: isOwner(req) ? "owner" : "guest" });
}
