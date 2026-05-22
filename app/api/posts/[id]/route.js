import { NextResponse } from "next/server";
import { postService } from "@/services/postService";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const post = postService.get(+params.id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const post = postService.update(+params.id, body);
    if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const changes = postService.delete(+params.id);
  return NextResponse.json({ ok: changes > 0 });
}
