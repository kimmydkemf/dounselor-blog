import db from "@/lib/db";
import { slugify } from "@/lib/slugify";

export const categoryService = {
  list() {
    return db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, name ASC").all();
  },

  get(id) {
    return db.prepare("SELECT * FROM categories WHERE id=?").get(id);
  },

  getBySlug(slug) {
    return db.prepare("SELECT * FROM categories WHERE slug=?").get(slug);
  },

  create({ name, description, icon, sort_order }) {
    const slug = slugify(name);
    const result = db.prepare(
      "INSERT INTO categories (slug, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)"
    ).run(slug, name, description || "", icon || "", sort_order ?? 0);
    return this.get(result.lastInsertRowid);
  },

  update(id, { name, description, icon, sort_order }) {
    db.prepare(
      "UPDATE categories SET name=?, description=?, icon=?, sort_order=? WHERE id=?"
    ).run(name, description || "", icon || "", sort_order ?? 0, id);
    return this.get(id);
  },

  delete(id) {
    // 글이 속해있으면 category_id NULL 로
    db.prepare("UPDATE posts SET category_id=NULL WHERE category_id=?").run(id);
    return db.prepare("DELETE FROM categories WHERE id=?").run(id).changes;
  },
};
