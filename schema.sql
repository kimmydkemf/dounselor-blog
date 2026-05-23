-- dounselor-blog 메타데이터 DB (SQLite)
-- 본문 마크다운은 D:\Obsidian\MyNotes\블로그\ 에 파일로 저장.

CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Kakao OAuth 정보
  kakao_id         TEXT UNIQUE,
  email            TEXT,
  name             TEXT NOT NULL,
  profile_image    TEXT,
  role             TEXT NOT NULL DEFAULT 'guest',   -- 'owner' | 'verified' | 'guest'
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 블로그 카테고리 (사용자가 추가) — parent_id 로 계층 지원
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon        TEXT DEFAULT '',         -- emoji
  color       TEXT DEFAULT '',         -- 카드 강조 색상 (hex)
  sort_order  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 방문 로그 (일 단위 unique by ip_hash)
CREATE TABLE IF NOT EXISTS visits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash    TEXT NOT NULL,
  day        TEXT NOT NULL,   -- YYYY-MM-DD (Seoul)
  path       TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ip_hash, day)
);

CREATE INDEX IF NOT EXISTS idx_visits_day ON visits(day);

-- 블로그 글
CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER REFERENCES categories(id),
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT DEFAULT '',
  body         TEXT NOT NULL,                  -- 마크다운 원본
  body_html    TEXT DEFAULT '',                -- 렌더링 캐시
  tags         TEXT DEFAULT '',                -- 콤마 구분
  status       TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
  obsidian_path TEXT DEFAULT '',               -- Obsidian 저장 경로
  ai_drafts    TEXT DEFAULT '',                -- AI 가 제안한 다듬은 버전들 (JSON)
  published_at DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_status_pub ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id, published_at DESC);

-- 추억집 — 사진/영상 앨범 (Phase 3)
CREATE TABLE IF NOT EXISTS memories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url   TEXT DEFAULT '',
  occurred_on DATE,
  status      TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memory_media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id   INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  type        TEXT NOT NULL,   -- 'image' | 'video'
  caption     TEXT DEFAULT '',
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memory_invites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id   INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  email       TEXT,
  used_at     DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 협업 보드 (Trello-like) — Phase 2
CREATE TABLE IF NOT EXISTS boards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id    INTEGER NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  color       TEXT DEFAULT '#6366f1',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS board_members (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id  INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  UNIQUE(board_id, user_id)
);

CREATE TABLE IF NOT EXISTS board_lists (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id  INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS board_cards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id     INTEGER NOT NULL REFERENCES board_lists(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date    DATE,
  assignee_id INTEGER REFERENCES users(id),
  sort_order  INTEGER DEFAULT 0,
  created_by  INTEGER REFERENCES users(id),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_board_cards_list ON board_cards(list_id, sort_order);

-- 시드: 기본 카테고리 + 개발일지 하위
INSERT OR IGNORE INTO categories (id, slug, name, icon, color, sort_order) VALUES
  (1, 'dev-log',     '개발일지',      '👨‍💻', '#6366f1', 0),
  (2, 'thought',     '단상',          '💭',  '#ec4899', 40),
  (3, 'review',      '리뷰',          '📝',  '#f59e0b', 50),
  (4, 'carnivore',   '카니보어 식단', '🥩',  '#dc2626', 30);

-- 개발일지 하위
INSERT OR IGNORE INTO categories (id, parent_id, slug, name, icon, sort_order) VALUES
  (10, 1, 'cs-study',     '컴퓨터 공부',     '💻', 1),
  (11, 1, 'claude-usage', '클로드 사용법',   '🤖', 2),
  (12, 1, 'dev-tools',    '개발 도구',       '🛠️', 3);
