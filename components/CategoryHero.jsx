import { getTheme } from "@/lib/categoryTheme";
import CategoryCover from "./CategoryCover";

/**
 * Apple-style full-bleed hero — 카테고리별로 다른 그라데이션/패턴/카피.
 *
 * @param {object}   props
 * @param {string}   props.slug      — null/undefined 면 디폴트 테마
 * @param {string=}  props.eyebrow   — 카테고리 chip 위에 띄울 짧은 라벨 (기본: theme.badge)
 * @param {string=}  props.title     — 큰 제목 override
 * @param {string=}  props.subtitle  — 보조 카피 override
 * @param {string=}  props.imageSrc  — 우측 카드 이미지 override
 * @param {object[]=} props.stats    — [{n, label}] 통계 박스 (없으면 안 그림)
 */
export default function CategoryHero({ slug, eyebrow, title, subtitle, imageSrc, stats }) {
  const t = getTheme(slug);
  const isLight = t.light;
  const txt = isLight ? "text-slate-900" : "text-white";
  const txtMuted = isLight ? "text-slate-600" : "text-white/70";
  const eb = eyebrow ?? t.badge;
  const tt = title ?? t.title;
  const st = subtitle ?? t.subtitle;

  return (
    <section className="relative full-bleed overflow-hidden">
      {/* 컬러 그라데이션 베이스 */}
      <div className="absolute inset-0 -z-20"
        style={{ background: `linear-gradient(135deg, ${t.hue[0]} 0%, ${t.hue[1]} 100%)` }} />
      {/* 패턴 오버레이 */}
      <div className={`absolute inset-0 -z-10 ${
        t.pattern === "grid"   ? "bg-pattern-grid"   :
        t.pattern === "dots"   ? "bg-pattern-dots"   :
        t.pattern === "mesh"   ? "bg-pattern-mesh"   :
        t.pattern === "aurora" ? "bg-pattern-aurora" : ""
      } ${isLight ? "is-light" : ""}`} />

      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className={`text-xs font-semibold tracking-[0.3em] uppercase mb-5 appear appear-1`}
             style={{ color: t.accent }}>
            {eb}
          </p>
          <h1 className={`text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5 appear appear-2 ${txt}`}>
            {tt}
          </h1>
          <p className={`text-base md:text-lg leading-relaxed max-w-md appear appear-3 ${txtMuted}`}>
            {st}
          </p>

          {stats && stats.length > 0 && (
            <div className="mt-8 flex gap-6 appear appear-4">
              {stats.map(s => (
                <div key={s.label}>
                  <div className={`text-3xl md:text-4xl font-bold tabular ${txt}`}>
                    {typeof s.n === "number" ? s.n.toLocaleString() : s.n}
                  </div>
                  <div className={`text-[10px] tracking-widest uppercase mt-1 ${txtMuted}`}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 우측 비주얼 카드 — SVG 비주얼 */}
        <div className="hidden md:block appear appear-3">
          <CategoryCover slug={slug} aspect="4/3"
            className="rounded-3xl shadow-2xl"
            >
            <div className="absolute inset-0"
              style={{ boxShadow: `inset 0 0 0 1px ${t.accent}30` }} />
            <div className={`absolute left-5 bottom-5 text-xs font-semibold tracking-widest uppercase opacity-90 ${txt}`}>
              {eb}
            </div>
          </CategoryCover>
        </div>
      </div>
    </section>
  );
}
