import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "name 필수" }, { status: 400 });
    const l = boardService.createList(+params.id, body);
    return NextResponse.json(l, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
