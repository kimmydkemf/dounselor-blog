import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";
import { getBoardActor, canAccessBoard } from "@/lib/boardAuth";

export const dynamic = "force-dynamic";

async function checkAccess(cardId) {
  const actor = await getBoardActor();
  if (!actor) return { error: "unauthorized", status: 401 };
  const boardId = boardService.cardBoardId(cardId);
  if (!boardId) return { error: "card not found", status: 404 };
  if (!canAccessBoard(actor, boardId)) return { error: "forbidden", status: 403 };
  return { actor, boardId };
}

export async function GET(_req, { params }) {
  const cardId = +params.id;
  const a = await checkAccess(cardId);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.status });
  return NextResponse.json(boardService.listComments(cardId));
}

export async function POST(req, { params }) {
  const cardId = +params.id;
  const a = await checkAccess(cardId);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.status });
  const { body } = await req.json().catch(() => ({}));
  if (!body?.trim()) return NextResponse.json({ error: "내용 필수" }, { status: 400 });

  const comment = boardService.addComment(cardId, a.actor, body.trim());
  boardService.logActivity(a.boardId, a.actor, {
    action: "comment", target_type: "card", target_id: cardId,
    meta: { preview: body.trim().slice(0, 60) },
  });
  return NextResponse.json(comment, { status: 201 });
}
