import { getTheme } from "@/lib/categoryTheme";

/**
 * 카테고리별 SVG 비주얼 — 사진 대신 사용.
 * Picsum 의 랜덤 사진이 토픽과 안 맞는 문제를 해결.
 *
 * 구성:
 *   - 베이스: 카테고리 색 선형 그라데이션
 *   - 패턴: grid / dots / mesh / aurora 중 하나 오버레이
 *   - 데코: 카테고리 키 컬러의 큰 블롭 (blur)
 *   - 심볼: 크게 띄운 이모지 (오른쪽 하단, 옅게)
 *
 * Props:
 *   - slug:       카테고리 slug
 *   - icon:       표시할 이모지 (없으면 theme/기본값)
 *   - aspect:     "16/10" | "16/9" | "4/3" | "1/1" | "21/9"
 *   - className:  컨테이너 추가 클래스
 *   - children:   오버레이 콘텐츠 (라벨, 제목 등)
 */
export default function CategoryCover({
  slug,
  icon,
  aspect = "16/10",
  className = "",
  children,
}) {
  const t  = getTheme(slug);
  const sy = icon ?? glyphFor(slug);

  const aspectClass =
    aspect === "16/9"  ? "aspect-video"   :
    aspect === "16/10" ? "aspect-[16/10]" :
    aspect === "4/3"   ? "aspect-[4/3]"   :
    aspect === "1/1"   ? "aspect-square"  :
    aspect === "21/9"  ? "aspect-[21/9]"  :
    "aspect-[16/10]";

  return (
    <div className={`relative overflow-hidden ${aspectClass} ${className}`}>
      {/* 베이스 그라데이션 */}
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${t.hue[0]} 0%, ${t.hue[1]} 100%)` }} />

      {/* 패턴 오버레이 */}
      <div className={`absolute inset-0 ${
        t.pattern === "grid"   ? "bg-pattern-grid"   :
        t.pattern === "dots"   ? "bg-pattern-dots"   :
        t.pattern === "mesh"   ? "bg-pattern-mesh"   :
        t.pattern === "aurora" ? "bg-pattern-aurora" : ""
      } ${t.light ? "is-light" : ""}`} />

      {/* 컬러 블롭 (좌상) */}
      <div className="absolute -top-1/3 -left-1/4 w-[70%] aspect-square rounded-full blur-3xl opacity-40"
        style={{ background: t.accent }} />
      {/* 컬러 블롭 (우하) */}
      <div className="absolute -bottom-1/3 -right-1/4 w-[60%] aspect-square rounded-full blur-3xl opacity-25"
        style={{ background: t.hue[0] }} />

      {/* 큰 심볼 — 옅게, 우하단 */}
      <div className="absolute right-[-1rem] bottom-[-2rem] text-[10rem] md:text-[14rem] leading-none select-none pointer-events-none"
           style={{ opacity: t.light ? 0.12 : 0.18, filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.18))" }}
           aria-hidden>
        {sy}
      </div>

      {/* 노이즈/그레인 (옅게) */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }} />

      {/* 자식 오버레이 */}
      {children && (
        <div className="absolute inset-0">
          {children}
        </div>
      )}
    </div>
  );
}

/** slug 별 키 글리프 — 없으면 빈 동그라미 */
function glyphFor(slug) {
  const m = {
    "cs-study":     "⌨️",
    "dev-log":      "🧩",
    "claude-usage": "🤖",
    "dev-tools":    "🛠️",
    "thought":      "💭",
    "review":       "🎞️",
    "movie":        "🎬",
    "drama":        "📺",
    "anime":        "🎌",
    "health":       "🌿",
    "carnivore":    "🥩",
    "exercise":     "💪",
  };
  return m[slug] || "✨";
}
