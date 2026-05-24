"use client";
import { useEffect, useState } from "react";

/**
 * 좌측 sticky 목차 — h2/h3 클릭 시 해당 헤딩으로 부드럽게 스크롤.
 * 현재 보이는 섹션은 activeId 로 강조.
 */
export default function TocSidebar({ items }) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!items?.length) return;
    const headings = items
      .map(i => document.getElementById(i.id))
      .filter(Boolean);
    if (!headings.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // 상단에 가장 가까운 visible 헤딩을 active
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, [items]);

  if (!items?.length) return null;

  return (
    <nav className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
      <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400 dark:text-slate-500 mb-3 px-3">목차</p>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={i} className={it.level === 3 ? "pl-3" : ""}>
            <a href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(it.id);
                if (el) {
                  window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
                  history.replaceState(null, "", `#${it.id}`);
                }
              }}
              className={`block px-3 py-1.5 rounded-md border-l-2 transition-all leading-snug ${
                activeId === it.id
                  ? "border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50/60 dark:bg-indigo-500/10"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600"
              }`}>
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
