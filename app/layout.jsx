import "./globals.css";
import Link from "next/link";
import { headers } from "next/headers";
import { visitorService } from "@/services/visitorService";
import VisitorPing from "@/components/VisitorPing";

export const metadata = {
  title: "Dounselor",
  description: "기록 · 추억 · 협업 — 개인 블로그 + 추억집 + 공유 보드",
};

export default function RootLayout({ children }) {
  const isOwner = headers().get("x-is-owner") === "1";
  const stats = visitorService.stats();

  return (
    <html lang="ko">
      <body className="bg-white text-slate-900 min-h-screen antialiased">
        <VisitorPing />
        <Nav isOwner={isOwner} />
        <main>{children}</main>
        <Footer isOwner={isOwner} stats={stats} />
      </body>
    </html>
  );
}

function Nav({ isOwner }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight text-slate-900 hover:text-indigo-600 transition-colors">
          Dounselor
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/blog"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            블로그
          </Link>
          {isOwner && (
            <>
              <Link href="/memories"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                추억집
              </Link>
              <Link href="/board"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                보드
              </Link>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <form action="/api/auth/logout" method="post">
                <button type="submit"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  로그아웃
                </button>
              </form>
            </>
          )}
          {/* 게스트는 로그인 버튼 숨김 — /login 직접 URL 입력으로만 접근 가능 */}
        </div>
      </div>
    </nav>
  );
}

function Footer({ isOwner, stats }) {
  return (
    <footer className="border-t border-slate-200 mt-24 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>© 2026 Dounselor · <a href="https://dounselor.com" className="hover:text-slate-600 transition-colors">dounselor.com</a></p>
        <p className="flex items-center gap-3">
          <span>오늘 <span className="font-semibold text-slate-600">{stats.today.toLocaleString()}</span></span>
          <span>·</span>
          <span>총 <span className="font-semibold text-slate-600">{stats.total.toLocaleString()}</span> 방문</span>
        </p>
      </div>
    </footer>
  );
}
