import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "blog.db");
const SCHEMA_PATH = path.join(process.cwd(), "schema.sql");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
db.exec(schema);

// ── 마이그레이션 (기존 DB 호환) ──
const safeExec = (sql) => { try { db.exec(sql); } catch {} };
safeExec("ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL");
safeExec("ALTER TABLE categories ADD COLUMN color TEXT DEFAULT ''");
safeExec("ALTER TABLE categories ADD COLUMN cover_image TEXT DEFAULT ''");

// ── 보드 협업 기능 ──
safeExec("ALTER TABLE boards ADD COLUMN invite_code TEXT");
safeExec("ALTER TABLE boards ADD COLUMN background TEXT DEFAULT ''");
safeExec("ALTER TABLE board_cards ADD COLUMN labels TEXT DEFAULT ''");      // JSON: ["red","green",...]
safeExec("ALTER TABLE board_cards ADD COLUMN checklist TEXT DEFAULT ''");   // JSON: [{text, done}]
safeExec(`CREATE TABLE IF NOT EXISTS board_guests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id   INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  joined_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen  DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
safeExec("CREATE INDEX IF NOT EXISTS idx_board_guests_token ON board_guests(token)");
safeExec("CREATE INDEX IF NOT EXISTS idx_boards_invite ON boards(invite_code)");

// 댓글
safeExec(`CREATE TABLE IF NOT EXISTS board_card_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id     INTEGER NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  author_kind TEXT NOT NULL,        -- 'owner' | 'guest'
  author_id   INTEGER,              -- owner=1, guest=board_guests.id
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
safeExec("CREATE INDEX IF NOT EXISTS idx_comments_card ON board_card_comments(card_id, created_at DESC)");

// 활동 로그 (보드 단위)
safeExec(`CREATE TABLE IF NOT EXISTS board_activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id    INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  actor_kind  TEXT NOT NULL,        -- 'owner' | 'guest'
  actor_name  TEXT NOT NULL,
  action      TEXT NOT NULL,        -- 'card_create','card_move','card_update','comment','attach',...
  target_type TEXT,                 -- 'card' | 'list' | 'board'
  target_id   INTEGER,
  meta        TEXT DEFAULT '',      -- JSON 자유 필드
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
safeExec("CREATE INDEX IF NOT EXISTS idx_activity_board ON board_activity(board_id, created_at DESC)");

// 첨부
safeExec(`CREATE TABLE IF NOT EXISTS board_card_attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id     INTEGER NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  path        TEXT NOT NULL,           -- data/board-uploads/<id>.<ext>
  uploader    TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
safeExec("CREATE INDEX IF NOT EXISTS idx_attach_card ON board_card_attachments(card_id)");

// ── 카테고리 시드 (전체 재정렬) ──
// id 를 고정해서 멱등하게 적용. 기존 글의 category_id 가 깨지지 않도록 id 보존.
const seeds = [
  // 루트
  { id: 10, parent_id: null, slug: "cs-study",     name: "컴퓨터 공부",  icon: "💻", color: "#6366f1", sort_order: 10 },
  { id: 2,  parent_id: null, slug: "thought",      name: "단상",        icon: "💭", color: "#ec4899", sort_order: 20 },
  { id: 3,  parent_id: null, slug: "review",       name: "리뷰",        icon: "📝", color: "#f59e0b", sort_order: 30 },
  { id: 4,  parent_id: null, slug: "health",       name: "건강",        icon: "🌿", color: "#16a34a", sort_order: 40 },

  // 컴퓨터 공부 하위 — 기존 "개발일지" 를 자식으로 강등
  { id: 1,  parent_id: 10,   slug: "dev-log",      name: "개발일지",    icon: "👨‍💻", color: "",        sort_order: 1 },
  { id: 11, parent_id: 10,   slug: "claude-usage", name: "클로드 사용법", icon: "🤖", color: "",        sort_order: 2 },
  { id: 12, parent_id: 10,   slug: "dev-tools",    name: "개발 도구",    icon: "🛠️", color: "",        sort_order: 3 },

  // 리뷰 하위
  { id: 20, parent_id: 3,    slug: "movie",        name: "영화",        icon: "🎬", color: "",        sort_order: 1 },
  { id: 21, parent_id: 3,    slug: "drama",        name: "드라마",      icon: "📺", color: "",        sort_order: 2 },
  { id: 22, parent_id: 3,    slug: "anime",        name: "애니메이션",  icon: "🎌", color: "",        sort_order: 3 },

  // 건강 하위
  { id: 30, parent_id: 4,    slug: "carnivore",    name: "카니보어 정보", icon: "🥩", color: "",        sort_order: 1 },
  { id: 31, parent_id: 4,    slug: "exercise",     name: "운동 정보",    icon: "💪", color: "",        sort_order: 2 },
];

const ensureSeeds = () => {
  const insert = db.prepare(`
    INSERT INTO categories (id, parent_id, slug, name, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      parent_id  = excluded.parent_id,
      slug       = excluded.slug,
      name       = excluded.name,
      icon       = excluded.icon,
      color      = CASE WHEN excluded.color = '' THEN categories.color ELSE excluded.color END,
      sort_order = excluded.sort_order
  `);
  const tx = db.transaction((rows) => {
    for (const r of rows) insert.run(r.id, r.parent_id, r.slug, r.name, r.icon, r.color, r.sort_order);
  });
  try { tx(seeds); } catch (e) { console.error("[seed] failed:", e.message); }
};
ensureSeeds();

// ── owner 사용자 시드 ──
// 카카오 OAuth 도입 전 단계 — boards 등 user_id FK 에 사용할 단일 owner.
try {
  db.prepare("INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)").run(1, "Owner", "owner");
} catch (e) {
  console.error("[seed] owner user:", e.message);
}

export default db;
