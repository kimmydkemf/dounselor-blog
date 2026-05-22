import { NextResponse } from "next/server";
import { categoryService } from "@/services/categoryService";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(categoryService.list());
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "name 필수" }, { status: 400 });
    const cat = categoryService.create(body);
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
