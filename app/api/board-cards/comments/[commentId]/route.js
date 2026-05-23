import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";
import { getBoardActor } from "@/lib/boardAuth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  const actor = await getBoardActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = db.prepare("SELECT * FROM board_card_comments WHERE id=?").get(+params.commentId);
  if (!c) return NextResponse.json({ ok: false }, { status: 404 });
  // 본인 댓글 OR owner 만 삭제 가능
  if (actor.kind !== "owner" && !(c.author_kind === actor.kind && c.author_id === actor.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  boardService.deleteComment(+params.commentId);
  return NextResponse.json({ ok: true });
}
