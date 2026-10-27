# 칸반 웹훅

세션 상태가 바뀌면 등록한 주소로 `POST` 를 보낸다. 칸반(Jira · Trello · Notion · 사내 보드 …)의 자동화가 이걸 받아 **카드를 알아서 옮기게** 하는 용도.
설정: 관리 센터 › 🔌 연동 · 설정 › **웹훅** (최대 10개).

> FlowBoard(TCC) 를 쓰면 웹훅 없이 **내장 칸반 연동**(관리 센터 › 🗂️ 칸반, 세션 상세 › 칸반 카드)이 카드 상태 · 진척도 · 체크리스트 · 댓글을 직접 갱신한다.

## 언제 보내나

| 이벤트 | 때 |
|---|---|
| `session.created` | 새 세션이 처음 보일 때 |
| `session.moved` | 세션의 "열(column)"이 바뀔 때 |
| `session.closed` | 세션이 끝나 사라질 때 |

세션 상태 → 열:

| columnKey | 뜻 | 기본 열 이름 |
|---|---|---|
| `working` | 작업 중 (도구 · 생각 · 위임) | In Progress |
| `review` | 결정 필요 (입력 · 승인 대기) | Review |
| `done` | 응답 완료 | Done |
| `idle` | 대기 | To Do |
| `stopped` | 중단 · 감옥 · 던전 · 금고 | Backlog |
| `closed` | 세션 종료 | Done |

열 이름은 웹훅마다 바꿀 수 있다(보드의 실제 열 이름에 맞추기).

## 본문

```json
{
  "event": "session.moved",
  "column": "In Progress",
  "columnKey": "working",
  "previous": "idle",
  "session": {
    "id": "claude:0b6c…", "title": "결제 모듈 테스트 보강", "project": "shop-api", "provider": "claude",
    "model": "claude-opus-5-5", "kind": "single", "status": "tool", "place": "active",
    "activity": { "type": "terminal", "label": "명령 실행 중", "detail": "npm test" },
    "startedAt": 1793060000000, "lastActive": 1793063000000,
    "task": { "key": "ARC-29", "title": "…", "url": "…" }, "memo": null, "tags": null, "roster": []
  },
  "at": 1793063000123
}
```

## 헤더 · 서명

```
Content-Type: application/json
User-Agent: AI-Office-Webhook/1
X-AIO-Event: session.moved
X-AIO-Signature: sha256=<hex>      # 비밀값을 넣었을 때만
(웹훅마다 추가 헤더 최대 5개 — 예: Authorization)
```

받는 쪽 서명 확인(Node):

```js
import crypto from 'node:crypto';
const ok = (raw, sig, secret) => {
  const want = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return sig && sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want));
};
```

## 재시도 · 기록

- 실패(네트워크 · 5xx)하면 3번까지 다시 보낸다. 결과는 설정 화면의 전송 기록에 남는다.
- 「📨 테스트」 버튼으로 첫 세션을 예시로 한 번 보내 볼 수 있다.

## 보안 제한

- **https + 공개 호스트만** 보낼 수 있다(사설 · 루프백 · 링크로컬 주소 거부 — 내부망으로 요청을 보내게 하는 SSRF 방지).
- 리다이렉트는 따라가지 않는다. 8초 시간 제한.
- 본문에 세션 제목 · 메모가 들어가므로 신뢰하는 주소만 등록한다.
