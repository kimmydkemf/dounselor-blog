import { NextResponse } from "next/server";
import { clearOwnerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * form POST 로 호출됐을 땐 페이지로 리다이렉트해야 함 — 그렇지 않으면
 * 사용자 브라우저에 `{ok:true}` JSON 이 그대로 노출됨.
 * 303 See Other = POST 후 GET 으로 자연 이동.
 */
export async function POST(req) {
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/`, { status: 303 });
  return clearOwnerCookie(res);
}
