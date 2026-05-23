"use client";
import { useEffect, useState } from "react";

/**
 * PWA 설치 프롬프트 — Chrome/Edge 의 beforeinstallprompt 이벤트 캐치.
 * iOS Safari 는 별도 안내 (manifest 자동 설치 unsupported, 사용자가 "홈 화면에 추가" 메뉴 수동 사용).
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 설치된 PWA 면 표시 X
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("install_dismissed")) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      // iOS — 24시간에 한 번 노출
      const last = parseInt(localStorage.getItem("install_ios_last") || "0", 10);
      if (Date.now() - last > 24 * 3600 * 1000) {
        setTimeout(() => setIosHint(true), 8000);
      }
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      // 진입 후 8초 뒤 노출 — 너무 빠르면 거슬림
      setTimeout(() => setShow(true), 8000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    setIosHint(false);
    sessionStorage.setItem("install_dismissed", "1");
    if (iosHint) localStorage.setItem("install_ios_last", String(Date.now()));
  };

  if (!show && !iosHint) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 animate-slide-up">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900">Dounselor 앱 설치</div>
          {iosHint ? (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Safari 의 <span className="inline-block px-1 bg-slate-100 rounded">공유</span> 버튼 → <b>홈 화면에 추가</b>
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              한 번 설치하면 홈 화면에서 바로 — 빠르고 풀스크린.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {!iosHint && (
            <button onClick={install}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700">
              설치
            </button>
          )}
          <button onClick={dismiss}
            className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100">
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
