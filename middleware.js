import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-secret"
);

async function isOwner(request) {
  const token = request.cookies.get("owner_session")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload?.role === "owner";
  } catch {
    return false;
  }
}

/** board_guest 쿠키 → { boardId, token } 또는 null */
function parseGuestCookie(request) {
  const raw = request.cookies.get("board_guest")?.value;
  if (!raw) return null;
  const [bidStr, token] = raw.split(":");
  const boardId = Number(bidStr);
  if (!boardId || !token) return null;
  return { boardId, token };
}

// 게스트 접근 차단 — 페이지
const OWNER_ONLY_PAGES = [
  "/memories",
  "/blog/new",
  "/blog/edit",
  "/blog/categories",
  "/blog/journal",
];

// owner 만 — board 페이지의 일부 (목록 등). 개별 보드 페이지는 따로 게스트 허용 처리.
const OWNER_ONLY_BOARD_LIST = "/board"; // exact match

// 게스트 접근 차단 — API write
const OWNER_ONLY_WRITE_API = [
  "/api/posts",
  "/api/categories",
  "/api/ai/refine",
  "/api/ai/journal",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // login + 인증 API + 보드 게스트 가입 API 는 항상 열림
  if (pathname === "/login" || pathname.startsWith("/api/auth/") || pathname === "/api/board-join") {
    return NextResponse.next();
  }

  const owner = await isOwner(request);
  const guest = parseGuestCookie(request);

  // ── 보드 페이지 가드 ──
  // /board (목록)        — owner 전용
  // /board/[id]          — owner OR (guest 이고 그 boardId 와 일치)
  // /board/join/[code]   — 누구나 가능
  if (pathname === "/board" || pathname === "/board/") {
    if (!owner) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  } else if (pathname.startsWith("/board/join/")) {
    // 게스트 가입 페이지 — 항상 열림
  } else if (pathname.startsWith("/board/")) {
    const m = pathname.match(/^\/board\/(\d+)/);
    const reqBoardId = m ? Number(m[1]) : null;
    const guestAllowed = guest && reqBoardId && guest.boardId === reqBoardId;
    if (!owner && !guestAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // ── 보드 API 가드 ──
  // /api/boards          — owner 전용 (보드 목록 조회/생성)
  // /api/boards/[id]/... — owner OR (guest 이고 그 boardId 일치)
  // /api/board-lists/*, /api/board-cards/* — owner OR 해당 보드 게스트
  //   (개별 list/card → board 매핑은 서비스 레이어에서 추가 검증 가능. 일단 owner|guest 둘 다 통과)
  const isBoardListAPI = pathname === "/api/boards" || pathname.startsWith("/api/boards?");
  const boardScopedAPI = pathname.match(/^\/api\/boards\/(\d+)/);
  const subAPI         = pathname.startsWith("/api/board-lists") || pathname.startsWith("/api/board-cards");

  if (isBoardListAPI) {
    if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  } else if (boardScopedAPI) {
    const reqBoardId = Number(boardScopedAPI[1]);
    const guestAllowed = guest && guest.boardId === reqBoardId;
    if (!owner && !guestAllowed) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // 초대 코드 회전 / 게스트 추방 / 보드 삭제 — owner only
    if (!owner && method !== "GET" && (
      pathname.match(/\/invite\/?$/) ||
      pathname.match(/\/guests\//)   ||
      pathname.match(/^\/api\/boards\/\d+\/?$/) && (method === "DELETE" || method === "PUT")
    )) {
      return NextResponse.json({ error: "owner only" }, { status: 403 });
    }
  } else if (subAPI) {
    if (!owner && !guest) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // ── 게시판/카테고리 / AI 등 API write 가드 ──
  if (!owner && method !== "GET" && method !== "HEAD") {
    for (const p of OWNER_ONLY_WRITE_API) {
      if (pathname === p || pathname.startsWith(p + "/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
  }

  // ── owner-only 페이지 ──
  if (!owner && OWNER_ONLY_PAGES.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.headers.set("x-is-owner", owner ? "1" : "0");
  if (guest) {
    res.headers.set("x-guest-board", String(guest.boardId));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
