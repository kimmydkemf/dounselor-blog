/**
 * Wikipedia REST API 로 작품(영화/드라마/애니) 메타데이터 가져오기.
 * 키 불필요. 한국어 → 영어 순으로 시도.
 *
 * 1) action=opensearch 로 가장 가까운 페이지 title 찾기
 * 2) /api/rest_v1/page/summary/{title} 로 썸네일 + extract 가져오기
 */

const UA = "DounselorBlog/1.0 (https://blog.dounselor.com)";

async function jget(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

async function searchTitles(query, lang) {
  // action=opensearch returns [query, titles[], descriptions[], urls[]]
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
    action: "opensearch",
    search: query,
    limit: "5",
    namespace: "0",
    format: "json",
    origin: "*",
  });
  try {
    const data = await jget(url);
    return (data?.[1] || []).map((title, i) => ({
      title,
      desc: data?.[2]?.[i] || "",
      url:  data?.[3]?.[i] || "",
      lang,
    }));
  } catch {
    return [];
  }
}

/** displaytitle 에는 <span class=...> 같은 HTML 이 섞여 있음 → 태그 제거 */
function stripTags(s) {
  return String(s || "").replace(/<[^>]+>/g, "").trim();
}

async function summaryFor(title, lang) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const d = await jget(url);
    return {
      title:         d.title || title,
      displaytitle:  stripTags(d.displaytitle) || stripTags(d.title) || title,
      description:   d.description || "",
      extract:       d.extract || "",
      thumbnail:     d.thumbnail?.source || "",
      originalimage: d.originalimage?.source || "",
      url:           d.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      lang,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} query  — 작품 제목 (한국어 또는 영어)
 * @param {string=} hint  — 'movie' | 'drama' | 'anime' (검색 보강)
 * @returns {Promise<Array<{title, displaytitle, description, extract, thumbnail, originalimage, url, lang}>>}
 */
export async function lookupWork(query, hint) {
  const q = (query || "").trim();
  if (!q) return [];

  // 한국어 우선, 그 다음 영어
  const langs = ["ko", "en"];
  const hintKo = { movie: " (영화)", drama: " (드라마)", anime: " (애니메이션)" }[hint] || "";
  const hintEn = { movie: " (film)",  drama: " (TV series)", anime: " (anime)" }[hint] || "";

  const candidates = [];
  for (const lang of langs) {
    const hint2 = lang === "ko" ? hintKo : hintEn;
    // 1) hint 붙여서 시도
    if (hint2) candidates.push(...await searchTitles(q + hint2, lang));
    // 2) plain query
    candidates.push(...await searchTitles(q, lang));
  }

  // de-dup by (lang, title)
  const seen = new Set();
  const uniq = candidates.filter(c => {
    const k = `${c.lang}::${c.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // 최대 8개 후보 summary 병렬 fetch
  const summaries = await Promise.all(uniq.slice(0, 8).map(c => summaryFor(c.title, c.lang)));

  // 결과 dedup — Wikipedia redirect 로 같은 페이지에 도달한 결과 합치기
  const seenUrl = new Set();
  const uniqSums = summaries.filter(Boolean).filter(s => {
    const key = `${s.lang}::${s.url}`;
    if (seenUrl.has(key)) return false;
    seenUrl.add(key);
    return true;
  });

  // 이미지 있는 것 우선
  return uniqSums
    .sort((a, b) => (b.thumbnail ? 1 : 0) - (a.thumbnail ? 1 : 0))
    .slice(0, 5);
}
