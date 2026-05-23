import { STYLE_PRESETS } from "@/lib/ollama";
import { lookupWork } from "@/lib/wikipedia";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OLLAMA_URL   = process.env.OLLAMA_URL   || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

/* ─────────────────────────────────────────────────────────────
 * 한국어 강제 — qwen2.5 가 한자(중국어)를 섞는 문제를 막는 system 프롬프트.
 * ───────────────────────────────────────────────────────────── */
const SYSTEM_KO = `당신은 한국 블로그 전문 에디터입니다.

절대 규칙:
- 모든 출력은 100% 한국어로만 작성합니다.
- 중국어 한자(简体/繁體), 일본어 한자·가나, 영어 외의 외국어 절대 금지.
- 사람 이름·지명 같은 고유명사도 한글로 음차해 적습니다. 꼭 필요한 경우 괄호 안에 영문만 보조로 적되, 한자는 쓰지 않습니다.
- 인사말("안녕하세요"), 자기소개("저는 AI..."), 메타 설명("출력:", "다음은...") 같은 글머리·꼬리는 쓰지 않습니다.
- 응답은 요청된 결과물만 단독으로 출력합니다.`;

const STAGE1_PROMPT = (draft) => `다음 한국어 초안을 자연스럽게 다듬어라.

규칙:
- 한국어 맞춤법·띄어쓰기 교정
- 어색한 표현, 번역체, 중복 표현 정리
- 문장이 너무 길면 끊고, 끊긴 흐름이면 자연스럽게 연결
- 원문의 의미·정보·뉘앙스 유지. 새 내용 추가 X
- 마크다운 형식 유지
- 100% 한국어로만. 한자(중국어) 사용 절대 금지
- 응답은 다듬은 본문만

== 초안 ==
${draft}

== 다듬은 글 ==
`;

const STAGE2_PROMPT = (text, style) => `다음 한국어 글을 "${style.label}" 톤으로 자연스러운 블로그 글처럼 다시 써라.

스타일 가이드: ${style.voice}

블로그용 작업:
- 첫 문장(도입)은 독자를 끌어들이게
- 마지막 문장(마무리)은 여운이나 정리
- 한 단락이 너무 길면 적절히 나눠 가독성 ↑
- 자연스러운 흐름 유지
${style.id === "structured" ? "- 적절한 곳에 ## 소제목과 - 목록을 활용해 구조화" : ""}

규칙:
- 원문 의미·정보 유지. 새 내용·의견 추가 X
- 마크다운 형식 유지
- **100% 한국어로만 출력. 한자(중국어) 절대 사용 금지.** "친근한" 톤이라도 한국어 구어체만 사용.
- 응답은 본문만

== 입력 ==
${text}

== 출력 ==
`;

const META_PROMPT = (text) => `다음 한국어 블로그 본문을 분석해 메타데이터를 JSON 으로만 반환해라.

== 출력 형식 (JSON만, 다른 텍스트 절대 X) ==
{"title":"<8-25자 한국어 제목>","excerpt":"<40-90자 요약 한 문장>","tags":["<태그1>","<태그2>","<태그3>"]}

규칙:
- title: 호기심 자극하되 과장 X, 한국어
- excerpt: 본문 첫인상 한 문장, 한국어
- tags: 3-6개 핵심 키워드, 각 1-8자, 한국어
- 모두 100% 한국어. 한자/중국어 절대 사용 금지.
- JSON 외 일체의 텍스트 X (백틱, "출력:" 같은 머리말도 X)

== 본문 ==
${text}

== JSON ==
`;

const TITLE_EXTRACT_PROMPT = (text) => `다음 한국어 글에서 다루는 "작품 제목" (영화/드라마/애니메이션 제목) 을 찾아 한 줄로만 답하라.
규칙:
- 정확히 작품 제목 하나만, 그 외 단어 X
- 없으면 NONE
- 한자 사용 금지 (한글로 표기)

== 글 ==
${text}

== 작품 제목 ==
`;

/* ─────────────────────────────────────────────────────────────
 * Ollama 호출 — system + user 메시지, 한국어 강제.
 * ───────────────────────────────────────────────────────────── */
async function ollamaChat(prompt, temperature = 0.6) {
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
        temperature,
        top_p: 0.92,
        repeat_penalty: 1.08,
        num_predict: 4096,
        num_ctx: 8192,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${t.slice(0, 200)}`);
  }
  return ((await res.json())?.message?.content || "").trim();
}

/* 한자 비율 — 0.5% 넘으면 leak 로 간주 */
function chineseRatio(s) {
  if (!s) return 0;
  const han  = (s.match(/[一-鿿]/g) || []).length;
  return han / Math.max(1, s.length);
}

/** 한자 leak detected → 더 강한 prompt 로 1회 재시도 */
async function ollamaWithKoreanGuard(basePrompt, temperature) {
  let out = await ollamaChat(basePrompt, temperature);
  if (chineseRatio(out) <= 0.005) return out;

  // 재시도 — 한자 제거 강제, temperature 낮춰서
  const retryPrompt = `${basePrompt}

== 추가 지시 ==
이전 응답에 한자가 섞여 있었다. 모든 한자를 제거하고 한글로만 다시 작성해라. JSON 이면 JSON 만, 본문이면 본문만.
`;
  out = await ollamaChat(retryPrompt, Math.max(0.2, temperature - 0.2));

  // 그래도 한자가 남으면 강제 제거 (마지막 안전망)
  if (chineseRatio(out) > 0.005) {
    out = out.replace(/[一-鿿]+/g, "").replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  }
  return out;
}

function clean(text) {
  return text
    .replace(/^(?:다듬은\s*글|블로그\s*본문|출력)?\s*:?\s*\n+/i, "")
    .replace(/^["「『]/g, "")
    .replace(/["」』]\s*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** JSON 응답에서 첫 { } 블록만 안전하게 파싱 */
function parseMetaJson(text) {
  if (!text) return null;
  // ```json ... ``` 처리
  const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const body  = fence ? fence[1] : text;
  const first = body.indexOf("{");
  const last  = body.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    const j = JSON.parse(body.slice(first, last + 1));
    return {
      title:   String(j.title   || "").trim().slice(0, 60),
      excerpt: String(j.excerpt || "").trim().slice(0, 200),
      tags:    Array.isArray(j.tags) ? j.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

/**
 * SSE 스트리밍.
 *
 * Body:
 *   { draft: string, isReview?: boolean, hint?: 'movie'|'drama'|'anime', title?: string }
 *
 * 이벤트:
 *   { type:"stage", stage, status, elapsed_ms }
 *   { type:"draft", id, label, desc, content }
 *   { type:"meta",  title, excerpt, tags }
 *   { type:"work",  result }            ← 리뷰일 때만
 *   { type:"done",  elapsed_ms }
 *   { type:"error", message }
 */
export async function POST(req) {
  const body  = await req.json().catch(() => ({}));
  const draft = body?.draft;
  if (!draft?.trim()) {
    return new Response(JSON.stringify({ error: "draft 필수" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  const isReview = !!body?.isReview;
  const hint     = body?.hint || "movie";
  const userTitle = (body?.title || "").trim();

  const encoder = new TextEncoder();
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        // Stage 1 — 공유 정련
        send({ type: "stage", stage: "1", status: "start", elapsed_ms: Date.now() - t0 });
        const stage1 = await ollamaWithKoreanGuard(STAGE1_PROMPT(draft), 0.4);
        send({ type: "stage", stage: "1", status: "done", elapsed_ms: Date.now() - t0 });

        // 리뷰일 때 — 작품 검색을 병렬로 시작 (BG, 결과 늦게 도착해도 OK)
        let workPromise = null;
        if (isReview) {
          workPromise = (async () => {
            try {
              let candidate = userTitle;
              if (!candidate) {
                // 본문에서 LLM 으로 추출
                const t = await ollamaChat(TITLE_EXTRACT_PROMPT(stage1), 0.1);
                const line = t.split("\n").find(l => l.trim());
                candidate = (line || "").trim();
                if (candidate === "NONE" || candidate.length < 2) candidate = "";
              }
              if (!candidate) return null;
              const results = await lookupWork(candidate, hint);
              return results[0] || null;
            } catch (e) {
              return { error: String(e.message).slice(0, 200) };
            }
          })();
        }

        // Stage 2 — 각 스타일
        for (const style of STYLE_PRESETS) {
          send({ type: "stage", stage: `2-${style.id}`, status: "start", label: style.label, elapsed_ms: Date.now() - t0 });
          try {
            const out = await ollamaWithKoreanGuard(STAGE2_PROMPT(stage1, style), 0.65);
            send({
              type: "draft",
              id: style.id, label: style.label, desc: style.desc,
              content: clean(out),
            });
            send({ type: "stage", stage: `2-${style.id}`, status: "done", elapsed_ms: Date.now() - t0 });
          } catch (e) {
            send({
              type: "draft",
              id: style.id, label: style.label, desc: style.desc,
              content: "", error: String(e.message).slice(0, 200),
            });
          }
        }

        // Stage 3 — 메타데이터 (제목/요약/태그)
        send({ type: "stage", stage: "3-meta", status: "start", elapsed_ms: Date.now() - t0 });
        try {
          const raw = await ollamaWithKoreanGuard(META_PROMPT(stage1), 0.3);
          const meta = parseMetaJson(raw);
          if (meta) send({ type: "meta", ...meta });
        } catch (e) { /* meta 실패는 치명적이지 않음 */ }
        send({ type: "stage", stage: "3-meta", status: "done", elapsed_ms: Date.now() - t0 });

        // 리뷰면 work lookup 결과 전송
        if (workPromise) {
          send({ type: "stage", stage: "4-work", status: "start", elapsed_ms: Date.now() - t0 });
          const w = await workPromise;
          if (w && !w.error) send({ type: "work", result: w });
          send({ type: "stage", stage: "4-work", status: "done", elapsed_ms: Date.now() - t0 });
        }

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
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
