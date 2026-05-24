"use client";

/**
 * 보드 초대 가입 페이지 — 카카오 로그인 전용.
 *
 * 이전엔 이름만 입력해도 익명 게스트로 가입 가능했는데, 그러면 누구나 코드만 알면
 * 들어올 수 있어 보안이 약함. 이제 무조건 카카오 인증 거치게 강제.
 *
 * 카카오 콜백 (/api/auth/kakao/callback) 가 join 코드를 받아 자동으로 게스트 가입 처리.
 */
export default function BoardJoinPage({ params }) {
  const kakaoUrl = `/api/auth/kakao/login?join=${encodeURIComponent(params.code)}&from=/board`;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📋</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">보드 참여하기</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              초대 코드 <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{params.code}</span>
            </p>
          </div>

          {/* 카카오 — 유일한 가입 수단 */}
          <a href={kakaoUrl}
            className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] py-3 rounded-xl text-sm font-semibold transition-colors shadow-md">
            <svg width="18" height="18" viewBox="0 0 256 256" aria-hidden>
              <path fill="#191919" d="M128 36C70.56 36 24 72.93 24 118.5c0 29.2 19.3 54.86 48.4 69.46-1.4 5.4-9 31.65-9.4 33.7-.5 2.55 1.3 4.27 3.2 4.27 1.5 0 2.95-.66 4.4-1.55 1.7-1.05 26.6-17.55 36.1-23.85 7 1 14.1 1.45 21.3 1.45 57.44 0 104-36.93 104-82.5S185.44 36 128 36z"/>
            </svg>
            카카오로 참여하기
          </a>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-5 leading-relaxed">
            보안을 위해 <b className="text-slate-600 dark:text-slate-300">카카오 인증</b>이 필요합니다.<br />
            카카오 닉네임으로 자동 가입 — 별도 회원가입 없음.
          </p>
        </div>
      </div>
    </div>
  );
}
