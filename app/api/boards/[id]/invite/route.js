import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

/** 초대 코드 조회 — 없으면 발급 */
export async function GET(_req, { params }) {
  const code = boardService.ensureInviteCode(+params.id);
  if (!code) return NextResponse.json({ error: "not found" }, { status: 404 });
  const guests = boardService.listGuests(+params.id);
  return NextResponse.json({ code, guests });
}

/** 코드 회전 (기존 토큰은 유지) */
export async function POST(_req, { params }) {
  const code = boardService.regenerateInviteCode(+params.id);
  return NextResponse.json({ code });
}
