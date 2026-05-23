import { NextResponse } from "next/server";
import { visitorService } from "@/services/visitorService";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // 단순 조회 — 통계만 반환
  return NextResponse.json(visitorService.stats());
}

export async function POST(req) {
  // 페이지에서 호출 — 본인 IP 로그 + 통계 반환
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const body = await req.json().catch(() => ({}));
  visitorService.log(ip, body?.path || "");
  return NextResponse.json(visitorService.stats());
}
