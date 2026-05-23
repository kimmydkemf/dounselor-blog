import { subscribeBoard } from "@/lib/boardBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/boards/[id]/stream — SSE.
 *
 * 클라이언트: new EventSource(`/api/boards/${id}/stream`)
 * 이벤트: { type: "card_update"|"card_create"|"card_delete"|"card_move"|"list_create"|"list_update"|"list_delete"|"comment"|"attach", ...payload }
 *
 * 같은 보드에 가입된 모든 사용자에게 broadcast — 자기 자신도 받음 (간단함).
 * 클라이언트에서 자신의 변경은 무시하려면 origin client id 비교.
 */
export async function GET(_req, { params }) {
  const boardId = +params.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); }
        catch { /* closed */ }
      };

      // 초기 hello
      send({ type: "hello", board_id: boardId, t: Date.now() });

      // 보드 구독
      const unsub = subscribeBoard(boardId, send);

      // keep-alive ping — 30초마다 주석 라인 (브라우저/프록시 idle timeout 회피)
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch {}
      }, 30000);

      // 연결 종료 시 정리
      const close = () => {
        clearInterval(ping);
        unsub();
        try { controller.close(); } catch {}
      };
      // ReadableStream 의 abort 시그널 — 클라이언트가 연결 끊을 때
      // (Next.js 14 에선 request.signal 로 받음 — 두 번째 인자에 없으므로 polyfill X. 자동 cleanup 의존)
      // node-stream 내부에서 cancel() 호출 시 처리
      controller._close = close;
    },
    cancel() {
      this._close?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
