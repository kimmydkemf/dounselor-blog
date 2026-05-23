export const metadata = {
  title: "오프라인 — Dounselor",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-5">📡</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">오프라인입니다</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          인터넷 연결이 끊겼습니다.<br />
          연결되면 자동으로 다시 시도해보세요.
        </p>
      </div>
    </div>
  );
}
