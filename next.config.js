/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

// PWA — next-pwa 로 service worker 자동 생성.
// 개발 모드에선 disable (HMR 충돌 방지). 빌드 시 public/sw.js + workbox-*.js 생성.
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // SSE 같은 long-poll 응답을 캐시하지 않게 — 디폴트 runtime cache 충돌 회피
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: {
    document: "/offline",
  },
});

module.exports = withPWA(nextConfig);
