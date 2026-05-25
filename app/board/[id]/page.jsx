"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LABEL_COLORS, LABEL_KEYS, BACKGROUNDS, getBackgroundCss } from "@/lib/boardLabels";

/**
 * 칸반 보드 — Trello 스타일.
 *
 * 시각:
 *   - 풀-블리드 컬러 배경 (boards.background 의 프리셋 id)
 *   - sticky 헤더 (보드명, 멤버 아바타, 초대 버튼)
 *   - 리스트는 반투명 흰 글래스
 *   - 카드는 상단 라벨 색띠 + 본문 + 메타 푸터(체크리스트 N/M, 마감 칩, 멤버)
 *   - 카드 모달: 좌 본문(설명/체크리스트) + 우 사이드바(라벨/마감/액션)
 *
 * 데이터: { id, name, color, background, lists:[{id, name, cards:[...]}] }
 * 카드: { id, title, description, due_date, labels: string[], checklist: [{text, done}], ... }
 */

function parseJsonField(v) {
  if (!v || typeof v !== "string") return [];
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
}

export default function BoardDetail({ params }) {
  const router = useRouter();
  const [board,   setBoard]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");
  const [editName, setEditName] = useState(false);
  const [openCard, setOpenCard] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showBg, setShowBg] = useState(false);
  const [invite, setInvite] = useState(null);   // {code, guests}
  const [isOwner, setIsOwner] = useState(false);

  const reload = async () => {
    try {
      const [boardRes, meRes] = await Promise.all([
        fetch(`/api/boards/${params.id}?full=1`),
        fetch("/api/auth/me").catch(() => null),
      ]);
      if (!boardRes.ok) {
        const d = await boardRes.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${boardRes.status}`);
      }
      const b = await boardRes.json();
      // labels/checklist JSON 파싱
      b.lists = (b.lists || []).map(l => ({
        ...l,
        cards: (l.cards || []).map(c => ({
          ...c,
          labels:    parseJsonField(c.labels),
          checklist: parseJsonField(c.checklist),
        })),
      }));
      setBoard(b);

      if (meRes?.ok) {
        const me = await meRes.json();
        setIsOwner(!!me?.role && me.role === "owner");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [params.id]);

  // SSE — 다른 사용자가 변경하면 자동 re-fetch (debounced)
  useEffect(() => {
    const es = new EventSource(`/api/boards/${params.id}/stream`);
    let timer = null;
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "hello") return;
        // 짧은 시간 내 여러 이벤트 묶어서 한 번만 reload
        clearTimeout(timer);
        timer = setTimeout(() => { reload(); }, 250);
      } catch {}
    };
    es.onerror = () => { /* 자동 재접속 — EventSource 가 알아서 함 */ };
    return () => { clearTimeout(timer); es.close(); };
    /* eslint-disable-next-line */
  }, [params.id]);

  const loadInvite = async () => {
    const r = await fetch(`/api/boards/${params.id}/invite`);
    if (r.ok) setInvite(await r.json());
  };
  const openMembers = async () => { setShowMembers(true); if (!invite) await loadInvite(); };

  if (loading) return <div className="px-6 py-20 text-center text-sm text-white/70">불러오는 중…</div>;
  if (err)     return (
    <div className="px-6 py-20 text-center">
      <p className="text-sm text-red-500 mb-4">⚠ {err}</p>
      <Link href="/board" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">← 보드 목록</Link>
    </div>
  );
  if (!board)  return null;

  const bgCss = board.background ? getBackgroundCss(board.background) :
    `linear-gradient(135deg, ${board.color || "#6366f1"} 0%, ${board.color || "#6366f1"}cc 100%)`;

  /* ── 보드 메타 ── */
  const renameBoard = async (newName) => {
    if (!newName.trim() || newName === board.name) { setEditName(false); return; }
    const r = await fetch(`/api/boards/${board.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (r.ok) {
      const b = await r.json();
      setBoard(prev => ({ ...prev, ...b }));
    }
    setEditName(false);
  };
  const changeBackground = async (bgId) => {
    setBoard(prev => ({ ...prev, background: bgId }));
    await fetch(`/api/boards/${board.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ background: bgId }),
    });
  };

  /* ── DnD ── */
  const persistReorder = async (lists) => {
    const payload = {
      lists: lists.map((l, li) => ({
        id: l.id,
        sort_order: li + 1,
        cards: l.cards.map((c, ci) => ({ id: c.id, sort_order: ci + 1 })),
      })),
    };
    await fetch(`/api/boards/${board.id}/reorder`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };
  const moveCard = (cardId, toListId, toIndex) => {
    setBoard(prev => {
      const lists = prev.lists.map(l => ({ ...l, cards: [...l.cards] }));
      let dragged = null;
      for (const l of lists) {
        const i = l.cards.findIndex(c => c.id === cardId);
        if (i >= 0) { dragged = l.cards.splice(i, 1)[0]; break; }
      }
      if (!dragged) return prev;
      const target = lists.find(l => l.id === toListId);
      if (!target) return prev;
      dragged = { ...dragged, list_id: toListId };
      if (toIndex == null || toIndex > target.cards.length) target.cards.push(dragged);
      else target.cards.splice(toIndex, 0, dragged);
      persistReorder(lists);
      return { ...prev, lists };
    });
  };
  const moveList = (listId, toIndex) => {
    setBoard(prev => {
      const lists = [...prev.lists];
      const from = lists.findIndex(l => l.id === listId);
      if (from < 0) return prev;
      const [m] = lists.splice(from, 1);
      lists.splice(Math.min(toIndex, lists.length), 0, m);
      persistReorder(lists);
      return { ...prev, lists };
    });
  };

  /* ── List CRUD ── */
  const addList = async (name) => {
    const r = await fetch(`/api/boards/${board.id}/lists`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (r.ok) {
      const l = await r.json();
      setBoard(prev => ({ ...prev, lists: [...prev.lists, { ...l, cards: [] }] }));
    }
  };
  const renameList = async (listId, name) => {
    const r = await fetch(`/api/board-lists/${listId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (r.ok) setBoard(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? { ...l, name } : l),
    }));
  };
  const deleteList = async (listId) => {
    if (!confirm("이 리스트와 그 안의 모든 카드를 삭제할까요?")) return;
    const r = await fetch(`/api/board-lists/${listId}`, { method: "DELETE" });
    if (r.ok) setBoard(prev => ({ ...prev, lists: prev.lists.filter(l => l.id !== listId) }));
  };

  /* ── Card CRUD ── */
  const addCard = async (listId, title) => {
    const r = await fetch(`/api/board-lists/${listId}/cards`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (r.ok) {
      const c = await r.json();
      const parsed = { ...c, labels: parseJsonField(c.labels), checklist: parseJsonField(c.checklist) };
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, parsed] } : l),
      }));
    }
  };
  const updateCard = async (cardId, patch) => {
    const r = await fetch(`/api/board-cards/${cardId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const c = await r.json();
      const parsed = { ...c, labels: parseJsonField(c.labels), checklist: parseJsonField(c.checklist) };
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l => ({
          ...l,
          cards: l.cards.map(x => x.id === cardId ? parsed : x),
        })),
      }));
      setOpenCard(prev => prev?.id === cardId ? parsed : prev);
    }
  };
  const deleteCard = async (cardId) => {
    if (!confirm("이 카드를 삭제할까요?")) return;
    const r = await fetch(`/api/board-cards/${cardId}`, { method: "DELETE" });
    if (r.ok) {
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) })),
      }));
      setOpenCard(null);
    }
  };

  /* ── 초대/멤버 관리 ── */
  const rotateCode = async () => {
    if (!confirm("초대 코드를 새로 발급할까요?\n옛 코드로 접속하면 더 이상 가입 안 됩니다 (이미 가입한 멤버는 그대로).")) return;
    const r = await fetch(`/api/boards/${board.id}/invite`, { method: "POST" });
    if (r.ok) { const d = await r.json(); setInvite(prev => ({ ...prev, code: d.code })); }
  };
  const removeGuest = async (guestId) => {
    if (!confirm("이 멤버를 보드에서 제거할까요?")) return;
    const r = await fetch(`/api/boards/${board.id}/guests/${guestId}`, { method: "DELETE" });
    if (r.ok) setInvite(prev => ({ ...prev, guests: prev.guests.filter(g => g.id !== guestId) }));
  };

  return (
    <div className="min-h-screen relative" style={{ background: bgCss }}>
      {/* 미세 노이즈 오버레이 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"
        }} />

      {/* sticky 헤더 */}
      <div className="sticky top-[57px] z-30 backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/board" className="text-xs text-white/70 hover:text-white flex-shrink-0">← 보드</Link>
            {editName ? (
              <input type="text" defaultValue={board.name} autoFocus
                onBlur={e => renameBoard(e.target.value)}
                onKeyDown={e => e.key === "Enter" && renameBoard(e.target.value)}
                className="text-xl font-bold tracking-tight bg-white/10 text-white border border-white/30 rounded px-2 py-0.5 focus:outline-none focus:bg-white/20 placeholder-white/50" />
            ) : (
              <button onClick={() => isOwner && setEditName(true)}
                className={`text-xl font-bold tracking-tight text-white truncate ${isOwner ? "hover:text-white/80 cursor-text" : "cursor-default"}`}>
                {board.name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openMembers}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur border border-white/10 transition-colors flex items-center gap-1.5">
              <span>👥</span> 멤버 · 초대
            </button>
            {isOwner && (
              <button onClick={() => setShowBg(v => !v)}
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur border border-white/10 transition-colors flex items-center gap-1.5">
                <span>🎨</span> 배경
              </button>
            )}
          </div>
        </div>

        {showBg && isOwner && (
          <div className="px-5 py-3 border-t border-white/10 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-white/60 mb-2">배경</p>
            <div className="flex gap-2 flex-wrap">
              {BACKGROUNDS.map(bg => (
                <button key={bg.id} onClick={() => changeBackground(bg.id)}
                  title={bg.name}
                  style={{ background: bg.css }}
                  className={`w-14 h-9 rounded-md ring-2 transition-all ${
                    board.background === bg.id ? "ring-white scale-105" : "ring-transparent hover:ring-white/40"
                  }`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 보드 — 가로 스크롤 */}
      <div className="overflow-x-auto">
        <div className="flex gap-3 p-5 items-start min-h-[60vh]">
          {board.lists.map((list, listIndex) => (
            <BoardList key={list.id}
              list={list}
              listIndex={listIndex}
              onRename={(name) => renameList(list.id, name)}
              onDelete={() => deleteList(list.id)}
              onAddCard={(title) => addCard(list.id, title)}
              onOpenCard={setOpenCard}
              moveCard={moveCard}
              moveList={moveList} />
          ))}
          <AddList onAdd={addList} />
        </div>
      </div>

      {openCard && (
        <CardModal
          card={openCard}
          board={board}
          onClose={() => setOpenCard(null)}
          onUpdate={(patch) => updateCard(openCard.id, patch)}
          onDelete={() => deleteCard(openCard.id)} />
      )}

      {showMembers && (
        <MembersPanel
          board={board}
          invite={invite}
          isOwner={isOwner}
          onClose={() => setShowMembers(false)}
          onRotate={rotateCode}
          onRemoveGuest={removeGuest} />
      )}
    </div>
  );
}

/* ───────────────── List ─────────────────
 * 드래그 동작:
 *   - 리스트 컨테이너 자체엔 draggable 없음 (카드 드래그 충돌 방지)
 *   - 헤더 왼쪽의 명시적 핸들 (⋮⋮) 을 잡고 끌어야 리스트 이동
 *   - 카드를 빈 영역에 떨어뜨리면 그 리스트로 이동 (kind="card" 만)
 *   - 카드/리스트 둘 다 헤더+바디 영역에 drop 가능. drag 종류로 분기.
 */
function BoardList({ list, listIndex, onRename, onDelete, onAddCard, onOpenCard, moveCard, moveList }) {
  const [editingName, setEditingName] = useState(false);
  const [adding,      setAdding]      = useState(false);
  const [newTitle,    setNewTitle]    = useState("");
  const [dragOver,    setDragOver]    = useState(false);
  const [listDragOver, setListDragOver] = useState(false);  // 리스트가 다른 리스트의 drop target 일 때

  const onHandleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-kanban", JSON.stringify({ kind: "list", id: list.id }));
  };

  // 컨테이너 전체 — 카드 / 리스트 둘 다 받음
  const onContainerDragOver = (e) => {
    if (!hasKanbanData(e)) return;
    e.preventDefault();
  };
  // 카드만 들어왔을 때 body 하이라이트 (kind 는 dragover 중 보안상 못 읽어 무조건 시도)
  const onBodyDragOver = (e) => {
    if (!hasKanbanData(e)) return;
    e.preventDefault();
    setDragOver(true);
  };
  const onBodyDragLeave = () => setDragOver(false);
  const onBodyDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const data = readKanban(e);
    if (data?.kind === "card") moveCard(data.id, list.id, null);
    // kind="list" 가 빈 카드 영역에 떨어지면 무시 (사용자 의도는 리스트 위치 변경이므로 헤더로 떨어뜨려야)
  };

  // 헤더 영역 — 리스트가 떨어지면 list reorder, 카드가 떨어지면 그 리스트 맨 끝
  const onHeaderDragOver = (e) => {
    if (!hasKanbanData(e)) return;
    e.preventDefault();
    setListDragOver(true);
  };
  const onHeaderDragLeave = () => setListDragOver(false);
  const onHeaderDrop = (e) => {
    e.preventDefault();
    setListDragOver(false);
    const data = readKanban(e);
    if (data?.kind === "list" && data.id !== list.id) {
      moveList(data.id, listIndex);
    } else if (data?.kind === "card") {
      moveCard(data.id, list.id, null);
    }
  };

  const submitNewCard = () => {
    if (newTitle.trim()) { onAddCard(newTitle.trim()); setNewTitle(""); }
    setAdding(false);
  };

  return (
    <div className={`w-72 flex-shrink-0 rounded-2xl bg-white/95 backdrop-blur shadow-lg p-2 transition-all ${
      listDragOver ? "ring-2 ring-indigo-400 scale-[1.02]" : ""
    }`}
      onDragOver={onContainerDragOver}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1.5"
        onDragOver={onHeaderDragOver} onDragLeave={onHeaderDragLeave} onDrop={onHeaderDrop}>
        {/* 명시적 drag handle — 이것만 잡고 끌어야 리스트 이동 */}
        <span draggable onDragStart={onHandleDragStart}
          className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200 select-none px-0.5"
          title="리스트 드래그">⋮⋮</span>

        {editingName ? (
          <input type="text" defaultValue={list.name} autoFocus
            onBlur={e => { onRename(e.target.value.trim() || list.name); setEditingName(false); }}
            onKeyDown={e => e.key === "Enter" && e.target.blur()}
            className="font-bold text-sm bg-white dark:bg-slate-900 border border-indigo-300 rounded px-2 py-0.5 flex-1 focus:outline-none focus:border-indigo-500" />
        ) : (
          <button onClick={() => setEditingName(true)}
            className="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white dark:text-white truncate flex-1 text-left">
            {list.name}
            <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500 tabular">{list.cards.length}</span>
          </button>
        )}
        <button onClick={onDelete}
          className="text-slate-400 dark:text-slate-500 hover:text-red-500 text-base leading-none px-1.5"
          title="리스트 삭제">×</button>
      </div>

      <div onDragOver={onBodyDragOver} onDragLeave={onBodyDragLeave} onDrop={onBodyDrop}
           className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors p-1 ${dragOver ? "bg-indigo-100/60" : ""}`}>
        {list.cards.map((card, idx) => (
          <BoardCardItem key={card.id}
            card={card} index={idx} listId={list.id}
            onOpen={() => onOpenCard(card)} moveCard={moveCard} />
        ))}

        {adding ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-2 shadow-md ring-1 ring-indigo-200">
            <textarea value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitNewCard(); } }}
              placeholder="이 카드의 제목 입력..." autoFocus rows={2}
              className="w-full text-sm border-0 focus:outline-none resize-none placeholder-slate-400" />
            <div className="flex gap-1 mt-1.5">
              <button onClick={submitNewCard}
                className="text-xs px-3 py-1 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700">카드 추가</button>
              <button onClick={() => { setAdding(false); setNewTitle(""); }}
                className="text-xs px-2 py-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200">취소</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full text-left text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 rounded px-2 py-2 transition-colors flex items-center gap-1.5">
            <span className="text-base leading-none">+</span> 카드 추가
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Card ───────────────── */
function BoardCardItem({ card, index, listId, onOpen, moveCard }) {
  const [hoverPos, setHoverPos] = useState(null);
  const onDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-kanban", JSON.stringify({ kind: "card", id: card.id }));
  };
  const onDragOver = (e) => {
    if (!hasKanbanData(e)) return;
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos(e.clientY < rect.top + rect.height / 2 ? "before" : "after");
  };
  const onDragLeave = () => setHoverPos(null);
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const data = readKanban(e);
    if (data?.kind === "card" && data.id !== card.id) {
      moveCard(data.id, listId, hoverPos === "after" ? index + 1 : index);
    }
    setHoverPos(null);
  };

  const labels   = card.labels || [];
  const checks   = card.checklist || [];
  const doneCount = checks.filter(c => c.done).length;

  return (
    <div className="relative">
      {hoverPos === "before" && <div className="h-1 bg-indigo-500 rounded-full mb-1.5" />}
      <button draggable onDragStart={onDragStart}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={onOpen}
        className="w-full text-left bg-white dark:bg-slate-900 rounded-lg p-2.5 shadow-sm hover:shadow-md hover:ring-2 hover:ring-indigo-300 transition-all cursor-grab active:cursor-grabbing">
        {/* 라벨 색띠 */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.map(l => (
              <span key={l} style={{ background: LABEL_COLORS[l]?.bg || "#94a3b8" }}
                className="h-2 w-10 rounded-full" />
            ))}
          </div>
        )}
        <p className="text-sm text-slate-900 dark:text-white leading-snug whitespace-pre-wrap break-words">{card.title}</p>

        {/* 메타 푸터 */}
        {(card.description || card.due_date || checks.length > 0) && (
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {card.description && (
              <span title="설명 있음" className="inline-flex items-center">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>
              </span>
            )}
            {checks.length > 0 && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${
                doneCount === checks.length ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}>
                ✓ {doneCount}/{checks.length}
              </span>
            )}
            {card.due_date && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${dueClass(card.due_date)}`}>
                📅 {fmtDue(card.due_date)}
              </span>
            )}
          </div>
        )}
      </button>
      {hoverPos === "after" && <div className="h-1 bg-indigo-500 rounded-full mt-1.5" />}
    </div>
  );
}

function AddList({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [name,   setName]   = useState("");
  const submit = () => { if (name.trim()) onAdd(name.trim()); setName(""); setAdding(false); };
  if (!adding) {
    return (
      <button onClick={() => setAdding(true)}
        className="w-72 flex-shrink-0 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur text-sm text-white py-3 transition-colors border border-white/10 font-medium">
        + 다른 리스트 추가
      </button>
    );
  }
  return (
    <div className="w-72 flex-shrink-0 rounded-2xl bg-white/95 backdrop-blur shadow-lg p-2">
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="리스트 이름" autoFocus
        className="w-full text-sm border border-indigo-300 rounded px-2 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500" />
      <div className="flex gap-1 mt-1.5">
        <button onClick={submit}
          className="text-xs px-3 py-1 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700">리스트 추가</button>
        <button onClick={() => { setAdding(false); setName(""); }}
          className="text-xs px-2 py-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200">취소</button>
      </div>
    </div>
  );
}

/* ───────────────── 카드 모달 (좌-우 레이아웃) ───────────────── */
function CardModal({ card, board, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(card.title);
  const [desc,  setDesc]  = useState(card.description || "");
  const [due,   setDue]   = useState(card.due_date || "");
  const [showLabels,   setShowLabels]   = useState(false);
  const [newCheck,     setNewCheck]     = useState("");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const list = board.lists.find(l => l.id === card.list_id);

  useEffect(() => {
    setTitle(card.title);
    setDesc(card.description || "");
    setDue(card.due_date || "");
    // 댓글 + 첨부 fetch
    fetch(`/api/board-cards/${card.id}/comments`).then(r => r.ok ? r.json() : []).then(setComments).catch(() => {});
    fetch(`/api/board-cards/${card.id}/attachments`).then(r => r.ok ? r.json() : []).then(setAttachments).catch(() => {});
  }, [card.id]);

  const saveField = (field, value) => { if (value === (card[field] || "")) return; onUpdate({ [field]: value }); };
  const moveTo = (listId) => onUpdate({ list_id: +listId });

  const toggleLabel = (l) => {
    const current = card.labels || [];
    const next = current.includes(l) ? current.filter(x => x !== l) : [...current, l];
    onUpdate({ labels: next });
  };
  const addChecklistItem = () => {
    if (!newCheck.trim()) return;
    const next = [...(card.checklist || []), { text: newCheck.trim(), done: false }];
    onUpdate({ checklist: next });
    setNewCheck("");
  };
  const toggleCheckItem = (idx) => {
    const next = (card.checklist || []).map((c, i) => i === idx ? { ...c, done: !c.done } : c);
    onUpdate({ checklist: next });
  };
  const removeCheckItem = (idx) => {
    const next = (card.checklist || []).filter((_, i) => i !== idx);
    onUpdate({ checklist: next });
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    const r = await fetch(`/api/board-cards/${card.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    if (r.ok) {
      const c = await r.json();
      setComments(prev => [...prev, c]);
      setNewComment("");
    } else {
      const e = await r.json().catch(() => ({}));
      alert(e.error || "댓글 등록 실패");
    }
  };
  const removeComment = async (cid) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    const r = await fetch(`/api/board-cards/comments/${cid}`, { method: "DELETE" });
    if (r.ok) setComments(prev => prev.filter(c => c.id !== cid));
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/board-cards/${card.id}/attachments`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "업로드 실패");
      setAttachments(prev => [d, ...prev]);
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };
  const removeAttachment = async (aid) => {
    if (!confirm("이 첨부파일을 삭제할까요?")) return;
    const r = await fetch(`/api/board-cards/attachments/${aid}`, { method: "DELETE" });
    if (r.ok) setAttachments(prev => prev.filter(a => a.id !== aid));
  };

  const checks    = card.checklist || [];
  const doneCount = checks.filter(c => c.done).length;
  const pct       = checks.length ? Math.round((doneCount / checks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-4 pt-16 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-4"
        onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="p-6 pb-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            onBlur={() => saveField("title", title)}
            onKeyDown={e => e.key === "Enter" && e.target.blur()}
            className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white w-full border-0 bg-transparent focus:outline-none" />
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
            리스트
            <select value={card.list_id} onChange={e => moveTo(e.target.value)}
              className="ml-1 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 bg-white dark:bg-slate-900 text-xs">
              {board.lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 p-6 pt-2">
          {/* 좌 — 본문 */}
          <div className="space-y-5">
            {/* 라벨 표시 */}
            {(card.labels || []).length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1.5">라벨</p>
                <div className="flex flex-wrap gap-1.5">
                  {card.labels.map(l => (
                    <span key={l} style={{ background: LABEL_COLORS[l]?.bg, color: LABEL_COLORS[l]?.text }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded">
                      {LABEL_COLORS[l]?.name || l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 마감일 표시 */}
            {card.due_date && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1.5">마감일</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${dueClass(card.due_date)}`}>
                  📅 {fmtDueFull(card.due_date)}
                </span>
              </div>
            )}

            {/* 설명 */}
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>
                설명
              </p>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                onBlur={() => saveField("description", desc)}
                placeholder="더 자세한 설명 — 마크다운 가능"
                rows={6}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500" />
            </div>

            {/* 체크리스트 */}
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                <span>✓</span> 체크리스트
                {checks.length > 0 && (
                  <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 tabular">{doneCount}/{checks.length}</span>
                )}
              </p>
              {checks.length > 0 && (
                <div className="mb-2">
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
              <ul className="space-y-1">
                {checks.map((c, i) => (
                  <li key={i} className="group flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={c.done} onChange={() => toggleCheckItem(i)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                    <span className={c.done ? "line-through text-slate-400 flex-1" : "text-slate-800 flex-1"}>{c.text}</span>
                    <button onClick={() => removeCheckItem(i)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 hover:text-red-500 text-xs">×</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-1 mt-2">
                <input type="text" value={newCheck} onChange={e => setNewCheck(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addChecklistItem()}
                  placeholder="항목 추가"
                  className="flex-1 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500" />
                <button onClick={addChecklistItem} disabled={!newCheck.trim()}
                  className="px-3 py-1 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-50">추가</button>
              </div>
            </div>

            {/* 첨부 */}
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                <span>📎</span> 첨부
                {attachments.length > 0 && <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 tabular">{attachments.length}개</span>}
              </p>
              {attachments.length > 0 && (
                <ul className="space-y-1.5 mb-2">
                  {attachments.map(a => (
                    <li key={a.id} className="group flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                      {a.mime.startsWith("image/") ? (
                        <a href={`/api/board-cards/attachments/${a.id}`} target="_blank" rel="noopener"
                          className="w-14 h-14 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                          <img src={`/api/board-cards/attachments/${a.id}`} alt="" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <div className="w-14 h-14 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                          {a.mime.includes("pdf") ? "📄" : a.mime.startsWith("video") ? "🎬" : "📎"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={`/api/board-cards/attachments/${a.id}`} target="_blank" rel="noopener"
                          className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-indigo-700 truncate block">
                          {a.name}
                        </a>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {fmtSize(a.size)} · {a.uploader} · {fmtRelDate(a.created_at)}
                        </div>
                      </div>
                      <button onClick={() => removeAttachment(a.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 px-2">삭제</button>
                    </li>
                  ))}
                </ul>
              )}
              <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer text-sm ${
                uploading ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-600"
              }`}>
                {uploading ? "업로드 중..." : "+ 파일 첨부 (이미지/PDF, 최대 10MB)"}
                <input type="file" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]; if (f) uploadFile(f);
                  e.target.value = "";
                }} disabled={uploading} />
              </label>
            </div>

            {/* 댓글 */}
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                <span>💬</span> 댓글
                {comments.length > 0 && <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 tabular">{comments.length}개</span>}
              </p>
              <ul className="space-y-2 mb-3">
                {comments.map(c => (
                  <li key={c.id} className="group flex gap-2.5">
                    <Avatar name={c.author_name} />
                    <div className="flex-1 min-w-0">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.author_name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">{fmtRelDate(c.created_at)}</div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">{c.body}</p>
                      </div>
                      <button onClick={() => removeComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 dark:text-slate-500 hover:text-red-500 mt-0.5 ml-3">삭제</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitComment(); } }}
                  placeholder="댓글 — ⌘/Ctrl + Enter 로 전송"
                  rows={2}
                  className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-indigo-500" />
                <button onClick={submitComment} disabled={!newComment.trim()}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 self-end">전송</button>
              </div>
            </div>
          </div>

          {/* 우 — 사이드바 */}
          <aside className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500">카드에 추가</p>

            <div className="relative">
              <button onClick={() => setShowLabels(v => !v)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2">
                <span className="text-base">🏷</span> 라벨
              </button>
              {showLabels && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-10">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500 px-1 mb-1.5">라벨 선택</p>
                  <div className="space-y-1">
                    {LABEL_KEYS.map(l => {
                      const active = (card.labels || []).includes(l);
                      return (
                        <button key={l} onClick={() => toggleLabel(l)}
                          style={{ background: LABEL_COLORS[l].bg }}
                          className={`w-full h-7 rounded text-xs font-bold text-white px-2 flex items-center justify-between transition-all ${active ? "ring-2 ring-slate-900 ring-offset-1" : "hover:opacity-90"}`}>
                          <span>{LABEL_COLORS[l].name}</span>
                          {active && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer">
                <span className="text-base">📅</span> 마감일
                <input type="date" value={due} onChange={e => setDue(e.target.value)}
                  onBlur={() => saveField("due_date", due)}
                  className="ml-auto text-xs bg-transparent border-0 focus:outline-none" />
              </label>
              {due && (
                <button onClick={() => { setDue(""); onUpdate({ due_date: "" }); }}
                  className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-red-500 mt-1 px-3">마감일 지우기</button>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">작업</p>
              <button onClick={onDelete}
                className="w-full px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors flex items-center gap-2">
                <span>🗑</span> 카드 삭제
              </button>
            </div>
          </aside>
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700">닫기</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── 멤버/초대 패널 ───────────────── */
function MembersPanel({ board, invite, isOwner, onClose, onRotate, onRemoveGuest }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" && invite?.code
    ? `${window.location.origin}/board/join/${invite.code}` : "";

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { prompt("이 링크를 복사해서 보내세요:", url); }
  };

  /** 친구에게 보내기 — 카카오톡 모달은 환경 의존 너무 심해서 포기.
   *  대신 깔끔하게: 링크 복사 + 카카오톡 앱 자동 열기. 사용자가 채팅창에 붙여넣기. */
  const [shareStatus, setShareStatus] = useState("");

  // 모바일 환경 감지
  const isMobile = typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const shareText = `📋 ${board?.name || "보드"} 참여 초대\n함께 일하는 칸반 보드에 초대됐어요.\n${url}`;

  /** 메신저 deep link 들 — 모든 환경에서 OS 가 처리 */
  const shareVia = (target) => {
    if (!url) return;
    const enc = encodeURIComponent;
    const links = {
      sms:      `sms:?body=${enc(shareText)}`,
      mail:     `mailto:?subject=${enc(`${board.name} 보드 참여 초대`)}&body=${enc(shareText)}`,
      telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(`${board.name} 보드 참여 초대`)}`,
      whatsapp: `https://wa.me/?text=${enc(shareText)}`,
    };
    const u = links[target];
    if (u) window.open(u, "_blank");
  };

  const shareInvite = async () => {
    if (typeof window === "undefined" || !url) return;

    // ── (1) 무조건 링크 복사 — 어떤 환경에서도 확실히 동작 ──
    let copyOk = false;
    try {
      await navigator.clipboard.writeText(url);
      copyOk = true;
    } catch {
      // fallback — execCommand (legacy / iframe)
      try {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        copyOk = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
    if (copyOk) {
      setCopied(true);
      setShareStatus(isMobile
        ? "✓ 링크 복사됨 — 카카오톡 앱이 열리면 친구 채팅창에 길게 눌러 붙여넣기"
        : "✓ 링크 복사됨 — 카카오톡 PC 앱이 열리면 채팅창에 Ctrl+V 붙여넣기");
      setTimeout(() => setShareStatus(""), 10000);
    } else {
      // clipboard 마저 실패하면 prompt 로 직접 노출
      prompt("이 링크를 복사해서 보내세요:", url);
      return;
    }

    // ── (2) 카카오톡 앱 직접 열기 — OS 별로 다른 호출 방식 ──
    // 사용자 gesture 컨텍스트에서 즉시 호출 (setTimeout 빼면 더 잘 동작).
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    try {
      if (isIOS) {
        // iOS Safari/Chrome — 직접 location 변경. 앱 설치 X 면 아무 일도 안 일어남.
        window.location.href = "kakaotalk://";
      } else if (isAndroid) {
        // Android Chrome — intent URL 이 가장 안정적.
        window.location.href = "intent://#Intent;package=com.kakao.talk;scheme=kakaotalk;end";
      } else {
        // PC — iframe 으로 (페이지 이탈 방지)
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = "kakaotalk://";
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 1000);
      }
    } catch (e) {
      console.warn("[Share] kakaotalk launch failed:", e?.message);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-start justify-end p-4"
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 mt-16"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-4">멤버 · 초대</h2>

        {/* 초대 링크 */}
        <div className="mb-5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
          <p className="text-[10px] uppercase tracking-widest text-indigo-700 font-semibold mb-1.5">초대 링크</p>
          {invite ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-500/30 flex-1 truncate">{invite.code}</code>
                <button onClick={copy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
                  {copied ? "✓ 복사됨" : "링크 복사"}
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 break-all mb-2">{url}</p>

              {/* 친구에게 보내기 — 큰 버튼: 링크 복사 + 가능하면 카카오톡 모달 */}
              <button onClick={shareInvite}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] text-sm font-semibold transition-colors shadow-sm mt-2">
                <svg width="14" height="14" viewBox="0 0 256 256" aria-hidden>
                  <path fill="#191919" d="M128 36C70.56 36 24 72.93 24 118.5c0 29.2 19.3 54.86 48.4 69.46-1.4 5.4-9 31.65-9.4 33.7-.5 2.55 1.3 4.27 3.2 4.27 1.5 0 2.95-.66 4.4-1.55 1.7-1.05 26.6-17.55 36.1-23.85 7 1 14.1 1.45 21.3 1.45 57.44 0 104-36.93 104-82.5S185.44 36 128 36z"/>
                </svg>
                카카오톡으로 보내기
              </button>
              {shareStatus && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  {shareStatus}
                </div>
              )}

              {/* 다른 메신저 옵션 — 카카오톡 차단 시 안전 fallback */}
              <div className="mt-2.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 text-center">또는 다른 앱으로</p>
                <div className="flex items-center justify-center gap-1.5">
                  {isMobile && (
                    <button onClick={() => shareVia("sms")}
                      title="SMS 로 보내기"
                      className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center text-base">
                      💬
                    </button>
                  )}
                  <button onClick={() => shareVia("telegram")}
                    title="텔레그램 으로 보내기"
                    className="w-9 h-9 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] transition-colors flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.643.135-.953l11.566-4.458c.538-.196 1.006.128.832.941z"/></svg>
                  </button>
                  <button onClick={() => shareVia("whatsapp")}
                    title="WhatsApp 으로 보내기"
                    className="w-9 h-9 rounded-lg bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#25d366] transition-colors flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/></svg>
                  </button>
                  <button onClick={() => shareVia("mail")}
                    title="이메일 로 보내기"
                    className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center text-base">
                    ✉️
                  </button>
                </div>
              </div>

              {isOwner && (
                <button onClick={onRotate}
                  className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 hover:text-red-500">↻ 코드 새로 발급</button>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">불러오는 중…</p>
          )}
        </div>

        {/* 멤버 목록 */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold mb-2">
            멤버 · {(invite?.guests?.length || 0) + 1}명
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900">
              <Avatar name="나" color={board.color} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">나 (소유자)</div>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">OWNER</span>
            </li>
            {(invite?.guests || []).map(g => (
              <li key={g.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900">
                <Avatar name={g.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{g.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">참여 {fmtRelDate(g.joined_at)}</div>
                </div>
                {isOwner && (
                  <button onClick={() => onRemoveGuest(g.id)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:text-red-700">제거</button>
                )}
              </li>
            ))}
          </ul>
          {(invite?.guests?.length || 0) === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">아직 게스트 없음 — 위 링크를 보내 초대해보세요.</p>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700">닫기</button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, color }) {
  const seed = String(name || "?").charCodeAt(0) || 64;
  const palette = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#a855f7", "#ef4444"];
  const bg = color || palette[seed % palette.length];
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: bg }}>
      {String(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

/* ───────────────── helpers ───────────────── */
function hasKanbanData(e) { return e.dataTransfer.types.includes("application/x-kanban"); }
function readKanban(e) { try { return JSON.parse(e.dataTransfer.getData("application/x-kanban")); } catch { return null; } }

function fmtDue(iso) {
  try { const d = new Date(iso); return `${d.getMonth()+1}/${d.getDate()}`; }
  catch { return iso; }
}
function fmtDueFull(iso) {
  try {
    const d = new Date(iso);
    const days = ["일","월","화","수","목","금","토"];
    return `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  } catch { return iso; }
}
function dueClass(iso) {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(iso); d.setHours(0,0,0,0);
    const diff = (d - today) / (24 * 3600 * 1000);
    if (diff < 0)   return "bg-red-100 text-red-800";
    if (diff === 0) return "bg-amber-100 text-amber-800";
    if (diff <= 2)  return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-600";
  } catch { return "bg-slate-100 text-slate-600"; }
}
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtRelDate(iso) {
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return "방금";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}시간 전`;
    if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}일 전`;
    return new Date(iso).toLocaleDateString("ko-KR");
  } catch { return iso; }
}
