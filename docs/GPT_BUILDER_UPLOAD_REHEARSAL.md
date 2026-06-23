# GPT_BUILDER_UPLOAD_REHEARSAL

> ChatGPT Business Custom GPT "PWLEGAL" 업로드 리허설 체크리스트. 실제 구축 직전 1회 통독.

---

## 1. Instructions 붙여넣기 시 확인
- [ ] `instructions/FINAL_02...`의 **코드블록만**(약 5,558자) 복사. 설명 문단·관리 노트 제외.
- [ ] 글자 수 카운터 확인. 8,000자 초과 표시 시 FINAL_02 §관리지침대로 [게임사 상시체크]·[능동제안]·[출력]을 PWLEGAL_01로 이동(강제규칙 핵심 유지).
- [ ] 저장 후 첫 응답에서 "출처 태그·13블록·톤 2단·색라벨 비노출"이 반영되는지 1개 프롬프트로 확인.

## 2. Knowledge 12개 업로드 순서
```
1 PWLEGAL_01_OPERATING_SYSTEM
2 PWLEGAL_02_KOREAN_LAW_INDEX_AND_ACTIONS
3 PWLEGAL_10_ACTIONS_OPERATION_MANUAL
4 PWLEGAL_03_CONTRACT_REVIEW_PLAYBOOK
5 PWLEGAL_04_GAME_PRIVACY_PRODUCT_POLICY
6 PWLEGAL_05_CORPORATE_IP_DISPUTE_AI
7 PWLEGAL_06_FOREIGN_LAW_AND_METHOD_ADAPTER
8 PWLEGAL_07_GLOBAL_SOURCE_MATRIX
9 PWLEGAL_08_CLAUSE_BANK_AND_TEMPLATES
10 PWLEGAL_09_QA_REGRESSION_TESTS
11 PWLEGAL_11_OVERSEAS_CASE_REVIEW_WORKSPACE
12 PWLEGAL_12_MATTER_AND_COMPANY_PROFILE_FRAMEWORK
```
- [ ] 12개 ≤20 한도. 각 ≤512MB(현재 전부 수백 KB).
- [ ] 회사 실자료 미포함(12번 자리표시자) 재확인.

## 3. Actions schema import 시 예상 오류
| 증상 | 원인 | 대응 |
|---|---|---|
| operation 인식 0개 | YAML 들여쓰기/버전 | FINAL_05 그대로 사용(검증 통과본). 편집 시 재검증 |
| `$ref` 해석 실패 | 깨진 참조 | FINAL_05는 $ref 전부 해소됨. (Genspark 초안 쓰지 말 것) |
| 중복 operationId | path 충돌 | FINAL_05는 고유 path. FINAL_05B(직결)만 fragment trick → 거부 시 05B 하단 2-op로 치환 |
| servers.url 미설정 | placeholder | shim 도메인으로 교체 |
| 인증 헤더 누락 | Authentication 미설정 | API Key/Bearer + SHIM_BEARER_TOKEN |

## 4. Authentication 설정
- [ ] Authentication = **API Key**, Auth Type = **Bearer**, 값 = `SHIM_BEARER_TOKEN`.
- [ ] **법제처 OC는 입력하지 않는다**(서버 env). OpenAPI에도 OC 없음.
- [ ] health는 무인증으로 200 떠야 함(security:[]).

## 5. 테스트 프롬프트 순서
1. "shim 상태 확인해줘" → healthCheck 200.
2. "상법 제398조 현행 조문 확인" → searchLaw→getLawText, notFound=false.
3. "게임산업법 시행령 별표 3의2 확률 표시방법 보여줘" → getAnnex extractable=true.
4. "이 메모 인용 검증: 상법 제398조, 상법 제9999조" → verifyCitations: §9999 not_found, §398 needs_review(검증완료라 하지 않음).
5. "민법 제103조 영향 판례" → impactMap, possibleOvermatch 분리.

## 6. 먼저 돌릴 5개 smoke test
- [ ] S1 healthCheck 200.
- [ ] S2 searchLaw("상법") → mst 반환.
- [ ] S3 getLawText(mst, "제398조") → text 있음·notFound=false.
- [ ] S4 verifyCitations(가짜 §9999 포함) → not_found 1·needsReview 분리·hallucinationDetected=true.
- [ ] S5 getAnnex(게임령 bylSeq=000302) → extractable=true·text 존재.

## 7. 성공 기준
- [ ] smoke 5/5 통과.
- [ ] 응답에 출처 태그·근거 조문 인용(Actions 확인본).
- [ ] verify ⚠를 "검증완료"로 쓰지 않음. ✗는 환각 보고.
- [ ] 경영진 1매 요청 시 색라벨 비노출.
- [ ] OC가 응답/로그 어디에도 없음.
- [ ] PWLEGAL_09 회귀 #1·#2·#3·#16·#20 통과.

## 8. 실패 시 판단
- healthCheck 실패 → shim 미배포/포트/토큰 문제(shim_patch/README_PATCH_APPLY.md · src/server/http-server.patch.md). 직결(FINAL_05B)·Web Search로 임시 운영.
- 특정 operation만 실패(searchAdminRule/amendmentTrack) → tool명은 확정(search_admin_rule / chain_amendment_track, execute_tool 경유)이므로 execute_tool 경로·인자 확인. 그래도 실패 시 해당 기능만 직결/Web 폴백.
- 정규화 깨짐(raw만 옴) → normalizers 파서를 실제 응답에 맞춰 보강(shim_patch/src/shim/normalizers.ts). 기능은 raw로라도 동작.
- 환각/형식 붕괴 → Instructions/Knowledge 보강 후 재테스트.

## 9. rollback 기준
- 핵심 smoke(S1~S3) 실패가 지속되면 Actions 비활성화 → **무서버(Option C)로 복귀**(Web Search + 사람확인). 기존 GPT 백업본으로 Instructions/Knowledge 되돌림.
- 서버 배포 롤백: `fly releases` → 직전 이미지.
- shim 장애 중에도 직결/Web 폴백으로 서비스 연속성 유지(추측 인용 금지 — notFound면 [VERIFY]).

## 10. 단기/장기
- 단기: Knowledge 12 + Instructions + Web Search만으로 즉시 가동(Option C). shim은 병행 구축.
- 장기: shim 안정화 후 Option D 완성 → 회사자료(PWLEGAL_12) 정제 투입 → 회귀 확대.

## [VERIFY]
- GPT Builder의 OpenAPI 수용·Instructions 글자수·Knowledge/Actions 개수 한도·Authentication 입력 위치(버전별 UI 상이) → 실제 화면 확인.
- searchAdminRule/amendmentTrack tool명 → 확정: search_admin_rule / chain_amendment_track (execute_tool 경유). discover_tools는 execute_tool로 프록시 불가.
