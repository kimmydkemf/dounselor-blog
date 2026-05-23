import "./globals.css";
import Link from "next/link";
import { headers } from "next/headers";
import { visitorService } from "@/services/visitorService";
import VisitorPing from "@/components/VisitorPing";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata = {
  title: {
    default: "Dounselor — 기록의 정원",
    template: "%s · Dounselor",
  },
  description: "글 · 추억 · 협업 — 개인 블로그 + 추억집 + 공유 보드. 매일을 기록으로 남기는 작은 공간.",
  applicationName: "Dounselor",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dounselor",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg",       type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Dounselor — 기록의 정원",
    description: "글 · 추억 · 협업이 한 곳에. 매일을 기록으로 남기는 공간.",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f172a" },
  ],
};

export default function RootLayout({ children }) {
  const isOwner = headers().get("x-is-owner") === "1";
  const stats = visitorService.stats();

  return (
    <html lang="ko">
      <body className="bg-white text-slate-900 min-h-screen antialiased overflow-x-hidden">
        <VisitorPing />
        <Nav isOwner={isOwner} />
        <main>{children}</main>
        <Footer isOwner={isOwner} stats={stats} />
        <InstallPrompt />
      </body>
    </html>
  );
}

/* ───────────────── Nav — Linear/Vercel 풍 glass + subtle gradient ───────────────── */
function Nav({ isOwner }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60">
      {/* 상단 미세 컬러 띠 — 브랜드 시그니처 */}
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 -ml-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors">
          <span className="relative w-7 h-7 rounded-lg overflow-hidden shadow-sm ring-1 ring-slate-900/5">
            <img src="/icon.svg" alt="" className="w-full h-full" />
          </span>
          <span className="font-bold text-[15px] tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Dounselor
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          <NavLink href="/blog">블로그</NavLink>
          {isOwner && (
            <>
              <NavLink href="/memories">추억집</NavLink>
              <NavLink href="/board">보드</NavLink>
              <div className="w-px h-5 bg-slate-200 mx-2" />
              <form action="/api/auth/logout" method="post">
                <button type="submit"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                  로그아웃
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }) {
  return (
    <Link href={href}
      className="relative px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
      {children}
    </Link>
  );
}

/* ───────────────── Footer — Stripe/Vercel 풍 멀티컬럼 ───────────────── */
function Footer({ isOwner, stats }) {
  return (
    <footer className="relative mt-32 border-t border-slate-200 bg-gradient-to-b from-white via-slate-50/60 to-slate-100/40">
      {/* 미세 데코 그라데이션 (top) */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-12">
          {/* 브랜드 컬럼 */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <img src="/icon.svg" alt="" className="w-8 h-8 rounded-lg shadow-sm" />
              <span className="font-bold text-base tracking-tight text-slate-900">Dounselor</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              매일의 글, 추억의 사진, 함께 일하는 보드 — 한 곳에 차곡차곡 쌓아두는 작은 공간.
            </p>
            <p className="mt-4 text-[11px] text-slate-400">
              © 2026 Dounselor · <a href="https://dounselor.com" className="hover:text-slate-700 transition-colors">dounselor.com</a>
            </p>
          </div>

          {/* 콘텐츠 */}
          <FooterCol title="콘텐츠">
            <FooterLink href="/blog">블로그</FooterLink>
            <FooterLink href="/blog?cat=cs-study">컴퓨터 공부</FooterLink>
            <FooterLink href="/blog?cat=health">건강</FooterLink>
            <FooterLink href="/blog?cat=review">리뷰</FooterLink>
            <FooterLink href="/blog?cat=thought">단상</FooterLink>
          </FooterCol>

          {/* 도구 */}
          <FooterCol title="도구">
            {isOwner ? (
              <>
                <FooterLink href="/board">공유 보드</FooterLink>
                <FooterLink href="/memories">추억집</FooterLink>
                <FooterLink href="/blog/new">새 글 쓰기</FooterLink>
                <FooterLink href="/blog/journal/auto">자동 일지</FooterLink>
              </>
            ) : (
              <>
                <FooterLink href="/blog">최근 글</FooterLink>
                <span className="block text-xs text-slate-400">추억집·보드는 소유자만</span>
              </>
            )}
          </FooterCol>
        </div>

        {/* 하단 — 통계 + 작은 글씨 */}
        <div className="pt-6 border-t border-slate-200/70 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p className="flex items-center gap-2">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            서비스 정상 작동 중
          </p>
          <p className="flex items-center gap-3 tabular">
            <span>오늘 <span className="font-semibold text-slate-600">{stats.today.toLocaleString()}</span></span>
            <span className="opacity-50">·</span>
            <span>총 <span className="font-semibold text-slate-600">{stats.total.toLocaleString()}</span> 방문</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-3">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
function FooterLink({ href, children }) {
  return (
    <li>
      <Link href={href} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
        {children}
      </Link>
    </li>
  );
}
