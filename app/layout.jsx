import "./globals.css";
import Link from "next/link";
import { headers } from "next/headers";
import { visitorService } from "@/services/visitorService";
import VisitorPing from "@/components/VisitorPing";
import InstallPrompt from "@/components/InstallPrompt";
import ThemeToggle from "@/components/ThemeToggle";
import KakaoShareScript from "@/components/KakaoShareScript";

export const metadata = {
  title: {
    default: "Dounselor — 기록의 정원",
    template: "%s · Dounselor",
  },
  description: "글 · 추억 · 협업 — 개인 블로그 + 추억집 + 공유 보드. 매일을 기록으로 남기는 작은 공간.",
  applicationName: "Dounselor",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Dounselor" },
  other: {
    // apple-mobile-web-app-capable 가 deprecated 라고 Chrome 경고 → 표준 mobile-web-app-capable 도 같이
    "mobile-web-app-capable": "yes",
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

/**
 * Hydration mismatch 방지 — server-render 시 html 에 클래스 없고 client 에서 추가하면
 * 첫 렌더가 잘못된 테마로 깜빡임. inline script 가 hydrate 전에 dark 적용.
 */
const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  const isOwner = headers().get("x-is-owner") === "1";
  const stats = visitorService.stats();

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Kakao SDK — 서비스 워커/lazy 로딩 무관하게 SSR HTML 에 직접 포함 */}
        <script src="/kakao.min.js" async></script>
      </head>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen antialiased overflow-x-hidden transition-colors duration-200">
        <VisitorPing />
        <Nav isOwner={isOwner} />
        <main>{children}</main>
        <Footer isOwner={isOwner} stats={stats} />
        <InstallPrompt />
        <KakaoShareScript />
      </body>
    </html>
  );
}

/* ───────────────── Nav ───────────────── */
function Nav({ isOwner }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
      <div className="max-w-6xl mx-auto px-3 md:px-6 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="group flex items-center gap-2 -ml-1 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex-shrink-0">
          <span className="relative w-7 h-7 rounded-lg overflow-hidden shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
            <img src="/icon.svg" alt="" className="w-full h-full" />
          </span>
          <span className="font-bold text-[15px] tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Dounselor
          </span>
        </Link>

        <div className="flex items-center gap-0.5 min-w-0">
          <NavLink href="/blog">블로그</NavLink>
          {isOwner && (
            <>
              <NavLink href="/memories">추억집</NavLink>
              <NavLink href="/board">보드</NavLink>
              <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700 mx-2" />
              <form action="/api/auth/logout" method="post" className="hidden sm:block">
                <button type="submit"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  로그아웃
                </button>
              </form>
            </>
          )}
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }) {
  return (
    <Link href={href}
      className="relative px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap">
      {children}
    </Link>
  );
}

/* ───────────────── Footer ───────────────── */
function Footer({ isOwner, stats }) {
  return (
    <footer className="relative mt-32 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50/60 to-slate-100/40 dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-900/60">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-500 to-transparent" />
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-12">
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <img src="/icon.svg" alt="" className="w-8 h-8 rounded-lg shadow-sm" />
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">Dounselor</span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              매일의 글, 추억의 사진, 함께 일하는 보드 — 한 곳에 차곡차곡 쌓아두는 작은 공간.
            </p>
            <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
              © 2026 Dounselor · <a href="https://dounselor.com" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">dounselor.com</a>
            </p>
          </div>

          <FooterCol title="콘텐츠">
            <FooterLink href="/blog">블로그</FooterLink>
            <FooterLink href="/blog?cat=cs-study">컴퓨터 공부</FooterLink>
            <FooterLink href="/blog?cat=health">건강</FooterLink>
            <FooterLink href="/blog?cat=review">리뷰</FooterLink>
            <FooterLink href="/blog?cat=thought">단상</FooterLink>
          </FooterCol>

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
                <span className="block text-xs text-slate-400 dark:text-slate-500">추억집·보드는 소유자만</span>
              </>
            )}
          </FooterCol>
        </div>

        <div className="pt-6 border-t border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          <p className="flex items-center gap-2">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
            서비스 정상 작동 중
          </p>
          <p className="flex items-center gap-3 tabular">
            <span>오늘 <span className="font-semibold text-slate-600 dark:text-slate-300">{stats.today.toLocaleString()}</span></span>
            <span className="opacity-50">·</span>
            <span>총 <span className="font-semibold text-slate-600 dark:text-slate-300">{stats.total.toLocaleString()}</span> 방문</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-500 mb-3">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
function FooterLink({ href, children }) {
  return (
    <li>
      <Link href={href} className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
        {children}
      </Link>
    </li>
  );
}
