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
      {/* ────────────── HERO — 상업급, 큰 임팩트 + 컬러풀 메쉬 ────────────── */}
      <section className="relative full-bleed overflow-hidden">
        <div className="absolute inset-0 -z-20"
          style={{ background: "linear-gradient(135deg, #0b1027 0%, #1e1b4b 40%, #4c1d95 75%, #831843 100%)" }} />
        <div className="absolute inset-0 -z-10 bg-pattern-mesh opacity-90" />
        <div className="absolute inset-0 -z-10 bg-pattern-dots opacity-40" />
        {/* 추가 컬러풀 블롭 — 시각적 깊이 */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full blur-[120px] -z-10"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 60%)", opacity: 0.5 }} />
        <div className="absolute -bottom-40 -right-40 w-[44rem] h-[44rem] rounded-full blur-[140px] -z-10"
          style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 60%)", opacity: 0.45 }} />

        <div className="relative max-w-5xl mx-auto px-6 py-32 md:py-44 text-center">
          {/* 상단 배지 — "라이브" 신호 */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 mb-8 appear appear-1">
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 live-dot" />
              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-50" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90">
              Personal Space · Since 2026
            </span>
          </div>

          <h1 className="text-5xl md:text-[5.5rem] font-bold tracking-tight text-white leading-[0.98] appear appear-2">
            기록은 곧
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                나를 만든다.
              </span>
              {/* underline glow */}
              <span className="absolute -bottom-2 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </span>
          </h1>
          <p className="mt-8 text-lg md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed appear appear-3">
            글로 정리하고, 사진으로 남기고, 함께 일하는 작은 공간.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 appear appear-4">
            <Link href="/blog"
              className="group px-7 py-3.5 rounded-full bg-white text-slate-900 text-sm font-semibold hover:bg-white/95 transition-all shadow-2xl shadow-indigo-900/40 hover:shadow-indigo-700/60 hover:-translate-y-0.5 inline-flex items-center gap-2">
              블로그 둘러보기
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link href="#topics"
              className="px-7 py-3.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors">
              주제 보기
            </Link>
          </div>

          {/* 큰 통계 — 더 정교한 카드 형식 */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto appear appear-4">
            <StatTile n={postTotal}   label="발행글"     accent="from-indigo-400 to-violet-400" />
            <StatTile n={catCount}    label="카테고리"   accent="from-fuchsia-400 to-pink-400" />
            <StatTile n={stats.today} label="오늘 방문"  accent="from-amber-300 to-orange-400" />
            <StatTile n={stats.total} label="총 방문"    accent="from-emerald-300 to-teal-400" />
          </div>
        </div>

        {/* 하단 페이드 — section 전환 부드럽게 */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-white pointer-events-none" />
      </section>

      {/* ────────────── 가치 제안 (Features) — Linear 식 3컬럼 ────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 mb-3">Why Dounselor</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white max-w-2xl mx-auto leading-tight">
            기록은 흩어지면 사라지고,
            <br />
            모이면 자산이 됩니다.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            icon="✍️"
            title="AI 가 다듬는 글쓰기"
            desc="한 줄 메모만 적어두면 AI 가 톤·구조·제목·태그까지 자동으로 다듬어줍니다."
            tone="indigo"
          />
          <FeatureCard
            icon="📷"
            title="추억은 그대로"
            desc="여행·일상의 사진과 영상을 한 권의 앨범처럼. 초대된 사람만 볼 수 있는 비공개 모드."
            tone="rose"
          />
          <FeatureCard
            icon="🗂"
            title="함께 일하는 보드"
            desc="Trello 식 칸반 + 라벨/체크리스트/댓글/파일. 실시간 동기화로 같이 일하기 좋은 협업 공간."
            tone="emerald"
          />
        </div>
      </section>

      {/* ────────────── TOPICS — Apple 식 풀-블리드 컬러 카드 그리드 ────── */}
      <section id="topics" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 mb-3">Topics</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            주제별로 둘러보기.
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-500 dark:text-slate-400 dark:text-slate-500 max-w-xl mx-auto">
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
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">작업 공간</h2>
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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">최근 글</h2>
            </div>
            <Link href="/blog" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">전체 →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recent.slice(0, 6).map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`}
                className="group block rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden card-lift bg-white dark:bg-slate-900">
                <CategoryCover slug={p.category_slug} aspect="16/10">
                  {p.category_name && (
                    <div className="absolute left-4 bottom-3 text-xs font-semibold tracking-widest uppercase text-white">
                      {p.category_icon} {p.category_name}
                    </div>
                  )}
                </CategoryCover>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                    {p.title}
                  </h3>
                  {p.excerpt && <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 line-clamp-3 leading-relaxed">{p.excerpt}</p>}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">{fmtDate(p.published_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Hero 통계 타일 — 컬러풀 액센트 + 글래스 */
function StatTile({ n, label, accent }) {
  return (
    <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 px-4 py-5 overflow-hidden">
      {/* 액센트 라인 */}
      <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r ${accent}`} />
      <div className={`text-3xl md:text-4xl font-bold tabular bg-gradient-to-br ${accent} bg-clip-text text-transparent`}>
        {Number(n).toLocaleString()}
      </div>
      <div className="text-[10px] tracking-[0.25em] uppercase mt-1.5 text-white/60">{label}</div>
    </div>
  );
}

/** Features 카드 — Linear 식 */
function FeatureCard({ icon, title, desc, tone }) {
  const tones = {
    indigo:  { bg: "from-indigo-50 via-white to-violet-50", border: "border-indigo-100", icon: "from-indigo-500 to-violet-600", text: "text-indigo-700" },
    rose:    { bg: "from-rose-50 via-white to-pink-50",     border: "border-rose-100",   icon: "from-rose-500 to-pink-600",     text: "text-rose-700" },
    emerald: { bg: "from-emerald-50 via-white to-teal-50",  border: "border-emerald-100", icon: "from-emerald-500 to-teal-600",  text: "text-emerald-700" },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className={`group relative rounded-3xl p-7 border ${t.border} bg-gradient-to-br ${t.bg} shadow-elevated transition-all hover:-translate-y-1 overflow-hidden`}>
      {/* 데코 블롭 */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${t.icon} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

      <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${t.icon} flex items-center justify-center text-2xl shadow-lg mb-5`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
    </div>
  );
}

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
          className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 card-lift">
          <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.color} opacity-10 group-hover:opacity-20 transition-opacity blur-xl`} />
          <div className="relative">
            <div className="text-3xl mb-3">{s.icon}</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">{s.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">{s.desc}</p>
            <div className="mt-4 text-xs font-medium text-indigo-600 group-hover:text-indigo-800">열기 →</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
