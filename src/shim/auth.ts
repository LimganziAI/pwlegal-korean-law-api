// src/shim/auth.ts
// Bearer 인증 · IP/토큰별 rate limit · CORS allowlist. health는 인증/CORS 예외.

import type { Request, Response, NextFunction } from "express";

const BEARER = () => process.env.SHIM_BEARER_TOKEN || "";
const RPM = Number(process.env.RATE_LIMIT_RPM || 60);
const ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Bearer 토큰 검증. SHIM_BEARER_TOKEN과 일치해야 통과. 타이밍 안전 비교. */
export function bearerAuth(req: Request, res: Response, next: NextFunction) {
  const expected = BEARER();
  const got = String(req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  if (!expected || !safeEqual(got, expected)) {
    return res.status(401).json({ error: "unauthorized", status: 401 });
  }
  next();
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** CORS allowlist. ALLOWED_ORIGINS에 포함된 Origin만 허용. */
export function corsAllow(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
}

// ── 경량 토큰/ IP 버킷 rate limiter (외부 의존성 없이 동작) ─────────────
// express-rate-limit을 쓰고 싶으면 package.patch.md 참고. 아래는 무의존 폴백.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function keyOf(req: Request): string {
  const token = String(req.headers["authorization"] || "").slice(-12); // 토큰 꼬리 일부
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  return `${ip}|${token}`;
}

/** 분당 RPM 제한. health는 라우터에서 예외 처리. */
export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const k = keyOf(req);
  const b = buckets.get(k);
  if (!b || now >= b.resetAt) {
    buckets.set(k, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (b.count >= RPM) {
    const retry = Math.ceil((b.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retry));
    return res.status(429).json({ error: "rate_limited", status: 429 });
  }
  b.count++;
  next();
}

// 메모리 누수 방지: 주기적 정리
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}, 120_000).unref?.();
