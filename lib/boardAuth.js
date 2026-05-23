import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { boardService } from "@/services/boardService";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-secret"
);

/**
 * 현재 요청의 actor 정보 — { kind: "owner"|"guest", id, name, boardId? }
 * cookies() 는 Next.js 서버 컴포넌트/route handler 에서 사용.
 */
export async function getBoardActor() {
  const jar = cookies();
  // owner
  const ownerTok = jar.get("owner_session")?.value;
  if (ownerTok) {
    try {
      const { payload } = await jwtVerify(ownerTok, SECRET);
      if (payload?.role === "owner") {
        return { kind: "owner", id: 1, name: "Owner" };
      }
    } catch {}
  }
  // guest
  const raw = jar.get("board_guest")?.value;
  if (raw) {
    const [bidStr, token] = raw.split(":");
    const boardId = Number(bidStr);
    const g = boardService.getGuestByToken(token);
    if (g && g.board_id === boardId) {
      boardService.touchGuest(token);
      return { kind: "guest", id: g.id, name: g.name, boardId };
    }
  }
  return null;
}

/** 해당 actor 가 boardId 접근 가능한지 */
export function canAccessBoard(actor, boardId) {
  if (!actor) return false;
  if (actor.kind === "owner") return true;
  return actor.kind === "guest" && actor.boardId === boardId;
}
