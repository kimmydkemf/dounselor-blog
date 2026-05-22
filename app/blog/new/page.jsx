"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    body: "",
    excerpt: "",
    tags: "",
    category_id: "",
  });
  const [drafts,    setDrafts]    = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAiRefine = async () => {
    if (!form.body.trim()) { setAiError("초안을 먼저 입력하세요."); return; }
    setAiLoading(true); setAiError(""); setDrafts([]);
    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: form.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 요청 실패");
      setDrafts(data.drafts || []);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const applyDraft = (draft) => {
    setForm(f => ({ ...f, body: draft.content }));
    setDrafts([]);
  };

  const handleSave = async (status) => {
    if (!form.title.trim()) { alert("제목을 입력하세요."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          category_id: form.category_id ? +form.category_id : null,
          ai_drafts: drafts.length ? drafts : null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      router.push(status === "published" ? `/blog/${data.slug}` : "/blog");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/blog" className="text-xs text-slate-500 hover:text-slate-900">← 블로그</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">새 글</h1>
        </div>
      </div>

      <div className="space-y-5">
        <input type="text" value={form.title} onChange={set("title")}
          placeholder="제목"
          className="w-full text-3xl font-bold tracking-tight border-b border-slate-200 pb-3 focus:outline-none focus:border-slate-900 bg-transparent placeholder:text-slate-300" />

        <div className="flex gap-2 flex-wrap">
          <select value={form.category_id} onChange={set("category_id")}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">카테고리 선택</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <input type="text" value={form.tags} onChange={set("tags")}
            placeholder="태그 (콤마 구분)"
            className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>

        <textarea value={form.body} onChange={set("body")}
          placeholder="여기에 본문을 자유롭게 적으세요. (마크다운 OK)&#10;&#10;다 적으면 아래 'AI 다듬기' 로 3가지 톤의 정리된 버전을 제안받을 수 있어요."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base bg-white font-mono leading-relaxed focus:outline-none focus:border-slate-900"
          rows={18} />

        <input type="text" value={form.excerpt} onChange={set("excerpt")}
          placeholder="요약 (선택) — 목록에 표시되는 짧은 설명"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />

        {/* AI 다듬기 */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">✨ AI 다듬기</h3>
              <p className="text-xs text-slate-400 mt-0.5">2단계 정련: 맞춤법 + 톤별 블로그 본문</p>
            </div>
            <button onClick={handleAiRefine} disabled={aiLoading || !form.body.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium">
              {aiLoading ? "다듬는 중... (~30초)" : "3가지 톤 제안받기"}
            </button>
          </div>
          {aiError && <p className="text-xs text-red-500 mb-2">⚠ {aiError}</p>}
          {drafts.length > 0 && (
            <div className="grid grid-cols-1 gap-4 mt-4">
              {drafts.map(d => (
                <div key={d.id} className="border border-slate-200 rounded-2xl p-5 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-indigo-700">{d.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{d.desc}</div>
                    </div>
                    <button onClick={() => applyDraft(d)} disabled={!d.content}
                      className="text-xs px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-700 font-medium disabled:opacity-40">
                      이걸로 적용
                    </button>
                  </div>
                  {d.error ? (
                    <p className="text-xs text-red-500">실패: {d.error}</p>
                  ) : (
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto bg-slate-50 rounded-lg p-3">{d.content || "(빈 응답)"}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 저장 */}
        <div className="flex gap-2 justify-end pt-6 border-t border-slate-200">
          <button onClick={() => handleSave("draft")} disabled={saving}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium">
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
