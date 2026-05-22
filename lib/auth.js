/**
 * 소유자 인증 — 단순 패스워드 → JWT 쿠키.
 * Phase 2 에서 카카오 OAuth 로 확장 예정.
 */

import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const SECRET   = process.env.JWT_SECRET || "change-this-secret";
const COOKIE   = "owner_session";
const TTL_DAYS = 30;

/** 소유자 JWT 발행 */
export function signOwnerToken() {
  return jwt.sign({ role: "owner" }, SECRET, { expiresIn: `${TTL_DAYS}d` });
}

/** JWT 검증 — 유효하면 payload, 아니면 null */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

/** Next.js Request → owner 여부 */
export function isOwner(req) {
  const token = req.cookies?.get?.(COOKIE)?.value
    || req.cookies?.get?.(COOKIE)
    || null;
  // route handler 와 middleware 에서 cookies API 차이가 있어 양쪽 대응
  const val = typeof token === "string" ? token : token?.value || null;
  const payload = verifyToken(val);
  return Boolean(payload && payload.role === "owner");
}

/** 응답에 owner 쿠키 set/clear */
export function setOwnerCookie(res, token) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });
  return res;
}
export function clearOwnerCookie(res) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

/** API route 가드 — 비-owner 면 401 */
export async function requireOwner(req, handler) {
  if (!isOwner(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return handler(req);
}

export const OWNER_COOKIE = COOKIE;
