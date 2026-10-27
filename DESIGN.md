# AI OFFICE — 설계 문서

내 PC에서 돌아가는 AI 세션(Claude Code, Codex, Gemini CLI, ChatGPT 등)을 **작은 아이소메트릭 사무실**로 실시간 시각화한다.

---

## 1. 레퍼런스 조사 (Threads @fashion.ai.log, 2026-10-20 게시글)

### 1-1. 미디어
- 게시글 미디어는 **영상이 아니라 단일 이미지 1장** (Threads 내부 데이터 `media_type: 1`, `carousel_media: null`, 1238×729).
- 같은 페이지에 있던 82초 영상은 "관련 스레드"(@abbalatte, *사장이 AI 알면 바로 인원 감축?*)의 것이라 본 글과 무관.

### 1-2. 이미지에서 읽은 요소
| 요소 | 원본 내용 | 본 구현에서 |
|---|---|---|
| 시점 | 아이소메트릭 3D, 베이지 원목 바닥, 밝은 회색 벽 2면 | Canvas 2D 아이소메트릭, 바닥 판재 패턴, 벽 2면 |
| 캐릭터 | 니트(털실) 인형 — 털모자·베레모·헤드폰·머플러·선글라스 등 소품으로 구분 | 털실 텍스처 인형 + 제공사별 색/소품 (Claude=테라코타 머플러, Codex=초록, Gemini=파랑-보라 …) |
| 이름표 | `A0 통합 본부장` / `오늘 점검함 · Lv.9`, `A12 신사업개발` / `대기 · Lv.17` (굵은 이름 + 회색 상태·레벨) | `C3 세션 이름` / `작업중 · Lv.N` 동일 포맷, 상태 점 추가 |
| 강조 | 본부장만 검은 테두리 이름표 | 하네스 리더(지휘) 테두리 강조 |
| 말풍선 | 흰 둥근 말풍선 `선물하기 입점 조건 보자` | 현재 하는 일 실시간 말풍선 (도구·파일·명령) |
| 자리 | 책상 2개씩 마주보는 클러스터, 모니터, 의자, 컵 | 마주보는 2×2 클러스터, 모니터에 **실제 작업 종류별 화면** |
| 가구 | 옷걸이(패션), 소파+쿠션, 원형 회의 테이블+스툴, 화이트보드(포스트잇), 코르크 게시판, 9월 달력(23일 표시), 벽시계, 커피머신 캐비닛, 몬스테라 화분, 스탠드 조명, 창문, 액자 | 전부 재현 + 게시판=**"대표 결정 필요"** 실데이터, 달력=오늘 날짜, 시계=실시간, 화이트보드=Task 목록 |

### 1-3. 본문·댓글에서 읽은 운영 개념
- 17명 부서형 → 15명이 "할 일 없음", 본부장 AI가 1/3을 혼자 처리, '대표 결정 필요' 8건 중 진짜 2건.
- 재설계: 4명(지휘는 **나누기만**, 검수는 **만든 쪽이 아닌 다른 AI**) + 고문 AI(매일 피드백 1줄, 매주 사무실 점검 1건). 같은 실수 2번 → 규칙 1줄 추가.
- 댓글(공개분): 반복 업무(아침 보고·검수)부터 넘겨라 / "본부장 AI 1/3 = 우리 사무실 클로드랑 똑같음" / "회사 놀이 아니냐"는 비판 → **실제 일의 흐름이 보여야 의미가 있다.**
- 비로그인으로는 댓글 61개 중 일부만 공개되어 나머지는 확인 불가.

→ 설계 반영: ① 놀고 있는 자리(대기)와 일하는 자리가 한눈에 구분, ② 지휘(리더)가 일을 나누는 흐름 = 위임선, ③ **'대표 결정 필요'** 보드 = 사용자 입력/승인 대기 세션만 진짜로 모음, ④ 오늘 처리량·레벨로 "누가 일을 몰아서 하는지" 보이기.

---

## 2. 데이터 소스 조사 (이 PC 실측)

| 제공사 | 위치 | 얻을 수 있는 것 |
|---|---|---|
| Claude Code (데스크톱/CLI) | `~/.claude/sessions/<pid>.json` | **살아있는 세션 레지스트리**: pid, sessionId, cwd, name, `status: busy/idle`, startedAt |
| | `~/.claude/projects/<cwd인코딩>/<sessionId>.jsonl` | 대화 기록: user/assistant(thinking·text·tool_use)/tool_result, ai-title, custom-title, model, effort |
| | `…/<sessionId>/subagents/agent-*.jsonl` + `.meta.json` | 서브에이전트: agentType, description, spawnDepth, background 여부, model |
| | `<project>/.claude/agents/*.md` | **하네스 팀 명부**(frontmatter name/description) |
| Codex (OpenAI) | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, `session_index.jsonl` | session_meta, task_started/complete, function_call(shell/apply_patch), agent_message, 승인요청, thread_name |
| Gemini CLI / Qwen Code | `~/.gemini/tmp/*/chats/session-*.json`, `~/.qwen/…` | messages(user/gemini), toolCalls(status), thoughts |
| ChatGPT·Cursor·Antigravity·Ollama 등 데스크톱 앱 | 프로세스 목록 | 실행 여부만 (내용은 브리지로) |
| 웹 ChatGPT/Gemini/Claude.ai | 브라우저 유저스크립트 → `POST /api/events` | 생성 중/완료 |
| 기타 무엇이든 | `POST /api/events` (공용 이벤트 프로토콜) | 자유 |

---

## 3. 아키텍처

```
 ┌───────────── 수집기 (Node, 의존성 0, 127.0.0.1만) ─────────────┐
 │ adapters/claude.mjs   레지스트리 + jsonl 증분 tail + subagents   │
 │ adapters/codex.mjs    rollout jsonl tail                         │
 │ adapters/gemini.mjs   chats json                                 │
 │ adapters/processes.mjs tasklist → 앱 존재                         │
 │ adapters/ingest.mjs   POST /api/events (훅·유저스크립트·타 도구) │
 │            ↓ 공통 모델(Session/Agent/Event)로 정규화              │
 │ GET /api/state   GET /api/stream (SSE)   정적 파일 서빙           │
 └──────────────────────────────┬───────────────────────────────────┘
                                ↓
 ┌──────── 프론트 (순수 HTML + Canvas, 빌드 없음) ────────┐
 │ data.js  live(SSE) ↔ demo(시뮬레이터) 자동 전환          │
 │ layout.js 세션 수에 따라 사무실 평면 자동 생성            │
 │ office.js 엔티티/경로탐색(A*)/애니메이션/렌더             │
 │ sprites.js 털실 인형·가구·모니터 화면                     │
 │ ui.js 상단 HUD, 결정필요 보드, 상세 패널, 이벤트 티커      │
 └────────────────────────────────────────────────────────┘
```
`index.html`을 그냥 더블클릭(file://)하면 **데모 모드**로 동작하고, `start.cmd`로 수집기를 켜면 **라이브 모드**.
수집기 주소는 **http://127.0.0.1:17777 고정**(설정 불가). 페이지·훅·유저스크립트가 모두 이 주소를 바라본다. 포트가 점유돼 있으면 다른 포트로 우회하지 않고 종료하며 안내한다.

### 3-1. 공통 데이터 모델 (제공사 무관)
```js
Session {
  id, provider: 'claude'|'codex'|'gemini'|'chatgpt'|'cursor'|…,
  source: 'transcript'|'process'|'bridge',
  kind: 'single' | 'harness' | 'app',
  title, project, cwd, model,
  status: 'working'|'thinking'|'tool'|'delegating'|'waiting_permission'|'waiting_input'|'done'|'idle'|'sleeping',
  activity: { type, label, detail, since },   // type: read|edit|terminal|search|web|think|delegate|meeting|plan|ask|skill|publish|tool|talk|idle
  startedAt, lastActive,
  stats: { tools, edits, cmds, reads, searches, web, agents, turns, today },
  level,
  roster: [{ name, description, runs }],      // 하네스 팀 명부
  agents: [Agent],                             // 서브에이전트
  todos:  [{ id, text, status }],
  feed:   [{ t, icon, text }]
}
Agent { id, type, description, status, activity, startedAt, lastActive, depth, background, model }
```

### 3-2. 단일 세션 vs 하네스 — 동작 방식별 표현
| | 판별 | 사무실 표현 |
|---|---|---|
| **단일 세션** | 서브에이전트가 없거나 기본형(general-purpose/Explore/Plan)만 가끔 | 개인 책상 1개(마주보는 4인 클러스터에 배치). 서브에이전트는 **인턴**으로 출입문에서 등장 → 공용 핫데스크에서 작업 → 의뢰한 세션 자리로 가서 "📄 보고" → 퇴장 |
| **하네스** | 프로젝트에 `.claude/agents/*.md` 팀 명부가 있고 그 agentType을 실제로 호출, 또는 Workflow/SendMessage/TeamCreate 사용 | **팀 구역(러그+팻말)**: 리더(지휘, 강조 이름표) 책상 + 명부의 **모든 팀원 책상**. 쉬는 팀원은 `대기 · Lv.N`(N=누적 호출 수), 호출되면 작업 애니메이션, 끝나면 리더에게 걸어가 보고 후 복귀. 리더→팀원 **위임선** 표시, 팀 화이트보드에 Task 목록 |
| **앱 존재(프로세스)** | 실행 중인 데스크톱 앱 | 외부 협력사 자리. "활동 추적 불가 — 브리지 연결 시 상세" 명시 |
| **브리지** | `/api/events` 수신 | 단일 세션처럼 표시 |

### 3-3. 상태 판정 (Claude)
- 레지스트리 `busy` → 작업중. 미완료 도구가 있으면 그 도구로 activity 결정.
- 미완료 `AskUserQuestion`/`ExitPlanMode` → **waiting_input(대표 결정 필요)**.
- 레지스트리 status에 wait/permission/action 포함 또는 훅 Notification → **waiting_permission**.
- `idle` + 마지막이 assistant 텍스트 → **done(확인 필요)** 30분, 이후 idle → 15분~3시간 라운지 휴식, 3시간+ 자리에서 졸기(모니터 꺼짐).
- pid 죽음 → 퇴근(문으로 퇴장).

### 3-4. 도구 → 행동/모니터 화면
| 도구 | activity | 모니터 | 말풍선 예 |
|---|---|---|---|
| Read | read | 문서 | 📖 server.mjs 읽는 중 |
| Edit/Write/MultiEdit/NotebookEdit | edit | 코드 에디터(스크롤) | ✍️ office.js 수정 |
| Bash/PowerShell/Monitor | terminal | 검은 터미널 | ⌨️ npm test |
| Grep/Glob/ToolSearch | search | 검색 결과 | 🔎 "TODO" 찾는 중 |
| WebFetch/WebSearch/브라우저 MCP | web | 브라우저 | 🌐 threads.com |
| Agent/Task/Workflow | delegate | 조직도 | 👥 kanban-qa에게 위임 |
| SendMessage | meeting | 메신저 | 💬 팀원과 대화 |
| TaskCreate/TaskUpdate/TodoWrite | plan | 체크리스트 | 📋 할 일 정리 |
| AskUserQuestion/ExitPlanMode | ask | 물음표 | 🙋 대표님 결정 필요 |
| thinking | think | 반짝이는 점 | 💭 생각 중… |

### 3-5. 레이아웃 자동 생성
블록 단위 shelf-packing: 하네스 팀 구역(4+2·⌈n/2⌉+1 × 6), 단일 4인 클러스터(6×6), 핫데스크, 협력사석, 라운지(소파·원형 테이블·커피 캐비닛·화이트보드). 세션→좌석 매핑은 id 기준으로 고정해 재배치 시 흔들림 최소화. 왼쪽 벽: 창문(시간대별 하늘색), 출입문. 오른쪽 벽: 결정필요 게시판, 달력, 시계, 액자.

### 3-6. 원본보다 살린 디테일
실시간 시계/오늘 달력, 시간대 조명(밤엔 실내등·모니터 글로우), 모니터 작업별 화면, A* 경로 이동, 입·퇴장 애니메이션, 보고 동선, 위임선, 졸기 Zzz, 완료 반짝임, 커피 들고 쉬기, 레벨·오늘 처리량, 이벤트 티커, 상세 패널(타임라인·서브에이전트·Task), 데스크톱 알림(결정 필요 발생 시), 팬/줌/포커스.

---

## 4. 확장 — 새 AI 붙이는 법
1. **로그 파일이 있으면**: `server/adapters/`에 `scan()` → `Session[]`을 돌려주는 어댑터 하나 추가 후 `server/index.mjs`의 `ADAPTERS`에 등록.
2. **로그가 없으면**: `POST http://127.0.0.1:17777/api/events`로 이벤트 전송 (`bridges/` 참고).
3. 겉모습: `public/js/providers.js`에 색·소품·약칭만 추가.
