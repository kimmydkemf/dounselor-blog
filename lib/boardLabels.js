/** Trello 식 라벨 색상 팔레트 */
export const LABEL_COLORS = {
  green:  { bg: "#22c55e", text: "#fff", name: "초록" },
  yellow: { bg: "#eab308", text: "#fff", name: "노랑" },
  orange: { bg: "#f97316", text: "#fff", name: "주황" },
  red:    { bg: "#ef4444", text: "#fff", name: "빨강" },
  purple: { bg: "#a855f7", text: "#fff", name: "보라" },
  blue:   { bg: "#3b82f6", text: "#fff", name: "파랑" },
  sky:    { bg: "#0ea5e9", text: "#fff", name: "하늘" },
  lime:   { bg: "#84cc16", text: "#fff", name: "라임" },
  pink:   { bg: "#ec4899", text: "#fff", name: "분홍" },
  slate:  { bg: "#64748b", text: "#fff", name: "회색" },
};

export const LABEL_KEYS = Object.keys(LABEL_COLORS);

/** 보드 배경 그라데이션 프리셋 — Trello home picker 같은 분위기 */
export const BACKGROUNDS = [
  { id: "indigo", name: "인디고 새벽", css: "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)" },
  { id: "rose",   name: "장미빛 노을", css: "linear-gradient(135deg, #831843 0%, #500724 100%)" },
  { id: "ocean",  name: "심해",         css: "linear-gradient(135deg, #075985 0%, #0c4a6e 100%)" },
  { id: "forest", name: "숲",           css: "linear-gradient(135deg, #14532d 0%, #052e16 100%)" },
  { id: "amber",  name: "황혼",         css: "linear-gradient(135deg, #78350f 0%, #451a03 100%)" },
  { id: "teal",   name: "청록",         css: "linear-gradient(135deg, #115e59 0%, #134e4a 100%)" },
  { id: "purple", name: "보라 안개",   css: "linear-gradient(135deg, #6b21a8 0%, #3b0764 100%)" },
  { id: "slate",  name: "달밤",         css: "linear-gradient(135deg, #1e293b 0%, #020617 100%)" },
];

export function getBackgroundCss(id) {
  return BACKGROUNDS.find(b => b.id === id)?.css || BACKGROUNDS[0].css;
}
