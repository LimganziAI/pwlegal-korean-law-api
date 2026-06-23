# GitHub 업로드 후 다음 작업

## 1. Repository 목적

이 repo는 `PLAYWITH Legal OS`의 한국법 Actions API 서버입니다.

기존 다음 repo는 건드리지 않습니다.

- `kglegal-claude-legal-adapter`: Claude 방법론 adapter
- `kglegal-korean-law-actions`: legacy 실험 repo
- `yuny-suno-os`, `visual-direction-os`: 무관

## 2. GitHub에 넣을 때

`pwlegal-korean-law-api` repo는 API 서버 전용이므로, 기존 README가 잘못 들어가 있으면 이 패키지로 덮어씁니다.

## 3. Render 배포

1. Render → New Web Service
2. GitHub repo `playwithlawkr/pwlegal-korean-law-api` 연결
3. Build Command: `npm install && npm run build`
4. Start Command: `npm run start`
5. Health Check Path: `/v1/health`
6. Environment Variables 입력:
   - `LAW_OC`
   - `SHIM_BEARER_TOKEN`
   - `NODE_ENV=production`
   - `RATE_LIMIT_RPM=60`
   - `ALLOWED_ORIGINS=*`
   - `MAX_RESPONSE_CHARS=30000`

## 4. GPT Builder Actions

서버가 배포되고 `/v1/health`가 작동하면:

1. `openapi/pwlegal-korean-law-actions.yaml` 열기
2. `servers.url`을 실제 Render/Fly URL로 교체
3. GPT Builder → Actions → Add action
4. Authentication: Bearer token
5. Token: `SHIM_BEARER_TOKEN`
6. YAML 붙여넣기
7. Preview에서 `상법 제398조` smoke test

## 5. 주의

- `LAW_OC`는 ChatGPT에 넣지 않습니다.
- `SHIM_BEARER_TOKEN`만 ChatGPT Actions에 넣습니다.
- GitHub에는 `.env`를 올리지 않습니다.
