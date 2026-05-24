"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STAGE_LABELS = {
  "1":            { name: "1단계 · 맞춤법/문장 정련", note: "초안을 깔끔하게 다듬어요" },
  "2-polished":   { name: "2단계 · 정돈된 톤",        note: "차분하고 다듬어진 글" },
  "2-casual":     { name: "2단계 · 친근한 톤",        note: "편한 대화체" },
  "2-structured": { name: "2단계 · 구조화 톤",        note: "소제목과 목록으로 정리" },
  "3-meta":       { name: "3단계 · 제목 / 태그 추출", note: "본문에서 메타데이터 자동 추출" },
  "4-work":       { name: "4단계 · 작품 정보 가져오기", note: "(리뷰만) Wikipedia 검색" },
};
const STAGE_BASE   = ["1", "2-polished", "2-casual", "2-structured", "3-meta"];
const STAGE_REVIEW = [...STAGE_BASE, "4-work"];

export default function NewPostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "", body: "", excerpt: "", tags: "", category_id: "",
  });
  const [drafts,    setDrafts]    = useState([]);
  const [meta,      setMeta]      = useState(null);          // {title, excerpt, tags[]} — AI 추출
  const [work,      setWork]      = useState(null);          // {displaytitle, thumbnail, ...} — 위키 결과
  const [progress,  setProgress]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState("");
  const [saving,    setSaving]    = useState(false);

  // 리뷰 — 수동 검색 (선택)
  const [workQuery,    setWorkQuery]    = useState("");
  const [workResults,  setWorkResults]  = useState([]);
  const [workLoading,  setWorkLoading]  = useState(false);
  const [workError,    setWorkError]    = useState("");

  // 진행률 타이머
  const startTimeRef = useRef(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!aiLoading) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [aiLoading]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(cats => {
      setCategories(cats);
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("prefill") === "journal") {
        const raw = sessionStorage.getItem("journal_prefill");
        if (raw) {
          try {
            const p = JSON.parse(raw);
            const catId = cats.find(c => c.slug === p.category_slug)?.id || "";
            setForm(f => ({
              ...f,
              title: p.title || "",
              body:  p.body  || "",
              excerpt: p.excerpt || "",
              tags: p.tags || "",
              category_id: catId ? String(catId) : "",
            }));
          } catch {}
          sessionStorage.removeItem("journal_prefill");
        }
      }
    }).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // 선택된 카테고리에서 리뷰 hint
  const reviewHint = (() => {
    const cat = categories.find(c => String(c.id) === String(form.category_id));
    if (!cat) return null;
    if (["movie", "drama", "anime"].includes(cat.slug)) return cat.slug;
    if (cat.slug === "review") return "movie";
    return null;
  })();

  /** SSE — refine 호출 */
  const handleAiRefine = async () => {
    if (!form.body.trim()) { setAiError("초안을 먼저 입력하세요."); return; }
    setAiLoading(true); setAiError("");
    setDrafts([]); setMeta(null); setWork(null);
    setProgress({ currentStage: "1", doneStages: new Set(), elapsedMs: 0 });
    startTimeRef.current = Date.now();

    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: form.body,
          isReview: !!reviewHint,
          hint: reviewHint || undefined,
          title: form.title || undefined,
        }),
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        const msg = ct.includes("application/json")
          ? (await res.json()).error
          : await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("응답 본문이 없습니다");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const draftMap = new Map();
      const draftOrder = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";

        for (const ev of events) {
          const line = ev.split("\n").find(l => l.startsWith("data: "));
          if (!line) continue;
          let payload;
          try { payload = JSON.parse(line.slice(6)); } catch { continue; }

          if (payload.type === "stage") {
            setProgress(p => {
              const doneStages = new Set(p?.doneStages || []);
              if (payload.status === "done") doneStages.add(payload.stage);
              return {
                currentStage: payload.status === "start" ? payload.stage : (p?.currentStage || payload.stage),
                doneStages,
                elapsedMs: payload.elapsed_ms ?? 0,
              };
            });
          } else if (payload.type === "draft") {
            if (!draftMap.has(payload.id)) draftOrder.push(payload.id);
            draftMap.set(payload.id, payload);
            setDrafts(draftOrder.map(id => draftMap.get(id)));
          } else if (payload.type === "meta") {
            setMeta({ title: payload.title, excerpt: payload.excerpt, tags: payload.tags || [] });
          } else if (payload.type === "work") {
            setWork(payload.result);
          } else if (payload.type === "done") {
            setProgress(p => ({ ...(p || {}), currentStage: null, elapsedMs: payload.elapsed_ms ?? 0 }));
          } else if (payload.type === "error") {
            throw new Error(payload.message || "AI 처리 중 오류");
          }
        }
      }
    } catch (e) {
      setAiError(e.message || String(e));
    } finally {
      setAiLoading(false);
    }
  };

  /** draft 적용 — 본문 + (자동으로 메타·작품 정보도 같이) */
  const applyDraft = (draft) => {
    let nextBody  = draft.content;
    let nextTitle = form.title;
    let nextExc   = form.excerpt;
    let nextTags  = form.tags;

    // 메타 자동 적용 (비어있는 필드만)
    if (meta) {
      if (!nextTitle && meta.title)   nextTitle = meta.title;
      if (!nextExc   && meta.excerpt) nextExc   = meta.excerpt;
      const existingTagSet = new Set(nextTags.split(",").map(s => s.trim()).filter(Boolean));
      for (const t of (meta.tags || [])) existingTagSet.add(t);
      nextTags = Array.from(existingTagSet).join(", ");
    }

    // 작품 정보 자동 prepend (리뷰 + 위키 결과 있을 때, body 시작이 이미지가 아니면)
    if (work && !/^!\[/.test(nextBody)) {
      const img = work.originalimage || work.thumbnail || "";
      const block = [
        img ? `![${work.displaytitle}](${img})` : "",
        "",
        `> **${work.displaytitle}**${work.description ? ` — ${work.description}` : ""}`,
        "",
        work.extract ? work.extract.trim() : "",
        "",
        `*출처: [Wikipedia](${work.url})*`,
        "",
        "---",
        "",
      ].filter(s => s !== "").join("\n");
      nextBody = `${block}\n${nextBody}`;
      if (!nextTitle) nextTitle = work.displaytitle;
    }

    setForm(f => ({ ...f, body: nextBody, title: nextTitle, excerpt: nextExc, tags: nextTags }));
    setDrafts([]); setMeta(null); setWork(null); setProgress(null);
  };

  /* ── 수동 작품 검색 (자동이 실패했거나 다른 결과를 원할 때) ── */
  const searchWork = async () => {
    if (!workQuery.trim()) return;
    setWorkLoading(true); setWorkError(""); setWorkResults([]);
    try {
      const url = `/api/lookup/work?q=${encodeURIComponent(workQuery)}${reviewHint ? `&hint=${reviewHint}` : ""}`;
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "검색 실패");
      setWorkResults(d.results || []);
      if ((d.results || []).length === 0) setWorkError("결과가 없습니다.");
    } catch (e) {
      setWorkError(e.message);
    } finally {
      setWorkLoading(false);
    }
  };
  const insertWork = (w) => {
    const img = w.originalimage || w.thumbnail || "";
    const block = [
      img ? `![${w.displaytitle}](${img})` : "",
      "",
      `> **${w.displaytitle}**${w.description ? ` — ${w.description}` : ""}`,
      "",
      w.extract ? w.extract.trim() : "",
      "",
      `*출처: [Wikipedia](${w.url})*`,
      "",
      "---",
      "",
    ].filter(s => s !== "").join("\n");
    setForm(f => ({
      ...f,
      title:   f.title   || w.displaytitle,
      excerpt: f.excerpt || (w.description || "").slice(0, 140),
      body:    `${block}\n${f.body}`.trim(),
    }));
    setWorkResults([]);
    setWorkQuery("");
  };

  const handleSave = async (status) => {
    if (!form.title.trim()) { alert("제목을 입력하세요."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       form.title,
          body:        form.body,
          excerpt:     form.excerpt,
          tags:        form.tags,
          category_id: form.category_id ? +form.category_id : null,
          ai_drafts:   drafts.length ? drafts : null,
          status,                            // 명시적으로 전달, form 에 status 키 자체가 없음
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      router.refresh();                    // SSR 캐시 무효화 — 새 글이 목록에 즉시 반영
      if (data.slug) router.push(`/blog/${data.slug}`);
      else router.push("/blog");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // 진행률 UI
  const stageOrder = reviewHint ? STAGE_REVIEW : STAGE_BASE;
  const elapsedSec = aiLoading
    ? Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000))
    : Math.floor((progress?.elapsedMs || 0) / 1000);
  const doneCount = progress?.doneStages?.size || 0;
  const pct = Math.min(100, Math.round((doneCount / stageOrder.length) * 100));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/blog" className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white dark:text-white">← 블로그</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">새 글</h1>
        </div>
      </div>

      <div className="space-y-5">
        <input type="text" value={form.title} onChange={set("title")}
          placeholder="제목 (적지 않으면 AI 가 추출해서 채워줍니다)"
          className="w-full text-3xl font-bold tracking-tight border-b border-slate-200 dark:border-slate-800 pb-3 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 bg-transparent placeholder:text-slate-300 dark:placeholder:text-slate-600" />

        <div className="flex gap-2 flex-wrap">
          <select value={form.category_id} onChange={set("category_id")}
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900">
            <option value="">카테고리 선택</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? "  ↳ " : ""}{c.icon} {c.name}
              </option>
            ))}
          </select>
          <input type="text" value={form.tags} onChange={set("tags")}
            placeholder="태그 (콤마 구분) — 비워두면 AI 가 자동 추가"
            className="flex-1 min-w-[200px] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm" />
        </div>

        <textarea value={form.body} onChange={set("body")}
          placeholder={
            reviewHint
              ? "여기에 본문을 자유롭게 적으세요. 작품 제목을 적어두면 'AI 다듬기' 시 자동으로 포스터/줄거리를 가져옵니다."
              : "여기에 본문을 자유롭게 적으세요. (마크다운 OK)\n\n다 적으면 'AI 다듬기' 로 본문 정련 + 제목/태그 자동 추출까지 한 번에."
          }
          className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-base bg-white dark:bg-slate-900 font-mono leading-relaxed focus:outline-none focus:border-slate-900 dark:focus:border-slate-100"
          rows={18} />

        <input type="text" value={form.excerpt} onChange={set("excerpt")}
          placeholder="요약 (선택) — 비워두면 AI 가 자동 생성"
          className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm" />

        {/* AI 다듬기 */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">✨ AI 다듬기</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                3톤 본문 + 제목·태그 자동 추출{reviewHint ? " + 작품 정보 자동" : ""}
              </p>
            </div>
            <button onClick={handleAiRefine} disabled={aiLoading || !form.body.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium">
              {aiLoading ? `다듬는 중... ${elapsedSec}s` : "AI 분석"}
            </button>
          </div>

          {/* 진행률 */}
          {(aiLoading || progress) && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 mb-3">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-2">
                <span className="font-semibold text-indigo-700">
                  {aiLoading ? `진행 중 · ${doneCount}/${stageOrder.length} 단계` : `완료 · ${elapsedSec}s`}
                </span>
                <span className="font-mono">{elapsedSec}s</span>
              </div>
              <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                     style={{ width: `${pct}%` }} />
              </div>
              <ul className="space-y-1">
                {stageOrder.map(s => {
                  const info = STAGE_LABELS[s];
                  const isDone   = progress?.doneStages?.has(s);
                  const isActive = !isDone && progress?.currentStage === s;
                  return (
                    <li key={s} className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex w-4 h-4 rounded-full items-center justify-center text-[10px] font-bold ${
                        isDone ? "bg-green-500 text-white"
                          : isActive ? "bg-indigo-500 text-white animate-pulse"
                          : "bg-slate-200 text-slate-400"
                      }`}>
                        {isDone ? "✓" : isActive ? "•" : ""}
                      </span>
                      <span className={isDone ? "text-slate-500 line-through" : isActive ? "text-slate-900 font-medium" : "text-slate-400"}>
                        {info.name}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">— {info.note}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {aiError && <p className="text-xs text-red-500 mb-2">⚠ {aiError}</p>}

          {/* 메타데이터 카드 (AI 추출) */}
          {meta && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 mb-3">
              <div className="text-xs font-semibold text-emerald-800 mb-2">📋 AI 가 추출한 메타데이터 — 적용 시 빈 필드에 채워집니다</div>
              <dl className="text-sm space-y-1">
                <div className="flex gap-2"><dt className="font-semibold text-slate-600 dark:text-slate-300 min-w-[3rem]">제목</dt><dd className="text-slate-900 dark:text-white">{meta.title || "—"}</dd></div>
                <div className="flex gap-2"><dt className="font-semibold text-slate-600 dark:text-slate-300 min-w-[3rem]">요약</dt><dd className="text-slate-700 dark:text-slate-200">{meta.excerpt || "—"}</dd></div>
                <div className="flex gap-2 flex-wrap items-center">
                  <dt className="font-semibold text-slate-600 dark:text-slate-300 min-w-[3rem]">태그</dt>
                  <dd className="flex flex-wrap gap-1">
                    {(meta.tags || []).map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">#{t}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* 작품 정보 카드 (AI 자동 추출 결과) */}
          {work && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 px-4 py-3 mb-3">
              <div className="text-xs font-semibold text-amber-800 mb-2">🎞️ 자동 검색된 작품 정보 — 적용 시 본문 상단에 삽입됩니다</div>
              <div className="flex gap-3">
                {work.thumbnail ? (
                  <img src={work.thumbnail} alt={work.displaytitle} className="w-16 h-20 object-cover rounded-md flex-shrink-0 bg-amber-100" />
                ) : (
                  <div className="w-16 h-20 rounded-md bg-amber-100 flex items-center justify-center text-2xl">🎞️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-700">{work.lang}</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{work.displaytitle}</span>
                  </div>
                  {work.description && <p className="text-xs text-slate-700 dark:text-slate-200 mb-1">{work.description}</p>}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{work.extract}</p>
                </div>
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div className="grid grid-cols-1 gap-4 mt-4">
              {drafts.map(d => (
                <div key={d.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-indigo-700">{d.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">{d.desc}</div>
                    </div>
                    <button onClick={() => applyDraft(d)} disabled={!d.content}
                      className="text-xs px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-700 font-medium disabled:opacity-40">
                      이걸로 적용 (메타/작품 포함)
                    </button>
                  </div>
                  {d.error ? (
                    <p className="text-xs text-red-500">실패: {d.error}</p>
                  ) : (
                    <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg p-3">{d.content || "(빈 응답)"}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 리뷰 — 수동 작품 검색 (자동 실패 시 fallback) */}
        {reviewHint && (
          <details className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <summary className="text-sm font-semibold text-amber-900 cursor-pointer">🎞️ 작품 직접 검색 (자동 결과가 마음에 안 들면)</summary>
            <div className="mt-3">
              <div className="flex gap-2">
                <input type="text" value={workQuery}
                  onChange={e => setWorkQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), searchWork())}
                  placeholder="작품 제목"
                  className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900" />
                <button onClick={searchWork} disabled={workLoading || !workQuery.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50">
                  {workLoading ? "검색 중..." : "검색"}
                </button>
              </div>
              {workError && <p className="text-xs text-red-500 mt-2">⚠ {workError}</p>}
              {workResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  {workResults.map((w, i) => (
                    <button key={i} onClick={() => insertWork(w)}
                      className="text-left flex gap-3 p-3 rounded-xl border border-amber-200 bg-white dark:bg-slate-900 hover:border-amber-400 transition-all">
                      {w.thumbnail ? (
                        <img src={w.thumbnail} alt={w.displaytitle} className="w-16 h-20 object-cover rounded-md flex-shrink-0 bg-amber-100" />
                      ) : (
                        <div className="w-16 h-20 rounded-md bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">🎞️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-700">{w.lang}</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{w.displaytitle}</span>
                        </div>
                        {w.description && <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">{w.description}</p>}
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">{w.extract}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}

        {/* 저장 */}
        <div className="flex gap-2 justify-end pt-6 border-t border-slate-200 dark:border-slate-800">
          <button onClick={() => handleSave("draft")} disabled={saving}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 text-sm font-medium">
            초안 저장
          </button>
          <button onClick={() => handleSave("published")} disabled={saving}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 font-semibold text-sm">
            {saving ? "발행 중..." : "발행"}
          </button>
        </div>
      </div>
    </div>
  );
}
