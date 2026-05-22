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
  const [drafts, setDrafts] = useState([]);       // AI 제안 버전들
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState("");
  const [saving, setSaving]       = useState(false);

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
    setDrafts([]); // 적용 후 제안 숨김
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">새 글 작성</h1>
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-800">← 취소</Link>
      </div>

      <div className="space-y-4">
        <input type="text" value={form.title} onChange={set("title")}
          placeholder="제목"
          className="w-full text-2xl font-bold border-b border-gray-200 pb-2 focus:outline-none focus:border-indigo-500 bg-transparent" />

        <div className="flex gap-3">
          <select value={form.category_id} onChange={set("category_id")}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">카테고리 선택</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <input type="text" value={form.tags} onChange={set("tags")}
            placeholder="태그 (콤마로 구분)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
        </div>

        <textarea value={form.body} onChange={set("body")}
          placeholder="여기에 본문을 자유롭게 적으세요. (마크다운 OK)&#10;&#10;'AI 다듬기' 버튼을 누르면 3가지 스타일의 정리된 버전을 제안받을 수 있어요."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white font-mono leading-relaxed"
          rows={16} />

        <input type="text" value={form.excerpt} onChange={set("excerpt")}
          placeholder="요약 (선택)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />

        {/* AI 다듬기 */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">✨ AI 다듬기</h3>
            <button onClick={handleAiRefine} disabled={aiLoading || !form.body.trim()}
              className="text-sm px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
              {aiLoading ? "다듬는 중..." : "초안 → 3가지 버전 제안"}
            </button>
          </div>
          {aiError && (
            <p className="text-xs text-red-500 mb-2">⚠ {aiError}</p>
          )}
          {drafts.length > 0 && (
            <div className="grid grid-cols-1 gap-3 mt-3">
              {drafts.map(d => (
                <div key={d.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-violet-700">{d.label}</span>
                      <span className="ml-2 text-xs text-gray-500">{d.desc}</span>
                    </div>
                    <button onClick={() => applyDraft(d)}
                      disabled={!d.content}
                      className="text-xs px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 hover:bg-violet-100 font-medium disabled:opacity-40">
                      이걸로 적용
                    </button>
                  </div>
                  {d.error ? (
                    <p className="text-xs text-red-500">실패: {d.error}</p>
                  ) : (
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">{d.content || "(빈 응답)"}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 저장 액션 */}
        <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
          <button onClick={() => handleSave("draft")} disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">
            초안 저장
          </button>
          <button onClick={() => handleSave("published")} disabled={saving}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm">
            {saving ? "발행 중..." : "발행"}
          </button>
        </div>
      </div>
    </div>
  );
}
