"use client";
import { useEffect, useState } from "react";

/**
 * 다크/라이트 모드 토글.
 *
 * 흐름:
 *   - 초기값 — localStorage("theme") 또는 prefers-color-scheme
 *   - 토글 시 html.classList 의 "dark" 토글 + localStorage 저장
 *   - 시스템 변경 자동 감지 (사용자가 명시 선택 안 했을 때만)
 *
 * SSR mismatch 방지 — head 의 inline script 가 hydrate 전에 클래스를 미리 적용해두고,
 * 이 컴포넌트는 mount 후에만 토글 UI 노출.
 */
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme,   setTheme]   = useState("light");

  useEffect(() => {
    setMounted(true);
    // head 의 inline script 가 이미 html 에 dark 또는 light 클래스 적용했으므로 그 결과 읽음.
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    // 시스템 변경 감지 — 사용자가 explicit 선택 안 했을 때만 자동 따라감
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
        document.documentElement.classList.toggle("dark", e.matches);
      }
    };
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    // meta theme-color 동적 변경 (모바일 주소창 색)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#0f172a" : "#ffffff");
  };

  // SSR 단계에선 빈 자리 (CLS 방지 위해 정확히 같은 크기 placeholder)
  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg" aria-hidden />;
  }

  return (
    <button onClick={toggle}
      aria-label={theme === "dark" ? "라이트 모드로" : "다크 모드로"}
      className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      {theme === "dark" ? (
        // 해 (light 로 가는 버튼)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        // 달 (dark 로 가는 버튼)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
