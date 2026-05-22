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

// 게스트 접근 차단 — 페이지
const OWNER_ONLY_PAGES = [
  "/memories",
  "/board",
  "/blog/new",
  "/blog/edit",
  "/blog/categories",
];

// 게스트 접근 차단 — API (메서드별로 추가 가드)
const OWNER_ONLY_WRITE_API = [
  "/api/posts",
  "/api/categories",
  "/api/ai/refine",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // login 페이지/API 는 항상 열림
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const owner = await isOwner(request);

  // 페이지 가드
  if (!owner && OWNER_ONLY_PAGES.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // API write 가드 — POST/PUT/PATCH/DELETE on protected paths
  if (!owner && method !== "GET" && method !== "HEAD") {
    for (const p of OWNER_ONLY_WRITE_API) {
      if (pathname === p || pathname.startsWith(p + "/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
  }

  // 응답에 owner 플래그 전달 (Server Component 에서 cookie 직접 못 읽는 경우 대비)
  const res = NextResponse.next();
  res.headers.set("x-is-owner", owner ? "1" : "0");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
