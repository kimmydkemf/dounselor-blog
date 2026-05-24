"use client";
import Script from "next/script";

/**
 * Kakao JavaScript SDK 로드 — 카카오톡 공유 기능용.
 *
 * 키: NEXT_PUBLIC_KAKAO_JS_KEY (Kakao Developers 의 "JavaScript 키" — REST API 키와 다름)
 * 키가 없으면 SDK 로드 안 함 (build/start 시 환경변수 없어도 페이지는 동작).
 *
 * 사용 예:
 *   if (typeof window !== "undefined" && window.Kakao?.Share) {
 *     window.Kakao.Share.sendDefault({ ... });
 *   }
 */
export default function KakaoShareScript() {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return null;

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.share.min.js"
      integrity="sha384-iKD9hSPNRR5RpsmgnEZSpVbcjlmgtRRlfM/AsWQGS9wKpaVNvccmQUu8L4HD2Nb1"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        try {
          if (window.Kakao && !window.Kakao.isInitialized()) {
            window.Kakao.init(key);
          }
        } catch (e) {
          console.error("[KakaoShare] init failed:", e);
        }
      }}
    />
  );
}
