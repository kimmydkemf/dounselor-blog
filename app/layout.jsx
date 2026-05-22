import "./globals.css";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata = {
  title: "Dounselor",
  description: "기록 · 추억 · 협업 — 개인 블로그 + 추억집 + 공유 보드",
};

export default function RootLayout({ children }) {
  const isOwner = headers().get("x-is-owner") === "1";

  return (
    <html lang="ko">
      <body className="bg-white text-slate-900 min-h-screen antialiased">
        <Nav isOwner={isOwner} />
        <main>{children}</main>
        <footer className="border-t border-slate-200 mt-24 py-10 text-center">
          <p className="text-xs text-slate-400">
            © 2026 Dounselor · <a href="https://dounselor.com" className="hover:text-slate-600 transition-colors">dounselor.com</a>
          </p>
        </footer>
      </body>
    </html>
  );
}

function Nav({ isOwner }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
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
            </>
          )}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {isOwner ? (
            <form action="/api/auth/logout" method="post">
              <button type="submit"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                로그아웃
              </button>
            </form>
          ) : (
            <Link href="/login"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
