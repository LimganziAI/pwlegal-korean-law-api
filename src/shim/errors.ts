// src/shim/errors.ts
// 표준 오류 처리. 스택트레이스·OC·내부경로를 외부로 노출하지 않는다.

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export interface SafeError {
  status: number;
  error: string;
}

/**
 * 임의의 throw 값을 사용자에게 안전한 {status, error}로 변환.
 * - HttpError면 그 status/message 사용 (message는 짧은 코드성 문자열만 권장)
 * - 그 외(상류 실패·예기치 못한 예외)는 502 + 일반 메시지
 * - 스택트레이스·키·경로는 절대 포함하지 않는다
 */
export function toSafeError(e: unknown): SafeError {
  if (e instanceof HttpError) {
    return { status: e.status, error: sanitizeMessage(e.message) };
  }
  return { status: 502, error: "upstream_or_internal_error" };
}

/** 메시지에서 혹시 모를 키/경로 흔적 제거 (방어적) */
function sanitizeMessage(msg: string): string {
  const oc = process.env.LAW_OC;
  let m = (msg || "error").slice(0, 200);
  if (oc) m = m.split(oc).join("***");
  // 절대경로/파일경로 흔적 제거
  m = m.replace(/(?:[A-Za-z]:)?[\\/][^\s'"]+/g, "[path]");
  return m;
}

/** Express 응답으로 표준 오류 전송 (서버 로그는 호출측 미들웨어에서 마스킹) */
export function sendError(res: any, e: unknown): void {
  const { status, error } = toSafeError(e);
  res.status(status).json({ error, status });
}
