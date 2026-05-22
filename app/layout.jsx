import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Dounselor — Blog · Memories · Board",
  description: "개인 블로그 · 추억집 · 협업 보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-bold text-indigo-700 tracking-tight">Dounselor</Link>
            <div className="flex gap-5 text-sm font-medium text-gray-600">
              <Link href="/blog"     className="hover:text-indigo-700">📝 블로그</Link>
              <Link href="/memories" className="hover:text-indigo-700">📷 추억집</Link>
              <Link href="/board"    className="hover:text-indigo-700">📋 보드</Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-gray-200 mt-16 py-8 text-center text-xs text-gray-400">
          © 2026 Dounselor · <a href="https://dounselor.com" className="hover:underline">dounselor.com</a>
        </footer>
      </body>
    </html>
  );
}
