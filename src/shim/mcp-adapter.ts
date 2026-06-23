// src/shim/mcp-adapter.ts
// MCP tool 호출 어댑터. 1차 in-process dispatch, 2차 loopback /mcp JSON-RPC.
// LAW_OC는 env로만 사용하며 응답/로그로 내보내지 않는다.

const LAW_OC = process.env.LAW_OC;
const PORT = process.env.PORT || "8080";

// [VERIFY] 실제 레포의 in-process tool dispatch를 여기에 연결.
// 예) import { callToolByName } from "../tool-registry.js";
// korean-law-mcp 버전에 따라 export 형태가 다를 수 있으므로, 연결 전엔 null 유지 → loopback 사용.
type InProcessDispatch = (name: string, args: Record<string, unknown>) => Promise<McpToolResult>;
let inProcess: InProcessDispatch | null = null;

/** 레포 연결 시 http-server.patch에서 1회 주입 (선택). 미주입이면 loopback만 사용. */
export function registerInProcessDispatch(fn: InProcessDispatch): void {
  inProcess = fn;
}

export interface McpToolResult {
  content: Array<{ type: string; text?: string; [k: string]: unknown }>;
  isError?: boolean;
  /** structured 응답을 주는 빌드의 경우 여기에 담길 수 있음 */
  structured?: unknown;
}

/**
 * MCP tool을 이름으로 호출.
 * - OC 주입: tool이 apiKey 인자를 받는 빌드에서만 의미. 받지 않고 서버 env로 OC를 쓰면 무해(무시됨). [VERIFY SHIM-06]
 * - 1차 in-process(빠름) → 실패/미연결 시 2차 loopback(확실).
 */
export async function callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
  const withOc = LAW_OC ? { apiKey: LAW_OC, ...args } : args;

  if (inProcess) {
    try {
      return await inProcess(name, withOc);
    } catch {
      // fall through to loopback
    }
  }
  return callViaLoopback(name, withOc);
}

/** (2차) 같은 프로세스의 MCP JSON-RPC(/mcp)로 loopback 호출 — 실제 동작 가능 */
async function callViaLoopback(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name, arguments: args },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000); // ChatGPT Actions 타임아웃 여유
  let res: any;
  try {
    res = await fetch(`http://127.0.0.1:${PORT}/mcp`, {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
    },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new Error("mcp_loopback_unreachable");
  } finally {
    clearTimeout(timer);
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    // 일부 MCP HTTP 전송은 SSE 프레이밍을 쓸 수 있음 → 텍스트 폴백 파싱 [VERIFY SHIM-06]
    const raw = await safeText(res);
    return { content: [{ type: "text", text: raw }], isError: !res.ok };
  }

  if (json?.error) throw new Error("mcp_error");
  const result = json?.result ?? {};
  return {
    content: Array.isArray(result.content) ? result.content : [],
    isError: !!result.isError,
    structured: result.structuredContent ?? result.structured ?? undefined,
  };
}

async function safeText(res: any): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/** MCP content[]에서 text 블록을 합쳐 반환 */
export function mcpText(result: McpToolResult): string {
  const blocks = result?.content ?? [];
  return blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}
