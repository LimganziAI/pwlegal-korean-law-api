# FINAL_11_VERIFY_AND_OPEN_ISSUES

> 모든 [VERIFY]·open issue. **각 항목에 [확인방법]/[확인할 출처]/[임시 회사 조치]/[외부자문 질문]/[API 테스트] 중 하나 이상 부착.**
> 라이브로 이미 해소된 항목은 ✅로 표시.

---

## A. 한국 법령 현행성

A1. **게임산업법 §33의2 현행 시행일·문구** — 메모 "2025.8.1" vs 라이브 통합본 "시행 20251023".
- [확인방법] getLawText(게임산업진흥에 관한 법률, §33의2) + amendmentTrack로 연혁. [임시조치] 답변 시 "현행 통합본 기준, 시행일 재확인" 라벨. [API 테스트] searchLaw→mst→getLawText.

A2. **§33의2 '집단분쟁조정 신설' 근거조문 위치** — 라이브 §33의2⑤는 신고·피해구제센터(집단분쟁조정 아님).
- [확인방법] searchLaw "콘텐츠산업진흥법" → 분쟁조정 조문 getLawText; 게임산업법 내 별도 조문 검색. [확인할 출처] 콘텐츠산업진흥법 §28 등 [OFFICIAL-LAW]. [외부자문 질문] "확률형 관련 집단분쟁조정의 근거 법령·관할 기구는?"

A3. **개인정보 유출 통지·신고 기한** — ✅ **라이브 해소(2026-06-09)**: 통지 72h(시행령 §39①)·신고 72h(시행령 §40①: 1천명↑/민감·고유식별/외부불법접근), 전문기관 KISA(§40③), 법 §34 "지체없이".
- [임시조치] 인용 전 시행령 현행 시행일(20260519) 재확인 습관화.

A4. **데드라인 수치 전반**(청약철회·노동위 구제·사업/반기/분기보고서·내용수정신고 등).
- [확인방법] 사안별 getLawText로 해당 조문 직접 확인. [임시조치] 수치는 "조문 확인 후 확정" 표기 후 산출. [API 테스트] 회귀 #11·#16.

A5. **AI 기본법(2026.1.22 시행) 적용범위·고영향 분류**.
- [확인방법] searchLaw(AI 관련 법) → getLawText; 하위 고시 searchAdminRule. [외부자문 질문] "당사 매칭/추천/생성형 기능이 고영향 AI에 해당하는가?"

## B. 법제처 API parameter

B1. **별표 target 코드(licbyl 등) 정확값**.
- [확인방법] 법제처 OPEN API 가이드(open.law.go.kr/LSO/openApi/guideResult.do, htmlName=licbylInfoGuide) 확인. [임시조치] 별표 본문은 shim getAnnex(bylSeq) 사용(라이브 검증됨). [API 테스트] shim getAnnex(게임령, bylSeq=000302) 재현.

B2. **JO 조문번호 6자리 규칙(조의N 분기)** — 예 제398조=039800, 제33조의2=?
- [확인방법] guideResult htmlName=lsJoInfoGuide. [API 테스트] getLawTextDirect로 제33조의2 호출해 응답 확인. [임시조치] shim은 "제N조의M" 문자열을 서버가 변환(직결만 6자리 이슈).

B3. **개정이력 target(lawHst vs lsHstInq)·법령체계도·위임관계 코드**.
- [확인방법] guideResult htmlName=lsHstInqGuide 등. [임시조치] amendmentTrack은 shim이 처리; 직결은 [VERIFY].

B4. **위원회 결정문(cmt) 통합 범위 / 공정위·개인정보위 결정문**.
- [확인할 출처] 법제처 cmtInfoGuide + 공공데이터포털 odcloud(공정위 15103246·개보위 15103265 [VERIFY]). [임시조치] 결정문은 Web Search 병행. [외부자문 질문] 불필요(공개자료).

B5. **OC 파라미터 대소문자(OC vs oc)**.
- [API 테스트] 양쪽으로 1회씩 직결 호출. [임시조치] 대문자 OC 기본.

## C. ChatGPT GPT Builder UI

C1. **OpenAPI fragment trick(path#suffix) 수용 여부**.
- [확인방법] FINAL_05B를 Actions에 import 시도. 거부 시 05B 하단 2-op(target enum) 대안으로 치환. [임시조치] 주축은 FINAL_05(shim, fragment 미사용)라 영향 적음.

C2. **Instructions 글자 수 한도 표시·동작**.
- [확인방법] FINAL_02 붙여넣고 카운터 확인(현재 5,558자). [임시조치] 초과 시 일부 블록 Knowledge 이동.

C3. **Knowledge 파일 수·크기 한도, Actions 개수 한도**.
- [확인방법] Builder 화면 확인(≤20파일·≤512MB). [임시조치] 12파일 유지.

C4. **Authentication 방식(API Key/Bearer) 입력 위치**.
- [확인방법] Actions > Authentication. [API 테스트] healthCheck로 토큰 인증 확인.

## D. 서버/shim 필요 여부

D1. **shim 호스팅 결정(fly.io/Render/Cloudflare)·비용**.
- [확인방법] 기존 korean-law-mcp 호스팅 재활용 가능성 점검(`http-server.ts`+`fly.toml` 보유). [임시조치] 미구축 시 Option C 운영.

D2. **너의 patched 빌드 실제 노출 도구 수**(upstream=17/카탈로그93).
- [API 테스트] discover_tools 호출 / shim `/health`의 exposedTools. [확인방법] 소스 tool-registry.ts 확인.

D3. **Referer/IP whitelist 필요 endpoint**(직결 시).
- [API 테스트] Referer 없이/있이 직결 호출 비교. [임시조치] 필요하면 shim 경유(서버가 Referer 설정).

## E. 외국법 현지자문 필요

E1. **중국 판호·미성년자·데이터 국외이전** — [외부자문 질문] 현지 퍼블리셔·판호 경로·CAC 이전 평가. [확인할 출처] NPPA·CAC [REGULATOR]. **현지 자문 필수.**
E2. **베트남 게임 허가(G1~G4)·데이터 현지화(Decree 53)·PDPL 2025** — [외부자문 질문] 허가등급·현지법인·데이터 현지화 범위. [확인할 출처] vbpl.vn [OFFICIAL-LAW].
E3. **인도네시아 PSE 등록·PDP Law 시행·감독기구** — [외부자문 질문] PSE 등록 의무·연령등급. [확인할 출처] peraturan.bpk.go.id, Komdigi [VERIFY 부처명].
E4. **EU AI Act 단계 시행일·게임 관련 분류** — [확인방법] EUR-Lex(2024/1689) + EDPB/EC Web Search. [외부자문 질문] 당사 기능의 AI Act 리스크 등급.
E5. **각 관할 개인정보 감독기구·확률형 규제 현행성** — [확인방법] FINAL_06 매트릭스 링크 Web Search. [임시조치] 출력에 "현지 변호사 최종확인" 게이트.

## F. 운영 전 반드시 확인
- [ ] A1·A2·A4 해소(법령 현행성) — 핵심.
- [ ] B1·B2 해소(직결 쓸 경우) / shim 쓰면 우선순위 낮음.
- [ ] C1·C2·C4(Builder) / D1(shim) 결정.
- [ ] 회귀 22개 통과(FINAL_09).
- [ ] OC 미노출·회사자료 미포함·색라벨 비노출 확인.

## G. 나중에 개선
- 회사 Practice Profile 축적(표준계약·redline·승인기준) → 하우스 포지션 정밀화.
- 해외 관할별 현지 자문 네트워크 연결·질문지 표준화.
- chain 재구성 절차의 회귀 테스트 추가.
- 공정위/개보위 결정문 odcloud 연동 검토.
- verify_citations 후처리(조 단위 확정) 로직을 shim에 강화.
