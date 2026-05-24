import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { postService } from "@/services/postService";
import { extractToc, slugify } from "@/lib/toc";
import { getTheme } from "@/lib/categoryTheme";
import CategoryCover from "@/components/CategoryCover";
import TocSidebar from "@/components/TocSidebar";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";

export const dynamic = "force-dynamic";

/** 마크다운 → HTML. h2/h3 에 id 자동 부여 (목차 anchor 용) */
function md2html(md) {
  if (!md) return "";
  const safeUrl = (u) => /^(https?:|data:image\/)/i.test(u) ? u : "#";

  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      (_, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" />`)
    // h2/h3 — id 부여
    .replace(/^### (.*$)/gm, (_, t) => `<h3 id="${slugify(t)}">${t}</h3>`)
    .replace(/^## (.*$)/gm,  (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`)
    .replace(/^# (.*$)/gm,   "<h1>$1</h1>")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, l, c) => `<pre><code>${c}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      (_, txt, href) => `<a href="${safeUrl(href)}" target="_blank" rel="noopener">${txt}</a>`)
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[-*+] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    .replace(/^---$/gm, "<hr>");

  html = html.split(/\n{2,}/).map(p => {
    if (/^<(h\d|ul|ol|pre|blockquote|hr|img|p)/.test(p.trim())) return p;
    return `<p>${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

function readingMinutes(body) {
  const chars = (body || "").replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / 400));
}
function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "—";
}

export default function PostDetail({ params }) {
  const isOwner = headers().get("x-is-owner") === "1";
  const post = postService.getBySlug(decodeURIComponent(params.slug));
  if (!post) notFound();
  if (!isOwner && post.status !== "published") notFound();

  const toc      = extractToc(post.body);
  const related  = postService.related(post.id, post.category_id, 4);
  const minutes  = readingMinutes(post.body);
  const theme    = getTheme(post.category_slug);

  return (
    <>
      <ReadingProgress />

      {/* ─── 상단 카테고리 hero — 얇은 컬러 배너 ─── */}
      {post.category_slug && (
        <div className="relative full-bleed h-32 overflow-hidden">
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${theme.hue[0]} 0%, ${theme.hue[1]} 100%)` }} />
          <div className="absolute inset-0 bg-pattern-mesh opacity-60" />
          <div className="relative max-w-6xl mx-auto px-6 h-full flex items-end pb-4">
            <Link href={`/blog?cat=${post.category_slug}`}
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-white/90 hover:text-white">
              <span className="text-base">{post.category_icon}</span>
              {post.category_name}
            </Link>
          </div>
        </div>
      )}

      {/* ─── 3컬럼: TOC | 본문 | 메타 ─── */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 grid lg:grid-cols-[200px_minmax(0,1fr)_220px] gap-10">
        {/* 좌: TOC */}
        <TocSidebar items={toc} />

        {/* 본문 */}
        <article className="max-w-2xl mx-auto lg:mx-0 w-full">
          <div className="mb-3">
            <Link href="/blog" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              ← 블로그
            </Link>
          </div>

          {post.status === "draft" && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 mb-3">
              ✎ 초안 — 나만 볼 수 있어요
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight mb-5">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <time>{fmtDate(post.published_at)}</time>
              <span className="opacity-50">·</span>
              <span>{minutes}분 읽기</span>
            </div>
            <ShareButtons title={post.title} url={`/blog/${post.slug}`} />
          </div>

          <div className="prose-doc" dangerouslySetInnerHTML={{ __html: md2html(post.body) }} />

          {post.tags && (
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
              {post.tags.split(",").filter(Boolean).map(t => (
                <span key={t} className="chip-grad text-xs px-3 py-1 rounded-full">
                  #{t.trim()}
                </span>
              ))}
            </div>
          )}

          {/* author block */}
          <div className="mt-12 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-md">D</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Dounselor</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                매일을 기록으로 남기는 작은 공간. 글, 추억, 보드를 한 곳에.
              </p>
            </div>
            <Link href="/blog"
              className="hidden sm:inline-block text-xs px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors flex-shrink-0">
              다른 글 →
            </Link>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <Link href="/blog" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
              ← 블로그 목록
            </Link>
            {isOwner && (
              <Link href={`/blog/edit/${post.id}`} className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                수정
              </Link>
            )}
          </div>
        </article>

        {/* 우: 메타 사이드바 */}
        <aside className="hidden lg:block sticky top-24 self-start space-y-5">
          {post.category_name && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400 dark:text-slate-500 mb-2">카테고리</p>
              <Link href={`/blog?cat=${post.category_slug}`}
                className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                <span className="text-lg">{post.category_icon}</span>
                {post.category_name}
              </Link>
            </div>
          )}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400 dark:text-slate-500 mb-2">정보</p>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">작성일</dt><dd className="font-medium text-slate-800 dark:text-slate-200">{fmtDate(post.published_at || post.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">읽는 시간</dt><dd className="font-medium text-slate-800 dark:text-slate-200">{minutes}분</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">글자수</dt><dd className="font-medium text-slate-800 dark:text-slate-200 tabular">{(post.body || "").length.toLocaleString()}</dd></div>
            </dl>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400 dark:text-slate-500 mb-2">공유</p>
            <ShareButtons title={post.title} url={`/blog/${post.slug}`} />
          </div>
        </aside>
      </div>

      {/* 관련 글 */}
      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 dark:text-indigo-400 mb-2">Related</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">관련 글</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`}
                className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden card-lift">
                <CategoryCover slug={p.category_slug} aspect="16/10">
                  {p.category_name && (
                    <div className="absolute left-3 bottom-2 text-[10px] font-semibold tracking-widest uppercase text-white">
                      {p.category_icon} {p.category_name}
                    </div>
                  )}
                </CategoryCover>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 line-clamp-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{fmtDate(p.published_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
