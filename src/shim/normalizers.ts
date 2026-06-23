// src/shim/normalizers.ts
// MCP 응답(JSON 또는 사람이 읽는 텍스트)을 정규화. stub 아님 — best-effort 파서.
// 공통 계약: 실패해도 raw만 반환하지 않고 { raw, results, total, warnings, truncated } 형태 유지.

import { truncate } from "./sanitize.js";

export interface BaseResult {
  raw: string;
  results: any[];
  total: number;
  warnings: string[];
  truncated: boolean;
  sourceUrl?: string;
}

/** 텍스트가 JSON이면 파싱, 아니면 null */
function tryJson(text: string): any | null {
  const t = (text || "").trim();
  if (!t) return null;
  if (!(t.startsWith("{") || t.startsWith("["))) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function base(text: string): BaseResult {
  const { text: t, truncated } = truncate(text);
  return { raw: t, results: [], total: 0, warnings: [], truncated };
}

const reUrl = /https?:\/\/[^\s'")]+/;
function firstUrl(text: string): string | undefined {
  const m = text.match(reUrl);
  return m ? m[0] : undefined;
}

// ── searchLaw ────────────────────────────────────────────────────────────
// 기대 행: "법령명 / 법령ID 12345 / MST 67890 / 시행 20260101" 류 또는 JSON.
export function normalizeSearchLaw(text: string): BaseResult {
  const out = base(text);
  const j = tryJson(text);
  if (j) {
    const arr =
      j?.LawSearch?.law ?? j?.results ?? j?.laws ?? (Array.isArray(j) ? j : []);
    out.results = (Array.isArray(arr) ? arr : []).map((x: any) => ({
      name: x["법령명한글"] ?? x.name ?? x.lawName ?? "",
      lawId: x["법령ID"] ?? x.lawId ?? "",
      mst: x["법령일련번호"] ?? x.mst ?? x.MST ?? "",
      promulgationDate: x["공포일자"] ?? x.promulgationDate ?? "",
      effectiveDate: x["시행일자"] ?? x.effectiveDate ?? "",
      ministry: x["소관부처명"] ?? x.ministry ?? "",
    }));
    out.total = Number(j?.LawSearch?.totalCnt ?? out.results.length) || out.results.length;
    out.sourceUrl = firstUrl(text);
    return out;
  }
  // 텍스트 best-effort: 줄 단위로 법령ID/MST/시행일 추출
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const lawId = line.match(/법령\s*ID[:\s]*([0-9]{4,})/i)?.[1];
    const mst = line.match(/(?:MST|법령일련번호|마스터)[:\s]*([0-9]{4,})/i)?.[1];
    const ef = line.match(/시행[:\s]*([0-9]{8})/)?.[1];
    const name = line.match(/^[\s\-\d.]*([가-힣A-Za-z0-9·ㆍ()「」\s]+?법(?:률)?)\b/)?.[1]?.trim();
    if (lawId || mst || name) {
      out.results.push({ name: name || "", lawId: lawId || "", mst: mst || "", effectiveDate: ef || "" });
    }
  }
  out.total = out.results.length;
  if (out.results.length === 0) out.warnings.push("parse_fallback_no_rows");
  out.sourceUrl = firstUrl(text);
  return out;
}

// ── getLawText ─────────────────────────────────────────────────────────────
export interface LawTextResult extends BaseResult {
  lawName: string;
  effectiveDate: string;
  article: string;
  text: string;
  notFound: boolean;
}
const reNotFound = /NOT_FOUND|해당 조문(이)? 없|조회\s*결과가? 없|존재하지 않/i;

export function parseLawText(raw: string, requestedJo?: string): LawTextResult {
  const b = base(raw);
  const notFound = reNotFound.test(raw);
  const j = tryJson(raw);
  let lawName = "", effectiveDate = "", article = requestedJo || "", body = raw;
  if (j) {
    const law = j["법령"] ?? j.law ?? j;
    lawName = law?.["기본정보"]?.["법령명_한글"] ?? law?.lawName ?? j.lawName ?? "";
    effectiveDate = law?.["기본정보"]?.["시행일자"] ?? j.effectiveDate ?? "";
    const jo = law?.["조문"]?.["조문단위"];
    if (Array.isArray(jo) && jo.length) {
      article = `제${jo[0]["조문번호"] ?? ""}조`;
      body = jo.map((u: any) => u["조문내용"] ?? "").join("\n");
    } else if (typeof j.text === "string") {
      body = j.text;
    }
  } else {
    lawName = raw.match(/법령명[:\s]*([^\n]+)/)?.[1]?.trim() || "";
    effectiveDate = raw.match(/시행[:\s]*([0-9]{8})/)?.[1] || "";
    article = requestedJo || raw.match(/제\s*\d+\s*조(?:의\s*\d+)?/)?.[0] || article;
  }
  const t = truncate(body);
  return {
    ...b,
    lawName,
    effectiveDate,
    article,
    text: t.text,
    truncated: t.truncated,
    notFound,
    total: notFound ? 0 : 1,
    sourceUrl: firstUrl(raw),
  };
}

// ── searchDecision / searchAdminRule (목록류 공통) ───────────────────────────
export function normalizeDecisions(text: string): BaseResult {
  const out = base(text);
  const j = tryJson(text);
  if (j) {
    const arr =
      j?.results ?? j?.PrecSearch?.prec ?? j?.list ?? (Array.isArray(j) ? j : []);
    out.results = (Array.isArray(arr) ? arr : []).map((x: any) => ({
      id: x.id ?? x["판례일련번호"] ?? x["일련번호"] ?? x.serial ?? "",
      caseName: x.caseName ?? x["사건명"] ?? x.title ?? "",
      caseNumber: x.caseNumber ?? x["사건번호"] ?? "",
      court: x.court ?? x["법원명"] ?? x.agency ?? "",
      date: x.date ?? x["선고일자"] ?? x["결정일자"] ?? "",
    }));
    out.total = Number(j?.totalCnt ?? out.results.length) || out.results.length;
    return out;
  }
  // 텍스트: 사건번호/일자/일련번호 라인 추출
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const caseNumber = line.match(/\d{2,4}[가-힣]{1,3}\d{1,6}/)?.[0]; // 예 2018다255648
    const id = line.match(/(?:일련번호|ID)[:\s]*([0-9]{3,})/i)?.[1];
    const date = line.match(/(\d{4}[.\-]\d{1,2}[.\-]\d{1,2})/)?.[1];
    if (caseNumber || id) out.results.push({ id: id || "", caseNumber: caseNumber || "", date: date || "" });
  }
  out.total = out.results.length;
  if (!out.results.length) out.warnings.push("parse_fallback_no_rows");
  return out;
}

// ── getAnnex ────────────────────────────────────────────────────────────────
export interface AnnexResult extends BaseResult {
  lawName: string;
  text: string;
  extractable: boolean;
  downloadUrl?: string;
  annexes: Array<{ bylSeq?: string; title?: string; kind?: string }>;
}
export function parseAnnex(raw: string, opts: { bylSeq?: string; lawName?: string }): AnnexResult {
  const b = base(raw);
  const j = tryJson(raw);
  let text = raw;
  let annexes: AnnexResult["annexes"] = [];
  if (j) {
    const arr = j?.annexes ?? j?.list ?? (Array.isArray(j) ? j : []);
    annexes = (Array.isArray(arr) ? arr : []).map((x: any) => ({
      bylSeq: x.bylSeq ?? x["별표일련번호"] ?? "",
      title: x.title ?? x["별표명"] ?? "",
      kind: x.kind ?? x["별표구분"] ?? "",
    }));
    text = typeof j.text === "string" ? j.text : raw;
  } else {
    // 텍스트 내 "[별표 N]" 헤더 수집
    const heads = raw.match(/\[?별표\s*\d+(?:의\d+)?\]?[^\n]*/g) || [];
    annexes = heads.map((h) => ({ title: h.trim() }));
  }
  const t = truncate(text);
  const downloadUrl = firstUrl(raw);
  // bylSeq 지정 + 본문 텍스트가 충분히 있으면 추출 성공으로 간주
  const extractable = !!opts.bylSeq && t.text.replace(/\s/g, "").length > 50;
  if (!extractable && opts.bylSeq) b.warnings.push("annex_text_not_extracted_maybe_image_pdf");
  return {
    ...b,
    lawName: opts.lawName || "",
    text: extractable ? t.text : "",
    truncated: t.truncated,
    extractable,
    downloadUrl: extractable ? undefined : downloadUrl,
    annexes,
    total: annexes.length,
  };
}

// ── verifyCitations ──────────────────────────────────────────────────────────
export interface VerifyItem {
  citation: string;
  status: "verified" | "not_found" | "needs_review";
  note?: string;
  requiresGetLawText?: boolean;
}
export interface VerifyResult extends BaseResult {
  verified: number;
  notFound: number;
  needsReview: number;
  items: VerifyItem[];
  hallucinationDetected: boolean;
}
export function parseVerify(raw: string, isError: boolean): VerifyResult {
  const b = base(raw);
  const j = tryJson(raw);
  const items: VerifyItem[] = [];
  if (j && Array.isArray(j.items ?? j.results)) {
    for (const x of j.items ?? j.results) {
      const s = String(x.status ?? "").toLowerCase();
      const status: VerifyItem["status"] =
        s.includes("verif") || s === "ok" || s === "✓" ? "verified"
        : s.includes("not") || s === "✗" || s === "x" ? "not_found"
        : "needs_review";
      items.push({
        citation: x.citation ?? x.cite ?? x["인용"] ?? "",
        status,
        note: x.note ?? x["비고"] ?? "",
        requiresGetLawText: status === "needs_review",
      });
    }
  } else {
    // 텍스트 best-effort: "민법 제750조 ✓ / 상법 제9999조 ✗(존재범위...) / 상법 제398조 ⚠"
    const lines = raw.split(/\r?\n/);
    const citeRe = /([가-힣]+(?:법|법률|규칙|령))\s*(제\s*\d+\s*조(?:의\s*\d+)?(?:\s*제\s*\d+\s*항)?(?:\s*제\s*\d+\s*호)?)/;
    for (const line of lines) {
      const m = line.match(citeRe);
      if (!m) continue;
      const citation = `${m[1]} ${m[2]}`.replace(/\s+/g, " ").trim();
      let status: VerifyItem["status"] = "needs_review";
      if (/✓|verified|존재함|확인됨/.test(line)) status = "verified";
      if (/✗|not.?found|존재(하지|범위)|없음|환각/i.test(line)) status = "not_found";
      if (/⚠|확인\s*필요|needs.?review/i.test(line)) status = "needs_review";
      const note = line.match(/존재범위[^\n,)]*/)?.[0];
      items.push({ citation, status, note, requiresGetLawText: status === "needs_review" });
    }
  }
  const verified = items.filter((i) => i.status === "verified").length;
  const notFound = items.filter((i) => i.status === "not_found").length;
  const needsReview = items.filter((i) => i.status === "needs_review").length;
  return {
    ...b,
    items,
    verified,
    notFound,
    needsReview,
    total: items.length,
    // isError(=HALLUCINATION_DETECTED 봉투) 또는 notFound>0면 환각 신호
    hallucinationDetected: !!isError || notFound > 0,
    warnings: needsReview > 0 ? ["needsReview는 통과가 아님 — getLawText로 확정 필요"] : [],
  };
}

// ── impactMap ────────────────────────────────────────────────────────────────
export interface ImpactResult extends BaseResult {
  lawName: string;
  article: string;
  mermaid: string;
  exactMatches: any[]; // 정확 조문 매칭 후보
  possibleOvermatch: any[]; // 과매칭 의심(제103조↔제1032조)
}
export function parseImpact(raw: string, lawName: string, jo: string): ImpactResult {
  const b = base(raw);
  const j = tryJson(raw);
  let mermaid = "";
  const rows: any[] = [];
  if (j) {
    mermaid = j.mermaid ?? "";
    const cited = j.citedBy ?? j.citations ?? {};
    for (const k of Object.keys(cited)) for (const it of cited[k] ?? []) rows.push({ domain: k, ...it });
  } else {
    mermaid = raw.match(/graph\s+(?:TD|LR)[\s\S]*?(?:\n\n|$)/)?.[0] ?? "";
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    for (const line of lines) {
      const caseNumber = line.match(/\d{2,4}[가-힣]{1,3}\d{1,6}/)?.[0];
      if (caseNumber) rows.push({ ref: caseNumber, line: line.trim().slice(0, 120) });
    }
  }
  // 정확 조문 필터: "제103조" 가 "제1032조"의 부분매칭이 되지 않도록 경계 검사
  const num = jo.match(/\d+(?:의\d+)?/)?.[0] ?? "";
  const exactRe = new RegExp(`제\\s*${num.replace("의", "조의")}\\b(?!\\d)`);
  const exactReSimple = new RegExp(`제\\s*${num}\\s*조(?!\\d)`);
  const exactMatches: any[] = [];
  const possibleOvermatch: any[] = [];
  for (const r of rows) {
    const hay = JSON.stringify(r);
    if (exactReSimple.test(hay) || exactRe.test(hay) || (!/\d{3,}/.test(hay))) exactMatches.push(r);
    else possibleOvermatch.push(r);
  }
  return {
    ...b,
    lawName,
    article: jo,
    mermaid,
    exactMatches,
    possibleOvermatch,
    results: rows,
    total: rows.length,
    warnings: possibleOvermatch.length
      ? [`과매칭 의심 ${possibleOvermatch.length}건 분리됨 — 사건번호/조문으로 사람 확인`]
      : [],
  };
}
