# Dounselor Blog

**[blog.dounselor.com](https://blog.dounselor.com)** — 개인 기록 + 협업이 한 곳에 있는 통합 사이트. PWA 로 폰에서도 앱처럼 사용 가능.

| 섹션 | 경로 | 인증 | 상태 |
|---|---|---|---|
| 📝 **블로그** + 개발일지 | `/blog` | 공개 | ✅ |
| 📋 **공유 보드** (Trello 풍) | `/board` | 소유자 + 카카오 게스트 초대 | ✅ |
| 📷 **추억집** (사진·영상) | `/memories` | 카카오 로그인 + 초대제 | 🚧 |

---

## 핵심 기능

### ✨ AI 글쓰기 도움
- 거친 초안 → 로컬 Ollama LLM (qwen2.5:7b) 이 **2단계 정련**: 맞춤법 → 3가지 톤 (정돈/친근/구조화) 동시 제안
- **제목·요약·태그 자동 추출** (JSON 메타)
- **한국어 강제** — system 프롬프트 + 한자 leak 가드 + 재시도
- **리뷰 카테고리** — 본문에서 작품 제목 추출 → Wikipedia 자동 검색 → 포스터·줄거리 본문 상단 prepend
- **개발일지 자동 작성** — git log (커밋 + 미커밋 staged/unstaged/untracked) 수집 → Ollama 가 일지로 정리
- 진행률 실시간 표시 (SSE 스트리밍)

### 📚 블로그
- **카테고리 계층** — 컴퓨터 공부 (개발일지/클로드 사용법/개발 도구), 단상, 리뷰 (영화/드라마/애니), 건강 (카니보어/운동)
- **Apple-style 풀-블리드 hero** + 카테고리별 SVG 비주얼 (메쉬/도트/그리드/오로라 패턴)
- **글 수정 페이지** + 초안 owner-only 노출 + 발행 상태 라디오 토글
- **방문자 카운터** (IP 해시 + 일별 UNIQUE)
- **Obsidian 단방향 저장** — 발행 시 `<OBSIDIAN_VAULT>/블로그/<카테고리>/YYYY-MM-DD 제목.md`

### 📋 공유 보드 (Trello-style)
- **칸반** — 리스트/카드 CRUD, native HTML5 드래그앤드롭 (명시적 list drag handle 로 카드 잘못 옮김 방지)
- **라벨 10색** / **체크리스트 (진행률 바)** / **마감일 칩** (지남/오늘/임박 색 자동)
- **카드 모달** 좌-우 레이아웃 — 본문 (라벨·마감·설명·체크리스트·첨부·댓글) + 사이드바
- **파일 첨부** (최대 10MB, 이미지/PDF/MP4)
- **댓글 + 활동 로그**
- **게스트 초대** — 6자 코드 + 카카오 로그인 → 게스트 토큰 (90일) → 해당 보드만 접근 (다른 보드 자동 차단)
- **실시간 동기화** (SSE) — 다른 사용자 변경 자동 반영
- **8가지 배경 그라데이션 프리셋**

### 🔐 인증
- **소유자** — 단순 비밀번호 (JWT 쿠키, 30일)
- **게스트** (보드용) — 카카오 로그인으로만 가입. `/board/join/<코드>` 링크로 초대

### 📱 PWA
- 홈 화면 설치 가능 — Android Chrome / iOS Safari / 데스크탑 Chrome
- 오프라인 폴백 페이지
- next-pwa + Workbox 자동 service worker

---

## 도메인 / 인프라

- **공개 URL**: `https://blog.dounselor.com`
- **로컬**: `http://localhost:3100`
- **터널**: Cloudflare Named Tunnel
- **저장소**:
  - 메타: SQLite (`data/blog.db`, gitignored)
  - 본문: Obsidian vault 로 단방향 저장
  - 보드 첨부: `data/board-uploads/`

---

## 실행

```powershell
cd C:\dounselor-blog
npm install
npm run build
npm start             # port 3100
```

### `.env.local` 키

| 키 | 의미 |
|---|---|
| `OBSIDIAN_VAULT` | Obsidian 볼트 경로 |
| `OLLAMA_URL` | Ollama API endpoint (기본 `http://localhost:11434`) |
| `OLLAMA_MODEL` | 모델 (권장 `qwen2.5:7b` — 한국어 자연스러움) |
| `JWT_SECRET` | 세션 서명 |
| `OWNER_PASSWORD` | 소유자 로그인 비밀번호 |
| `KAKAO_REST_API_KEY` | 카카오 OAuth (게스트 초대용) |
| `KAKAO_REDIRECT_URI` | `https://blog.dounselor.com/api/auth/kakao/callback` |

---

## 기술 스택

- **Frontend**: Next.js 14 (App Router) · React 18 · Tailwind CSS · next-pwa
- **Backend**: Next.js API Routes · better-sqlite3 · jose (JWT) · sharp (이미지)
- **AI**: 로컬 Ollama (qwen2.5:7b 권장, 키·비용 0)
- **Auth**: 자체 JWT (소유자) + Kakao OAuth (게스트)
- **Realtime**: SSE (Server-Sent Events) + in-memory pub/sub
- **Hosting**: PC 로컬 + Cloudflare Named Tunnel

---

## 디자인 시스템

- **Linear / Vercel / Stripe** 식 상업급 폴리시
- **컬러** — Indigo (브랜드) + Pink/Amber/Emerald 액센트
- **타이포** — 시스템 폰트 (Pretendard / SF Pro / Noto Sans KR)
- **컴포넌트** — `btn-primary`, `btn-ghost`, `glass`, `shadow-elevated`, `chip-grad`
- **모션** — fade-in / slide-up / hover lift / soft pulse (live indicator)
- **다층 메쉬 그라데이션** + 컬러 블롭 깊이감

---

## 기능 로드맵

- [x] 블로그 + AI 글쓰기 + Obsidian sync
- [x] 카테고리 계층화
- [x] 글 수정 + 초안 관리
- [x] 자동 개발일지 (git log 기반)
- [x] 방문자 카운터
- [x] 보드 (칸반 + 라벨/체크리스트/첨부/댓글)
- [x] 보드 게스트 초대 (카카오)
- [x] SSE 실시간 동기화
- [x] PWA 설치
- [x] 카카오 OAuth 통합
- [ ] 추억집 (사진·영상 앨범)
- [ ] 검색 / RSS
- [ ] 다크 모드
- [ ] 블로그 상세 페이지 사이드바 (목차 + 관련 글)
