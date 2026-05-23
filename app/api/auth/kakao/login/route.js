import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/kakao/login?from=/some/path&join=ABCDEF
 *
 * 카카오 OAuth 인가 페이지로 redirect.
 * Query:
 *   - from: 로그인 후 돌아갈 경로 (옵션, 디폴트 "/")
 *   - join: 보드 초대 코드 (옵션) — 콜백에서 자동으로 게스트 가입 처리에 사용
 *
 * 필요한 환경변수 (.env.local):
 *   KAKAO_REST_API_KEY      = Kakao Developers 의 REST API 키
 *   KAKAO_REDIRECT_URI      = https://blog.dounselor.com/api/auth/kakao/callback
 *                             (로컬: http://localhost:3100/api/auth/kakao/callback)
 */
export async function GET(req) {
  const kid = process.env.KAKAO_REST_API_KEY;
  const redirect = process.env.KAKAO_REDIRECT_URI;
  if (!kid || !redirect) {
    return NextResponse.json({
      error: "kakao_not_configured",
      hint: ".env.local 에 KAKAO_REST_API_KEY 와 KAKAO_REDIRECT_URI 추가 필요",
    }, { status: 501 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "/";
  const join = url.searchParams.get("join") || "";

  // CSRF state — from/join 도 encode 해서 보관 (콜백에서 다시 사용)
  const stateRaw = crypto.randomBytes(16).toString("hex");
  const state    = Buffer.from(JSON.stringify({ s: stateRaw, from, join })).toString("base64url");

  const auth = new URL("https://kauth.kakao.com/oauth/authorize");
  auth.searchParams.set("client_id", kid);
  auth.searchParams.set("redirect_uri", redirect);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("state", state);
  // scope 최소화 — 닉네임/프로필이미지만
  auth.searchParams.set("scope", "profile_nickname,profile_image");

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set("kakao_state", stateRaw, {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10분
  });
  return res;
}
