# README_PATCH_APPLY — shim patch 적용 절차

> 개발자가 그대로 따라 하는 절차. shim은 기존 `korean-law-mcp`에 `/v1/*`를 더하는 패치다. OC·토큰은 코드에 넣지 않는다(env).

---

## 1) 기존 repo clone
```bash
git clone <YOUR_FORK_of_korean-law-mcp>
cd korean-law-mcp
git checkout -b feature/rest-shim
```

## 2) shim_patch 파일 복사
```bash
# 이 패키지의 shim_patch/src 를 레포 src 위에 복사
cp -R shim_patch/src/shim   ./src/shim
# http-server 배선은 수기 반영(아래 4) — patch.md 참고
#   shim_patch/src/server/http-server.patch.md
```
복사 결과:
```
src/shim/errors.ts
src/shim/sanitize.ts
src/shim/auth.ts
src/shim/mcp-adapter.ts
src/shim/normalizers.ts
src/shim/rest-router.ts
```

## 3) env 설정
```bash
cat > .env <<'ENV'
LAW_OC=<법제처 OC>
SHIM_BEARER_TOKEN=<openssl rand -hex 32 결과>
NODE_ENV=production
RATE_LIMIT_RPM=60
LOG_LEVEL=info
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
MAX_RESPONSE_CHARS=12000
PORT=8080
# 선택(health 표기): MCP_VERSION=4.1.1 MCP_EXPOSED_TOOLS=17 MCP_CATALOG_TOOLS=93
ENV
```
> dotenv를 쓰면 로드, 아니면 호스팅 secret으로 주입. **.env는 커밋 금지(.gitignore).**

## 4) http-server 배선
- `shim_patch/src/server/http-server.patch.md`대로 `app.use("/v1", restRouter)` 추가.
- 의존성: `package.patch.md` 참고(express 없으면 설치). Node 18+.

## 5) build
```bash
npm install
npm run build        # tsc (스크립트명 [VERIFY])
```

## 6) local run + health
```bash
node dist/server/http-server.js   # 진입점 [VERIFY]
# 또는: npx tsx src/server/http-server.ts
curl -s localhost:8080/v1/health
# → {"status":"ok",...}
```

## 7) curl searchLaw / getLawText / getAnnex
```bash
export TOK=$SHIM_BEARER_TOKEN
curl -s -X POST localhost:8080/v1/searchLaw -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" -d '{"query":"상법"}'
curl -s -X POST localhost:8080/v1/getLawText -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" -d '{"mst":"284143","jo":"제398조"}'
curl -s -X POST localhost:8080/v1/getAnnex -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d '{"lawName":"게임산업진흥에 관한 법률 시행령","bylSeq":"000302"}'
```
(전체 curl 세트는 `actions/FINAL_05_OPENAPI_SCHEMA_RECOMMENDED.yaml`의 각 operation 및 본 README의 curl 예시와 1:1 일치.)

## 8) ChatGPT Actions import
1. GPT Builder > Actions > Schema에 `actions/FINAL_05_OPENAPI_SCHEMA_RECOMMENDED.yaml` 붙여넣기.
2. `servers.url`을 배포 도메인으로 교체.
3. Authentication = **API Key / Bearer**, 값 = `SHIM_BEARER_TOKEN`. (OC는 입력하지 않음.)
4. `healthCheck` → `searchLaw` 테스트.

## 9) regression test
- `build/GPT_BUILDER_UPLOAD_REHEARSAL.md`의 smoke 5종 → `knowledge/PWLEGAL_09` 회귀.

## 10) rollback
```bash
git checkout main         # 패치 미반영 상태로 복귀
# 배포 롤백: fly releases → 직전 이미지로
```
- shim 장애 시 ChatGPT는 직결 Actions(FINAL_05B)·Web Search로 폴백하므로 서비스 연속성 유지.

---

## 검증 순서 요약 (개발 착수)
1. (2)(4) 복사+배선 → `/v1/health` 200.
2. (6)(7) searchLaw/getLawText/getAnnex 200 + 정규화 형태 확인.
3. verifyCitations(가짜 §9999) → notFound/needsReview 분리 확인.
4. impactMap(제103조) → possibleOvermatch 분리 확인.
5. searchAdminRule/amendmentTrack tool명 확정됨: `search_admin_rule` / `chain_amendment_track` (둘 다 execute_tool 경유, 최소 인자 query). 아래 §개정이력 [VERIFY]에 검증 curl/JSON-RPC 예시.
6. Actions import → smoke 5종.

## [VERIFY]
- build 스크립트명·dist 진입점·ESM/CJS·import 확장자 → 레포 확인.
- in-process dispatch 미연결 시 loopback 사용(/mcp 유지 필수).

## 부록 — searchAdminRule / amendmentTrack 도구명 검증 (CONFIRMED 2026-06)
라이브 확인 결과 두 operation은 **execute_tool 프록시**로 호출한다. 직접 tools/list 미노출일 수 있으나 execute_tool 경유로 동작 확인됨. `discover_tools`는 execute_tool로 프록시 **불가**("메타 도구는 execute_tool로 실행할 수 없습니다").

도구 존재/부재 판별 규칙:
- `[NOT_FOUND] ...검색 결과가 없습니다` → **도구는 존재**, 데이터만 없음.
- `도구를 찾을 수 없습니다: X` → 도구 **미존재**(이름 오류).

### searchAdminRule → search_admin_rule (최소 인자 query)
MCP JSON-RPC(loopback /mcp):
```json
{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"execute_tool",
   "arguments":{"tool_name":"search_admin_rule","params":{"query":"게임","display":5}}}}
```
shim curl:
```bash
curl -s -X POST localhost:8080/v1/searchAdminRule -H "Authorization: Bearer $SHIM_BEARER_TOKEN" \
  -H "Content-Type: application/json" -d '{"query":"게임","knd":3}'
```
실패 시 fallback: 직결(FINAL_05B 별도 행정규칙 호출 시 target=`admrul`) → Web Search "행정규칙 law.go.kr" → [VERIFY].

### amendmentTrack → chain_amendment_track (최소 인자 query=법령명, 신구대조표 반환)
MCP JSON-RPC(loopback /mcp):
```json
{"jsonrpc":"2.0","id":2,"method":"tools/call",
 "params":{"name":"execute_tool",
   "arguments":{"tool_name":"chain_amendment_track","params":{"query":"게임산업진흥에 관한 법률"}}}}
```
shim curl:
```bash
curl -s -X POST localhost:8080/v1/amendmentTrack -H "Authorization: Bearer $SHIM_BEARER_TOKEN" \
  -H "Content-Type: application/json" -d '{"lawName":"게임산업진흥에 관한 법률"}'
```
실패 시 fallback: `chain_law_system`(scenario 자동) 또는 search_law→get_law_text(연혁) → Web Search → [VERIFY].
> 잔여 [VERIFY]: 이 두 tool이 **직접 tools/list에도 노출되는지**(노출이면 execute_tool 래핑 없이 직접 호출 가능). 확인 전까지 execute_tool 경유 유지.
