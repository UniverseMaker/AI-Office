# AI OFFICE API

서버: `http://127.0.0.1:17777` (포트 고정). 응답은 JSON(UTF-8).

## 인증 방식

| 방식 | 쓰는 곳 |
|---|---|
| 로그인 토큰 `Authorization: Bearer <64자 hex>` | 화면(브라우저). `POST /api/auth/login` 으로 받는다 |
| 쿠키 `aio_session` (HttpOnly · SameSite=Strict) | 같은 서버에서 연 화면만 |
| API 키 `Authorization: Bearer aio_…` / `X-API-Key: aio_…` | 외부 프로그램. scope `full` · `read` · `transfer` |

- 관리 API 는 **관리자만**. 등급 계정(방문자 ~ 교수)은 정보공개 정책이 허용한 것만 읽는다.
- 로그인은 IP 별로 5번 틀리면 30초부터 점점 길게 잠긴다.

## 공개 (로그인 없이)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/auth/me` | `{ configured, authed, admin, user, tier, tierName }` |
| POST | `/api/auth/login` | `{ user, password }` → `{ ok, token }` |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/state` | 사무실 상태 — 보는 사람에 맞게 걸러짐(비로그인은 제목 · 내용 없음) |
| GET | `/api/stream` | 같은 상태를 SSE 로 계속 |
| POST | `/api/events` | 세션 신호 입구 — **이 PC(127.0.0.1)에서 온 JSON 만** |
| POST | `/api/hook/claude` | Claude Code 훅 입구 — 위와 같음 (`bridges/claude-hook.mjs`) |

### /api/events (브리지 · 다른 AI 도구용)

```json
{ "provider": "gemini", "sessionId": "abc", "app": "Gemini CLI", "title": "리서치", "status": "working",
  "activity": { "type": "web", "label": "웹 탐색 중" }, "ttl": 600 }
```

`status`: `working` · `tool` · `thinking` · `waiting_input` · `waiting_permission` · `done` · `idle`. `end: true` 면 세션 종료. 배열로 여러 개(최대 50).

## 세션 API v1 (API 키)

문서: `GET /api/v1` (인증 불필요)

| 메서드 | 경로 | scope | 설명 |
|---|---|---|---|
| GET | `/api/v1/sessions` | read | 살아 있는 세션 목록 |
| GET | `/api/v1/sessions/{id}` | read | 세션 하나 |
| PATCH | `/api/v1/sessions/{id}` | full | `{ memo, task, tags, pinned, rank, role }` 만 (정보공개 · 배치 같은 관리 키는 불가) |
| GET | `/api/v1/sessions/{id}/conversation` | read | 대화 (보관본) |
| GET | `/api/v1/archive` | read | 보관함 목록 |
| GET | `/api/v1/archive/{id}` | read | 보관본 대화 |
| GET | `/api/v1/archive/{id}/export?fmt=json\|openai\|md\|jsonl` | read | 내려받기 |
| POST | `/api/v1/archive/import` | full | 가져오기 (`ai-office-session/v1` 또는 `{ messages: [{ role, content }] }`) |
| GET | `/api/v1/events?since={ms}` | read | 최근 소식 (폴링) |

## 세션 전송 API

[TRANSFER_API.md](TRANSFER_API.md) — 세션 스위처 백업 형식 zip.

## 관리자 API (화면이 쓰는 것)

| 경로 | 설명 |
|---|---|
| `POST /api/meta` | 세션 메모 · 고정 · 배치 · 직급 · 정보공개 등 |
| `POST /api/place` | `{ id, place: 'jail' \| 'dungeon' \| 'vault' \| null }` — 감옥 · 비밀던전 · 금고 보내기/꺼내기 (오래 쉰 세션은 자동으로 감옥까지만, 던전은 이걸로만) |
| `GET/POST /api/settings` | 보관 · 직급 체계 · 재화 · 월급제 · 캐릭터 자동 이름 등 |
| `GET/POST /api/prefs` | 계정 옵션(테마 · 글꼴 · 글자색 …) |
| `/api/keys` | API 키 발급 · 폐기 |
| `/api/archive/*` | 보관함 목록 · 대화 · 편집 저장 · `POST …/apply`(실제 세션에 반영) · `POST …/restore`(반영 되돌리기) |
| `/api/users*` | 등급 계정 발급 · 수정 · 정지 · 삭제 |
| `POST /api/disclose` | 기본 / 세션별 정보공개 정책 |
| `/api/econ*` | 사내 재화 · 상점 · 지급 |
| `/api/webhooks*` | [WEBHOOKS.md](WEBHOOKS.md) |
| `POST /api/persona` | 캐릭터 이름 · 국적 `{ id, persona: { name, nat } }` · `{ id, random: 'name' \| 'nat' \| 'all' }` · `{ id, clear: true }` |
| `GET /api/persona/nations` | 국적 목록 |
| `/api/timer` | 업무타이머 기록 (로그인한 계정마다) |
| `GET /api/vault` | 계정 금고 상태(값 없음) |
| `/api/tcc/*` | FlowBoard 칸반: `config` · `proxy/*` · `link` · `sync` |
| `/api/mgm/*` | 행정관리: `config` · `proxy/*` · `audit` · `draft`(AI 세션 기록으로 주간 업무보고 초안) |

칸반 · 행정 프록시의 허용 경로 · 필드 · 속도 제한은 [SECURITY.md](SECURITY.md) 참고.

## 월급제 계산

```
기본급  = 기본 월급 × (1 + 레벨당% × (레벨 − 1))
근속    = floor(세션 나이(일) ÷ "근속 1년 = 실제 N일")
월급    = 기본급 × (1 + 인상%)^근속 × 근무 계수(재직 1 · 휴직 0.5 · 정직 0)
주급    = 월급 × 12 ÷ 52 · 일급 = 월급 ÷ 30 · 시급 = 일급 ÷ 8
```

매일 하루 한 번 일급이 지갑에 들어간다(놓친 날은 7일치까지). 일하는 동안 버는 코인은 **성과급**으로 따로 쌓인다.
