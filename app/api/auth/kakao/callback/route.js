import { NextResponse } from "next/server";
import db from "@/lib/db";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/kakao/callback?code=...&state=...
 *
 * 1) authorization code → access token 교환
 * 2) /v2/user/me 로 사용자 정보 조회
 * 3) users 테이블에 UPSERT (role='guest' 디폴트, owner 면 owner)
 * 4) join 코드 있으면 자동으로 보드 게스트 가입
 * 5) 세션 쿠키 발급 (현재는 단순 user_id 쿠키 — 향후 JWT 확장 가능)
 */
export async function GET(req) {
  const kid    = process.env.KAKAO_REST_API_KEY;
  const secret = process.env.KAKAO_CLIENT_SECRET || ""; // optional
  const redir  = process.env.KAKAO_REDIRECT_URI;
  if (!kid || !redir) {
    return NextResponse.json({ error: "kakao_not_configured" }, { status: 501 });
  }

  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  // state 검증
  let from = "/", join = "";
  try {
    const decoded = JSON.parse(Buffer.from(state || "", "base64url").toString("utf8"));
    const cookieState = req.cookies.get("kakao_state")?.value;
    if (decoded.s !== cookieState) return NextResponse.json({ error: "state mismatch" }, { status: 400 });
    from = decoded.from || "/";
    join = decoded.join || "";
  } catch {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  // 1) token 교환
  const tokRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id:  kid,
      redirect_uri: redir,
      code,
      ...(secret ? { client_secret: secret } : {}),
    }),
  });
  if (!tokRes.ok) {
    const t = await tokRes.text();
    return NextResponse.json({ error: "token exchange failed", detail: t.slice(0, 300) }, { status: 502 });
  }
  const tok = await tokRes.json();
  const access = tok.access_token;

  // 2) 사용자 정보
  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { "Authorization": `Bearer ${access}` },
  });
  if (!meRes.ok) {
    return NextResponse.json({ error: "user info failed" }, { status: 502 });
  }
  const me = await meRes.json();
  const kakaoId  = String(me.id);
  const profile  = me.kakao_account?.profile || {};
  const nickname = profile.nickname || `사용자${kakaoId.slice(-4)}`;
  const image    = profile.profile_image_url || profile.thumbnail_image_url || "";

  // 3) users UPSERT
  const existing = db.prepare("SELECT * FROM users WHERE kakao_id=?").get(kakaoId);
  let userId;
  if (existing) {
    db.prepare("UPDATE users SET name=?, profile_image=? WHERE id=?")
      .run(nickname, image, existing.id);
    userId = existing.id;
  } else {
    const r = db.prepare(
      "INSERT INTO users (kakao_id, name, profile_image, role) VALUES (?, ?, ?, 'guest')"
    ).run(kakaoId, nickname, image);
    userId = r.lastInsertRowid;
  }

  // 4) join 코드 있으면 보드 게스트 자동 가입
  let landingPath = from;
  if (join) {
    const r = boardService.joinAsGuest(join, nickname);
    if (!r.error) landingPath = `/board/${r.board.id}`;
    // 가입 결과 쿠키도 함께 발급
    const res = NextResponse.redirect(new URL(landingPath, req.url));
    res.cookies.set("kakao_user", String(userId), {
      httpOnly: true, sameSite: "lax", path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    if (!r.error) {
      res.cookies.set("board_guest", `${r.board.id}:${r.token}`, {
        httpOnly: true, sameSite: "lax", path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 90,
      });
    }
    // 사용한 state 쿠키 지움
    res.cookies.delete("kakao_state");
    return res;
  }

  const res = NextResponse.redirect(new URL(landingPath, req.url));
  res.cookies.set("kakao_user", String(userId), {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.delete("kakao_state");
  return res;
}
