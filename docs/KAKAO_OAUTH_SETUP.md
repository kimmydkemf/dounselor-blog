# 카카오 OAuth 설정 가이드

블로그/보드에 카카오 로그인을 붙이기 위해 사용자가 직접 해야 하는 작업.

## 1) Kakao Developers 에서 앱 생성

1. https://developers.kakao.com 접속 → 카카오 계정 로그인
2. **내 애플리케이션 → 애플리케이션 추가하기**
   - 앱 이름: `Dounselor Blog` (자유)
   - 사업자명: 본인 이름
3. 생성 후 앱 정보 페이지에서 **REST API 키** 복사

## 2) 플랫폼 / 리다이렉트 URI 등록

앱 정보 페이지 좌측 메뉴에서:

- **앱 설정 → 플랫폼 → Web 플랫폼 등록**
  - 사이트 도메인: `https://blog.dounselor.com`
  - 로컬 테스트도 한다면 한 줄 더 추가: `http://localhost:3100`
- **제품 설정 → 카카오 로그인 → 활성화 (ON)**
- **카카오 로그인 → Redirect URI 등록**
  - `https://blog.dounselor.com/api/auth/kakao/callback`
  - (로컬) `http://localhost:3100/api/auth/kakao/callback`
- **카카오 로그인 → 동의 항목 → 닉네임 / 프로필 사진 → 필수 동의**

## 3) `.env.local` 에 키 추가

```
KAKAO_REST_API_KEY=발급받은_REST_API_키
KAKAO_REDIRECT_URI=https://blog.dounselor.com/api/auth/kakao/callback
# (선택) Client Secret 사용 활성화한 경우만:
# KAKAO_CLIENT_SECRET=발급받은_시크릿
```

`.env.local` 저장 후 서버 재시작 — 다음 빌드/스타트부터 환경변수가 잡힙니다.

## 4) 동작 확인

- 게스트 상태로 `/api/auth/kakao/login` 호출 → 카카오 인가 화면으로 redirect → 동의 → 콜백
- 콜백 처리: `users` 테이블에 카카오 닉네임으로 UPSERT, `kakao_user` 쿠키 발급
- 초대 링크 흐름:
  - 누군가에게 `https://blog.dounselor.com/api/auth/kakao/login?join=ABCDEF` 를 보내면
  - 그 사람이 카카오 로그인 → 자동으로 그 보드에 게스트로 가입 → 보드 페이지로 도착

## 현 상태
- **백엔드 스캐폴딩 완료** — `/api/auth/kakao/login`, `/api/auth/kakao/callback` 동작
- **사용자 추가 작업** — 위 1~3 단계 (Kakao Developers 키 발급 + `.env.local` 추가)
- **프론트엔드 UI** — 로그인 페이지에 "카카오로 시작하기" 버튼 추가는 키 발급 후 진행 권장
  (지금 붙여놓으면 키 없는 상태에서 501 에러)

## 카카오톡 공유 (보드 초대 링크 발송)

보드 멤버 패널의 **"카카오톡으로 보내기"** 버튼은 별도 키가 필요합니다.

### 키 발급
- Kakao Developers → 앱 정보 → **앱 키** 페이지
- **JavaScript 키** 복사 (REST API 키와 다름!)

### `.env.local` 추가
```
NEXT_PUBLIC_KAKAO_JS_KEY=발급받은_JavaScript_키
```
`NEXT_PUBLIC_` prefix 필수 — 클라이언트 코드에서 사용.

### 플랫폼 등록 확인
- 앱 설정 → 플랫폼 → Web 플랫폼 등록 시 입력한 도메인이 카카오톡 공유 동작 도메인과 일치해야 함
- `https://blog.dounselor.com` 등록돼있어야 함

### 카카오톡 공유 활성화
- 제품 설정 → 카카오톡 공유 → **활성화 ON** 확인 (또는 따로 활성 안 해도 JS SDK 만으로 사용 가능 — 카카오 정책 자주 바뀜)

### 키 없으면
JavaScript 키 미설정 시 SDK 자체가 로드 안 됨. 멤버 패널의 "카카오톡으로 보내기" 버튼 클릭하면 alert 로 안내.

## 보안 메모
- `state` 파라미터로 CSRF 방지 (random 16 bytes + 쿠키 비교)
- `kakao_state` 쿠키는 10분 만료, 콜백 직후 삭제
- `kakao_user` 쿠키는 30일 만료, httpOnly
- 카카오 access_token 은 DB 에 저장하지 않음 (1회용)
