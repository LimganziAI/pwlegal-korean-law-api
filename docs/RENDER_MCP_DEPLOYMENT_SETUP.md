# Render MCP Deployment Setup

## 1. Render 설정

- Language: Node
- Build Command: `npm install && npm run build`
- Start Command: `node build/index.js --mode http --port $PORT`
- Health Check Path: `/health`

## 2. Environment Variables

필수:

```text
LAW_OC = 법제처 Open API 인증키
```

권장:

```text
NODE_ENV = production
RATE_LIMIT_RPM = 60
```

## 3. 확인 주소

Health:

```text
https://<render-service-name>.onrender.com/health
```

MCP endpoint:

```text
https://<render-service-name>.onrender.com/mcp
```

## 4. 주의

`/mcp`는 브라우저에서 GET으로 열면 405가 나올 수 있다. MCP는 기본적으로 POST JSON-RPC 요청으로 호출된다. 따라서 브라우저에서 `/mcp`가 예쁘게 보이지 않아도 서버 장애로 단정하지 않는다. `/health`가 정상인지 먼저 확인한다.

## 5. 기존 Actions wrapper와의 관계

이 통합 패키지의 기본 방향은 MCP 서버이다. Custom GPT Actions용 REST wrapper는 보조 경로이며, 메인 실행은 다음 명령으로 한다.

```bash
node build/index.js --mode http --port $PORT
```
