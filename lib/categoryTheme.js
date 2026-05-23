/**
 * 카테고리별 비주얼 테마 — Apple 스타일 풀-블리드 hero / SVG 커버에 사용.
 * 시드와 정합하도록 slug 키로 관리.
 *
 * - hue:     배경 그라데이션 두 색
 * - accent:  강조 색 (텍스트/액센트)
 * - badge:   영문 작은 라벨
 * - title:   hero 메인 카피
 * - subtitle: 보조 카피
 * - pattern: 'mesh' | 'dots' | 'grid' | 'aurora'
 * - glyph:   SVG 커버의 큰 상징 (이모지)
 * - light:   true 면 옅은 배경 + 다크 텍스트 모드
 */

export const CATEGORY_THEMES = {
  /* ── 컴퓨터 공부 (인디고) ─────────────────────────── */
  "cs-study": {
    hue:      ["#312e81", "#1e1b4b"],
    accent:   "#a5b4fc",
    badge:    "Engineering",
    title:    "코드와 사고의 궤적",
    subtitle: "그날의 작업, 배움, 시행착오를 한 데 모아둡니다.",
    pattern:  "grid",
    glyph:    "⌨️",
    light:    false,
  },
  "dev-log": {
    hue:      ["#4338ca", "#1e1b4b"],
    accent:   "#c7d2fe",
    badge:    "Dev Journal",
    title:    "오늘 만든 것들",
    subtitle: "Claude 와 함께 짜는 매일의 기록.",
    pattern:  "grid",
    glyph:    "🧩",
    light:    false,
  },
  "claude-usage": {
    hue:      ["#6366f1", "#312e81"],
    accent:   "#ddd6fe",
    badge:    "Workflow",
    title:    "Claude 를 길들이는 법",
    subtitle: "프롬프트 · 패턴 · 시행착오로 만들어가는 일상의 도구.",
    pattern:  "dots",
    glyph:    "🤖",
    light:    false,
  },
  "dev-tools": {
    hue:      ["#0f766e", "#134e4a"],
    accent:   "#5eead4",
    badge:    "Tooling",
    title:    "손에 익은 도구들",
    subtitle: "에디터, CLI, 자동화 — 살림살이 같은 도구 이야기.",
    pattern:  "grid",
    glyph:    "🛠️",
    light:    false,
  },

  /* ── 단상 (라이트 핑크) ───────────────────────────── */
  "thought": {
    hue:      ["#fdf2f8", "#fce7f3"],
    accent:   "#db2777",
    badge:    "Thoughts",
    title:    "스쳐 지나간 생각들",
    subtitle: "길에서, 책에서, 새벽에 떠올린 단상들.",
    pattern:  "aurora",
    glyph:    "💭",
    light:    true,
  },

  /* ── 리뷰 (앰버/다크) ─────────────────────────────── */
  "review": {
    hue:      ["#78350f", "#451a03"],
    accent:   "#fbbf24",
    badge:    "Reviews",
    title:    "본 것, 느낀 것",
    subtitle: "영화 · 드라마 · 애니메이션 — 끝나고 남는 자국들.",
    pattern:  "mesh",
    glyph:    "🎞️",
    light:    false,
  },
  "movie": {
    hue:      ["#1e293b", "#020617"],
    accent:   "#facc15",
    badge:    "Movies",
    title:    "스크린의 잔상",
    subtitle: "극장과 거실, 그 사이에서 본 영화들.",
    pattern:  "mesh",
    glyph:    "🎬",
    light:    false,
  },
  "drama": {
    hue:      ["#7c2d12", "#431407"],
    accent:   "#fdba74",
    badge:    "Drama",
    title:    "이야기에 빠진 밤",
    subtitle: "회차마다 다음 화를 기다리게 만든 드라마들.",
    pattern:  "aurora",
    glyph:    "📺",
    light:    false,
  },
  "anime": {
    hue:      ["#831843", "#500724"],
    accent:   "#f9a8d4",
    badge:    "Anime",
    title:    "2D 의 세계",
    subtitle: "작화, 음악, 마음을 흔든 장면들.",
    pattern:  "dots",
    glyph:    "🎌",
    light:    false,
  },

  /* ── 건강 (다크 그린) ─────────────────────────────── */
  "health": {
    hue:      ["#052e16", "#022c22"],
    accent:   "#86efac",
    badge:    "Health",
    title:    "몸을 가다듬는 일",
    subtitle: "식단, 운동, 회복 — 매일을 받쳐주는 기본기.",
    pattern:  "aurora",
    glyph:    "🌿",
    light:    false,
  },
  "carnivore": {
    hue:      ["#7f1d1d", "#450a0a"],
    accent:   "#fca5a5",
    badge:    "Carnivore",
    title:    "고기로 채우는 하루",
    subtitle: "카니보어 식단 — 기록, 실험, 효과.",
    pattern:  "mesh",
    glyph:    "🥩",
    light:    false,
  },
  "exercise": {
    hue:      ["#14532d", "#052e16"],
    accent:   "#bbf7d0",
    badge:    "Training",
    title:    "근력과 지구력",
    subtitle: "루틴, 무게, 컨디션의 흐름.",
    pattern:  "grid",
    glyph:    "💪",
    light:    false,
  },
};

const DEFAULT_THEME = {
  hue:      ["#1e293b", "#020617"],
  accent:   "#a5b4fc",
  badge:    "Blog",
  title:    "기록의 정원",
  subtitle: "개발과 일상의 단상들을 모은 곳.",
  pattern:  "dots",
  glyph:    "✨",
  light:    false,
};

export function getTheme(slug) {
  if (!slug) return DEFAULT_THEME;
  return CATEGORY_THEMES[slug] || DEFAULT_THEME;
}
