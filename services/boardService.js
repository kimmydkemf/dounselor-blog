import db from "@/lib/db";
import crypto from "crypto";
import { publishBoard } from "@/lib/boardBus";

const OWNER_ID = 1; // 단일 owner (카카오 OAuth 도입 전)

/** boardId 알 때 호출 — SSE 가입자에게 "변경됨" broadcast. payload 가벼움 (re-fetch 트리거). */
function broadcast(boardId, type, extra = {}) {
  if (boardId) publishBoard(boardId, { type, t: Date.now(), ...extra });
}

/** 6자리 영숫자 초대 코드 — 충돌 시 재시도 */
function newInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 O/0/I/1 제외
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
    if (!db.prepare("SELECT 1 FROM boards WHERE invite_code=?").get(code)) return code;
  }
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/** 게스트 토큰 — opaque 16 bytes hex (32자) */
function newGuestToken() {
  return crypto.randomBytes(16).toString("hex");
}

export const boardService = {
  /* ───────────────── Board ───────────────── */
  listBoards() {
    return db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM board_lists WHERE board_id = b.id) AS list_count,
        (SELECT COUNT(*) FROM board_cards c
           JOIN board_lists l ON l.id = c.list_id
           WHERE l.board_id = b.id) AS card_count
      FROM boards b
      ORDER BY b.created_at DESC
    `).all();
  },

  getBoard(id) {
    return db.prepare("SELECT * FROM boards WHERE id=?").get(id);
  },

  createBoard({ name, description, color, background }) {
    const invite = newInviteCode();
    const r = db.prepare(
      "INSERT INTO boards (owner_id, name, description, color, background, invite_code) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(OWNER_ID, name, description || "", color || "#6366f1", background || "", invite);
    const boardId = r.lastInsertRowid;
    // 기본 리스트 3개 자동 생성
    const defaults = [["할 일", 1], ["진행 중", 2], ["완료", 3]];
    const ins = db.prepare("INSERT INTO board_lists (board_id, name, sort_order) VALUES (?, ?, ?)");
    for (const [name, ord] of defaults) ins.run(boardId, name, ord);
    return this.getBoard(boardId);
  },

  /** 기존 보드에 invite_code 없으면 발급 */
  ensureInviteCode(boardId) {
    const cur = this.getBoard(boardId);
    if (!cur) return null;
    if (cur.invite_code) return cur.invite_code;
    const code = newInviteCode();
    db.prepare("UPDATE boards SET invite_code=? WHERE id=?").run(code, boardId);
    return code;
  },

  /** 초대 코드 회전 — 기존 게스트 토큰은 그대로 유효 */
  regenerateInviteCode(boardId) {
    const code = newInviteCode();
    db.prepare("UPDATE boards SET invite_code=? WHERE id=?").run(code, boardId);
    return code;
  },

  getByInviteCode(code) {
    return db.prepare("SELECT * FROM boards WHERE invite_code=?").get(code);
  },

  updateBoard(id, { name, description, color, background }) {
    const cur = this.getBoard(id);
    if (!cur) return null;
    db.prepare("UPDATE boards SET name=?, description=?, color=?, background=? WHERE id=?")
      .run(
        name        ?? cur.name,
        description ?? cur.description,
        color       ?? cur.color,
        background  ?? cur.background ?? "",
        id,
      );
    broadcast(id, "board_update");
    return this.getBoard(id);
  },

  /* ───────────────── Guests ───────────────── */

  /** 초대 코드 + 이름으로 게스트 가입. 같은 이름 재가입은 기존 토큰 회전. */
  joinAsGuest(code, name) {
    const board = this.getByInviteCode(code);
    if (!board) return { error: "invalid_code" };
    const cleanName = String(name || "").trim().slice(0, 30);
    if (!cleanName) return { error: "name_required" };

    const token = newGuestToken();
    db.prepare(
      "INSERT INTO board_guests (board_id, name, token) VALUES (?, ?, ?)"
    ).run(board.id, cleanName, token);
    return { board, token, name: cleanName };
  },

  getGuestByToken(token) {
    if (!token) return null;
    return db.prepare("SELECT * FROM board_guests WHERE token=?").get(token);
  },

  /** 보드의 모든 게스트 목록 (owner 가 보는 멤버 패널) */
  listGuests(boardId) {
    return db.prepare(
      "SELECT id, name, joined_at, last_seen FROM board_guests WHERE board_id=? ORDER BY joined_at ASC"
    ).all(boardId);
  },

  removeGuest(guestId) {
    return db.prepare("DELETE FROM board_guests WHERE id=?").run(guestId).changes;
  },

  touchGuest(token) {
    db.prepare("UPDATE board_guests SET last_seen=CURRENT_TIMESTAMP WHERE token=?").run(token);
  },

  /* ───────────────── Comments ───────────────── */
  listComments(cardId) {
    return db.prepare(
      "SELECT * FROM board_card_comments WHERE card_id=? ORDER BY created_at ASC"
    ).all(cardId);
  },
  addComment(cardId, actor, body) {
    const r = db.prepare(
      "INSERT INTO board_card_comments (card_id, author_kind, author_id, author_name, body) VALUES (?, ?, ?, ?, ?)"
    ).run(cardId, actor.kind, actor.id ?? null, actor.name, body);
    broadcast(this.cardBoardId(cardId), "comment");
    return db.prepare("SELECT * FROM board_card_comments WHERE id=?").get(r.lastInsertRowid);
  },
  deleteComment(commentId) {
    return db.prepare("DELETE FROM board_card_comments WHERE id=?").run(commentId).changes;
  },

  /* ───────────────── Activity ───────────────── */
  logActivity(boardId, actor, { action, target_type, target_id, meta }) {
    try {
      db.prepare(
        "INSERT INTO board_activity (board_id, actor_kind, actor_name, action, target_type, target_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        boardId, actor.kind, actor.name, action,
        target_type || null, target_id || null,
        meta ? JSON.stringify(meta) : "",
      );
    } catch { /* 활동 로그 실패는 본 작업에 영향 X */ }
  },
  listActivity(boardId, limit = 50) {
    return db.prepare(
      "SELECT * FROM board_activity WHERE board_id=? ORDER BY created_at DESC LIMIT ?"
    ).all(boardId, limit);
  },

  /* ───────────────── Attachments ───────────────── */
  listAttachments(cardId) {
    return db.prepare(
      "SELECT * FROM board_card_attachments WHERE card_id=? ORDER BY created_at DESC"
    ).all(cardId);
  },
  addAttachment(cardId, { name, mime, size, path, uploader }) {
    const r = db.prepare(
      "INSERT INTO board_card_attachments (card_id, name, mime, size, path, uploader) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(cardId, name, mime, size, path, uploader);
    broadcast(this.cardBoardId(cardId), "attach");
    return db.prepare("SELECT * FROM board_card_attachments WHERE id=?").get(r.lastInsertRowid);
  },
  getAttachment(id) {
    return db.prepare("SELECT * FROM board_card_attachments WHERE id=?").get(id);
  },
  deleteAttachment(id) {
    return db.prepare("DELETE FROM board_card_attachments WHERE id=?").run(id).changes;
  },

  /** card → board_id 역참조 (권한 검증용) */
  cardBoardId(cardId) {
    const row = db.prepare(
      "SELECT l.board_id AS bid FROM board_cards c JOIN board_lists l ON l.id=c.list_id WHERE c.id=?"
    ).get(cardId);
    return row?.bid ?? null;
  },
  listBoardId(listId) {
    const row = db.prepare("SELECT board_id AS bid FROM board_lists WHERE id=?").get(listId);
    return row?.bid ?? null;
  },

  deleteBoard(id) {
    return db.prepare("DELETE FROM boards WHERE id=?").run(id).changes;
  },

  /** 보드 전체(+ lists + cards) 한 번에 — 칸반 페이지에서 사용 */
  getBoardFull(id) {
    const board = this.getBoard(id);
    if (!board) return null;
    const lists = db.prepare(
      "SELECT * FROM board_lists WHERE board_id=? ORDER BY sort_order ASC, id ASC"
    ).all(id);
    const cards = db.prepare(`
      SELECT c.* FROM board_cards c
      JOIN board_lists l ON l.id = c.list_id
      WHERE l.board_id = ?
      ORDER BY c.sort_order ASC, c.id ASC
    `).all(id);
    const cardsByList = new Map();
    for (const c of cards) {
      if (!cardsByList.has(c.list_id)) cardsByList.set(c.list_id, []);
      cardsByList.get(c.list_id).push(c);
    }
    return {
      ...board,
      lists: lists.map(l => ({ ...l, cards: cardsByList.get(l.id) || [] })),
    };
  },

  /* ───────────────── Lists ───────────────── */
  createList(boardId, { name }) {
    const max = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM board_lists WHERE board_id=?").get(boardId).m;
    const r = db.prepare(
      "INSERT INTO board_lists (board_id, name, sort_order) VALUES (?, ?, ?)"
    ).run(boardId, name, max + 1);
    broadcast(boardId, "list_create");
    return db.prepare("SELECT * FROM board_lists WHERE id=?").get(r.lastInsertRowid);
  },

  updateList(id, { name, sort_order }) {
    const cur = db.prepare("SELECT * FROM board_lists WHERE id=?").get(id);
    if (!cur) return null;
    db.prepare("UPDATE board_lists SET name=?, sort_order=? WHERE id=?")
      .run(name ?? cur.name, sort_order ?? cur.sort_order, id);
    broadcast(cur.board_id, "list_update");
    return db.prepare("SELECT * FROM board_lists WHERE id=?").get(id);
  },

  deleteList(id) {
    const cur = db.prepare("SELECT board_id FROM board_lists WHERE id=?").get(id);
    const n = db.prepare("DELETE FROM board_lists WHERE id=?").run(id).changes;
    if (cur) broadcast(cur.board_id, "list_delete");
    return n;
  },

  /* ───────────────── Cards ───────────────── */
  createCard(listId, { title, description, due_date, labels, checklist }) {
    const max = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM board_cards WHERE list_id=?").get(listId).m;
    const r = db.prepare(
      "INSERT INTO board_cards (list_id, title, description, due_date, sort_order, created_by, labels, checklist) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      listId, title, description || "", due_date || null, max + 1, OWNER_ID,
      labels    ? JSON.stringify(labels)    : "",
      checklist ? JSON.stringify(checklist) : "",
    );
    broadcast(this.listBoardId(listId), "card_create");
    return db.prepare("SELECT * FROM board_cards WHERE id=?").get(r.lastInsertRowid);
  },

  updateCard(id, { title, description, due_date, list_id, sort_order, labels, checklist }) {
    const cur = db.prepare("SELECT * FROM board_cards WHERE id=?").get(id);
    if (!cur) return null;
    db.prepare(`
      UPDATE board_cards
      SET title=?, description=?, due_date=?, list_id=?, sort_order=?, labels=?, checklist=?
      WHERE id=?
    `).run(
      title       ?? cur.title,
      description ?? cur.description,
      due_date    !== undefined ? (due_date || null) : cur.due_date,
      list_id     ?? cur.list_id,
      sort_order  ?? cur.sort_order,
      labels    !== undefined ? (labels    ? JSON.stringify(labels)    : "") : cur.labels,
      checklist !== undefined ? (checklist ? JSON.stringify(checklist) : "") : cur.checklist,
      id,
    );
    const updated = db.prepare("SELECT * FROM board_cards WHERE id=?").get(id);
    broadcast(this.cardBoardId(id), "card_update");
    return updated;
  },

  deleteCard(id) {
    const bid = this.cardBoardId(id);
    const n = db.prepare("DELETE FROM board_cards WHERE id=?").run(id).changes;
    if (bid) broadcast(bid, "card_delete");
    return n;
  },

  /**
   * 드래그앤드롭 후 한 번에 reorder.
   * @param {number} boardId
   * @param {Array<{ id, sort_order, cards: Array<{ id, sort_order }> }>} lists
   */
  reorder(boardId, lists) {
    const updList = db.prepare("UPDATE board_lists SET sort_order=? WHERE id=? AND board_id=?");
    const updCard = db.prepare("UPDATE board_cards SET list_id=?, sort_order=? WHERE id=?");
    const tx = db.transaction(() => {
      for (const l of lists) {
        if (l.id != null && l.sort_order != null) updList.run(l.sort_order, l.id, boardId);
        if (Array.isArray(l.cards)) {
          for (const c of l.cards) {
            if (c.id != null && c.sort_order != null) updCard.run(l.id, c.sort_order, c.id);
          }
        }
      }
    });
    tx();
    broadcast(boardId, "reorder");
    return true;
  },
};
