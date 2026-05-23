import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

/**
 * POST /api/board-join
 * Body: { code: string, name: string }
 *
 * 인증 X — 누구든 코드+이름으로 게스트 가입.
 * 성공 시 board_guest 쿠키 (token) 발급. middleware 가 이 쿠키로 해당 boardId 접근 허용.
 */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { code, name } = body || {};
  const r = boardService.joinAsGuest(code, name);
  if (r.error) {
    const msg = r.error === "invalid_code" ? "초대 코드가 올바르지 않아요"
              : r.error === "name_required" ? "이름을 입력해주세요"
              : r.error;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, board_id: r.board.id, name: r.name });
  res.cookies.set("board_guest", `${r.board.id}:${r.token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90일
  });
  return res;
}
