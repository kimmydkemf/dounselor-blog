import Link from "next/link";
import { headers } from "next/headers";
import { postService } from "@/services/postService";
import { categoryService } from "@/services/categoryService";
import { visitorService } from "@/services/visitorService";
import { getTheme } from "@/lib/categoryTheme";
import CategoryCover from "@/components/CategoryCover";

export const dynamic = "force-dynamic";

function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
}

export default function HomePage() {
  const isOwner   = headers().get("x-is-owner") === "1";
  const recent    = postService.list({ status: "published", limit: 6 });
  const tree      = categoryService.tree();
  const stats     = visitorService.stats();
  const postTotal = postService.list({ status: "published", limit: 10000 }).length;
  const catCount  = tree.reduce((sum, r) => sum + 1 + r.children.length, 0);

  return (
    <div>
      {/* ────────────── HERO — 풀-블리드, 어두운 베이스 + 메쉬 ────────────── */}
      <section className="relative full-bleed overflow-hidden">
        <div className="absolute inset-0 -z-20"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #831843 100%)" }} />
        <div className="absolute inset-0 -z-10 bg-pattern-mesh opacity-90" />
        <div className="absolute inset-0 -z-10 bg-pattern-dots opacity-40" />

        <div className="relative max-w-5xl mx-auto px-6 py-32 md:py-44 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-300 mb-6 appear appear-1">
            Personal Space · Since 2026
          </p>
          <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-white leading-[0.98] appear appear-2">
            기록은 곧
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-pink-300 to-amber-300 bg-clip-text text-transparent">
              나를 만든다.
            </span>
          </h1>
          <p className="mt-8 text-lg md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed appear appear-3">
            글로 정리하고, 사진으로 남기고, 함께 일하는 작은 공간.
          </p>
          <div className="mt-12 flex items-center justify-center gap-3 appear appear-4">
            <Link href="/blog"
              className="px-7 py-3.5 rounded-full bg-white text-slate-900 text-sm font-semibold hover:bg-white/90 transition-colors shadow-2xl shadow-indigo-900/40">
              블로그 둘러보기 →
            </Link>
            <Link href="#topics"
              className="px-7 py-3.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors">
              주제 보기
            </Link>
          </div>

          {/* 큰 통계 */}
          <div className="mt-20 flex items-center justify-center gap-10 md:gap-16 appear appear-4">
            <BigStat n={postTotal} label="발행글" />
            <Divider />
            <BigStat n={catCount}  label="카테고리" />
            <Divider />
            <BigStat n={stats.today} label="오늘 방문" />
            <Divider />
            <BigStat n={stats.total} label="총 방문" />
          </div>
        </div>
      </section>

      {/* ────────────── TOPICS — Apple 식 풀-블리드 컬러 카드 그리드 ────── */}
      <section id="topics" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 mb-3">Topics</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900">
            주제별로 둘러보기.
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-500 max-w-xl mx-auto">
            관심사마다 결이 다른 공간을 만들었습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tree.map((c, i) => (
            <TopicCard key={c.id} cat={c} large={i < 2} />
          ))}
        </div>
      </section>

      {/* ────────────── OWNER WORKSPACE ────────────── */}
      {isOwner && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 mb-2">Workspace</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">작업 공간</h2>
          </div>
          <OwnerSectionGrid />
        </section>
      )}

      {/* ────────────── RECENT POSTS ────────────── */}
      {recent.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 mb-3">Recent</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">최근 글</h2>
            </div>
            <Link href="/blog" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">전체 →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recent.slice(0, 6).map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`}
                className="group block rounded-3xl border border-slate-200 overflow-hidden card-lift bg-white">
                <CategoryCover slug={p.category_slug} aspect="16/10">
                  {p.category_name && (
                    <div className="absolute left-4 bottom-3 text-xs font-semibold tracking-widest uppercase text-white">
                      {p.category_icon} {p.category_name}
                    </div>
                  )}
                </CategoryCover>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                    {p.title}
                  </h3>
                  {p.excerpt && <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{p.excerpt}</p>}
                  <p className="text-xs text-slate-400 mt-3">{fmtDate(p.published_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BigStat({ n, label }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-5xl font-bold text-white tabular">{Number(n).toLocaleString()}</div>
      <div className="text-[10px] tracking-[0.25em] uppercase mt-1.5 text-white/50">{label}</div>
    </div>
  );
}
function Divider() { return <div className="w-px h-12 bg-white/15" />; }

/** Apple-style 컬러 카드 — SVG 비주얼 (사진 X) + 그라데이션 + 자식 칩 */
function TopicCard({ cat, large }) {
  const t = getTheme(cat.slug);
  const totalPosts = cat.post_count + (cat.children?.reduce((s, c) => s + c.post_count, 0) || 0);
  const isLight = t.light;
  const txtMain  = isLight ? "text-slate-900"  : "text-white";
  const txtMuted = isLight ? "text-slate-600"  : "text-white/75";
  const chipBg   = isLight ? "bg-white/60 text-slate-700 border-slate-200" : "bg-white/15 text-white/90 border-white/15";

  return (
    <Link href={`/blog?cat=${cat.slug}`}
      className={`group relative block rounded-3xl overflow-hidden card-lift spotlight ${large ? "md:row-span-1 min-h-[28rem]" : "min-h-[22rem]"}`}>
      {/* SVG 비주얼 베이스 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${t.hue[0]} 0%, ${t.hue[1]} 100%)` }} />
        <div className={`absolute inset-0 ${
          t.pattern === "grid"   ? "bg-pattern-grid"   :
          t.pattern === "dots"   ? "bg-pattern-dots"   :
          t.pattern === "mesh"   ? "bg-pattern-mesh"   :
          t.pattern === "aurora" ? "bg-pattern-aurora" : ""
        } ${isLight ? "is-light" : ""}`} />
        {/* 컬러 블롭 */}
        <div className="absolute -top-1/3 -right-1/4 w-[60%] aspect-square rounded-full blur-3xl opacity-30"
          style={{ background: t.accent }} />
        <div className="absolute -bottom-1/3 -left-1/4 w-[50%] aspect-square rounded-full blur-3xl opacity-25"
          style={{ background: t.hue[0] }} />
        {/* 큰 글리프 */}
        <div className="absolute right-[-2rem] bottom-[-3rem] text-[14rem] md:text-[18rem] leading-none select-none pointer-events-none"
             style={{ opacity: isLight ? 0.16 : 0.22, transition: "transform 0.8s" }}
             aria-hidden>
          {t.glyph}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="relative h-full p-8 md:p-10 flex flex-col justify-between min-h-[inherit]">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl md:text-4xl">{cat.icon}</span>
            <span className={`text-[10px] font-semibold tracking-[0.3em] uppercase ${txtMuted}`}>
              {t.badge}
            </span>
          </div>
          <h3 className={`text-2xl md:text-4xl font-bold tracking-tight leading-tight mb-2 ${txtMain}`}>
            {cat.name}
          </h3>
          <p className={`text-sm md:text-base leading-relaxed max-w-md ${txtMuted}`}>
            {t.subtitle}
          </p>
        </div>

        <div>
          {cat.children?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {cat.children.map(ch => (
                <span key={ch.id}
                  className={`text-[11px] px-2.5 py-1 rounded-full backdrop-blur border ${chipBg}`}>
                  {ch.icon} {ch.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold tabular ${txtMuted}`}>
              글 {totalPosts}편
            </span>
            <span className={`text-sm font-medium ${txtMain} group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5`}>
              둘러보기 →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function OwnerSectionGrid() {
  const sections = [
    { href: "/blog",     icon: "📝", title: "블로그",     desc: "글·개발일지·리뷰. AI 가 초안을 다듬어줍니다.", color: "from-indigo-500 to-violet-600" },
    { href: "/memories", icon: "📷", title: "추억집",     desc: "사진과 영상으로 남기는 여행·일상.",        color: "from-pink-500 to-rose-600" },
    { href: "/board",    icon: "📋", title: "공유 보드",  desc: "Trello 같은 칸반 — 함께 일정·할 일 관리.", color: "from-emerald-500 to-teal-600" },
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
            <div className="mt-4 text-xs font-medium text-indigo-600 group-hover:text-indigo-800">열기 →</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
