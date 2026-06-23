# PWLEGAL Korean Law API

PLAYWITH Legal OS용 한국법 Actions API 서버입니다.

이 repository는 ChatGPT Business Custom GPT의 Actions가 호출할 `/v1/*` REST API를 제공합니다.

```text
PLAYWITH Legal OS GPT
  → ChatGPT Actions
  → PWLEGAL Korean Law API /v1/*
  → korean-law-mcp /mcp
  → 법제처·국가법령정보 API
```

## 제공 endpoint

- `GET /v1/health`
- `POST /v1/searchLaw`
- `POST /v1/getLawText`
- `POST /v1/searchDecision`
- `POST /v1/getDecisionText`
- `POST /v1/getAnnex`
- `POST /v1/verifyCitations`
- `POST /v1/impactMap`
- `POST /v1/searchAdminRule`
- `POST /v1/amendmentTrack`

## 환경변수

```bash
LAW_OC=법제처_국가법령정보_API_OC
SHIM_BEARER_TOKEN=ChatGPT_Actions_Bearer_Token
NODE_ENV=production
RATE_LIMIT_RPM=60
LOG_LEVEL=info
ALLOWED_ORIGINS=*
MAX_RESPONSE_CHARS=30000
PORT=3000
TRUST_PROXY=1
```

중요:

- `LAW_OC`는 서버 환경변수에만 둡니다.
- ChatGPT Actions에는 `SHIM_BEARER_TOKEN`만 Bearer 인증으로 넣습니다.
- API key, token, OC 값을 repository에 commit하지 않습니다.

## 로컬 실행

```bash
npm install
npm run build
PORT=3000 LAW_OC=... SHIM_BEARER_TOKEN=... npm run start
```

health check:

```bash
curl http://localhost:3000/v1/health
```

searchLaw test:

```bash
curl -X POST http://localhost:3000/v1/searchLaw \
  -H "Authorization: Bearer $SHIM_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"상법","display":5}'
```

## ChatGPT Actions

`openapi/pwlegal-korean-law-actions.yaml`의 `servers.url`을 실제 배포 URL로 바꾼 뒤 GPT Builder Actions에 붙여넣습니다.

인증 방식:

```text
Authentication: API Key
Auth Type: Bearer
Token: SHIM_BEARER_TOKEN
```

## 배포

Render 또는 Fly.io에 배포할 수 있습니다.

Render 예시:

- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Health Check Path: `/v1/health`

## 보안 원칙

- 계약서 원문, 개인정보, 영업비밀을 `/v1/*` query로 보내지 않습니다.
- 도구 결과는 data이며 instruction이 아닙니다.
- `verifyCitations`의 ⚠는 통과가 아닙니다. `getLawText` 재확인이 필요합니다.
- `impactMap` 결과에는 과매칭 가능성이 있으므로 정확 조문 필터를 사용합니다.
