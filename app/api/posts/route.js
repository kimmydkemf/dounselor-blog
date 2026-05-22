import { NextResponse } from "next/server";
import { postService } from "@/services/postService";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "published";
  const category_slug = searchParams.get("cat") || undefined;
  const limit = Math.min(+searchParams.get("limit") || 50, 200);
  const offset = +searchParams.get("offset") || 0;
  const list = postService.list({ status, category_slug, limit, offset });
  return NextResponse.json(list);
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "title 필수" }, { status: 400 });
    const post = postService.create(body);
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
