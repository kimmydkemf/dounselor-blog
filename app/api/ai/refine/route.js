import { NextResponse } from "next/server";
import { refineDraftAllStyles } from "@/lib/ollama";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Ollama 응답 최대 2분 대기

/**
 * POST /api/ai/refine
 * Body: { draft: string }
 * Returns: { drafts: [{id, label, desc, content, error}, ...] }
 *
 * 로컬 Ollama 호출 — 키 없음, 비용 없음.
 */
export async function POST(req) {
  try {
    const { draft } = await req.json();
    if (!draft?.trim()) {
      return NextResponse.json({ error: "draft 필수" }, { status: 400 });
    }
    const drafts = await refineDraftAllStyles(draft);
    return NextResponse.json({ drafts });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
