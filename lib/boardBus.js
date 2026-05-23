/**
 * 보드별 in-memory pub/sub.
 *
 * Next.js 단일 노드 인스턴스 가정 (현재 환경). 여러 인스턴스로 확장 시 Redis 등 외부 broker 필요.
 *
 * 사용:
 *   import { subscribeBoard, publishBoard } from "@/lib/boardBus";
 *   const unsub = subscribeBoard(boardId, (event) => { ... });
 *   publishBoard(boardId, { type: "card_update", card: {...} });
 */

// boardId → Set<callback>
const subscribers = new Map();

export function subscribeBoard(boardId, callback) {
  const key = String(boardId);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(callback);
  return () => {
    const set = subscribers.get(key);
    if (set) {
      set.delete(callback);
      if (set.size === 0) subscribers.delete(key);
    }
  };
}

export function publishBoard(boardId, event) {
  const set = subscribers.get(String(boardId));
  if (!set) return;
  for (const cb of set) {
    try { cb(event); } catch { /* swallow individual subscriber errors */ }
  }
}

export function subscriberCount(boardId) {
  return subscribers.get(String(boardId))?.size || 0;
}
