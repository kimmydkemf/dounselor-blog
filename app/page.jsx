import Link from "next/link";
import { headers } from "next/headers";
import { postService } from "@/services/postService";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const isOwner = headers().get("x-is-owner") === "1";
  const recent = postService.list({ status: "published", limit: 3 });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50/40 via-white to-pink-50/30" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-200/30 blur-3xl -z-10" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-pink-200/30 blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-indigo-600 mb-5">
            Personal Space
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-slate-900">
            <span className="text-gradient">기록</span>하고{" "}
            <span className="text-gradient">기억</span>하는 곳
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">
            글로 정리하고, 사진으로 남기고, 함께 일하는 작은 공간.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/blog"
              className="px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm shadow-slate-900/10">
              블로그 둘러보기 →
            </Link>
            {!isOwner && (
              <Link href="/login"
                className="px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                소유자 로그인
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 섹션 카드 — owner 만 3개 다 보임, guest 는 블로그만 강조 */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        {isOwner ? <OwnerSectionGrid /> : <GuestBlogShowcase />}
      </section>

      {/* 최근 글 */}
      {recent.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">최근 글</h2>
            <Link href="/blog" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">전체 →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recent.map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`}
                className="group block bg-white border border-slate-200 rounded-2xl p-5 card-lift">
                {p.category_name && (
                  <div className="text-xs font-semibold tracking-wide text-indigo-600 mb-2 uppercase">
                    {p.category_icon} {p.category_name}
                  </div>
                )}
                <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                  {p.title}
                </h3>
                {p.excerpt && <p className="text-sm text-slate-500 line-clamp-3">{p.excerpt}</p>}
                <p className="text-xs text-slate-400 mt-3">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString("ko-KR") : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OwnerSectionGrid() {
  const sections = [
    { href: "/blog",     icon: "📝", title: "블로그",     desc: "글·개발일지·리뷰. AI 가 초안을 다듬어줍니다.",            color: "from-indigo-500 to-violet-600" },
    { href: "/memories", icon: "📷", title: "추억집",     desc: "사진과 영상으로 남기는 여행·일상.",                       color: "from-pink-500 to-rose-600" },
    { href: "/board",    icon: "📋", title: "공유 보드",  desc: "Trello 같은 칸반 — 함께 일정·할 일 관리.",                color: "from-emerald-500 to-teal-600" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sections.map(s => (
        <Link key={s.href} href={s.href}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 card-lift">
          <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.color} opacity-10 group-hover:opacity-20 transition-opacity blur-xl`} />
          <div className="relative">
            <div className="text-3xl mb-3">{s.icon}</div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">{s.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            <div className="mt-4 text-xs font-medium text-indigo-600 group-hover:text-indigo-800">
              열기 →
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GuestBlogShowcase() {
  return (
    <Link href="/blog"
      className="group relative overflow-hidden block rounded-3xl border border-slate-200 bg-white p-12 card-lift">
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 opacity-10 group-hover:opacity-15 transition-opacity blur-2xl" />
      <div className="relative max-w-2xl">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">블로그 읽기</h3>
        <p className="text-base text-slate-500 leading-relaxed mb-5">
          개발 기록, 일상의 단상, 리뷰. 천천히 쌓이는 글들을 둘러보세요.
        </p>
        <div className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-800">
          글 둘러보기 →
        </div>
      </div>
    </Link>
  );
}
