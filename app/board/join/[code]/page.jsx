"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoardJoinPage({ params }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const join = async () => {
    if (!name.trim()) { setErr("이름을 입력해주세요"); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/board-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: params.code, name }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "참여 실패");
      router.push(`/board/${d.board_id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📋</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">보드 참여하기</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">
              초대 코드 <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{params.code}</span>
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">표시할 이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && join()}
              placeholder="예) 김유저" autoFocus maxLength={30}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">보드 안에서 카드 작성/수정 시 표시됩니다.</p>
          </div>

          {err && <p className="text-xs text-red-500 mt-3">⚠ {err}</p>}

          <button onClick={join} disabled={busy || !name.trim()}
            className="w-full mt-5 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors">
            {busy ? "참여 중..." : "참여하기 →"}
          </button>

          {/* divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">또는</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* 카카오 — 닉네임 자동 입력 + 본 사용자 계정으로 가입 */}
          <a href={`/api/auth/kakao/login?join=${encodeURIComponent(params.code)}&from=/board`}
            className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] py-2.5 rounded-lg text-sm font-semibold transition-colors">
            <svg width="16" height="16" viewBox="0 0 256 256" aria-hidden>
              <path fill="#191919" d="M128 36C70.56 36 24 72.93 24 118.5c0 29.2 19.3 54.86 48.4 69.46-1.4 5.4-9 31.65-9.4 33.7-.5 2.55 1.3 4.27 3.2 4.27 1.5 0 2.95-.66 4.4-1.55 1.7-1.05 26.6-17.55 36.1-23.85 7 1 14.1 1.45 21.3 1.45 57.44 0 104-36.93 104-82.5S185.44 36 128 36z"/>
            </svg>
            카카오로 참여
          </a>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-4 leading-relaxed">
            익명 참여는 90일간 이 보드에서만 활동 가능.<br />
            카카오로 참여하면 다음 접속 때도 자동 인식됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
