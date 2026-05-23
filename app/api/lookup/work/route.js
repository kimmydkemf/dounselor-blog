import { NextResponse } from "next/server";
import { lookupWork } from "@/lib/wikipedia";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  const q    = url.searchParams.get("q")    || "";
  const hint = url.searchParams.get("hint") || "";
  if (!q.trim()) return NextResponse.json({ error: "q 필수" }, { status: 400 });
  try {
    const results = await lookupWork(q, hint);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
