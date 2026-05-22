import Link from "next/link";
import { notFound } from "next/navigation";
import { postService } from "@/services/postService";

export const dynamic = "force-dynamic";

/** 간단한 마크다운 → HTML (외부 의존성 없이) */
function md2html(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, l, c) => `<pre><code>${c.replace(/&amp;/g, "&")}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[-*+] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  // 단락 처리
  html = html.split(/\n{2,}/).map(p => {
    if (/^<(h\d|ul|ol|pre|blockquote)/.test(p.trim())) return p;
    return `<p>${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

export default function PostDetail({ params }) {
  const post = postService.getBySlug(decodeURIComponent(params.slug));
  if (!post || post.status !== "published") notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
        {post.category_name && (
          <Link href={`/blog?cat=${post.category_slug}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
            {post.category_icon && <span>{post.category_icon}</span>}
            {post.category_name}
          </Link>
        )}
        <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("ko-KR") : "—"}</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{post.title}</h1>

      {post.tags && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {post.tags.split(",").filter(Boolean).map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">#{t.trim()}</span>
          ))}
        </div>
      )}

      <div className="prose-doc"
        dangerouslySetInnerHTML={{ __html: md2html(post.body) }} />

      <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-center text-sm">
        <Link href="/blog" className="text-indigo-600 hover:underline">← 목록</Link>
        <Link href={`/blog/edit/${post.id}`} className="text-gray-500 hover:text-gray-800">수정</Link>
      </div>
    </article>
  );
}
