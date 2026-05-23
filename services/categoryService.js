import db from "@/lib/db";
import { slugify } from "@/lib/slugify";

export const categoryService = {
  list() {
    return db.prepare("SELECT * FROM categories ORDER BY parent_id IS NOT NULL, sort_order ASC, name ASC").all();
  },

  /** 부모-자식 트리 + 각 카테고리의 발행글 수 */
  tree() {
    const all = db.prepare(`
      SELECT c.*, (
        SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status='published'
      ) AS post_count
      FROM categories c ORDER BY sort_order ASC, name ASC
    `).all();
    const roots    = all.filter(c => !c.parent_id);
    const children = all.filter(c =>  c.parent_id);
    return roots.map(r => ({
      ...r,
      children: children.filter(c => c.parent_id === r.id),
    }));
  },

  get(id) {
    return db.prepare("SELECT * FROM categories WHERE id=?").get(id);
  },

  getBySlug(slug) {
    return db.prepare("SELECT * FROM categories WHERE slug=?").get(slug);
  },

  /** slug 또는 id 로 자식 포함 모든 후손 id 반환 */
  descendantIds(parentId) {
    const out = [parentId];
    const direct = db.prepare("SELECT id FROM categories WHERE parent_id=?").all(parentId);
    for (const r of direct) out.push(...this.descendantIds(r.id));
    return out;
  },

  create({ name, description, icon, color, sort_order, parent_id }) {
    const slug = slugify(name);
    const result = db.prepare(
      "INSERT INTO categories (parent_id, slug, name, description, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(parent_id || null, slug, name, description || "", icon || "", color || "", sort_order ?? 0);
    return this.get(result.lastInsertRowid);
  },

  update(id, { name, description, icon, color, sort_order, parent_id }) {
    db.prepare(
      "UPDATE categories SET name=?, description=?, icon=?, color=?, sort_order=?, parent_id=? WHERE id=?"
    ).run(name, description || "", icon || "", color || "", sort_order ?? 0, parent_id || null, id);
    return this.get(id);
  },

  delete(id) {
    db.prepare("UPDATE posts SET category_id=NULL WHERE category_id=?").run(id);
    db.prepare("UPDATE categories SET parent_id=NULL WHERE parent_id=?").run(id);
    return db.prepare("DELETE FROM categories WHERE id=?").run(id).changes;
  },
};
