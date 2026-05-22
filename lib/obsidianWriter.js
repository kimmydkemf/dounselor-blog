/**
 * Obsidian 볼트로 블로그 글 단방향 저장.
 *
 * 경로: <OBSIDIAN_VAULT>/블로그/<카테고리>/YYYY-MM-DD <slug>.md
 *
 * .env.local 설정 예:
 *   OBSIDIAN_VAULT=D:\Obsidian\MyNotes
 *
 * 파일은 frontmatter (YAML) + 본문 마크다운 형식.
 * Obsidian 의 LiveSync 가 자동으로 다른 PC에 sync 됨.
 */

import fs from "fs";
import path from "path";

const VAULT = process.env.OBSIDIAN_VAULT || "D:\\Obsidian\\MyNotes";
const BLOG_ROOT = path.join(VAULT, "블로그");

function safe(s) {
  return String(s || "").replace(/[\\\/:*?"<>|]/g, "").trim().slice(0, 80);
}

function yyyymmdd(d) {
  const dt = d instanceof Date ? d : new Date(d || Date.now());
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}

function frontmatter(post) {
  const lines = ["---"];
  lines.push(`title: "${(post.title || "").replace(/"/g, '\\"')}"`);
  if (post.category) lines.push(`category: "${post.category}"`);
  if (post.tags)     lines.push(`tags: [${post.tags.split(",").filter(Boolean).map(t => `"${t.trim()}"`).join(", ")}]`);
  if (post.slug)     lines.push(`slug: "${post.slug}"`);
  lines.push(`published: ${post.published_at || new Date().toISOString()}`);
  lines.push(`source: dounselor-blog`);
  lines.push("---");
  return lines.join("\n");
}

/**
 * 블로그 글 → Obsidian 볼트에 저장.
 * @param {object} post - { title, slug, body, category, tags, published_at }
 * @returns {{path: string, relPath: string}} 저장된 절대 경로 + 볼트 기준 상대 경로
 */
export function writePostToObsidian(post) {
  if (!fs.existsSync(VAULT)) {
    throw new Error(`Obsidian 볼트 없음: ${VAULT}`);
  }
  const cat = safe(post.category || "기타");
  const dir = path.join(BLOG_ROOT, cat);
  fs.mkdirSync(dir, { recursive: true });

  const fname = `${yyyymmdd(post.published_at)} ${safe(post.title || post.slug || "untitled")}.md`;
  const full  = path.join(dir, fname);
  const rel   = path.relative(VAULT, full).replace(/\\/g, "/");

  const content = `${frontmatter(post)}\n\n${post.body || ""}\n`;
  fs.writeFileSync(full, content, "utf-8");

  return { path: full, relPath: rel };
}
