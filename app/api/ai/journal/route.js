import { collectActivities, activitiesToPrompt } from "@/lib/gitLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OLLAMA_URL   = process.env.OLLAMA_URL   || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

const SYSTEM_KO = `당신은 한국 블로그 전문 에디터입니다.
- 모든 출력은 100% 한국어로만.
- 한자(중국어/일본어), 외국어 절대 금지. 고유명사는 한글 음차.
- 인사말·자기소개·메타 설명 X. 결과물만 출력.`;

const PROMPT = ({ dateISO, weekday, gitContext, note }) => `오늘 작업한 내용을 정리해 블로그 개발일지 한 편을 작성해라.

날짜: ${dateISO} (${weekday})

== 사용자 메모 ==
${note?.trim() || "(메모 없음)"}

== git 활동 (자동 수집 — 커밋 + 미커밋 진행 중인 작업까지) ==
${gitContext}

== 작성 규칙 ==
- 한국어, 자연스러운 블로그 글체. 일기처럼 가볍지만 정보는 정확하게.
- 마크다운 형식. 첫 줄에 "# " 로 제목.
- 도입 1문단 → 본문 (## 소제목 2–4개) → "## 회고" 또는 "## 다음 할 일" 로 마무리.
- 커밋 해시를 그대로 노출하지 말고 의미 단위로 묶어 설명.
- "아직 커밋 안 한 작업" 도 본문에 자연스럽게 녹여 — "진행 중", "정리 안 한 변경", "내일 마무리할 부분" 같은 톤으로.
- 며칠 전부터 멈춰둔 파일은 회고/다음 할 일 섹션에서 언급.
- 파일 경로는 꼭 필요한 경우만 \`code\` 로.
- 작업이 적으면 짧고 솔직하게. 부풀리지 않는다.
- 본문만. "초안:" 같은 머리말이나 모델의 자기소개 X.

== 출력 ==
`;

function todayISO() {
  const ms = Date.now() + 9 * 60 * 60 * 1000;
  const d  = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}
function weekdayKo(iso) {
  const d = new Date(`${iso}T12:00:00+09:00`);
  return ["일","월","화","수","목","금","토"][d.getUTCDay()] + "요일";
}

async function ollama(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_KO },
        { role: "user",   content: prompt },
      ],
      stream: false,
      options: {
        temperature: 0.55,
        top_p: 0.92,
        repeat_penalty: 1.08,
        num_predict: 4096,
        num_ctx: 8192,
      },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  return ((await res.json())?.message?.content || "").trim();
}

function chineseRatio(s) {
  if (!s) return 0;
  return (s.match(/[一-鿿]/g) || []).length / Math.max(1, s.length);
}
async function ollamaKo(prompt) {
  let out = await ollama(prompt);
  if (chineseRatio(out) > 0.005) {
    out = await ollama(`${prompt}\n\n== 추가 지시 ==\n이전 응답에 한자가 섞여 있었다. 한자를 전부 한글로 바꿔 다시 작성.\n`);
    if (chineseRatio(out) > 0.005) {
      out = out.replace(/[一-鿿]+/g, "").replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
    }
  }
  return out;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const dateISO = (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) ? body.date : todayISO();
  const note    = body?.note || "";
  const extras  = Array.isArray(body?.repos) ? body.repos.filter(Boolean) : [];
  const includeUncommitted = body?.includeUncommitted !== false;  // 기본 ON

  // 기본으로 dounselor-blog 자신 + 사용자가 입력한 경로
  const repos = [process.cwd(), ...extras];
  const activities = collectActivities(repos, dateISO, { includeUncommitted });
  const gitContext = activitiesToPrompt(activities);

  // SSE 스트리밍 — refine 과 동일한 패턴
  const encoder = new TextEncoder();
  const t0 = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        send({
          type: "stage", stage: "collect", status: "done", elapsed_ms: Date.now() - t0,
          activities: activities.map(a => ({
            repo:    a.repo,
            commits: a.commits.length,
            summary: a.summary,
            uncommitted: a.uncommitted ? {
              staged:    a.uncommitted.staged.length,
              unstaged:  a.uncommitted.unstaged.length,
              untracked: a.uncommitted.untracked.length,
              recentEdits: a.uncommitted.recentEdits.length,
            } : null,
          })),
        });

        send({ type: "stage", stage: "write", status: "start", elapsed_ms: Date.now() - t0 });
        const md = await ollamaKo(PROMPT({ dateISO, weekday: weekdayKo(dateISO), gitContext, note }));
        send({ type: "stage", stage: "write", status: "done", elapsed_ms: Date.now() - t0 });

        // 제목 / 본문 분리 (첫 # 헤더 우선)
        const firstH = md.match(/^#\s+(.+?)\s*$/m);
        const title  = firstH ? firstH[1].trim() : `개발일지 — ${dateISO}`;
        const bodyMd = firstH ? md.replace(firstH[0], "").trimStart() : md;

        send({
          type: "result",
          title,
          body: bodyMd,
          excerpt: bodyMd.split("\n").find(l => l.trim() && !l.startsWith("#"))?.slice(0, 140) || "",
          dateISO,
        });
        send({ type: "done", elapsed_ms: Date.now() - t0 });
        controller.close();
      } catch (e) {
        send({ type: "error", message: String(e.message).slice(0, 300) });
        controller.close();
      }
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
