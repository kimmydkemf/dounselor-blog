import Link from "next/link";
import { categoryService } from "@/services/categoryService";
import { postService } from "@/services/postService";

export const dynamic = "force-dynamic";

export default function BlogIndex({ searchParams }) {
  const activeSlug = searchParams?.cat || null;
  const categories = categoryService.list();
  const posts = postService.list({
    status: "published",
    category_slug: activeSlug,
    limit: 50,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📝 블로그</h1>
        <div className="flex gap-2">
          <Link href="/blog/categories"
            className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
            카테고리 관리
          </Link>
          <Link href="/blog/new"
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
            + 새 글
          </Link>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <Link href="/blog"
          className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
            !activeSlug
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
          전체 ({postService.list({ status: "published", limit: 1000 }).length})
        </Link>
        {categories.map(c => (
          <Link key={c.id} href={`/blog?cat=${c.slug}`}
            className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
              activeSlug === c.slug
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {c.icon && <span className="mr-1">{c.icon}</span>}
            {c.name}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-2">아직 글이 없습니다.</p>
          <Link href="/blog/new" className="text-indigo-600 hover:underline text-sm">+ 첫 글 작성하기</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map(p => (
            <li key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <Link href={`/blog/${p.slug}`} className="block">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                  {p.category_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                      {p.category_icon && <span>{p.category_icon}</span>}
                      {p.category_name}
                    </span>
                  )}
                  <span>{p.published_at ? new Date(p.published_at).toLocaleDateString("ko-KR") : "—"}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{p.title}</h2>
                {p.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{p.excerpt}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
