import Link from "next/link";
import { headers } from "next/headers";
import { categoryService } from "@/services/categoryService";
import { postService } from "@/services/postService";

export const dynamic = "force-dynamic";

export default function BlogIndex({ searchParams }) {
  const isOwner = headers().get("x-is-owner") === "1";
  const activeSlug = searchParams?.cat || null;
  const categories = categoryService.list();
  const posts = postService.list({
    status: "published",
    category_slug: activeSlug,
    limit: 100,
  });
  const totalCount = postService.list({ status: "published", limit: 10000 }).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      {/* 헤더 */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase text-indigo-600 mb-3">Blog</p>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">기록의 정원</h1>
          {isOwner && (
            <div className="flex gap-2">
              <Link href="/blog/categories"
                className="text-sm px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                카테고리 관리
              </Link>
              <Link href="/blog/new"
                className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 font-medium transition-colors">
                + 새 글
              </Link>
            </div>
          )}
        </div>
        <p className="mt-3 text-base text-slate-500">개발과 일상의 단상들을 모은 곳.</p>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-1.5 mb-8 pb-6 border-b border-slate-100">
        <Link href="/blog"
          className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
            !activeSlug
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}>
          전체 {totalCount}
        </Link>
        {categories.map(c => (
          <Link key={c.id} href={`/blog?cat=${c.slug}`}
            className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
              activeSlug === c.slug
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}>
            {c.icon && <span className="mr-1">{c.icon}</span>}
            {c.name}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3 opacity-30">✍️</div>
          <p className="text-slate-500 text-sm mb-4">아직 글이 없습니다.</p>
          {isOwner && (
            <Link href="/blog/new"
              className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
              + 첫 글 작성하기
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map(p => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`}
                className="block bg-white border border-slate-200 rounded-2xl p-6 card-lift group">
                {p.category_name && (
                  <div className="text-xs font-semibold tracking-wide text-indigo-600 mb-2 uppercase">
                    {p.category_icon} {p.category_name}
                  </div>
                )}
                <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {p.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{p.published_at ? new Date(p.published_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span>
                  {p.tags && (
                    <div className="flex gap-1">
                      {p.tags.split(",").filter(Boolean).slice(0, 3).map(t => (
                        <span key={t} className="text-slate-400">#{t.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
