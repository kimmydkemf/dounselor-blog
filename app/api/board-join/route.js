import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-secret"
);

async function isOwner(req) {
  const tok = req.cookies.get("owner_session")?.value;
  if (!tok) return false;
  try {
    const { payload } = await jwtVerify(tok, SECRET);
    return payload?.role === "owner";
  } catch { return false; }
}

/**
 * POST /api/board-join
 * Body: { code, name }
 *
 * ⚠ owner 만 사용 가능 — 자기 보드에 직접 추가하는 관리 용도.
 * 일반 사용자의 가입은 무조건 /api/auth/kakao/login?join=<code> 경로로만.
 * 이름 입력 만으로 누구나 들어오는 옛 흐름은 차단.
 */
export async function POST(req) {
  if (!(await isOwner(req))) {
    return NextResponse.json({
      error: "카카오 인증이 필요합니다",
      hint: "초대 링크 그대로 클릭하면 카카오 로그인 페이지로 안내됩니다.",
    }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { code, name } = body || {};
  const r = boardService.joinAsGuest(code, name);
  if (r.error) {
    const msg = r.error === "invalid_code" ? "초대 코드가 올바르지 않아요"
              : r.error === "name_required" ? "이름을 입력해주세요"
              : r.error;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  // owner 가 추가한 케이스 — 직접 게스트 토큰은 발급하지 않음 (그 사람한테 따로 알려줘야)
  return NextResponse.json({ ok: true, board_id: r.board.id, name: r.name, token: r.token });
}
