"use client";
import { useEffect, useState } from "react";

/** 페이지 스크롤 진행률 — Nav 아래 1px 라인 */
export default function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max <= 0 ? 0 : Math.min(100, (window.scrollY / max) * 100));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-14 left-0 right-0 z-30 h-0.5 bg-transparent pointer-events-none">
      <div className="h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 transition-[width] duration-100"
        style={{ width: `${pct}%` }} />
    </div>
  );
}
