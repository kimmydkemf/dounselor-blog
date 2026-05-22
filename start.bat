@echo off
echo   dounselor-blog starting...

cd /d C:\dounselor-blog

:: 의존성 설치 (최초 1회 또는 package.json 변경 시)
if not exist "node_modules\.package-lock.json" (
  echo   Installing dependencies...
  call "C:\Program Files\nodejs\npm.cmd" install
)

:: 빌드 (변경 있으면 다시)
if not exist ".next\BUILD_ID" (
  echo   Building...
  call "C:\Program Files\nodejs\npm.cmd" run build
)

:: 시작 — 포트 3100 (life-manager 3000, pacer 8000 과 충돌 회피)
echo   Starting on port 3100...
call "C:\Program Files\nodejs\npm.cmd" start
