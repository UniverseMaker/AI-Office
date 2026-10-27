# 🧶 AI OFFICE

**내 PC에서 돌아가는 AI 세션들을, 털실 인형 직원들이 일하는 아이소메트릭 빌딩으로 실시간 보여 주는 대시보드.**
Claude Code · Codex · Gemini CLI · Qwen Code 는 기록을 직접 읽고, ChatGPT · Claude.ai · Gemini 웹과 다른 앱은 브리지로 붙는다.
의존성 없는 Node 서버 하나 + 빌드 없는 화면. 한국어 / English.

![전체 모습](docs/screenshots/01_overview.png)

> 이 저장소의 스크린샷은 모두 **데모 데이터**로 찍었습니다. 실제 세션 제목 · 대화는 들어 있지 않습니다.

---

## 목차

- [빠른 시작](#빠른-시작)
- [빌딩 둘러보기](#빌딩-둘러보기)
- [맵 고르기 (실내 × 실외)](#맵-고르기-실내--실외)
- [관리 센터](#관리-센터)
- [칸반 연동](#칸반-연동-flowboard)
- [행정관리 연동](#행정관리-연동)
- [업무타이머](#업무타이머)
- [캐릭터 · 직급 · 월급](#캐릭터--직급--월급)
- [계정 · 정보공개 · 보안](#계정--정보공개--보안)
- [다른 AI 붙이기 · API](#다른-ai-붙이기--api)
- [모바일 · 태블릿](#모바일--태블릿)
- [구조](#구조)

---

## 빠른 시작

```bash
git clone https://github.com/UniverseMaker/AI-Office.git
cd AI-Office
node server/set-admin.mjs        # 관리자 아이디 · 비밀번호(12자 이상) — 해시만 data/auth.json 에 저장
node server/index.mjs            # http://127.0.0.1:17777
```

- Node 18 이상, 설치할 패키지 없음.
- 포트는 **17777 고정**(동적 포트 범위 밖). 서버는 `127.0.0.1` 에만 열린다. 바깥에서 보려면 Cloudflare Tunnel 같은 터널을 붙이면 된다(보안은 [SECURITY.md](docs/SECURITY.md)).
- Windows 로그인 때 창 없이 자동 시작: `powershell -ExecutionPolicy Bypass -File autostart.ps1` (해제는 `-Remove`).
- 서버 없이 둘러보기: `http://127.0.0.1:17777/?demo` 또는 `public/index.html` 을 그냥 열기(데모 모드).

---

## 빌딩 둘러보기

세션 하나 = 직원 한 명. 하네스(팀) 세션은 팀장 + 팀원(서브에이전트)이 한 팀으로 앉는다.
지금 하는 일(코드 편집 · 터미널 · 검색 · 웹 · 생각 · 위임)이 모니터와 말풍선에 그대로 뜨고, **대표 결정 필요**(질문 · 승인 대기)는 빨간 느낌표와 게시판으로 모인다.

| | |
|---|---|
| ![업무층](docs/screenshots/02_workfloor.png) **업무층** — 팀 묶음 책상 · 팀원 쪽을 보는 팀장 책상 · 남는 폭은 공용 데스크 · 서재 · 집중 부스 · 커피 바 | ![팀장실](docs/screenshots/03_leadroom.png) **돌려쓰는 팀장실** — 가장 최근에 일한 팀장이 차지, 15분 일이 없으면 다음 팀장에게 |
| ![회의층](docs/screenshots/04_meeting.png) **회의층** — 팀이 많으면 회의 전용 층이 생긴다 | ![로비](docs/screenshots/05_lobby.png) **1F 로비** — 자동문 · 보안 게이트 · 안내데스크 · 카페 · 손님석 |
| ![루프탑](docs/screenshots/06_rooftop.png) **루프탑** — 엘리베이터실(유리 자동문) · 카페 · 맥주 바 · 가든 · 흡연구역 | ![임원층](docs/screenshots/11_exec.png) **임원층** — 대표실 · 임원실 · 중역회의실 |
| ![개인연구실](docs/screenshots/10_lab.png) **개인연구실** — 실적 좋은 세션이 쉬는 연구실 겸 숙소 | ![서버실](docs/screenshots/12_server.png) **서버실 · 관제실** |
| ![지하숙소](docs/screenshots/07_dorm_b3.png) **B3 지하숙소** — 6~24시간 쉰 세션: 벽에 머리 둔 침대 포드 + 라운지 | ![감옥](docs/screenshots/08_jail.png) **B4 감옥** — 하루 넘게 방치된 세션은 자동으로 여기까지 |
| ![비밀던전](docs/screenshots/09_dungeon.png) **B6 비밀던전** — 관리자가 직접 보낸 세션만 | |

**자리 규칙** (서버가 정해서 보낸다 — 로그아웃 상태에서도 정확)

| 상태 | 가는 곳 |
|---|---|
| 일하는 중 · 막 쉰 세션 | 자기 책상 (팀은 팀 구역, 인턴은 핫데스크 · 교육장) |
| 일시정지 | 휴게 공간 · 카페 · 루프탑 · 개인연구실 |
| 쉰 지 6시간 안 / 24시간 안 | B2 지하휴게실 / B3 지하숙소 |
| 하루 넘게 방치 | B4 감옥 (자동은 여기까지) |
| 관리자가 보냄 | 🚔 유치장 · 🐉 비밀던전 · 🏦 금고 |

조작: 드래그 이동 · 휠 확대 · 캐릭터 클릭 상세 · 더블클릭 따라가기 · 왼쪽 🛗 층 이동(`PageUp/Down`).

---

## 맵 고르기 (실내 × 실외)

실내 맵 20+ 와 실외 맵 20+ 를 자유롭게 조합한다(기본: **꼬마빌딩 + 열대 섬**).

![맵 고르기](docs/screenshots/13_map_picker.png)

| | | |
|---|---|---|
| ![마당](docs/screenshots/20_yard.png) 꼬마빌딩 + 마당 | ![캠퍼스](docs/screenshots/21_campus.png) 연구소 + 캠퍼스 | ![한옥](docs/screenshots/22_hanok.png) 한옥 + 정원 |
| ![스카이타워](docs/screenshots/23_skytower.png) 스카이타워 + 광장 | ![호텔](docs/screenshots/24_hotel.png) 호텔 + 항구 | ![온실](docs/screenshots/25_glasshouse.png) 온실 + 꽃밭 |
| ![도서관](docs/screenshots/26_library.png) 도서관 + 설원 | ![게임 스튜디오](docs/screenshots/27_gamestudio.png) 게임 스튜디오 + 테마파크 | |

---

## 관리 센터

관리자로 로그인하면 상단 독에서 연다.

| | |
|---|---|
| ![세션 관리](docs/screenshots/15_session_manager.png) **👥 세션 관리** — 검색 · 필터 · 정렬, 고정 · 메모 · 결정 알림 해제 · 자리 배치 · 던전 보내기 | ![빌딩 관리](docs/screenshots/16_building_manager.png) **🏢 빌딩 관리** — 층 이름 · 테이블 그룹 업무 · 자리 강제 배치/잠금 |

- **📦 세션 보관함**: 동작 중인 세션을 `archive/` 에 통째로 복제(대화 · 이미지 · 서브에이전트). JSON · OpenAI messages · Markdown · 원본 JSONL 로 내려받기, 가져오기, **대화 고치기 · 지우기 · 끼워 넣기**.
  고친 대화는 **⚡ 실제 세션에 반영**으로 Claude Code 원본 기록에 써 넣을 수 있다 — 원본은 백업되고(⏪ 되돌리기), 작업 중인 세션 · 도구 호출/결과 짝 · 생각 블록은 건드리지 않는다.
- **🔌 연동 · 설정**: 직급 체계, 사내 재화 · 월급제, API 키, 웹훅, 세션 전송 문서.

---

## 칸반 연동 (FlowBoard)

AI OFFICE 안에서 칸반 보드를 보고 조작하고, **세션 ↔ 카드**를 연결하면 세션이 바뀔 때 카드가 알아서 따라간다.

![칸반 — 에픽 스윔레인](docs/screenshots/40_kanban.png)

- 스윔레인: 없음 · **에픽** · 담당자 · 우선순위 · 유형 · 스프린트 (접기 · 빈 레인 숨기기)
- 에픽 카드 **숨기기 / 보기 / 에픽만**, 검색 · 내 일만 · 담당자 칩 · 유형 · 우선순위 · 라벨 · 완료 숨기기 · AI 연결 카드만
- 칸별 WIP 한도 · 카드 추가, **레인 사이로 끌어 놓으면 담당자 · 우선순위 · 에픽 · 스프린트도 바뀜**, 카드 크기 3단계
- 세션 상세에서 카드 번호로 연결하거나 ✨ 자동 생성. 연결된 카드는 **상태 · 진척도(할 일 완료율) · 체크리스트 · 이력 댓글**이 자동 갱신

![칸반 — 담당자 스윔레인](docs/screenshots/41_kanban_assignee.png)

다른 칸반을 쓰면 [웹훅](docs/WEBHOOKS.md)으로 카드 이동 자동화를 붙일 수 있다.

---

## 행정관리 연동

근태 · 전자결재 · 업무보고 · 일정 · 물품/장비 · 게시판을 AI OFFICE 안에서 처리한다 (관리 센터 › 🏛️ 행정).

| | |
|---|---|
| ![오늘](docs/screenshots/42_mgm_home.png) **오늘** — 출근/퇴근 · 내 결재 차례 · 다가오는 일정 · 최근 게시글 | ![결재](docs/screenshots/43_mgm_approval.png) **결재** — 결재함 · 결재선 · 승인/반려/회수 · 기안 |

- **📝 업무보고**: 이번 주 AI 세션 기록(프로젝트별 작업 · 할 일 진행)으로 **주간 업무보고 초안**을 만들어 고친 뒤 제출
- **🔐 연동 · 보안**: 토큰은 관리자 **계정 금고**에 암호화 저장, 경로 · 필드 허용목록, 삭제 · 인사 변경 차단, 속도 제한, 감사 기록

![행정 — 연동 · 보안](docs/screenshots/44_mgm_security.png)

---

## 업무타이머

상단의 🍅 알약을 누르면 열리는 뽀모도로 타이머. 집중 / 짧은 휴식 / 긴 휴식 자동 순환, 프리셋, 딴짓 기록, 메모 · 태그, 날짜별 기록, 통계(오늘 · 이번 주 · 연속 달성 · 12주 히트맵), **칸반 카드 연결 시 집중 시간이 카드 작업시간 + 댓글로**. 기록은 로그인한 계정마다 서버에 저장.

![업무타이머](docs/screenshots/18_timer.png)

---

## 캐릭터 · 직급 · 월급

- **캐릭터**: 세션마다 이름 · 국적(국기) · 나이 · MBTI · 출신 도시 · 취미 — 20개국, 그 나라 표기 그대로(한글 · 한자 · 라틴 문자). 직접 정하거나 🎲 무작위, 정하지 않으면 세션마다 늘 같은 인물이 자동으로.
- **직급 체계**: 연구소(방문자 ~ 교수) · 회사(사원 ~ 부장) · 직접 입력. 레벨 · 실적으로 오르고, 관리자가 직접 지정 가능.
- **월급제**: 레벨 기본급 × 근속 연수 인상률 → **월급 · 주급 · 일급 · 시급**을 상세로 보여 주고 매일 일급을 지급. 재직 100% · 휴직(중단) 50% · 정직(감옥 · 던전) 0%. 일한 시간만큼은 성과급.
- **사내 재화**: 코인으로 음식 · 차 · 집 · 취미를 산다(자동 소비 또는 관리자가 구매 · 지급). 이름표에 🏠🚗.

---

## 계정 · 정보공개 · 보안

| | |
|---|---|
| ![계정 옵션](docs/screenshots/14_account_options.png) **계정 옵션** — 테마 · 팔레트 · 강조색 · **글자색 5종** · 글꼴 · UI 크기 · 이름표/표지판/말풍선 크기 · 이름표 표시(캐릭터 이름 / 세션 제목) | |

- **비로그인**: 소스코드를 열어 봐도 세션 제목 · 요청 · 대화 · 메모가 오지 않는다(서버가 보는 사람마다 걸러서 보냄).
- **등급 계정**: 방문자 ~ 교수 12단계. 세션마다 7개 항목(제목 · 지금 하는 일 · 통계 · 메모 · 대화 · 진행 · 보관본)을 몇 등급부터 볼지 정한다. 새 계정은 처음엔 아무 상세도 안 보임.
- **계정 금고**: 외부 시스템 토큰은 코드 · 설정 파일에 없다. 계정별 키로 AES-256-GCM 암호화, 로그인해야 풀림.
- 로그인 토큰 해시 저장 · IP 별 잠금 · CSP · 수집 입구 로컬 전용 · 웹훅 SSRF 차단 … 자세한 설계와 보안 감사 결과는 **[docs/SECURITY.md](docs/SECURITY.md)**.

---

## 다른 AI 붙이기 · API

- **로그가 없는 도구** → `POST /api/events` (이 PC 에서만)
  ```bash
  curl -X POST http://127.0.0.1:17777/api/events -H "Content-Type: application/json" \
    -d '{"provider":"chatgpt","sessionId":"abc","title":"여행 일정","status":"working","activity":{"type":"talk","label":"답변 생성 중"}}'
  ```
- **웹 AI** (ChatGPT · Gemini · Claude.ai …) → Tampermonkey 에 `bridges/ai-office-web.user.js` (답변 생성 중/끝만 보냄, 내용 X)
- **Claude Code 승인 대기까지 정확히** → `~/.claude/settings.json` 훅
  ```json
  "hooks": {
    "Notification":     [{ "hooks": [{ "type": "command", "command": "node \"<AI-Office 폴더>/bridges/claude-hook.mjs\"" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node \"<AI-Office 폴더>/bridges/claude-hook.mjs\"" }] }],
    "Stop":             [{ "hooks": [{ "type": "command", "command": "node \"<AI-Office 폴더>/bridges/claude-hook.mjs\"" }] }]
  }
  ```
- **외부 프로그램용 API (키 발급)** → [docs/API.md](docs/API.md)
- **세션 통째로 내려받기 (세션 스위처 백업 형식)** → [docs/TRANSFER_API.md](docs/TRANSFER_API.md)
- **칸반 웹훅** → [docs/WEBHOOKS.md](docs/WEBHOOKS.md)

---

## 모바일 · 태블릿

하단 탭바(맵 · 세션 · 관리 · 설정 · 계정), 세션 패널은 아래에서 올라오는 시트, 층 이동은 가로 칩. 태블릿 · 확대 배율처럼 애매한 폭에서도 상단바 실제 높이를 재서 패널이 겹치지 않게 맞춘다.

| | | | |
|---|---|---|---|
| ![모바일](docs/screenshots/31_mobile.png) | ![모바일 세션](docs/screenshots/32_mobile_sessions.png) | ![모바일 층](docs/screenshots/33_mobile_floor.png) | ![태블릿](docs/screenshots/30_tablet.png) |

---

## 구조

```
server/
  index.mjs        HTTP + SSE + 수집 루프 (17777 고정)
  auth.mjs         관리자 · 등급 계정 · 로그인 토큰(해시) · 잠금
  vault.mjs        계정 금고 (외부 토큰 암호화)
  access.mjs       보는 사람별 상태 걸러내기 · redact.mjs 비로그인 요약
  meta.mjs         세션 메타 · 설정 · API 키 · 빌딩 설정
  economy.mjs      사내 재화 · 상점 · 월급제
  persona.mjs      캐릭터 인적사항 (20개국)
  archive.mjs      세션 보관함 · 편집 · 실제 세션 반영
  transfer.mjs     세션 스위처 형식 zip
  tcc.mjs          FlowBoard 칸반 연동 · 자동 갱신
  mgm.mjs          행정관리 연동 (허용목록 · 감사 기록)
  webhooks.mjs     칸반 웹훅
  routes_v4.mjs / routes_v6.mjs   API 라우트
  adapters/        claude · codex · gemini(qwen) · processes · ingest
public/
  index.html       화면 (빌드 없음)
  js/              iso · art* (그림) · layout · mini(꼬마빌딩) · compose · maps · world (행동 · 렌더) ·
                   ui · detail · manage · kanban · mgm · timer-ui · prefs · viewport …
  css/             style · panels · manage · v5 · v6 · kanban · mgm · timer-aio
bridges/           claude-hook.mjs · ai-office-web.user.js
tools/             maptest.mjs (모든 맵 길찾기 · 벽 통과 검사) · MAP_GUIDE.md
docs/              API · TRANSFER_API · WEBHOOKS · SECURITY · screenshots/
data/              (자동 생성 · 커밋 금지) 계정 해시 · 로그인 토큰 · 금고 · 설정
archive/           (자동 생성 · 커밋 금지) 세션 보관함
```

맵을 고치면 `node tools/maptest.mjs` 로 모든 자리에 걸어갈 수 있는지, 벽을 뚫는 길이 없는지 검사한다.

---

<sub>레퍼런스와 설계 메모는 [DESIGN.md](DESIGN.md).</sub>
