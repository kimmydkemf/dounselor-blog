/**
 * Ollama 로컬 API 클라이언트.
 * 기본 endpoint: http://localhost:11434/api/chat
 *
 * 글쓰기 다듬기 흐름:
 *   사용자 초안 → 3개의 다른 스타일로 다듬은 버전 제안 → 사용자 선택
 */

const OLLAMA_URL   = process.env.OLLAMA_URL   || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

const STYLE_PRESETS = [
  { id: "polished",  label: "다듬은 글",      desc: "문법·맞춤법 고치고, 어색한 문장 자연스럽게" },
  { id: "casual",    label: "캐주얼",         desc: "친근한 말투, 짧고 술술 읽히는 글" },
  { id: "formal",    label: "정돈된 어조",    desc: "정중하고 깔끔한 문장, 블로그 본문에 적합" },
];

function buildPrompt(draft, style) {
  const styleDesc = STYLE_PRESETS.find(s => s.id === style)?.desc || "자연스럽게";
  return `너는 한국어 블로그 글을 다듬는 편집자다. 사용자의 초안을 받아 "${styleDesc}" 방향으로 다시 써라.

원칙:
- 원문의 의미·정보·뉘앙스는 유지
- 한국어 맞춤법·띄어쓰기 교정
- 어색한 문장 자연스럽게
- 마크다운 형식 유지 (제목 #, 목록 - 등)
- 새 내용 추가 X, 의견 추가 X
- 답변은 다듬은 본문만, 인사말이나 설명 X

== 초안 ==
${draft}

== 다듬은 글 (위 원칙 그대로) ==
`;
}

/**
 * 한 가지 스타일로 다듬기.
 * @returns {Promise<string>} 다듬어진 마크다운
 */
export async function refineDraft(draft, style = "polished") {
  if (!draft?.trim()) return "";

  const prompt = buildPrompt(draft, style);

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: { temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data?.message?.content || "").trim();
}

/**
 * 3가지 스타일 모두 병렬로 생성.
 * 실패한 스타일은 빈 문자열.
 */
export async function refineDraftAllStyles(draft) {
  const results = await Promise.allSettled(
    STYLE_PRESETS.map(s => refineDraft(draft, s.id))
  );
  return STYLE_PRESETS.map((s, i) => ({
    id:    s.id,
    label: s.label,
    desc:  s.desc,
    content: results[i].status === "fulfilled" ? results[i].value : "",
    error:   results[i].status === "rejected"  ? String(results[i].reason).slice(0, 200) : null,
  }));
}

export { STYLE_PRESETS };
