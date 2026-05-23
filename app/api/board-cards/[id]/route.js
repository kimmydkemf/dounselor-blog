import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const c = boardService.updateCard(+params.id, body);
    if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const n = boardService.deleteCard(+params.id);
  return NextResponse.json({ ok: n > 0 });
}
