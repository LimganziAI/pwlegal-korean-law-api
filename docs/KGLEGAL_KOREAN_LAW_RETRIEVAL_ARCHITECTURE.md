# KGLEGAL Korean Law Retrieval Architecture

## 1. 목적

이 저장소는 한국 게임회사 사내 법무팀용 한국법 리서치 레이어를 구성하기 위한 통합 패키지이다.

핵심은 세 가지 레이어를 분리해 조립하는 것이다.

1. **KGLEGAL 법무 판단 레이어**: 계약검토, 게임규제, 개인정보, 회사법, 해외법, AI 거버넌스 등 사내 법무팀 workflow
2. **korea-law-index-light 색인 레이어**: 질문에서 관련 법령군, 별칭, 실무 검색어, 법률 트랙을 좁히는 경량 색인
3. **korean-law-mcp 실행 레이어**: 법제처 Open API를 호출해 현행 법령, 조문, 별표, 판례, 행정규칙, 인용 검증을 수행하는 MCP 서버

## 2. 전체 흐름

```text
사용자 질문
→ KGLEGAL workflow 분류
→ law-index로 관련 법령군·별칭·검색어 후보 압축
→ korean-law-mcp 도구로 공식 원문·판례·행정규칙·별표 조회
→ 인용 검증
→ 회사 적용, 계약 리스크, 문안, 협상전략, 후속 확인사항으로 변환
```

## 3. 각 레이어 역할

### 3.1 KGLEGAL

- 사안을 법무팀 업무유형으로 분류한다.
- 회사 기준, 계약 playbook, 과거 redline, 내부 승인기준을 반영한다.
- 다만 현행 법령·판례·규제기관 공식자료와 충돌하면 공식자료를 우선한다.

### 3.2 law-index

위치:

```text
law-index/korea-law-index-light/
```

역할:

- 법령 원문이 아니라 탐색 색인이다.
- 별칭, 실무어, 자연어 키워드로 검색 대상을 좁힌다.
- 민사/형사/절차/행정/노동/조세/상사/금융/소비자/기술법 트랙을 잡는다.
- 색인만으로 법적 결론을 내리지 않는다.

### 3.3 korean-law-mcp

역할:

- 법제처 Open API를 호출한다.
- MCP 도구를 통해 법령 검색, 조문 조회, 판례·해석례 조회, 별표 조회, 인용 검증을 수행한다.
- Render 등 서버에서는 HTTP MCP 모드로 실행한다.

## 4. 서버 실행

Build:

```bash
npm install && npm run build
```

Start:

```bash
node build/index.js --mode http --port $PORT
```

Health check:

```text
/health
```

MCP endpoint:

```text
/mcp
```

## 5. 환경변수

```text
LAW_OC = 법제처 Open API 인증키
RATE_LIMIT_RPM = 60
NODE_ENV = production
```

API 키는 GitHub에 커밋하지 않는다. Render 환경변수로만 둔다.

## 6. ChatGPT 연결 방향

우선순위는 다음과 같다.

1. ChatGPT에서 MCP/App 연결 UI가 제공되면 `/mcp` endpoint를 연결한다.
2. Custom GPT Actions가 필요한 경우 별도 REST wrapper를 사용한다.
3. 메인 법무 GPT에서 GitHub 앱을 유지해야 하는 경우, Actions와 앱의 동시 사용 제한 여부를 확인하고 구조를 분리한다.

## 7. 법무 답변 품질 기준

- 색인 결과는 검색 방향을 잡는 보조자료이다.
- 법령·시행령·시행규칙·고시·부칙·경과규정은 공식 원문을 확인한다.
- 판례·결정례는 사건번호와 판단요지를 확인한다.
- 제재금액, 시행일, 개정이력, 별표 기준은 기억으로 단정하지 않는다.
- 최종 답변은 조문 나열이 아니라 회사 적용, 리스크, 문안, 협상전략, 후속조치로 변환한다.
