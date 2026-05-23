"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // local 기준
  return d.toISOString().slice(0, 10);
}

export default function AutoJournalPage() {
  const router = useRouter();
  const [date,    setDate]    = useState(todayISO());
  const [note,    setNote]    = useState("");
  const [repos,   setRepos]   = useState("");           // 한 줄에 한 경로
  const [includeUncommitted, setIncludeUncommitted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [progress, setProgress] = useState(null);       // { stage, doneStages, elapsed }
  const [result,   setResult]   = useState(null);       // { title, body, excerpt, activities }
  const startRef = useRef(0);

  const generate = async () => {
    setLoading(true); setError(""); setResult(null);
    setProgress({ currentStage: "collect", doneStages: new Set(), elapsedMs: 0 });
    startRef.current = Date.now();

    try {
      const res = await fetch("/api/ai/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          note,
          repos: repos.split("\n").map(s => s.trim()).filter(Boolean),
          includeUncommitted,
        }),
      });
      if (!res.ok || !res.body) {
        const ct = res.headers.get("content-type") || "";
        const msg = ct.includes("json") ? (await res.json()).error : await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const evs = buf.split("\n\n");
        buf = evs.pop() || "";
        for (const ev of evs) {
          const line = ev.split("\n").find(l => l.startsWith("data: "));
          if (!line) continue;
          let p; try { p = JSON.parse(line.slice(6)); } catch { continue; }
          if (p.type === "stage") {
            setProgress(prev => {
              const d = new Set(prev?.doneStages || []);
              if (p.status === "done") d.add(p.stage);
              return {
                currentStage: p.status === "start" ? p.stage : prev?.currentStage,
                doneStages: d,
                elapsedMs: p.elapsed_ms ?? 0,
                activities: p.activities ?? prev?.activities,
              };
            });
          } else if (p.type === "result") {
            setResult({ title: p.title, body: p.body, excerpt: p.excerpt, dateISO: p.dateISO });
          } else if (p.type === "error") {
            throw new Error(p.message);
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendToEditor = () => {
    if (!result) return;
    // sessionStorage 로 prefill 데이터 전달
    sessionStorage.setItem("journal_prefill", JSON.stringify({
      title: result.title,
      body:  result.body,
      excerpt: result.excerpt,
      category_slug: "dev-log",
      tags: "개발일지,자동생성",
    }));
    router.push("/blog/new?prefill=journal");
  };

  const elapsedSec = loading
    ? Math.max(1, Math.floor((Date.now() - startRef.current) / 1000))
    : Math.floor((progress?.elapsedMs || 0) / 1000);
  const stages = [
    { key: "collect", label: "git 활동 수집" },
    { key: "write",   label: "Ollama 로 일지 작성" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/blog" className="text-xs text-slate-500 hover:text-slate-900">← 블로그</Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">✨ 오늘의 일지 자동 작성</h1>
        <p className="mt-2 text-sm text-slate-500">git 커밋 + 미커밋 진행 중인 변경까지 모아 AI 가 개발일지 한 편을 써줍니다.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">날짜</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            오늘 한 일 메모 <span className="text-slate-400 font-normal">(선택 — 키워드만 적어도 OK)</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="예) Cloudflare 터널 설정, MacroDroid SMS 자동 입력 422 통과, blog 디자인 Apple 스타일 리뉴얼"
            rows={4}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white leading-relaxed focus:outline-none focus:border-slate-900" />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            추가 git 경로 <span className="text-slate-400 font-normal">(한 줄에 하나 — 이 블로그 외 다른 프로젝트도 포함하려면)</span>
          </label>
          <textarea value={repos} onChange={e => setRepos(e.target.value)}
            placeholder={"예)\nC:\\my-calendar-app\nD:\\projects\\macrodroid-scripts"}
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white font-mono leading-relaxed focus:outline-none focus:border-slate-900" />
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
          <input type="checkbox" checked={includeUncommitted}
            onChange={e => setIncludeUncommitted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-indigo-600" />
          <div>
            <div className="text-sm font-semibold text-slate-800">아직 커밋 안 한 작업도 포함</div>
            <p className="text-xs text-slate-500 mt-0.5">
              staged · 수정 중인 파일 · untracked + 며칠 전 손대고 멈춰둔 파일까지. 진행 중 작업도 일지에 자연스럽게 녹여줍니다.
            </p>
          </div>
        </label>

        <div className="flex justify-end">
          <button onClick={generate} disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {loading ? `생성 중... ${elapsedSec}s` : "✨ 일지 생성"}
          </button>
        </div>

        {/* 진행률 */}
        {(loading || progress) && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span className="font-semibold text-indigo-700">
                {loading ? `진행 중 · ${progress?.doneStages?.size || 0}/${stages.length} 단계` : `완료 · ${elapsedSec}s`}
              </span>
              <span className="font-mono">{elapsedSec}s</span>
            </div>
            <ul className="space-y-1.5">
              {stages.map(s => {
                const isDone   = progress?.doneStages?.has(s.key);
                const isActive = !isDone && progress?.currentStage === s.key;
                return (
                  <li key={s.key} className="flex items-center gap-2 text-xs">
                    <span className={`inline-flex w-4 h-4 rounded-full items-center justify-center text-[10px] font-bold ${
                      isDone ? "bg-green-500 text-white" :
                      isActive ? "bg-indigo-500 text-white animate-pulse" :
                      "bg-slate-200 text-slate-400"
                    }`}>{isDone ? "✓" : isActive ? "•" : ""}</span>
                    <span className={isDone ? "text-slate-500 line-through" : isActive ? "text-slate-900 font-medium" : "text-slate-400"}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            {progress?.activities && progress.activities.length > 0 && (
              <div className="mt-3 pt-3 border-t border-indigo-100">
                <p className="text-[11px] font-semibold text-slate-600 mb-1">수집된 활동</p>
                <ul className="text-[11px] text-slate-500 space-y-1">
                  {progress.activities.map(a => {
                    const u = a.uncommitted;
                    const uncommittedTotal = u ? u.staged + u.unstaged + u.untracked : 0;
                    return (
                      <li key={a.repo} className="font-mono">
                        • <b className="text-slate-700">{a.repo}</b>
                        <span> — 커밋 {a.commits}</span>
                        {a.summary.files > 0 && <span> · 파일 {a.summary.files} · +{a.summary.insertions} -{a.summary.deletions}</span>}
                        {u && uncommittedTotal > 0 && (
                          <span className="text-amber-700"> · 미커밋 {uncommittedTotal} (staged {u.staged}, 수정중 {u.unstaged}, 새 파일 {u.untracked})</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">⚠ {error}</p>}

        {/* 결과 미리보기 */}
        {result && (
          <div className="border border-slate-200 rounded-2xl bg-white p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">생성된 일지</div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{result.title}</h2>
              </div>
              <button onClick={sendToEditor}
                className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 font-medium">
                에디터로 보내기 →
              </button>
            </div>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[36rem] overflow-y-auto bg-slate-50 rounded-lg p-4">{result.body}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
