# 세션 전송 API (v1)

다른 프로그램이 이 PC 의 **Claude Code 대화를 통째로 내려받아** 다른 곳에 탑재할 수 있게 하는 API.
[Claude Desktop Cowork ↔ Code Session Transfer](https://github.com/UniverseMaker/Claude-Desktop-Application-Cowork-and-Code-Session-Transfer)(세션 스위처)의 **백업 형식 그대로** zip 을 만들어 주므로, 받은 파일을 스위처의 「백업 / 복원 › 가져오기」에 바로 넣으면 된다.

- 기본 주소: `http://127.0.0.1:17777/api/transfer/v1`
- 문서(인증 불필요): `GET /api/transfer/v1`

## 인증

관리 센터 › 🔌 연동 · 설정 › **API 키** 에서 scope 를 `transfer`(또는 `full`)로 발급한다. 발급 화면에서 한 번만 보인다.

```
Authorization: Bearer aio_xxxxxxxxxxxxxxxx
# 또는
X-API-Key: aio_xxxxxxxxxxxxxxxx
```

관리자 로그인 토큰도 된다. scope `read` 키로는 전송 API 를 쓸 수 없다.

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/transfer/v1` | 이 문서(JSON) |
| GET | `/api/transfer/v1/sessions` | 이 PC 의 Claude Code 대화 목록 |
| GET | `/api/transfer/v1/bundle` | 전부 담은 zip |
| GET | `/api/transfer/v1/bundle?ids=<id>,<id>` | 고른 대화만 담은 zip |
| GET | `/api/transfer/v1/sessions/{cli_session_id}/transcript` | 대화 원문 `.jsonl` 하나 |

### GET /sessions

```json
{ "sessions": [
  { "cli_session_id": "0b6c…", "title": "결제 모듈 테스트 보강", "transcript_folder": "C--work-shop-api",
    "size": 482113, "sidecar_files": 3, "last_activity": "2026-10-27T01:20:11.000Z", "has_record": true, "live": true }
] }
```

- `has_record`: Claude Desktop 의 세션 기록(`%APPDATA%\Claude\claude-code-sessions\…\local_*.json`)이 있으면 `true` — zip 의 `records/` 에 함께 담긴다.
- `live`: 지금 AI OFFICE 가 보고 있는(살아 있는) 세션인지.

### GET /bundle — zip 구조 (manifest_version 2)

```
manifest.json
transcripts/<cli_session_id>.jsonl
sidecars/<cli_session_id>/…          # 서브에이전트 기록 등 (있으면)
records/<cli_session_id>.json        # Claude Desktop 세션 기록 (있으면)
```

zip 은 메모리에 다 올리지 않고 스트리밍으로 만든다(큰 대화도 OK).

## 예시

```bash
KEY=aio_xxxxxxxxxxxxxxxx
curl -H "Authorization: Bearer $KEY" http://127.0.0.1:17777/api/transfer/v1/sessions
curl -H "Authorization: Bearer $KEY" -o ai-office-backup.zip "http://127.0.0.1:17777/api/transfer/v1/bundle"
curl -H "Authorization: Bearer $KEY" -o one.zip "http://127.0.0.1:17777/api/transfer/v1/bundle?ids=0b6c...,9f2a..."
```

```python
import requests
S = requests.Session(); S.headers["Authorization"] = "Bearer aio_xxxxxxxxxxxxxxxx"
base = "http://127.0.0.1:17777/api/transfer/v1"
for s in S.get(f"{base}/sessions").json()["sessions"]:
    print(s["cli_session_id"], s["title"])
open("backup.zip", "wb").write(S.get(f"{base}/bundle").content)
```

## 보안

- 키 없이는 401. 키는 해시가 아니라 서버 설정에 저장되므로 `data/` 폴더를 지켜야 한다(배포 · 커밋 금지).
- 대화 원문이 통째로 나가는 API 라 **scope 를 `transfer` 로 따로** 발급하고, 다 쓰면 폐기한다.
- 외부 주소(터널)로도 열려 있으니 키를 링크 · 채팅에 붙이지 않는다.
