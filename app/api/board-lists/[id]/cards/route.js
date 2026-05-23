import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "title 필수" }, { status: 400 });
    const c = boardService.createCard(+params.id, body);
    return NextResponse.json(c, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
