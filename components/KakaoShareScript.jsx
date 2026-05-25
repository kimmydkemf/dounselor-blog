"use client";
import { useEffect } from "react";

/**
 * Kakao SDK init — SDK script 는 layout.jsx 의 <head> 에 직접 삽입되어 SSR HTML 에 포함됨.
 * 이 컴포넌트는 클라이언트 마운트 후 Kakao.init 만 보장 (polling).
 */
export default function KakaoShareScript() {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  useEffect(() => {
    if (!key) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (typeof window !== "undefined" && window.Kakao) {
        try {
          if (!window.Kakao.isInitialized()) {
            window.Kakao.init(key);
            console.log("[Kakao] initialized");
          }
        } catch (e) {
          console.error("[Kakao] init error:", e);
        }
        clearInterval(t);
      } else if (tries > 50) {
        console.warn("[Kakao] SDK not loaded after 10s — check /kakao.min.js");
        clearInterval(t);
      }
    }, 200);
    return () => clearInterval(t);
  }, [key]);

  return null;
}
