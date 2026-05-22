import Link from "next/link";

const SECTIONS = [
  {
    href: "/blog",
    icon: "📝",
    title: "블로그",
    desc: "글·개발일지·리뷰. AI가 초안을 다듬어줍니다.",
    color: "from-indigo-500 to-violet-600",
    public: true,
  },
  {
    href: "/memories",
    icon: "📷",
    title: "추억집",
    desc: "사진과 영상으로 남기는 여행·일상. 초대된 사람만 볼 수 있어요.",
    color: "from-pink-500 to-rose-600",
    public: false,
  },
  {
    href: "/board",
    icon: "📋",
    title: "공유 보드",
    desc: "Trello 같은 칸반 — 함께 일정·할 일 관리.",
    color: "from-emerald-500 to-teal-600",
    public: false,
  },
];

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-16 pb-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          <span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Dounselor
          </span>
        </h1>
        <p className="text-gray-500 text-lg">기록 · 추억 · 협업</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
            <div className="text-3xl mb-3">{s.icon}</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1.5 flex items-center gap-2">
              {s.title}
              {!s.public && <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">🔒 인증 필요</span>}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
