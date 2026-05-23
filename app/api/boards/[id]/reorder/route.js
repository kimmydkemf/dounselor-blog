import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

/**
 * 드래그앤드롭 후 일괄 업데이트.
 * Body: { lists: [{ id, sort_order, cards: [{ id, sort_order }] }, ...] }
 */
export async function POST(req, { params }) {
  try {
    const body = await req.json();
    if (!Array.isArray(body?.lists)) return NextResponse.json({ error: "lists 배열 필수" }, { status: 400 });
    boardService.reorder(+params.id, body.lists);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
