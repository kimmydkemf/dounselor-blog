import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";
import { getBoardActor, canAccessBoard } from "@/lib/boardAuth";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "data", "board-uploads");

async function checkAccess(attId) {
  const att = boardService.getAttachment(attId);
  if (!att) return { error: "not found", status: 404 };
  const actor = await getBoardActor();
  if (!actor) return { error: "unauthorized", status: 401 };
  const boardId = boardService.cardBoardId(att.card_id);
  if (!boardId) return { error: "card gone", status: 404 };
  if (!canAccessBoard(actor, boardId)) return { error: "forbidden", status: 403 };
  return { actor, boardId, att };
}

export async function GET(_req, { params }) {
  const r = await checkAccess(+params.attId);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status });
  const abs = path.join(UPLOAD_DIR, r.att.path);
  try {
    const buf = await fs.readFile(abs);
    return new Response(buf, {
      headers: {
        "Content-Type": r.att.mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(r.att.name)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "file missing on disk" }, { status: 410 });
  }
}

export async function DELETE(_req, { params }) {
  const r = await checkAccess(+params.attId);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status });
  try { await fs.unlink(path.join(UPLOAD_DIR, r.att.path)); } catch {}
  boardService.deleteAttachment(+params.attId);
  return NextResponse.json({ ok: true });
}
