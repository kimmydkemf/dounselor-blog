"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/";

  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "로그인 실패");
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center mb-8">
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Dounselor
          </div>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">소유자 로그인</h1>
          <p className="text-sm text-slate-500 mb-6">방문객은 로그인 없이 블로그만 열람 가능합니다.</p>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>

          <Link href="/blog" className="block text-center mt-6 text-sm text-slate-500 hover:text-slate-700">
            방문객으로 블로그 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
