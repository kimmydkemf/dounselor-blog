import { NextResponse } from "next/server";
import { signOwnerToken, setOwnerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { password } = await req.json();
    const ownerPwd = process.env.OWNER_PASSWORD;

    if (!ownerPwd) {
      return NextResponse.json({ error: "OWNER_PASSWORD 미설정" }, { status: 500 });
    }
    if (!password || password !== ownerPwd) {
      // 응답 지연으로 brute-force 약하게 방지
      await new Promise(r => setTimeout(r, 800));
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const token = signOwnerToken();
    const res = NextResponse.json({ ok: true, role: "owner" });
    return setOwnerCookie(res, token);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
