import crypto from "crypto";
import db from "@/lib/db";

/** 서울 기준 YYYY-MM-DD */
function todayStr() {
  const ms = Date.now() + 9 * 60 * 60 * 1000;
  const d  = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}

/** IP → 해시 (개인정보 비저장) */
function hashIp(ip) {
  return crypto.createHash("sha256").update(String(ip || "?")).digest("hex").slice(0, 32);
}

export const visitorService = {
  /**
   * 방문 기록. 같은 IP 가 같은 날 여러 번 접속해도 1로 카운트 (UNIQUE 제약).
   * @returns {boolean} 신규 방문(=오늘 처음)이면 true
   */
  log(ip, path = "") {
    const ipHash = hashIp(ip);
    const day = todayStr();
    try {
      const res = db.prepare("INSERT OR IGNORE INTO visits (ip_hash, day, path) VALUES (?, ?, ?)")
        .run(ipHash, day, path);
      return res.changes > 0;
    } catch {
      return false;
    }
  },

  /** 통계 — 오늘 + 누적 */
  stats() {
    const today = todayStr();
    const todayCount = db.prepare("SELECT COUNT(*) as c FROM visits WHERE day = ?").get(today).c;
    const totalCount = db.prepare("SELECT COUNT(*) as c FROM visits").get().c;
    return { today: todayCount, total: totalCount };
  },
};
