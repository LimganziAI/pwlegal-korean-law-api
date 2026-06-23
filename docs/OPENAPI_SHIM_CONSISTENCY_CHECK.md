# OPENAPI_SHIM_CONSISTENCY_CHECK

> FINAL_05 OpenAPI ↔ shim 코드(rest-router.ts/normalizers.ts) 자체 검수. operationId·path·method·필수입력·정규화·일치여부.

---

## 1. 일치표

| operationId | OpenAPI path | shim route | method | OpenAPI 필수입력 | shim 검증 | 호출 MCP tool | normalizer | 일치 |
|---|---|---|---|---|---|---|---|---|
| searchLaw | /v1/searchLaw | /v1/searchLaw | POST | query | query 필수 + rejectSensitive | search_law | normalizeSearchLaw | ✅ |
| getLawText | /v1/getLawText | /v1/getLawText | POST | (mst\|lawId) 권장 | mst\|lawId 필수 | get_law_text | parseLawText | ✅ |
| searchDecision | /v1/searchDecision | /v1/searchDecision | POST | domain | domain 필수 + (query시)reject | search_decisions | normalizeDecisions | ✅ |
| getDecisionText | /v1/getDecisionText | /v1/getDecisionText | POST | domain, id | domain+id 필수 | get_decision_text | truncate+injection | ✅ |
| getAnnex | /v1/getAnnex | /v1/getAnnex | POST | lawName | lawName 필수 | get_annexes | parseAnnex | ✅ |
| verifyCitations | /v1/verifyCitations | /v1/verifyCitations | POST | text | guardText+reject | verify_citations | parseVerify | ✅ |
| impactMap | /v1/impactMap | /v1/impactMap | POST | lawName, jo | lawName+jo 필수 | impact_map | parseImpact | ✅ |
| searchAdminRule | /v1/searchAdminRule | /v1/searchAdminRule | POST | query | query 필수 + reject | execute_tool{search_admin_rule} ✅확정 | normalizeDecisions | ✅ |
| amendmentTrack | /v1/amendmentTrack | /v1/amendmentTrack | POST | (mst\|lawId\|lawName) | identifier 필수 | execute_tool{chain_amendment_track} ✅확정 | truncate | ✅ |
| healthCheck | /v1/health | /v1/health | GET | — (security:[]) | 인증/rate 예외 | (env/tools-list) | inline | ✅ |

## 2. 응답 schema 정합
- OpenAPI `LawSearchResult.results[]`(name,lawId,mst,effectiveDate…) ↔ `normalizeSearchLaw` 출력 키 **일치**(추가로 raw/warnings/total 포함 — additive, 호환).
- OpenAPI `LawTextResult`(lawName,article,text,notFound) ↔ `parseLawText` **일치**.
- OpenAPI `VerifyCitationsResult`(verified,notFound,needsReview,items[],hallucinationDetected) ↔ `parseVerify` **일치** + `items[].requiresGetLawText` 추가(additive).
- OpenAPI `ImpactMapResult`(citedBy,mermaid,overmatchWarning) ↔ `parseImpact`는 `exactMatches`/`possibleOvermatch`로 **분리 강화**(OpenAPI는 overmatchWarning 문자열) → OpenAPI description 보강 권장(아래 4).
- OpenAPI `AnnexResult`(annexes,text,downloadUrl,extractable) ↔ `parseAnnex` **일치**.
- 공통 additive 필드(raw,warnings,truncated)는 OpenAPI가 `additionalProperties`를 막지 않으므로 호환. ChatGPT는 정의된 필드 우선 사용.

## 3. 인증/오류 정합
- OpenAPI `security: shimBearer(http bearer)` ↔ shim `bearerAuth`(Authorization: Bearer) **일치**. health는 OpenAPI `security:[]` ↔ shim 예외 **일치**.
- OpenAPI `responses.default → ErrorResponse{error,status}` ↔ shim `sendError`(error,status) **일치**. 429/401/400 코드도 shim에서 동일 형태.

## 4. 보정 권장 ([VERIFY] 반영)
- **searchAdminRule / amendmentTrack**: **tool명 확정(2026-06 라이브)** — `search_admin_rule`·`chain_amendment_track`, 둘 다 **execute_tool 프록시**로 호출(최소 인자 query). shim `rest-router.ts`가 이미 execute_tool 경유로 매핑(amendmentTrack도 직접 호출→execute_tool 경유로 교정). `discover_tools`는 execute_tool 프록시 불가. 잔여: 이 둘이 직접 tools/list에도 노출되는지(노출이면 래핑 불요). 실패 시 직결(FINAL_05B target=admrul)·Web Search 폴백.
- **impactMap**: OpenAPI `ImpactMapResult`에 `exactMatches`/`possibleOvermatch` 배열을 명시 추가하면 코드와 100% 일치(현재는 description+additive로 호환). 선택 보정.
- **getLawText 필수**: OpenAPI는 mst/lawId를 required로 강제하지 않음(둘 중 하나) — shim은 런타임 400으로 강제. 의도된 차이(스키마는 유연, 런타임은 엄격).

## 5. 결론
- 핵심 8개 operation은 경로·메서드·필수입력·정규화 **일치**. 나머지 2개(searchAdminRule·amendmentTrack)도 tool명 **확정**(search_admin_rule / chain_amendment_track, execute_tool 경유) — 잔여는 직접 노출 여부뿐(폴백 경로 확보됨). health 정합. → 사실상 10개 전부 정합.
- ChatGPT Actions import 시 FINAL_05(주축)는 fragment trick 미사용·$ref 전부 해소로 **깨끗이 인식**되어야 정상.

## [VERIFY]
- searchAdminRule/amendmentTrack 카탈로그 tool명·인자 → **확정**: search_admin_rule / chain_amendment_track (execute_tool 경유, 인자 query). 잔여: 직접 tools/list 노출 여부.
- impactMap OpenAPI schema에 분리 배열 명시 여부(선택).
- 정규화 파서가 실제 MCP 응답(JSON vs 텍스트)과 맞는지 → 첫 배포 후 응답 샘플로 검증.
