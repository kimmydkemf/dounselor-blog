import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { postService } from "@/services/postService";

export const dynamic = "force-dynamic";

/** 간단한 마크다운 → HTML — 외부 의존성 없이 */
function md2html(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, l, c) => `<pre><code>${c}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[-*+] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    .replace(/^---$/gm, "<hr>");
  html = html.split(/\n{2,}/).map(p => {
    if (/^<(h\d|ul|ol|pre|blockquote|hr)/.test(p.trim())) return p;
    return `<p>${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

function readingMinutes(body) {
  const chars = (body || "").replace(/\s+/g, "").length;
  // 한글 분당 ~400자
  return Math.max(1, Math.ceil(chars / 400));
}

export default function PostDetail({ params }) {
  const isOwner = headers().get("x-is-owner") === "1";
  const post = postService.getBySlug(decodeURIComponent(params.slug));
  if (!post || post.status !== "published") notFound();

  return (
    <article className="max-w-2xl mx-auto px-6 py-12 md:py-16">
      <div className="mb-3">
        <Link href="/blog" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
          ← 블로그
        </Link>
      </div>

      {post.category_name && (
        <Link href={`/blog?cat=${post.category_slug}`}
          className="inline-block text-xs font-semibold tracking-[0.2em] text-indigo-600 hover:text-indigo-800 uppercase mb-4">
          {post.category_icon} {post.category_name}
        </Link>
      )}

      <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight mb-5">
        {post.title}
      </h1>

      <div className="flex items-center gap-3 text-sm text-slate-500 mb-10 pb-8 border-b border-slate-100">
        <time>{post.published_at ? new Date(post.published_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "—"}</time>
        <span>·</span>
        <span>{readingMinutes(post.body)}분 읽기</span>
      </div>

      <div className="prose-doc" dangerouslySetInnerHTML={{ __html: md2html(post.body) }} />

      {post.tags && (
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-1.5">
          {post.tags.split(",").filter(Boolean).map(t => (
            <span key={t} className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600">
              #{t.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="mt-12 flex justify-between items-center">
        <Link href="/blog" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          ← 다른 글 보기
        </Link>
        {isOwner && (
          <Link href={`/blog/edit/${post.id}`} className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
            수정
          </Link>
        )}
      </div>
    </article>
  );
}
