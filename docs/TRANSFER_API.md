# 세션 전송 · 동기화 API (v1)

이 PC(서버)의 **Claude Code 대화를 다른 컴퓨터로 내려받아 이어서 작업하고, 다시 올려서 서버에 합치는** API.
형식은 [세션 스위처](https://github.com/UniverseMaker/Claude-Desktop-Application-Cowork-and-Code-Session-Transfer)의 **백업 zip 그대로**라서, 내려받은 파일은 스위처의 「백업 / 복원 › 가져오기」에 바로 넣을 수 있고, 스위처(또는 같은 형식을 만드는 오프라인 도구)가 만든 백업을 그대로 올리면 된다.

- 기본 주소: `http://127.0.0.1:17777/api/transfer/v1` (외부에서는 서버 공개 주소)
- 문서: `GET /api/transfer/v1` (JSON, 인증 불필요) · 보기 좋은 문서: `/docs/sync-api.html`

```
 서버(이 PC)                                    원격 컴퓨터 (오프라인 소프트웨어)
 ──────────                                    ──────────────────────────────
 GET /bundle?ids=…  ───── zip 내려받기 ────▶    복원 → 이어서 작업
                                               같은 형식 zip 으로 백업
 POST /uploads · PUT 조각  ◀── zip 올리기 ────
 POST /uploads/{id}/preview  → 무엇이 합쳐질지 확인
 POST /uploads/{id}/apply    → 줄 단위 병합으로 반영
 POST /uploads/{id}/undo     → (필요하면) 되돌리기
```

## 인증 · 권한

관리 센터 › 🔌 연동 · 설정 › **API 키** 에서 발급한다. 키 원문은 발급할 때 한 번만 보인다.

```
Authorization: Bearer aio_xxxxxxxxxxxxxxxx
# 또는
X-API-Key: aio_xxxxxxxxxxxxxxxx
```

| scope | 내려받기 (GET) | 올리기 · 반영 · 되돌리기 | 일반 API `/api/v1` |
|---|---|---|---|
| `transfer` | ✅ | ❌ 403 | ❌ |
| `sync` | ✅ | ✅ | ❌ |
| `full` | ✅ | ✅ | ✅ |
| 관리자 로그인 토큰 | ✅ | ✅ | ✅ |

원격 컴퓨터마다 `sync` 키를 따로 발급하면, 업로드 기록에 어느 키로 올렸는지 남고 그 컴퓨터만 골라 폐기할 수 있다.

## 엔드포인트

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/transfer/v1` | – | 이 문서 (JSON) |
| GET | `/sessions` | transfer | 이 PC 의 Claude Code 대화 목록 |
| GET | `/bundle` · `/bundle?ids=<id>,<id>` | transfer | 전부 / 고른 대화를 담은 zip (+ `manifest.sync.base` 지문) |
| GET | `/sessions/{cli_session_id}/transcript` | transfer | 대화 원문 `.jsonl` 하나 |
| GET | `/status?ids=<id>,<id>` | transfer | 대화별 지금 상태 (올리기 전 확인용) |
| POST | `/sync[?dry_run=1]` | sync | 작은 zip(≤95MB)을 본문으로 한 번에 → 미리 보기 / 반영 |
| POST | `/uploads` | sync | 조각 업로드 시작 |
| PUT | `/uploads/{upload_id}?offset=<n>` | sync | 조각 이어 붙이기 (≤64MB) |
| GET | `/uploads` · `/uploads/{upload_id}` | sync | 올린 기록 · 하나 자세히 |
| POST | `/uploads/{upload_id}/preview` | sync | 무엇이 어떻게 합쳐질지 (아무것도 안 바꿈) |
| POST | `/uploads/{upload_id}/apply` | sync | 반영 |
| POST | `/uploads/{upload_id}/undo` | sync | 반영 전으로 되돌리기 |
| DELETE | `/uploads/{upload_id}` | sync | 받은 파일 버리기 |

(경로는 모두 `/api/transfer/v1` 아래)

---

### 1. 내려받기

#### GET /sessions

```json
{ "sessions": [
  { "cli_session_id": "0b6c…", "title": "결제 모듈 테스트 보강", "transcript_folder": "C--work-shop-api",
    "size": 482113, "transcript_size": 470001, "sidecar_files": 3, "last_activity": 1793072650972, "has_record": true, "live": false }
] }
```

- `has_record`: Claude Desktop 세션 기록(`%APPDATA%\Claude\claude-code-sessions\…\local_*.json`)이 있으면 `true` — zip 의 `records/` 에 함께 담긴다.
- `live`: 지금 서버에서 돌고 있는 세션인지. **돌고 있는 세션을 원격에서 이어 쓰면 양쪽이 갈라진다** — 내려받기 전에 서버 쪽 세션을 끝내 두는 게 좋다.

#### GET /bundle — zip 구조 (manifest_version 2)

```
manifest.json
transcripts/<cli_session_id>.jsonl
sidecars/<cli_session_id>/…          # 서브에이전트 기록 · 도구 결과 (있으면)
records/<cli_session_id>.json        # Claude Desktop 세션 기록 (있으면)
```

```json
{
  "manifest_version": 2, "created_at": "2026-10-27T14:00:00", "source_computer": "OFFICE-PC", "source": "ai-office",
  "code": [ { "cli_session_id": "0b6c…", "title": "…", "transcript": true, "record": true, "record_name": "local_….json",
              "size": 482113, "sidecar_files": 3, "transcript_folder": "C--work-shop-api" } ],
  "cowork": [], "warnings": [],
  "sync": { "server": "OFFICE-PC", "exported_at": "2026-10-27T05:00:00.000Z",
            "base": { "0b6c…": { "sha256": "9f1c…", "size": 470001 } } }
}
```

`sync` 는 동기화용 추가 필드다(세션 스위처는 모르는 필드라 무시한다). 다시 올릴 때 이 `manifest.json` 의 `sync` 를 **그대로 두면**, 서버가 「내려받은 뒤 서버 쪽도 바뀌었는지」를 알려 준다.

#### GET /status?ids=…

```json
{ "sessions": [
  { "cli_session_id": "0b6c…", "exists": true, "transcript_folder": "C--work-shop-api",
    "sha256": "9f1c…", "lines": 412, "size": 470001, "last_activity": 1793072650972, "live": false },
  { "cli_session_id": "3333…", "exists": false }
] }
```

`sha256` 이 내려받을 때의 `sync.base[id].sha256` 과 같으면 서버 쪽은 그 뒤로 안 바뀐 것 — 올리면 깔끔하게 이어 붙는다.

---

### 2. 올리기

올리는 zip 은 **내려받은 것과 같은 형식**이다. 최소 요건:

- `manifest.json` 의 `code[]` 에 대화마다 `{ "cli_session_id": "<uuid>", "title": "…", "transcript": true }`
- `transcripts/<cli_session_id>.jsonl`
- 선택: `sidecars/<id>/…` · `records/<id>.json` · `code[].transcript_folder` · `code[].record_name` · 내려받을 때 받은 `sync`

zip 은 stored · deflate, zip64, UTF-8 파일 이름을 읽는다(파이썬 `zipfile` · 세션 스위처 백업 그대로 됨). 암호 zip 은 안 된다.

#### 작은 파일: POST /sync

본문에 zip 바이트를 그대로 보낸다 (`Content-Type: application/zip`, `Content-Length` 필수, 95MB 이하).

| 쿼리 | 뜻 |
|---|---|
| `dry_run=1` | 미리 보기만 (반영 안 함). **처음엔 이걸로 확인하는 걸 권장** |
| `ids=a,b` | 이 대화만 반영 |
| `overwrite=a,b` | 이 대화는 병합 대신 올린 것으로 덮어쓰기 |
| `records=0` | 등록 파일(Claude Desktop 사이드바)은 넣지 않기 |
| `force_live=1` | 서버에서 지금 쓰는 중인 세션도 반영 (권장 안 함) |
| `device=…` · `name=…` | 기록용 컴퓨터 이름 · 파일 이름 |

응답: `dry_run=1` 이면 [미리 보기](#post-uploadsidpreview), 아니면 [반영 결과](#post-uploadsidapply) + `preview` 요약. 어느 쪽이든 `upload_id` 가 들어 있어 나중에 `undo` 할 수 있다.

#### 큰 파일: 조각 업로드 (Cloudflare 터널은 요청당 100MB 제한)

1. **시작** `POST /uploads` `{ "size": 734003200, "name": "work.zip", "device": "LAB-PC" }`
   → `{ "upload_id": "20261027140000-1a2b3c4d", "chunk_max": 67108864, "size": 734003200 }`
2. **조각** `PUT /uploads/{upload_id}?offset=<지금까지 보낸 바이트>` 본문 = 조각 바이트 (≤ `chunk_max`, 16~32MB 권장)
   → `{ "received": 33554432, "size": 734003200, "complete": false }` … 마지막 조각에서 `"complete": true`
3. 끊겼으면 `GET /uploads/{upload_id}` 의 `received` 부터 다시 보낸다. offset 이 틀리면 `409` + `received`.
4. 다 받으면 `POST /uploads/{upload_id}/preview` → 확인 → `POST /uploads/{upload_id}/apply`

다 받지 않은 업로드는 24시간 뒤 지워진다.

#### POST /uploads/{id}/preview

아무것도 바꾸지 않고 대화마다 무슨 일이 일어날지 알려 준다.

```json
{
  "upload_id": "20261027140000-1a2b3c4d", "source_computer": "LAB-PC",
  "exported_from": { "server": "OFFICE-PC", "exported_at": "2026-10-27T05:00:00.000Z" },
  "summary": { "sessions": 3, "new": 1, "remote_newer": 1, "diverged": 1, "same": 0, "server_newer": 0, "live": 0, "add_lines": 57 },
  "sessions": [
    { "cli_session_id": "1111…", "title": "API 리팩터링", "status": "remote_newer", "server_lines": 300, "remote_lines": 340,
      "add_lines": 40, "server_only_lines": 0, "server_changed_since_export": false, "live": false, "sidecars": 4, "sidecars_new": 2, "record": "exists" },
    { "cli_session_id": "2222…", "status": "diverged", "add_lines": 15, "server_only_lines": 6, "server_changed_since_export": true, "…": "…" },
    { "cli_session_id": "3333…", "status": "new", "add_lines": 2, "record": "new", "transcript_folder": "D--lab-proj" }
  ],
  "warnings": []
}
```

| status | 뜻 | 기본 반영(병합) |
|---|---|---|
| `new` | 서버에 없는 대화 | 새로 만든다 |
| `remote_newer` | 원격에서만 늘어남 (서버는 그대로) | 원격 줄을 뒤에 붙인다 = 원격과 같아짐 |
| `diverged` | 양쪽 다 바뀜 | 서버 줄은 그대로 두고 원격에만 있는 줄을 뒤에 붙인다 (둘 다 남음) |
| `same` | 내용 같음 | 아무것도 안 함 |
| `server_newer` | 서버에만 더 있음 | 아무것도 안 함 (서버가 최신) |
| `no_transcript` | zip 에 대화 파일이 없음 | 건너뜀 |

- `server_changed_since_export`: 올린 zip 에 `sync.base` 가 있을 때만. `true` 면 내려받은 뒤 서버에서도 이어 썼다는 뜻.
- `live`: 서버에서 지금 쓰는 중(또는 30초 안에 바뀜) — 반영할 때 건너뛴다.
- `record`: `new`(사이드바 등록 파일을 넣음) · `exists`(이미 있음, 그대로) · `none`.

#### POST /uploads/{id}/apply

```json
{
  "ids": ["1111…", "3333…"],
  "overwrite": [],
  "records": true,
  "force_live": false,
  "folder_map": { "D--lab-proj": "C--work-proj" }
}
```

모든 필드는 선택. 비우면 zip 의 모든 대화를 병합한다.

- `folder_map`: **서버에 없던 새 대화**를 어느 프로젝트 폴더(`~/.claude/projects/<폴더>`)에 둘지. 원격 컴퓨터와 작업 경로가 다를 때 쓴다. 이미 있는 대화는 원래 있던 폴더에 합친다.

```json
{
  "upload_id": "20261027140000-1a2b3c4d",
  "transcripts": 2, "merged": 1, "overwritten": 0, "created": 1, "unchanged": 0,
  "sidecars": 2, "records": 1,
  "skipped": [ { "cli_session_id": "2222…", "reason": "이 PC 에서 지금 쓰는 중인 세션 (force_live 로 강제 가능)" } ],
  "warnings": [],
  "sessions": [ { "cli_session_id": "1111…", "title": "…", "result": "merged", "folder": "C--work-shop-api" } ]
}
```

#### POST /uploads/{id}/undo

`{ "force": false }` → `{ "restored": 1, "deleted": 4, "warnings": [] }`

반영 전 원본(서버 `data/sync/backups/<upload_id>/`)으로 되돌리고, 그 반영이 새로 만든 파일(대화 · 보조 기록 · 등록 파일)은 지운다.
반영한 뒤 그 대화를 서버에서 또 이어 썼으면 `409` — 되돌리면 그 사이 기록이 사라지기 때문. 그래도 하려면 `"force": true`.
반영 기록과 백업은 최근 30건까지 남는다.

---

## 합치는 규칙 (세션 스위처 복원과 같음)

- **대화(.jsonl)는 줄 단위 병합이 기본.** 서버 줄 순서는 그대로, 올린 쪽에만 있는 줄을 뒤에 붙인다. 똑같은 줄은 한 번만. → 어느 쪽 기록도 사라지지 않는다.
  줄은 개행(`\n` · `\r\n` · `\r`)으로만 나누고 빈 줄은 버린다 (` ` 등으로는 안 나눔 — 스위처와 같은 규칙이어야 같은 파일을 "다르다"고 잘못 보지 않는다).
- **덮어쓰기는 `overwrite` 로 고른 대화만.** 서버에서 그 뒤에 쓴 내용은 사라지니(백업은 남음) 꼭 필요할 때만.
- **보조 기록(sidecars)은 서버에 없는 파일만 채운다.** 한 번 쓰고 끝나는 파일이라 합칠 게 없고, 덮으면 서버에서 이어 쓴 기록을 잃는다.
- **등록 파일(records)은 서버에 같은 세션 기록이 없을 때만** 가장 최근에 쓰인 Claude Desktop 계정 폴더에 넣는다. 사이드바에 안 보이면 세션 스위처의 「세션 통합연결」을 한 번 돌린다.
- **지금 쓰는 세션은 건너뛴다** (서버에 살아 있거나 30초 안에 바뀐 대화). Claude 가 쓰고 있는 파일을 바꾸면 깨질 수 있다.
- 한 번에 하나만 반영한다 (동시에 오면 `423`).

## 원격 작업 권장 순서

1. 서버에서 그 세션을 끝낸다 (돌고 있는 채로 가져가면 양쪽이 갈라진다).
2. `GET /bundle?ids=…` → 원격 컴퓨터에서 복원 · 작업.
3. 그동안 서버에서 같은 대화를 이어 쓰지 않는다 (써도 병합으로 둘 다 남지만 대화가 두 갈래가 된다).
4. 원격에서 백업 zip 을 만들어 `dry_run` / `preview` 로 확인 → `apply`.
5. 이상하면 `undo`.

## 예시

### curl (bash)

```bash
AIO=http://127.0.0.1:17777           # 서버 주소
KEY=aio_xxxxxxxxxxxxxxxx             # scope sync 키
B=$AIO/api/transfer/v1

# 내려받기
curl -H "Authorization: Bearer $KEY" "$B/sessions"
curl -H "Authorization: Bearer $KEY" -o work.zip "$B/bundle?ids=0b6c...,9f2a..."

# (원격에서 작업 후) 작은 파일: 미리 보기 → 반영
curl -H "Authorization: Bearer $KEY" -H "Content-Type: application/zip" --data-binary @work-done.zip "$B/sync?dry_run=1&device=LAB-PC"
curl -H "Authorization: Bearer $KEY" -H "Content-Type: application/zip" --data-binary @work-done.zip "$B/sync?device=LAB-PC"

# 큰 파일: 조각으로
SIZE=$(stat -c %s big.zip)
ID=$(curl -s -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d "{\"size\":$SIZE,\"name\":\"big.zip\"}" "$B/uploads" | python -c "import sys,json;print(json.load(sys.stdin)['upload_id'])")
split -b 32m -d big.zip part_
OFF=0; for f in part_*; do curl -s -X PUT -H "Authorization: Bearer $KEY" --data-binary @$f "$B/uploads/$ID?offset=$OFF"; OFF=$((OFF + $(stat -c %s $f))); done
curl -X POST -H "Authorization: Bearer $KEY" "$B/uploads/$ID/preview"
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{}' "$B/uploads/$ID/apply"
# 되돌리기
curl -X POST -H "Authorization: Bearer $KEY" "$B/uploads/$ID/undo"
```

### Python (오프라인 소프트웨어에 붙이기)

```python
import os, requests

class AioSync:
    def __init__(self, base, key, chunk=32 * 1024 * 1024):
        self.b = base.rstrip("/") + "/api/transfer/v1"
        self.s = requests.Session(); self.s.headers["Authorization"] = "Bearer " + key
        self.chunk = chunk

    def sessions(self):
        return self.s.get(f"{self.b}/sessions").json()["sessions"]

    def download(self, ids, path):
        with self.s.get(f"{self.b}/bundle", params={"ids": ",".join(ids)}, stream=True) as r:
            r.raise_for_status()
            with open(path, "wb") as f:
                for c in r.iter_content(1 << 20): f.write(c)

    def upload(self, path, device=""):
        size = os.path.getsize(path)
        up = self.s.post(f"{self.b}/uploads", json={"size": size, "name": os.path.basename(path), "device": device}).json()
        uid, step = up["upload_id"], min(self.chunk, up["chunk_max"])
        with open(path, "rb") as f:
            off = 0
            while off < size:
                f.seek(off); data = f.read(step)
                r = self.s.put(f"{self.b}/uploads/{uid}", params={"offset": off}, data=data)
                if r.status_code == 409:                      # 끊겼다 이어 보낼 때: 서버가 받은 곳부터
                    off = r.json()["received"]; continue
                r.raise_for_status(); off = r.json()["received"]
        return uid

    def preview(self, uid):
        return self.s.post(f"{self.b}/uploads/{uid}/preview").json()

    def apply(self, uid, **opt):                              # ids · overwrite · records · force_live · folder_map
        return self.s.post(f"{self.b}/uploads/{uid}/apply", json=opt).json()

    def undo(self, uid, force=False):
        return self.s.post(f"{self.b}/uploads/{uid}/undo", json={"force": force}).json()

aio = AioSync("http://127.0.0.1:17777", "aio_xxxxxxxxxxxxxxxx")
uid = aio.upload("work-done.zip", device="LAB-PC")
p = aio.preview(uid)
for s in p["sessions"]:
    print(s["status"], s.get("add_lines"), s.get("title"))
if p["summary"]["diverged"] == 0:
    print(aio.apply(uid))
```

## 오류

| 코드 | 언제 |
|---|---|
| 400 | zip 이 아님 · manifest 없음 · 손상(CRC) · 암호 zip · size 누락 |
| 401 | 키 없음 / 틀림 |
| 403 | 권한 부족 (`transfer` 키로 올리기 등) |
| 404 | 없는 업로드 · 없는 대화 |
| 409 | offset 불일치(이어 올리기) · 아직 다 안 받음 · 이미 반영 · 되돌리면 안 되는 상태 |
| 410 | 반영 후 정리돼 올린 파일이 없음 |
| 411 · 413 | Content-Length 없음 · 너무 큼 (한 번에 95MB · 조각 64MB · 전체 8GB) |
| 423 | 다른 반영이 진행 중 |

## 보안

- 키 없이는 401. 올리기는 서버 PC 의 대화 파일을 바꾸므로 **`sync` 키는 믿는 컴퓨터에만**, 다 쓰면 폐기한다.
- zip 안 경로는 검사한다: `..` · 절대 경로 · 드라이브 문자는 거부, 세션 id 는 UUID 만, 폴더 이름은 영숫자와 `-` 만. 압축 폭탄(파일당 1GB · 합계 16GB) · CRC 도 검사한다.
- 바꾸기 전 원본은 서버 `data/sync/backups/` 에 남고 `undo` 로 되돌릴 수 있다. `data/` 폴더는 배포 · 커밋하지 않는다.
- 외부 주소(터널)로도 열려 있으니 키를 링크 · 채팅에 붙이지 않는다.
