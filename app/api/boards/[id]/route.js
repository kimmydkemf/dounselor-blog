import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const url = new URL(_req.url);
  const full = url.searchParams.get("full") === "1";
  const b = full ? boardService.getBoardFull(+params.id) : boardService.getBoard(+params.id);
  if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(b);
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const b = boardService.updateBoard(+params.id, body);
    if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(b);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const n = boardService.deleteBoard(+params.id);
  return NextResponse.json({ ok: n > 0 });
}
