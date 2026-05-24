"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditPostPage({ params }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "", body: "", excerpt: "", tags: "", category_id: "", status: "draft",
  });
  const [originalStatus, setOriginalStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [postRes, catsRes] = await Promise.all([
          fetch(`/api/posts/${params.id}`),
          fetch("/api/categories"),
        ]);
        if (!postRes.ok) {
          const d = await postRes.json().catch(() => ({}));
          throw new Error(d.error || `글 로드 실패 (${postRes.status})`);
        }
        const post = await postRes.json();
        const cats = await catsRes.json();
        if (cancelled) return;
        setCategories(cats);
        const initialStatus = post.status || "draft";
        setOriginalStatus(initialStatus);
        setForm({
          title:       post.title       || "",
          body:        post.body        || "",
          excerpt:     post.excerpt     || "",
          tags:        post.tags        || "",
          category_id: post.category_id ? String(post.category_id) : "",
          status:      initialStatus,
        });
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.id]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title.trim()) { alert("제목을 입력하세요."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       form.title,
          body:        form.body,
          excerpt:     form.excerpt,
          tags:        form.tags,
          category_id: form.category_id ? +form.category_id : null,
          status:      form.status,            // 명시적으로 form.status — 토글 결과
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");

      // server cache 우회 — published 글이 published 인 채로, draft 면 draft 로 정확히 보이도록
      router.refresh();
      // slug 가 없을 가능성에 대비
      if (data.slug) router.push(`/blog/${data.slug}`);
      else router.push("/blog");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;
    try {
      const res = await fetch(`/api/posts/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      router.refresh();
      router.push("/blog");
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-sm text-slate-400 dark:text-slate-500">불러오는 중…</div>;
  }
  if (err) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-sm text-red-500 mb-4">⚠ {err}</p>
        <Link href="/blog" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">← 블로그로</Link>
      </div>
    );
  }

  const setStatus = (s) => setForm(f => ({ ...f, status: s }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/blog" className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white dark:text-white">← 블로그</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            글 수정
            <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full align-middle ${
              originalStatus === "published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}>
              {originalStatus === "published" ? "● 발행됨" : "✎ 초안"}
            </span>
          </h1>
        </div>
      </div>

      <div className="space-y-5">
        <input type="text" value={form.title} onChange={set("title")}
          placeholder="제목"
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
            placeholder="태그 (콤마 구분)"
            className="flex-1 min-w-[200px] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm" />
        </div>

        <textarea value={form.body} onChange={set("body")}
          rows={20}
          className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-base bg-white dark:bg-slate-900 font-mono leading-relaxed focus:outline-none focus:border-slate-900 dark:focus:border-slate-100" />

        <input type="text" value={form.excerpt} onChange={set("excerpt")}
          placeholder="요약"
          className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm" />

        {/* 발행 상태 — 명시적 라디오 */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">발행 상태</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStatus("draft")}
              className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                form.status === "draft"
                  ? "border-amber-400 bg-amber-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
              <span className="text-base">✎</span>
              <div>
                <div className={`text-sm font-semibold ${form.status === "draft" ? "text-amber-900" : "text-slate-700"}`}>초안</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">나만 봄. 목록에서 초안 배지로 표시.</p>
              </div>
            </button>
            <button type="button" onClick={() => setStatus("published")}
              className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                form.status === "published"
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
              <span className="text-base">●</span>
              <div>
                <div className={`text-sm font-semibold ${form.status === "published" ? "text-emerald-900" : "text-slate-700"}`}>발행</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">모두에게 공개. Obsidian 에 동기화.</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={del}
            className="text-sm text-red-500 hover:text-red-700 font-medium">
            삭제
          </button>
          <button onClick={save} disabled={saving}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm ${
              form.status === "published"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-900 text-white hover:bg-slate-700"
            } disabled:opacity-50`}>
            {saving ? "저장 중..." : form.status === "published" ? "발행하기" : "초안으로 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
