import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  const n = boardService.removeGuest(+params.guestId);
  return NextResponse.json({ ok: n > 0 });
}
