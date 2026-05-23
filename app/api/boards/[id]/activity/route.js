import { NextResponse } from "next/server";
import { boardService } from "@/services/boardService";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  return NextResponse.json(boardService.listActivity(+params.id, 50));
}
