// src/shim/rest-router.ts
// /v1/* REST 라우터. FINAL_05 OpenAPI operation과 1:1.
// 파이프라인: 입력검증 → rejectSensitiveQuery → callTool → normalizer → scrubOc → 표준오류.

import { Router } from "express";
import type { Request, Response } from "express";
import { callTool, mcpText } from "./mcp-adapter.js";
import {
  guardText,
  truncate,
  scrubOc,
  rejectSensitiveQuery,
  stripPromptInjectionLikeText,
} from "./sanitize.js";
import { sendError, HttpError } from "./errors.js";
import { bearerAuth, rateLimit } from "./auth.js";
import {
  normalizeSearchLaw,
  parseLawText,
  normalizeDecisions,
  parseAnnex,
  parseVerify,
  parseImpact,
} from "./normalizers.js";

export const restRouter = Router();

// health는 인증/rate limit 예외, 그 외 전부 적용
restRouter.use((req, res, next) => (req.path === "/health" ? next() : bearerAuth(req, res, next)));
restRouter.use((req, res, next) => (req.path === "/health" ? next() : rateLimit(req, res, next)));

const ok = (res: Response, body: unknown) => res.json(scrubOc(body));
const body = (req: Request) => (req.body && typeof req.body === "object" ? req.body : {});

// 1) searchLaw
restRouter.post("/searchLaw", async (req, res) => {
  try {
    const { query, display = 50 } = body(req);
    if (!query || typeof query !== "string") throw new HttpError(400, "query_required");
    rejectSensitiveQuery(query);
    const r = await callTool("search_law", { query, display });
    ok(res, normalizeSearchLaw(mcpText(r)));
  } catch (e) {
    sendError(res, e);
  }
});

// 2) getLawText
restRouter.post("/getLawText", async (req, res) => {
  try {
    const { mst, lawId, jo, efYd } = body(req);
    if (!mst && !lawId) throw new HttpError(400, "mst_or_lawId_required");
    const r = await callTool("get_law_text", { mst, lawId, jo, efYd });
    ok(res, parseLawText(mcpText(r), typeof jo === "string" ? jo : undefined));
  } catch (e) {
    sendError(res, e);
  }
});

// 3) searchDecision
restRouter.post("/searchDecision", async (req, res) => {
  try {
    const { domain, query, display = 20, page = 1, sort } = body(req);
    if (!domain || typeof domain !== "string") throw new HttpError(400, "domain_required");
    if (typeof query === "string") rejectSensitiveQuery(query);
    const r = await callTool("search_decisions", { domain, query, display, page, sort });
    ok(res, { domain, ...normalizeDecisions(mcpText(r)) });
  } catch (e) {
    sendError(res, e);
  }
});

// 4) getDecisionText
restRouter.post("/getDecisionText", async (req, res) => {
  try {
    const { domain, id, full } = body(req);
    if (!domain || !id) throw new HttpError(400, "domain_and_id_required");
    const r = await callTool("get_decision_text", { domain, id, full });
    const inj = stripPromptInjectionLikeText(mcpText(r));
    const t = truncate(inj.text);
    ok(res, {
      domain,
      id,
      text: t.text,
      truncated: t.truncated,
      warnings: inj.flagged ? ["본문 내 지시문 비실행 처리됨"] : [],
    });
  } catch (e) {
    sendError(res, e);
  }
});

// 5) getAnnex
restRouter.post("/getAnnex", async (req, res) => {
  try {
    const { lawName, knd, bylSeq, annexNo } = body(req);
    if (!lawName || typeof lawName !== "string") throw new HttpError(400, "lawName_required");
    const r = await callTool("get_annexes", { lawName, knd, bylSeq, annexNo });
    ok(res, parseAnnex(mcpText(r), { bylSeq, lawName }));
  } catch (e) {
    sendError(res, e);
  }
});

// 6) verifyCitations
restRouter.post("/verifyCitations", async (req, res) => {
  try {
    const { text, maxCitations = 15 } = body(req);
    const guarded = guardText(text); // 길이/타입 검증
    rejectSensitiveQuery(guarded);
    const r = await callTool("verify_citations", { text: guarded, maxCitations });
    ok(res, parseVerify(mcpText(r), !!r.isError));
  } catch (e) {
    sendError(res, e);
  }
});

// 7) impactMap
restRouter.post("/impactMap", async (req, res) => {
  try {
    const { lawName, jo, includeOrdinances = false } = body(req);
    if (!lawName || !jo) throw new HttpError(400, "lawName_and_jo_required");
    const r = await callTool("impact_map", {
      lawName,
      jo,
      includeMermaid: true,
      includeOrdinances,
    });
    ok(res, parseImpact(mcpText(r), String(lawName), String(jo)));
  } catch (e) {
    sendError(res, e);
  }
});

// 8) searchAdminRule
// CONFIRMED(2026-06): 카탈로그 tool명 = "search_admin_rule" (execute_tool 경유). 최소 인자 query.
//   tool 존재 확인됨(데이터 없을 때 "[NOT_FOUND] ...검색 결과가 없습니다" 반환, "도구를 찾을 수 없습니다" 아님).
//   직접 tools/list에 없을 수 있어 execute_tool 프록시로 호출. (discover_tools는 execute_tool로 프록시 불가)
restRouter.post("/searchAdminRule", async (req, res) => {
  try {
    const { query, knd } = body(req);
    if (!query || typeof query !== "string") throw new HttpError(400, "query_required");
    rejectSensitiveQuery(query);
    const r = await callTool("execute_tool", {
      tool_name: "search_admin_rule",
      params: { query, ...(knd !== undefined ? { knd } : {}) },
    });
    ok(res, normalizeDecisions(mcpText(r)));
  } catch (e) {
    sendError(res, e);
  }
});

// 9) amendmentTrack
// CONFIRMED(2026-06): tool명 = "chain_amendment_track" (execute_tool 경유). 최소 인자 query(=법령명).
//   신구대조표 텍스트 반환 확인됨. 직접 tools/list 미노출 가능 → execute_tool 프록시로 호출.
restRouter.post("/amendmentTrack", async (req, res) => {
  try {
    const { mst, lawId, lawName } = body(req);
    const q = lawName || lawId || mst;
    if (!q) throw new HttpError(400, "identifier_required");
    const r = await callTool("execute_tool", {
      tool_name: "chain_amendment_track",
      params: { query: String(q) },
    });
    const t = truncate(mcpText(r));
    ok(res, { query: q, text: t.text, truncated: t.truncated, warnings: [] });
  } catch (e) {
    sendError(res, e);
  }
});

// 10) health (무인증)
restRouter.get("/health", async (_req, res) => {
  try {
    // [VERIFY] 실제 노출 도구 수는 tools/list 또는 discover_tools로 확정
    ok(res, {
      status: "ok",
      version: process.env.MCP_VERSION || "unknown",
      exposedTools: Number(process.env.MCP_EXPOSED_TOOLS || 17),
      catalogTools: Number(process.env.MCP_CATALOG_TOOLS || 93),
    });
  } catch (e) {
    sendError(res, e);
  }
});
