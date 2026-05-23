import Link from "next/link";
import { headers } from "next/headers";
import { categoryService } from "@/services/categoryService";
import { postService } from "@/services/postService";
import { getTheme } from "@/lib/categoryTheme";
import CategoryHero from "@/components/CategoryHero";
import CategoryCover from "@/components/CategoryCover";

export const dynamic = "force-dynamic";

function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "—";
}

export default function BlogIndex({ searchParams }) {
  const isOwner = headers().get("x-is-owner") === "1";
  const activeSlug = searchParams?.cat || null;

  const tree = categoryService.tree();
  const flatBySlug = (() => {
    const m = new Map();
    for (const r of tree) {
      m.set(r.slug, r);
      for (const c of r.children) m.set(c.slug, { ...c, parent: r });
    }
    return m;
  })();
  const activeCat        = activeSlug ? flatBySlug.get(activeSlug) : null;
  const expandedRootSlug = activeCat?.parent?.slug || activeCat?.slug || null;

  // owner 는 draft 까지 같이 봄 — 'all' 로 가져오되 게스트면 published 만
  const listStatus = isOwner ? "all" : "published";
  const posts = postService.list({
    status: listStatus,
    category_slug: activeSlug,
    limit: 100,
  });
  const totalCount    = postService.list({ status: listStatus, limit: 10000 }).length;
  const draftCount    = isOwner ? postService.list({ status: "draft", limit: 10000 }).length : 0;
  const visiblePostCount = posts.length;

  return (
    <div>
      {/* ── Hero — 카테고리별 다른 비주얼 ── */}
      <CategoryHero
        slug={activeSlug}
        eyebrow={activeCat ? (activeCat.parent ? `${activeCat.parent.icon} ${activeCat.parent.name}` : "Topic") : "Blog"}
        title={activeCat ? activeCat.name : undefined}
        subtitle={activeCat ? (getTheme(activeCat.slug).subtitle) : undefined}
        stats={[
          { n: visiblePostCount, label: activeCat ? "이 주제 글" : "발행글" },
        ]}
      />

      {/* ── Owner 액션바 ── */}
      {isOwner && (
        <div className="border-y border-slate-100 bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate-500">
              소유자 모드
              {draftCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  ✎ 초안 {draftCount}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Link href="/blog/categories"
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors">
                카테고리 관리
              </Link>
              <Link href="/blog/journal/auto"
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors">
                ✨ 오늘의 일지 자동 작성
              </Link>
              <Link href="/blog/new"
                className="text-xs px-4 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-700 font-medium transition-colors">
                + 새 글
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 본문 ── */}
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        {/* 카테고리 필터 */}
        <div className="mb-10 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Link href="/blog"
              className={`text-sm px-3.5 py-1.5 rounded-full transition-all chip-tx ${
                !activeSlug ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}>
              전체 <span className="opacity-60">{totalCount}</span>
            </Link>
            {tree.map(c => {
              const isActive    = activeSlug === c.slug;
              const isInBranch  = expandedRootSlug === c.slug;
              const color = c.color || "#6366f1";
              return (
                <Link key={c.id} href={`/blog?cat=${c.slug}`}
                  style={isActive ? { backgroundColor: color, color: "#fff" } : {}}
                  className={`text-sm px-3.5 py-1.5 rounded-full transition-all chip-tx flex items-center gap-1.5 ${
                    isActive
                      ? "shadow-sm"
                      : isInBranch
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}>
                  {c.icon && <span>{c.icon}</span>}
                  {c.name}
                  <span className="opacity-60 text-xs">{c.post_count + (c.children?.reduce((s, x) => s + x.post_count, 0) || 0)}</span>
                </Link>
              );
            })}
          </div>

          {expandedRootSlug && tree.find(r => r.slug === expandedRootSlug)?.children.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-4 border-l-2 border-indigo-200 ml-2">
              {tree.find(r => r.slug === expandedRootSlug).children.map(c => {
                const isActive = activeSlug === c.slug;
                return (
                  <Link key={c.id} href={`/blog?cat=${c.slug}`}
                    className={`text-xs px-3 py-1 rounded-full transition-all chip-tx ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200"
                    }`}>
                    ↳ {c.icon} {c.name} <span className="opacity-60">{c.post_count}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 글 목록 */}
        {posts.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border border-dashed border-slate-200 bg-slate-50/40">
            <div className="text-5xl mb-3 opacity-30">✍️</div>
            <p className="text-slate-500 text-sm mb-4">
              {activeCat ? `"${activeCat.name}" 에 아직 글이 없습니다.` : "아직 글이 없습니다."}
            </p>
            {isOwner && (
              <Link href="/blog/new"
                className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
                + 첫 글 작성하기
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Featured (첫 글) */}
            {posts[0] && <FeaturedCard post={posts[0]} />}
            {/* 나머지 */}
            {posts.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
                {posts.slice(1).map(p => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FeaturedCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`}
      className="group block rounded-[2rem] overflow-hidden card-lift relative">
      <div className="grid md:grid-cols-5 min-h-[24rem]">
        <div className="md:col-span-3 relative">
          <CategoryCover slug={post.category_slug} aspect="16/10" className="h-full" />
        </div>
        <div className="md:col-span-2 p-8 md:p-10 flex flex-col justify-center bg-white">
          <div className="flex items-center gap-1.5 mb-4">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-slate-900 text-white w-fit">
              ★ Featured
            </span>
            {post.status === "draft" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 w-fit">
                ✎ 초안
              </span>
            )}
          </div>
          {post.category_name && (
            <span style={{ color: post.category_color || "#4f46e5" }}
              className="text-xs font-semibold tracking-wide uppercase mb-3">
              {post.category_icon} {post.category_name}
            </span>
          )}
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-700 transition-colors leading-tight">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-3 text-base text-slate-500 leading-relaxed line-clamp-3">{post.excerpt}</p>
          )}
          <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
            <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span>
            <span className="font-medium text-indigo-600 group-hover:translate-x-1 transition-transform">읽으러 가기 →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`}
      className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden card-lift">
      <CategoryCover slug={post.category_slug} aspect="16/10">
        {post.status === "draft" && (
          <div className="absolute right-3 top-3 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-amber-200/95 text-amber-900">
            ✎ 초안
          </div>
        )}
        {post.category_name && (
          <div className="absolute left-4 bottom-3 text-xs font-semibold tracking-widest uppercase text-white">
            {post.category_icon} {post.category_name}
          </div>
        )}
      </CategoryCover>
      <div className="p-5">
        <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{post.excerpt}</p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("ko-KR") : "—"}</span>
          {post.tags && (
            <div className="flex gap-1">
              {post.tags.split(",").filter(Boolean).slice(0, 2).map(t => (
                <span key={t}>#{t.trim()}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
