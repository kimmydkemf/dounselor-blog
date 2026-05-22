"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: "", icon: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/categories").then(r => r.json()).then(setCats).catch(() => {});

  useEffect(() => { load(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("추가 실패");
      setForm({ name: "", icon: "", description: "" });
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📂 카테고리 관리</h1>
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-800">← 블로그</Link>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6 bg-white border border-gray-200 rounded-xl p-3">
        <input type="text" value={form.icon} onChange={set("icon")}
          placeholder="🎯" maxLength={4}
          className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-center text-lg" />
        <input type="text" value={form.name} onChange={set("name")}
          placeholder="카테고리 이름 (예: 개발일지)"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
          추가
        </button>
      </form>

      <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {cats.map(c => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-xl">{c.icon || "📁"}</span>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-500">/{c.slug}</div>
            </div>
          </li>
        ))}
        {cats.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-400 text-sm">카테고리가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
