/**
 * 한글 + 영문 안전한 slug 생성.
 * - 한글 그대로 유지 (URL 인코딩으로 처리됨)
 * - 공백 → -, 특수문자 제거, 소문자
 * - 최대 60자
 */
export function slugify(s) {
  return String(s || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\\\/:*?"<>|#%&{}\[\]+=`^~$@!()'.,;]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "untitled";
}
