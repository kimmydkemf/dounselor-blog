/**
 * 마크다운 본문에서 h2 / h3 헤딩을 추출해 목차 트리 만들기.
 * id 는 안전하게 slug 화 — 한글 그대로 사용 (브라우저 fragment 한글 OK).
 */
export function extractToc(md) {
  if (!md) return [];
  const lines = md.split("\n");
  const out = [];
  let inFence = false;
  for (const line of lines) {
    // 코드 펜스 안의 # 무시
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = m[1].length;       // 2 or 3
    const text  = m[2].replace(/[`*_]/g, "").trim();
    out.push({ level, text, id: slugify(text) });
  }
  return out;
}

/** anchor id slug — 공백을 하이픈으로, 영문 소문자, 한글은 그대로 */
export function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
