"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BACKGROUNDS, getBackgroundCss } from "@/lib/boardLabels";

const PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#0ea5e9", "#a855f7", "#ef4444", "#14b8a6",
];

export default function BoardListPage() {
  const router = useRouter();
  const [boards,  setBoards]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");
  const [showNew, setShowNew] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/boards");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setBoards(await r.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const remove = async (id, name) => {
    if (!confirm(`보드 "${name}" 을 삭제할까요? 안의 모든 리스트/카드도 같이 삭제됩니다.`)) return;
    const r = await fetch(`/api/boards/${id}`, { method: "DELETE" });
    if (r.ok) reload();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 mb-2">Boards</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">공유 보드</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Trello 처럼 — 리스트와 카드로 일·할 일을 관리합니다.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm">
          + 새 보드
        </button>
      </div>

      {err && <p className="text-sm text-red-500 mb-4">⚠ {err}</p>}

      {loading ? (
        <p className="text-center py-20 text-sm text-slate-400 dark:text-slate-500">불러오는 중…</p>
      ) : boards.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
          <div className="text-5xl mb-3 opacity-30">📋</div>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mb-4">아직 보드가 없어요.</p>
          <button onClick={() => setShowNew(true)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            + 첫 보드 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(b => (
            <BoardCard key={b.id} b={b} onDelete={() => remove(b.id, b.name)} />
          ))}
        </div>
      )}

      {showNew && (
        <NewBoardModal
          onClose={() => setShowNew(false)}
          onCreated={async (b) => {
            setShowNew(false);
            await reload();
            router.push(`/board/${b.id}`);
          }} />
      )}
    </div>
  );
}

function BoardCard({ b, onDelete }) {
  const color = b.color || "#6366f1";
  const bgCss = b.background ? getBackgroundCss(b.background)
              : `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`;
  return (
    <div className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 card-lift overflow-hidden">
      <Link href={`/board/${b.id}`} className="block">
        {/* 배경 프리뷰 (Trello 의 보드 카드처럼) */}
        <div className="h-24 relative" style={{ background: bgCss }}>
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-0 p-4 flex items-end">
            <h3 className="text-base font-bold text-white drop-shadow-md line-clamp-1">{b.name}</h3>
          </div>
        </div>
        <div className="p-4">
          {b.description && <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed mb-2">{b.description}</p>}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1">📋 <b className="text-slate-700 dark:text-slate-200 tabular">{b.list_count}</b></span>
            <span className="inline-flex items-center gap-1">🗂 <b className="text-slate-700 dark:text-slate-200 tabular">{b.card_count}</b></span>
          </div>
        </div>
      </Link>
      <button onClick={onDelete}
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-white/90 hover:text-white bg-black/30 hover:bg-red-500/80 px-2 py-0.5 rounded backdrop-blur">
        삭제
      </button>
    </div>
  );
}

function NewBoardModal({ onClose, onCreated }) {
  const [name,  setName]  = useState("");
  const [desc,  setDesc]  = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [bg,    setBg]    = useState(BACKGROUNDS[0].id);
  const [busy,  setBusy]  = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc, color, background: bg }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "생성 실패");
      onCreated(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">새 보드 만들기</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), create())}
              placeholder="예) 2026 1분기 작업" autoFocus
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">설명 (선택)</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">테마 색</label>
            <div className="flex gap-1.5 flex-wrap">
              {PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105"}`}
                  aria-label={c} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">배경</label>
            <div className="grid grid-cols-4 gap-1.5">
              {BACKGROUNDS.map(b => (
                <button key={b.id} type="button" onClick={() => setBg(b.id)}
                  title={b.name}
                  style={{ background: b.css }}
                  className={`h-10 rounded-md ring-2 transition-all ${bg === b.id ? "ring-slate-900 scale-105" : "ring-transparent hover:ring-slate-300"}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800">취소</button>
          <button onClick={create} disabled={busy || !name.trim()}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50">
            {busy ? "만드는 중..." : "만들기"}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">새 보드엔 기본 리스트 3개(할 일 / 진행 중 / 완료)가 같이 만들어져요.</p>
      </div>
    </div>
  );
}
