"use client";
import { useEffect } from "react";

/** 페이지 로드 시 방문 기록을 1회 POST. 통계는 서버 SSR 에서 표시. */
export default function VisitorPing() {
  useEffect(() => {
    // 이미 이번 세션에 ping 했으면 skip
    if (sessionStorage.getItem("v_ping")) return;
    sessionStorage.setItem("v_ping", "1");
    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname }),
    }).catch(() => {});
  }, []);
  return null;
}
