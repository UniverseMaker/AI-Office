# AI OFFICE v3 — 새 실내(건물) · 실외(부지) 맵 만들기 가이드

이 앱은 사용자의 AI 세션(Claude Code 등)을 귀여운 아이소메트릭 오피스 캐릭터로 보여 주는 대시보드다.
v3부터 맵 = **실내(건물) 1개 × 실외(부지) 1개** 조합이다. 사용자는 상단 🗺️ 버튼에서 두 목록을 따로 고른다.
어떤 실내든 어떤 실외와도 조합될 수 있어야 한다.

## 0. 절대 규칙
- **자기 파일만 수정한다.** 실내 A팀: `public/js/indoor_a.js` · 실내 B팀: `indoor_b.js` · 실외 A팀: `outdoor_a.js` · 실외 B팀: `outdoor_b.js`.
  다른 파일(world.js, compose.js, art*.js, maps.js, index.html …)은 **읽기만** 한다. 엔진 수정이 꼭 필요하면 최종 보고에 적는다.
- 새 소품 타입 · 바닥 재질 · 데칼 이름은 팀 접두어를 붙인다: `ia_` `ib_` `oa_` `ob_` (예: `oa_palm`, `ib_tatami`).
- 화면 글자(이름·설명·표지판)는 **한국어**. 맵 id 는 영문 소문자.
- 포트 17777 서버는 이미 떠 있다(재시작 금지). 빌드 단계 없음 — 파일 저장 후 브라우저 새로고침이면 반영.
- 이전 버전 폴더(`ai-office`, `ai-office-backups`)는 절대 건드리지 않는다.

## 1. 먼저 읽을 파일 (참고 구현)
- `public/js/compose.js` — 엔진: `C.tower()` 건물 키트, `lotKit` 부지 키트, `C.indoor/outdoor/prop/floorStyle/decal` 등록
- `public/js/indoor_base.js`, `public/js/outdoor_base.js` — 기존 맵을 떼어 낸 등록 예시
- `public/js/mini.js` — 꼬마빌딩: 층별 테마 방(지하 감옥·비밀연구소·금고·휴게층·임원층·루프탑) 손으로 짠 좋은 예
- `public/js/maps.js` `terrace()` — 야외 테라스(카페·풀·캠프파이어·연못) 좋은 예
- `public/js/art8.js` — 소품 그리기 예시(최근 작품: napPod, stairs, generator…). 그림 스타일을 여기에 맞춘다
- `public/js/layout.js` — `K.cluster / deskSeat / wallX / wallY / blockRect` …
- `public/js/iso.js` — 그리기 도구

## 2. 좌표 · 그리기
- 타일 좌표 (x, y): x 는 화면 오른쪽 아래, y 는 왼쪽 아래 방향. 시점은 남동쪽(+x,+y) 위에서 내려다봄 → +y 면(left face)과 +x 면(right face)이 보인다.
- `P(x, y, z)` → 화면 좌표. 타일 1칸 = 가로 64px·세로 32px, z 는 위로 px. 한 층 높이 58px, 실내 벽 104px.
- `AIO.iso`: `P, shade(hex, ±k), rgba(hex, a), poly(ctx, pts, fill, stroke, lw), box(ctx,x,y,z,w,d,h,top,left,right,stroke), sbox(ctx,x,y,z,w,d,h,base,stroke), cylinder(ctx,x,y,z,r,h,top,side,stroke), ellipseFloor(ctx,cx,cy,rx,ry,z,fill,stroke), onPlaneY(ctx,x,y,z,(g)=>{...}) (+y 쪽 벽면에 2D로 그리기), onPlaneX(...), roundRect(ctx,x,y,w,h,r)`
- 글꼴: `AIO.art.FONT`. 밤: 소품 draw 의 `I.nightInfo.lamps` 가 true 면 밤(조명 켜기).
- 한 소품은 보통 `x..x+w, y..y+d` 바닥 영역 안에 그리고, 그 타일들을 `blockRect` 로 막는다.

### 소품 등록 (플러그인)
```js
const C = AIO.compose, { P, shade, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, roundRect } = AIO.iso;
C.prop('oa_palm', {
  draw(ctx, f, t, I) { /* f = 배치한 객체 그대로 ({type,x,y,...}) · t = 초(애니메이션) */ },
  depth: (f) => f.x + f.y + 0.5,   // 정렬 깊이 (생략 시 x+w/2+y+d/2 또는 x+y). 큰 소품은 앞쪽 모서리 쪽으로
  slice: 0.6,                      // 가로로 긴 소품(w≥1.5)을 1칸씩 잘라 정렬 (선택)
  dynamic: true,                   // 실외 저배율에서도 매 프레임 그릴 애니메이션 소품 (선택)
});
C.floorStyle('oa_sand', (g, x, y, w, d, base, r, seed) => { /* 실내 patch / 실외 k.area 의 style 로 사용 */ });
C.decal('oa_sea', (g, d, r) => { /* 실외 G.decals / 실내 L.decals 의 type 으로 사용 (정적, 캐시됨) */ });
```
배치: 실내 `K.add({ type: 'oa_palm', x, y, ... })` · 실외 `k.add({ type, x, y }, bx, by, bw, bd)` (뒤 4개 = 막을 타일).

### 이미 있는 소품 타입 (그대로 써도 됨)
desk chair plant lamp sofa roundTable stool cabinet whiteboard bookshelf storeShelf fridgeCase till kitchenLine pizzaOven breadCase flowerStand salonStation sushiBelt pcStation wallSign menuWall willow streetLamp busStop fountain monument parkedCar policeCar fireTruck truck gateBooth barrier container foodTruck cafeKiosk basket slide swingSet seesaw jungleGym merryGoRound sandboxRim bridge duck pondSign flag stage picnicTable goal hoop atmKiosk airCon aquarium arcade armchair ashtray atm barStool batteryRack bbq beanbag bed beerTap bench bigScreen bikeRack birdbath blackboard bookStack bossChair brandWall bunk canvasEasel catTree cctvWall cellToilet chiller cleanroomTool coatRack console coolantPipe coop dartboard deckChair depositBoxes doghouse drafting easel electricPanel elevPanel entrance execDesk exitSign extinguisher fence firePit firePole flagStand foosball forklift fridge gameTV gazebo gearRack generator goldStack gpuRack greenhouse hammock hedge highTable janitorCart koi labBench lectern lockers machine mailboxes massageChair menuStand model3d napPod nocWall palletRack parasol parasolTable parcelShelf partsBin pergola phoneBooth piano pingPong pipes planter printer readingTable reception robotArm robotDog roofTree sculpture seatRow serverRack specimenTank stoneLantern storageShelf stringLights tableSeg tellerCounter ticketMachine topiary toyBlocks trampoline treadmill tree trophyCase tv umbrellaStand upsCabinet vaultDoor veggies vending wallAC washer waterCooler waterTank weightRack whiteboard
(인자는 world.js `drawFurniture` 의 case 와 기존 사용처를 grep 해서 확인. 예: `{ type: 'tree', x, y, size, seed, kind: 'oak'|'pine'|'cherry'|'maple'|'ginkgo' }`, `{ type: 'parasolTable', x, y, color }`, `{ type: 'bench', x, y, w, color }`)
- 바닥 재질(patch/area style): wood carpet marble concrete tile grass deck raised (+ 플러그인)
- 바닥 데칼: 실내 `L.decals` — floor{color} hazard lane court pool flowers meadow pond sand rubber mat parking asphalt deckPath stones / 실외 `G.decals` — 위 + track court amphi solar

### 사람(세션 캐릭터)이 쓰는 자리
- 휴식 자리 `{ x, y, face: '+y'|'-y'|'+x'|'-x', pose: 'sit'|'sofa'|'stand', approach: [tx, ty]?, carry: 'mug'|'cig'|'icecream'|null, tag: '장소 이름' }`
  approach = 그 자리에 앉기 전에 서는 **걸을 수 있는 빈 타일** (의자·소파가 막혀 있을 때 필수).
- NPC(직원) `T.npc(L, '역할', { x, y, face, pose }, { anim: 'idle'|'type'|'think', hat: 'cap'|'beret'|'bow'|'bucket'|'hardhat'|'headphones'|'police'|'shades'|'beanie', accent: '#hex', tie, carry: 'paper'|'mop'|'tray'|'box', say: '말풍선', patrol: [{x,y,face}, …] })`

## 3. 실내(건물) 만들기
```js
C.indoor({ id: 'school', icon: '🏫', name: 'AI 고등학교', desc: '교실 업무층 · 과학실 · 음악실 · 급식실 · 옥상 운동장',
  build(S, o, ctx) {
    const T = C.tower(S, { W: 26, H: 18, id: 'school', name: '🏫 AI 고등학교', facade: { … } });
    // (선택) 지하: T.level('B1 …', 'concrete', '#c4c2bc', 'office', { basement: true }) — 깊은 곳부터 먼저!
    // 1F 로비 (필수): T.nextFloor(); const { L, K } = T.level('1F 로비', 'marble', '#f1eee8'); L.desc = '…';
    //   T.shell(L, K, { name: T.securityRoom(L, K), color: '#2b3a67' }); T.entrance(L, K); T.visitorSofa(L, K, x, y); + 테마 소품
    // 업무층 (필수 — 세션 자리가 여기서 생긴다): T.workFloors(o, { name: (n) => `${n}F 교실`, looks: [['wood','#e8d5b0']], deco(L, K, n) { … } })
    // 테마 층 2~4개: T.nextFloor(); T.level(`${n}F 과학실`, …); T.shell(L, K, {name,color,glass}); 방 · 소품 · T.rest(…) · T.npc(…)
    // 옥상 (필수): T.roof({ name: 'R 옥상 운동장', kind: 'garden', desc: '…' })  (또는 직접 T.level(..., 'roof', {short:'R'}) 로 꾸미기 — 엘리베이터 탑은 T.roof 코드 참고)
    return T.done();
  } });
```
- **plate 크기**: W 20~40, H 16~26 (W ≥ 22 권장). 층마다 같은 크기. 층 수는 지하 포함 6~14.
- `T.shell` 이 차지하는 곳: 뒤쪽 오른편 `x ∈ [W-15, W)`, `y ∈ [0, 5)` (엘리베이터 2대·화장실·계단) + 복도 `y 5~7` 전체 폭. 왼편 뒤 `x ∈ [0, W-15)`, `y ∈ [0, 5)` 는 roomA(방 하나, 문은 x=W-16). 테마 내용은 `y ≥ 7`.
- 모든 층(옥상 제외)에 `T.shell` 을 호출해야 엘리베이터로 연결된다. 1F 정문은 `doorX`(기본 floor(W/2)) 앞쪽 벽 y=H.
- `T.workFloors` 는 팀 테이블(폭 = 팀원수 기준, 깊이 6)을 y=7 줄(H≥24면 y=14 줄도)에 깔고 앞쪽 띠(y H-2..H)에 휴식 소파를 둔다. 테마를 입히려면 looks / name / deco 를 쓴다 (deco 에서 앞쪽 띠·벽 장식 추가 가능, 단 y 7~13 은 비워 둘 것).
- 휴식 자리: 건물 전체에 **10개 이상** (업무층 소파 제외). 회의 자리 `T.meeting(L, {x,y,face})` 도 있으면 좋다.
- **흔한 버그**: 벽의 문(doors)이 열리는 바로 앞/뒤 타일이 소품으로 막혀 방 전체에 못 들어감. 문 칸 양쪽 타일은 반드시 비워 둔다. 하네스가 잡아 준다.
- `L.desc` 모든 층에 (층 버튼 툴팁 · '📍 현재 층' 에 보임). 방마다 `T.sign(L, x, y, '🧪 과학실', '#색')`.
- facade(외관) 필수 — 건물마다 확 달라 보이게:
  `{ wall: '#hex', texture: 'brick'|'wood'|'stripes'|'concrete'|'panel', win: 'glass'|'grid'|'arch'|'band'|'round'|'small'|'none', winColor, frame, trim, sign: '간판 글자', signBg, signFg, lobby: '1층 유리색', awning: '#hex 줄무늬 차양', paint(g, o) { /* 외벽에 추가로 그리기: o = { len(타일), Wpx, Hb, FP, k0, k1, dark(옆면), south(정면), night, t } — 2D 캔버스, 아래가 지면 */ } }`

## 4. 실외(부지) 만들기
```js
C.outdoor({ id: 'beach', icon: '🏖️', name: '해변', desc: '모래사장 · 바다 · 파라솔 · 서핑 · 구조대',
  size: (B) => ({ W: B.W + 40, H: B.H + 30 }),        // B = 건물 { W, H, doorX, base, levels } — 건물 크기에 비례해서!
  lot(S, OUT, B, k) {
    OUT.ground.base = { color: '#ecd9a8', tufts: null, edge: '#b89a62', edge2: '#a68a55' };  // 바탕(모래)
    k.place(B, TX, TY);                                   // ★ 맨 먼저: 건물 앉히기 (발자국 막기 · 정문 연결). k.front = 정문 y, k.right = 건물 오른쪽 x
    … 꾸미기 …
    S.door = { lv: OUT.idx, x, y, face: '-y' };           // 세션이 나타나고 떠나는 곳 (부지 가장자리 · 걸을 수 있는 칸)
  } });
```
- **어떤 건물에도 맞아야 한다**: 꼬마빌딩 22×16(+지하), 연구동 40×24, 원룸 오피스 약 51×35, 선셋 글래스 오피스 약 55×37. 모든 좌표는 `B.W, B.H, k.front, k.right, TX, TY` 기준으로 계산. 고정 좌표 금지(가장자리 장식 제외).
- 부지 크기 대략 (B.W+24~50) × (B.H+22~40). 너무 크면 느려진다(최대 약 130×110).
- `k` (부지 키트): `place, add(f, bx, by, bw, bd), solid, mark, free(x,y,w,d), walk(x,y,w,d) (포장 보도), plaza(x,y,w,d,color), area(x,y,w,d,style,color,paved) (바닥 재질 영역), water(x,y,w,d,decal) (못 걷는 물), pond(cx,cy,rx,ry), road(y,name,x0,x1) (차도 4칸, 차가 다님), cross(road, x) (횡단보도+신호등), tree(x,y,size,kind), rest(spot, tag), npc(role, home, opts), sign(x,y,text,color), curve(pts, w) (곡선 산책로), placeIn(rx,ry,rw,rd,w,d,fn) (영역 안 빈자리 찾기), G (ground: decals, fell(꽃밭 타원), curves, rounds …), W, H, used`
- 물 위 다리: `OUT.bridges = [{ x, y, w, d }]` 칸은 걸을 수 있게 된다 (+ `k.add({type:'bridge', x, y, w})`).
- 휴식 자리 **12개 이상**, NPC 2~6명, 표지판 4개 이상. 가능하면 `S.pets = [{ kind: 'dog'|'cat'|'duck'|'hen', color, near:[x,y], chicks }]`, 가족 피크닉 `S.park = { mats: [{x,y,seats:[…]}], wander: [{x,y,face}], play: [{x,y,face,pose}] }` (마당 예시 참고).
- 도로를 깔면 `S.traffic = { roads: k.roads, cross: k.G.cross }` 를 꼭 넣는다 (차가 다닌다).
- 건물 정문(TX + B.doorX, k.front) 앞에서 S.door 까지 **걸어갈 수 있어야 한다** (물·울타리로 막지 말 것).

## 5. 확인 방법
1. `node tools/maptest.mjs <실내id> <실외id>` — 오류 · 벽 통과 · 못 가는 자리 수. **모두 0 이어야 한다.**
   - 실내: `<id> yard`, `<id> none`, `<id> campus` 세 가지 모두 통과
   - 실외: `kkoma <id>`, `lab <id>`, `office <id>`, `terrace <id>` 네 가지 모두 통과
   - `ONLY=in node tools/maptest.mjs` / `ONLY=out …` 전체 목록
2. 브라우저 미리보기 (그림 확인 — 꼭 몇 번은 보고 고칠 것):
   - 내장 브라우저에서 **새 탭을 만들어(tabs_create) 그 탭만** 쓴다. 다른 탭은 건드리지 않는다.
   - 주소 `http://127.0.0.1:17777/?map=<실내id>|<실외id>` (저장 안 되는 미리보기)
   - 카메라: `const D = window.AIO_DEBUG; D.enter('tower', 층레벨idx); const [sx, sy] = AIO.iso.P(x, y, z); D.cam.tx = sx; D.cam.ty = sy; D.cam.tz = 1.2;` (실외 좌표 = 층 L.ox + x). `D.world.S` 가 장면. 층 목록: `D.world.S.levels.map(l => l.idx + ':' + l.name)`
   - 스크린샷은 `computer { action: 'screenshot', tabId }` 또는 `zoom`. 맵당 2~4장 정도.
3. 그림 품질: 기존 소품처럼 깔끔한 면 셰이딩(위 밝게 · +y면 중간 · +x면 어둡게), 얇은 외곽선, 파스텔 톤. 겹침/잘림 없게 depth 조정.

## 6. 끝나면
최종 보고: 만든 맵 id·이름 목록, 각 하네스 결과, 새 소품 목록, 엔진 쪽에 필요한 수정(있다면).
