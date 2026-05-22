# Dounselor Blog

**[blog.dounselor.com](https://blog.dounselor.com)** — 3개 섹션으로 구성된 통합 사이트:

| 섹션 | 경로 | 인증 | 상태 |
|---|---|---|---|
| 📝 **블로그** + 개발일지 | `/blog` | 공개 | ✅ Phase 1 |
| 📋 **공유 보드** (Trello 풍) | `/board` | 카카오 로그인 | ⏳ Phase 2 |
| 📷 **추억집** (사진·영상) | `/memories` | 카카오 로그인 + 초대제 | ⏳ Phase 3 |

---

## 핵심 기능 (Phase 1)

- **AI 글쓰기 도움** — 거친 초안을 로컬 Ollama LLM 이 3가지 스타일(다듬은 / 캐주얼 / 정돈된)로 다듬어 제안. 사용자가 선택해서 적용.
- **카테고리 사용자 추가** — `개발일지` / `단상` / `리뷰` 기본 제공, 자유 추가.
- **Obsidian 단방향 저장** — 발행한 글은 `<OBSIDIAN_VAULT>/블로그/<카테고리>/YYYY-MM-DD 제목.md` 로 마크다운 + frontmatter 저장. LiveSync 가 다른 PC 로 자동 동기화.
- **공개 블로그** — 누구나 읽기 가능 (글 작성/관리는 로컬 환경에서).

---

## 도메인 / 인프라

- **공개 URL**: `https://blog.dounselor.com`
- **로컬**: `http://localhost:3100`
- **터널**: Cloudflare Named Tunnel (`dounselor.com` 의 기존 named tunnel 에 ingress 추가)
- **저장소**:
  - 메타데이터: SQLite (`data/blog.db`, gitignored)
  - 본문 마크다운: `D:\Obsidian\MyNotes\블로그\` 단방향 sync
  - 미디어 (Phase 3): TBD

### Cloudflare Tunnel 추가

`C:\ProgramData\Cloudflare\cloudflared\config.yml` 에 `ingress` 한 줄 추가:

```yaml
ingress:
  - hostname: blog.dounselor.com
    service: http://localhost:3100
  # ... 기존 life / pacer 항목 ...
  - service: http_status:404
```

그리고:

```powershell
cloudflared tunnel route dns dounselor blog.dounselor.com
Restart-Service Cloudflared
```

---

## 실행

```powershell
cd C:\dounselor-blog

# 의존성 설치
npm install

# 빌드 + 시작
.\start.bat

# 또는 개발 모드
npm run dev
```

`.env.local` 필요 키:

| 키 | 의미 |
|---|---|
| `OBSIDIAN_VAULT` | Obsidian 볼트 경로 (예: `D:\Obsidian\MyNotes`) |
| `OLLAMA_URL` | Ollama API endpoint (기본 `http://localhost:11434`) |
| `OLLAMA_MODEL` | 사용 모델 (기본 `llama3.2:3b`, 권장 `qwen2.5:7b` — 한국어 더 자연스러움) |
| `JWT_SECRET` | Phase 2/3 카카오 로그인 세션 서명용 |

### Ollama 한국어 품질 업그레이드 (선택)

```powershell
ollama pull qwen2.5:7b
# .env.local 의 OLLAMA_MODEL=qwen2.5:7b 로 변경
```

---

## 기술 스택

- **Frontend**: Next.js 14 (App Router) · React 18 · Tailwind CSS
- **Backend**: Next.js API Routes · better-sqlite3
- **AI**: 로컬 Ollama (키·비용 0)
- **Obsidian sync**: 마크다운 파일 단방향 작성 + LiveSync (CouchDB) 가 다른 PC 동기화
- **Auth (Phase 2+)**: Kakao Login OAuth
- **Hosting**: PC 로컬 (port 3100) + Cloudflare Named Tunnel

---

## Phase 별 상태

### Phase 1 — 블로그 (현재) ✅

- [x] 카테고리 (CRUD + 시드)
- [x] 글 (목록, 상세, 작성)
- [x] AI 글쓰기 다듬기 (Ollama 3-style)
- [x] Obsidian 단방향 저장
- [ ] 수정 페이지
- [ ] 검색
- [ ] 인덱스 RSS

### Phase 2 — 공유 보드

- [ ] Trello 풍 Kanban (board / list / card)
- [ ] 드래그 앤 드롭
- [ ] 카카오 로그인
- [ ] 협업자 초대
- [ ] 일별 상태 스냅샷 → Obsidian

### Phase 3 — 추억집

- [ ] 사진·영상 업로드
- [ ] 모바일 청첩장 스타일 갤러리
- [ ] 초대 링크 + 카카오 인증
- [ ] 미디어 스토리지 (R2 또는 로컬)
