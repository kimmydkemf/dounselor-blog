"use client";
import Script from "next/script";
import { useEffect } from "react";

/**
 * Kakao JavaScript SDK 로드 — 카카오톡 공유 기능용.
 *
 * 키: NEXT_PUBLIC_KAKAO_JS_KEY (Kakao Developers 의 "JavaScript 키")
 *
 * onLoad 가 안 fire 되는 케이스를 대비해 useEffect 에서도 init 보장 (idempotent).
 * SRI integrity 는 Kakao CDN 의 빌드가 바뀌면 해시 불일치로 로드 자체가 차단되므로 제거.
 */
export default function KakaoShareScript() {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  // SDK 가 로드된 후 Kakao.init 가 안 됐으면 클라이언트에서 재시도 — onLoad 누락 방어
  useEffect(() => {
    if (!key) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (typeof window !== "undefined" && window.Kakao) {
        try {
          if (!window.Kakao.isInitialized()) window.Kakao.init(key);
        } catch (e) { console.error("[KakaoShare] init error:", e); }
        clearInterval(t);
      } else if (tries > 30) {
        // 6초 후 포기 — 차단됐거나 네트워크 오류
        clearInterval(t);
      }
    }, 200);
    return () => clearInterval(t);
  }, [key]);

  if (!key) return null;

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.share.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        try {
          if (window.Kakao && !window.Kakao.isInitialized()) {
            window.Kakao.init(key);
          }
        } catch (e) {
          console.error("[KakaoShare] init failed (onLoad):", e);
        }
      }}
    />
  );
}
