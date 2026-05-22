import db from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { writePostToObsidian } from "@/lib/obsidianWriter";

export const postService = {
  list({ status = "published", category_slug, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon
      FROM posts p LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += " AND p.status = ?"; params.push(status); }
    if (category_slug) {
      sql += " AND c.slug = ?";
      params.push(category_slug);
    }
    sql += " ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    return db.prepare(sql).all(...params);
  },

  getBySlug(slug) {
    return db.prepare(`
      SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon
      FROM posts p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ?
    `).get(slug);
  },

  get(id) {
    return db.prepare(`
      SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon
      FROM posts p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  },

  /** slug 충돌 시 -2, -3 suffix */
  uniqueSlug(base) {
    let slug = slugify(base);
    let i = 1;
    while (db.prepare("SELECT 1 FROM posts WHERE slug=?").get(slug)) {
      i++;
      slug = `${slugify(base)}-${i}`;
    }
    return slug;
  },

  create({ title, body, excerpt, category_id, tags, status, ai_drafts }) {
    const slug = this.uniqueSlug(title);
    const published_at = status === "published" ? new Date().toISOString() : null;
    const result = db.prepare(`
      INSERT INTO posts (category_id, slug, title, excerpt, body, tags, status, ai_drafts, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category_id || null,
      slug,
      title,
      excerpt || "",
      body || "",
      tags || "",
      status || "draft",
      ai_drafts ? JSON.stringify(ai_drafts) : "",
      published_at,
    );
    const post = this.get(result.lastInsertRowid);
    if (status === "published") this.syncToObsidian(post);
    return post;
  },

  update(id, { title, body, excerpt, category_id, tags, status }) {
    const cur = this.get(id);
    if (!cur) return null;

    // status 가 published 로 처음 바뀔 때 published_at 설정
    let published_at = cur.published_at;
    if (status === "published" && !published_at) {
      published_at = new Date().toISOString();
    }

    db.prepare(`
      UPDATE posts SET
        category_id=?, title=?, excerpt=?, body=?, tags=?, status=?,
        published_at=COALESCE(?, published_at),
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      category_id || null,
      title ?? cur.title,
      excerpt ?? cur.excerpt,
      body ?? cur.body,
      tags ?? cur.tags,
      status ?? cur.status,
      published_at,
      id,
    );
    const post = this.get(id);
    if (post.status === "published") this.syncToObsidian(post);
    return post;
  },

  delete(id) {
    return db.prepare("DELETE FROM posts WHERE id=?").run(id).changes;
  },

  /** Obsidian 볼트로 단방향 저장 */
  syncToObsidian(post) {
    try {
      const { path: full, relPath } = writePostToObsidian({
        title: post.title,
        slug: post.slug,
        body: post.body,
        category: post.category_name || post.category_slug || "기타",
        tags: post.tags,
        published_at: post.published_at,
      });
      db.prepare("UPDATE posts SET obsidian_path=? WHERE id=?").run(relPath, post.id);
      return relPath;
    } catch (e) {
      console.error("[Obsidian] write failed:", e.message);
      return null;
    }
  },
};
