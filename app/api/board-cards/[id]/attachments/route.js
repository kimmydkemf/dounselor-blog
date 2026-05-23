import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";
import { getBoardActor, canAccessBoard } from "@/lib/boardAuth";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.join(process.cwd(), "data", "board-uploads");
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/", "video/mp4"];

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

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
  return NextResponse.json(boardService.listAttachments(cardId));
}

export async function POST(req, { params }) {
  const cardId = +params.id;
  const a = await checkAccess(cardId);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.status });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file 필드 필수" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 413 });
  }
  const mime = String(file.type || "application/octet-stream");
  if (!ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p))) {
    return NextResponse.json({ error: "허용되지 않은 파일 형식 (이미지/PDF/텍스트/MP4 만)" }, { status: 415 });
  }

  await ensureDir();
  const ext = path.extname(file.name || "").slice(0, 8).replace(/[^a-zA-Z0-9.]/g, "") || ".bin";
  const filename = crypto.randomBytes(16).toString("hex") + ext;
  const absPath = path.join(UPLOAD_DIR, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absPath, buf);

  const att = boardService.addAttachment(cardId, {
    name: (file.name || filename).slice(0, 200),
    mime, size: buf.length,
    path: filename,  // 디렉터리 prefix 는 GET 핸들러에서 추가
    uploader: a.actor.name,
  });
  boardService.logActivity(a.boardId, a.actor, {
    action: "attach", target_type: "card", target_id: cardId,
    meta: { name: att.name, size: att.size },
  });
  return NextResponse.json(att, { status: 201 });
}
