/**
 * Ollama 로컬 API 클라이언트 — 한국어 블로그 글 다듬기.
 *
 * 다단계 정련:
 *   Stage 1 (정련) — 맞춤법/문법/어색한 표현 교정
 *   Stage 2 (스타일) — 선택한 톤으로 다시 쓰기 (도입·전환·마무리)
 *
 * 모델: qwen2.5:7b (한국어 강함) — 없으면 llama3.2:3b fallback
 */

const OLLAMA_URL   = process.env.OLLAMA_URL   || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

const STYLE_PRESETS = [
  {
    id: "polished",
    label: "정돈된 블로그",
    desc: "원문 의미는 유지하고 자연스럽고 매끄럽게",
    voice: "글쓴이 본인의 차분한 1인칭. 단정한 문장, 적당한 길이. 블로그 본문에 적합.",
  },
  {
    id: "casual",
    label: "친근한 톤",
    desc: "친구한테 말하듯 술술 읽히게",
    voice: "친근한 반말 또는 친밀한 존댓말 혼용 OK. 짧고 가벼운 문장. 가끔 의문문/감탄.",
  },
  {
    id: "structured",
    label: "구조적인 글",
    desc: "헤딩·목록·요약 등으로 정리된 정보성 글",
    voice: "정보 전달 위주. 적절한 곳에 ## 헤딩, - 목록 추가. 첫 줄에 한 줄 요약. 마지막에 정리/결론.",
  },
];

const STAGE1_PROMPT = (draft) => `다음 한국어 초안을 자연스럽게 다듬어라.

규칙:
- 한국어 맞춤법·띄어쓰기 교정
- 어색한 표현, 번역체, 중복 표현 정리
- 문장이 너무 길면 끊고, 너무 짧고 끊긴 흐름이면 자연스럽게 연결
- 원문의 의미·정보·뉘앙스 유지. 새 내용 추가 X
- 마크다운 형식 유지

== 초안 ==
${draft}

== 다듬은 글 (위 규칙대로) ==
`;

const STAGE2_PROMPT = (text, style) => `다음 한국어 글을 "${style.label}" 톤으로 자연스러운 블로그 글처럼 다시 써라.

스타일 가이드: ${style.voice}

블로그용 추가 작업:
- 첫 문장(도입)은 독자를 끌어들이게 — 너무 평범한 시작 피하기
- 마지막 문장(마무리)은 여운을 남기거나 정리하는 톤
- 한 단락이 너무 길면 적절히 나눠 가독성 ↑
- 자연스러운 흐름 유지. 문장끼리 부드럽게 연결
${style.id === "structured" ? "- 적절한 곳에 ## 소제목과 - 목록을 활용해 구조화" : ""}

규칙:
- 원문의 의미·정보 유지. 새 내용·의견 추가 X
- 마크다운 형식 유지
- 응답은 다듬은 본문만. 인사말이나 설명 X

== 입력 ==
${text}

== 출력 (블로그 본문 톤으로) ==
`;

async function ollamaChat(prompt, opts = {}) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.6,
        top_p:       0.92,
        repeat_penalty: 1.05,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data?.message?.content || "").trim();
}

/** 응답에서 가끔 들어가는 안내문 제거 */
function cleanOutput(text) {
  return text
    .replace(/^(?:다듬은\s*글|블로그\s*본문)?\s*:?\s*\n+/i, "")
    .replace(/^["「『]/g, "")
    .replace(/["」』]\s*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 1개 스타일에 대해 2-stage refinement.
 */
export async function refineDraft(draft, style = "polished") {
  if (!draft?.trim()) return "";
  const preset = STYLE_PRESETS.find(s => s.id === style) || STYLE_PRESETS[0];
  const stage1 = await ollamaChat(STAGE1_PROMPT(draft), { temperature: 0.4 });
  const stage2 = await ollamaChat(STAGE2_PROMPT(stage1, preset), { temperature: 0.65 });
  return cleanOutput(stage2);
}

/**
 * 3가지 스타일 모두 병렬로 — Stage1 한 번 + Stage2 3개.
 * 효율을 위해 Stage1 결과를 공유한다.
 */
export async function refineDraftAllStyles(draft) {
  if (!draft?.trim()) return [];

  // 1차 정련 (공유)
  let stage1;
  try {
    stage1 = await ollamaChat(STAGE1_PROMPT(draft), { temperature: 0.4 });
  } catch (e) {
    // 1차 실패 시 모든 스타일 실패로 처리
    return STYLE_PRESETS.map(s => ({
      id: s.id, label: s.label, desc: s.desc,
      content: "", error: String(e.message).slice(0, 200),
    }));
  }

  const results = await Promise.allSettled(
    STYLE_PRESETS.map(s => ollamaChat(STAGE2_PROMPT(stage1, s), { temperature: 0.65 }))
  );
  return STYLE_PRESETS.map((s, i) => ({
    id:    s.id,
    label: s.label,
    desc:  s.desc,
    content: results[i].status === "fulfilled" ? cleanOutput(results[i].value) : "",
    error:   results[i].status === "rejected"  ? String(results[i].reason).slice(0, 200) : null,
  }));
}

export { STYLE_PRESETS };
