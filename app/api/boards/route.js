import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(boardService.listBoards());
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "name 필수" }, { status: 400 });
    const b = boardService.createBoard(body);
    return NextResponse.json(b, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
