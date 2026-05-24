import db from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { writePostToObsidian } from "@/lib/obsidianWriter";

export const postService = {
  list({ status = "published", category_slug, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
      FROM posts p LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    // status: 'published' | 'draft' | 'all' | null(=published)
    if (status === "all") {
      // 모든 상태
    } else if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }
    if (category_slug) {
      // 부모 카테고리 선택 시 자식 카테고리 글까지 포함
      const cat = db.prepare("SELECT id FROM categories WHERE slug=?").get(category_slug);
      if (cat) {
        const childIds = db.prepare("SELECT id FROM categories WHERE parent_id=?").all(cat.id).map(r => r.id);
        const ids = [cat.id, ...childIds];
        sql += ` AND p.category_id IN (${ids.map(() => "?").join(",")})`;
        params.push(...ids);
      } else {
        sql += " AND 1=0"; // 없는 slug → 0건
      }
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

  /** 같은 카테고리의 다른 published 글 (현재 글 제외) */
  related(postId, categoryId, limit = 4) {
    if (!categoryId) {
      // 카테고리 없으면 전체에서 최신
      return db.prepare(`
        SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
        FROM posts p LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status='published' AND p.id != ?
        ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ?
      `).all(postId, limit);
    }
    return db.prepare(`
      SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
      FROM posts p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status='published' AND p.id != ? AND p.category_id = ?
      ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ?
    `).all(postId, categoryId, limit);
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
