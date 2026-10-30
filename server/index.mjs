// AI OFFICE collector — zero-dependency Node server.
//   node server/index.mjs [--open]        (기본 http://127.0.0.1:17777 — 포트 · 주소는 data/server.json 또는 AI_OFFICE_PORT/HOST, AI-OFFICE.exe 에서 설정)
// Binds to 127.0.0.1 by default. Serves ../public and a normalized live state of AI sessions.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { ClaudeAdapter } from './adapters/claude.mjs';
import { CodexAdapter } from './adapters/codex.mjs';
import { GeminiAdapter } from './adapters/gemini.mjs';
import { ProcessAdapter } from './adapters/processes.mjs';
import { IngestAdapter } from './adapters/ingest.mjs';
import { classifyTool, ICON } from './activity.mjs';
import { shorten, now } from './util.mjs';
import { handleAuth, isAuthed, isConfigured, tokenValid, requestToken, viewerOf, viewerOfToken } from './auth.mjs';
import { stateFor, allowed } from './access.mjs';
import * as econ from './economy.mjs';
import { Webhooks } from './webhooks.mjs';
import { routesV6 } from './routes_v6.mjs';
import { TccSync } from './tcc.mjs';
import { AutoAttend } from './mgm.mjs';
import { columnOf } from './webhooks.mjs';
import { redactState } from './redact.mjs';
import { Details } from './details.mjs';
import { Summarizer } from './summary.mjs';
import { DATA_DIR } from './auth.mjs';
import { personaOf } from './persona.mjs';
import * as chars from './characters.mjs';
import { applyMeta, settings as metaSettings, building, policyOf, getMeta, patchMeta } from './meta.mjs';
import { Archive } from './archive.mjs';
import { routesV4 } from './routes_v4.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');
const args = process.argv.slice(2);
// 포트 · 주소: server/config.mjs (기본 17777 · 127.0.0.1). 훅 브리지도 같은 설정을 읽는다.
import { PORT, HOST, SELF_HOSTS, URL_SELF, PID_FILE, LAUNCHER_KEY } from './config.mjs';
import crypto from 'node:crypto';
const TICK = 1500;

const ingest = new IngestAdapter();
const procs = new ProcessAdapter();
const claude = new ClaudeAdapter({ opts: () => metaSettings() });
const codex = new CodexAdapter();
// Register new transcript-based providers here.
const ADAPTERS = [
  claude,
  codex,
  new GeminiAdapter(),
  new GeminiAdapter({ dirName: '.qwen', provider: 'qwen', app: 'Qwen Code' }),
].filter((a) => a.available());

let state = { ts: 0, host: os.hostname(), mode: 'live', adapters: [], sessions: [], feed: [] };
let stateJson = '';      // full state (logged in)
let publicJson = '';     // redacted state (everyone else)
const prevStatus = new Map();
const globalFeed = [];
const clients = new Map(); // SSE res -> { token (null = public), last (마지막으로 보낸 내용) }
const details = new Details({ claude: ADAPTERS.includes(claude) ? claude : null, codex: ADAPTERS.includes(codex) ? codex : null, getState: () => state });
const summarizer = new Summarizer();
const archive = new Archive({ fileFor: (s) => details.fileFor(s), settings: metaSettings });   // 세션 보관함 (archive/)
let handleV4 = null, handleV6 = null;
const hooks = new Webhooks(() => metaSettings().webhooks);   // 칸반 연동
const autoAttend = new AutoAttend({ getCfg: () => metaSettings().mgm, feed: (text) => globalFeed.push({ t: now(), icon: '🏢', text, kind: 'notify' }), log: (...a) => log(...a) });   // 행정 자동 출퇴근
const tccSync = new TccSync({ getCfg: () => metaSettings().tcc, getLink: (id) => getMeta(id)?.task || null, setLink: (id, task) => patchMeta(id, { task }), columnOf, log: (...a) => log(...a) });   // FlowBoard 카드 자동 갱신
let lastTick = Date.now();
const accessOpts = () => ({ policyOf, defaults: metaSettings().disclosureDefault, configured: isConfigured() });

function applyOverlays(sessions) {
  const t = now();
  for (const s of sessions) {
    const o = ingest.overlays.get(s.id);
    if (!o) continue;
    // expire, or drop as soon as the transcript moves on (e.g. the permission was answered)
    if (t - o.at > o.ttl || s.lastActive > o.at + 1500) { ingest.overlays.delete(s.id); continue; }
    if (o.status) s.status = o.status;
    if (o.activity) s.activity = { ...s.activity, ...o.activity, since: o.at };
  }
}

const STATUS_FEED = {
  waiting_input: ['🙋', '대표님 결정이 필요해요'],
  waiting_permission: ['✋', '승인을 기다려요'],
  done: ['✅', '작업을 마쳤어요'],
};

function collect() {
  let sessions = [];
  const used = [];
  for (const a of ADAPTERS) {
    try { const s = a.scan(); sessions.push(...s); if (s.length) used.push(a.name); }
    catch (e) { console.error(`[${a.name}]`, e.message); }
  }
  applyOverlays(sessions);
  sessions.push(...ingest.scan());
  sessions.push(...procs.scan(sessions));
  sessions.push(...chars.inject(sessions));          // 직접 만든 캐릭터 (독립 직원 · 세션에 입힌 인적사항)
  // where each session belongs on the campus (decided here because titles are hidden from logged-out viewers):
  //   paused  — title says 일시정지 → rest areas   ·   stopped — title says 중단, or idle 3h+ → factory   ·   active → tower
  //   jail — 유치장/감금 in the title or sent there from the detail panel · vault — 금고/보관 or stored from the panel
  for (const s of sessions) {
    const title = String(s.title || '');
    const ov = placeOverrides[s.id];
    s.placeOverride = ov || undefined;
    s.place = ov || (s.source === 'custom' ? s.place : s.kind === 'app' ? 'active' : /유치장|감금/.test(title) ? 'jail' : /금고|보관/.test(title) ? 'vault'
      : /일시\s*정지/.test(title) ? 'paused' : (/중단/.test(title) || s.status === 'sleeping') ? 'stopped' : 'active');
    applyMeta(s);                                      // 메모 · 결정 알림 해제 · 고정 · 동작 · 배치
    chars.afterMeta(s);
    if (s.custom && s.custom.linked) s.basePersona = personaOf(s.id, (getMeta(s.id) || {}).persona, metaSettings().personaAuto !== false);   // 공개 범위 밖 사람에게 보일 원래 인물
    s.persona = s.kind === 'app' ? null : s.custom ? personaOf(s.id, s.custom.persona, true) : personaOf(s.id, (getMeta(s.id) || {}).persona, metaSettings().personaAuto !== false);   // 캐릭터 이름 · 국적
  }
  // 사내 재화: 일한 만큼 벌고, 알아서 먹고 사고
  { const nowMs = Date.now(), dt = Math.min(10e3, nowMs - lastTick); lastTick = nowMs; const set = metaSettings();
    const pay = { payOn: set.payOn !== false, payBase: Number(set.payBase) || 3000, payStep: Number(set.payStep) || 0, payRaise: Number(set.payRaise) || 0, payYearDays: Number(set.payYearDays) || 7,
      bankLoanRate: Number(set.bankLoanRate) || 0, bankLateAdd: Number(set.bankLateAdd) || 0, bankDepositRate: Number(set.bankDepositRate) || 0, bankLimitMonths: Number(set.bankLimitMonths) || 6, bankAutoRepay: Number(set.bankAutoRepay) || 0, bankCredit: set.bankCredit !== false, companyPays: set.companyPays !== false };
    const bought = econ.tick(sessions, dt, Number(set.econRate) || 1, set.econAuto !== false, pay);
    for (const b of bought) {
      const s = sessions.find((x) => x.id === b.sid);
      if (b.pay) globalFeed.push({ t: now(), icon: '💵', sid: b.sid, text: `${shorten(s?.title || '', 20)} · 일급 ${b.pay.amount} 코인 지급${b.pay.days > 1 ? ` (${b.pay.days}일치)` : ''}`, kind: 'purchase' });
      else globalFeed.push({ t: now(), icon: b.item.icon, sid: b.sid, text: `${shorten(s?.title || '', 20)} · ${b.item.name} 구매 (💰${b.item.price})`, kind: 'purchase' });
    }
    for (const id of econ.bankTick(pay, nowMs)) {   // 새로 신용불량이 된 직원
      const s = sessions.find((x) => x.id === id);
      globalFeed.push({ t: now(), icon: '💸', sid: id, text: `${shorten(s?.title || '', 20)} · 신용불량 (대출이 한도를 넘음)`, kind: 'notify' });
      if (set.bankJail && s && !placeOverrides[id]) { setPlace(id, 'jail'); globalFeed.push({ t: now(), icon: '🚔', sid: id, text: `${shorten(s?.title || '', 20)} · 빚을 못 갚아 감옥행`, kind: 'notify' }); }
    }
    for (const s of sessions) s.wallet = econ.walletOf(s.id, s, pay); }

  // status-change events → global feed
  const t = now();
  for (const s of sessions) {
    const p = prevStatus.get(s.id);
    if (p && p !== s.status && STATUS_FEED[s.status]) {
      const [icon, text] = STATUS_FEED[s.status];
      globalFeed.push({ t, icon, sid: s.id, text: `${shorten(s.title, 24)} · ${text}`, kind: s.status });
    }
    if (!p && state.ts) globalFeed.push({ t, icon: '🚪', sid: s.id, text: `${shorten(s.title, 24)} 출근`, kind: 'enter' });
    prevStatus.set(s.id, s.status);
  }
  for (const id of [...prevStatus.keys()]) {
    if (!sessions.some((s) => s.id === id)) { prevStatus.delete(id); globalFeed.push({ t, icon: '👋', sid: id, text: '세션 종료 · 퇴근', kind: 'leave' }); }
  }
  if (globalFeed.length > 80) globalFeed.splice(0, globalFeed.length - 80);
  const merged = [...globalFeed];
  for (const s of sessions) for (const f of s.feed || []) if (t - f.t < 3600e3) merged.push({ ...f, sid: s.id, text: `${shorten(s.title, 18)} · ${f.text}${f.n > 1 ? ` ×${f.n}` : ''}` });
  merged.sort((a, b) => b.t - a.t);

  state = { ts: t, host: os.hostname(), mode: 'live', adapters: [...new Set([...ADAPTERS.map((a) => a.name), 'processes', 'ingest'])], sessions, feed: merged.slice(0, 60), building: building(), ranks: { scheme: metaSettings().rankScheme, custom: metaSettings().rankCustom } };
  try { hooks.scan(sessions); } catch (e) { log('webhook:', e.message); }
  try { tccSync.scan(sessions); } catch (e) { log('tcc:', e.message); }
  try { autoAttend.scan(sessions); } catch (e) { log('attend:', e.message); }
  publish();
  archive.tick(sessions).catch((e) => log('archive:', e.message));
}

// serialize both views once per tick; push to each SSE client the one it may see
function publish(force = false) {
  // 보는 사람(비로그인 · 등급 계정 · 관리자)마다 서버에서 걸러 낸 상태만 보낸다 — 받지 않은 정보는 브라우저 어디에도 없다
  const strip = (j) => j.replace(/"ts":\d+,/, '');
  const cache = new Map();
  const variant = (viewer) => {
    const k = viewer ? (viewer.admin ? 'A' : 'T' + viewer.tier) : 'P';
    if (!cache.has(k)) cache.set(k, JSON.stringify(stateFor(state, viewer, accessOpts())));
    return cache.get(k);
  };
  stateJson = variant({ admin: true, user: 'admin' });
  publicJson = variant(null);
  for (const [res, c] of clients) {
    let viewer = c.token ? viewerOfToken(c.token) : null;
    if (c.token && !viewer) c.token = null;          // 로그아웃 · 만료 → 이 연결은 공개 상태로 내린다
    const json = variant(viewer);
    if (force || strip(json) !== c.last) { c.last = strip(json); res.write(`data: ${json}\n\n`); }
  }
}

// --- Claude Code hook translation (optional precision for permission prompts) ---
function claudeHook(h) {
  const sid = h.session_id;
  if (!sid) return;
  const ev = h.hook_event_name;
  if (ev === 'Notification') {
    const msg = String(h.message || '');
    const perm = /permission|승인|허가|approve/i.test(msg) || h.notification_type === 'permission_prompt';
    if (perm) ingest.overlay({ provider: 'claude', sessionId: sid, status: 'waiting_permission', activity: { type: 'ask', label: '승인 대기', detail: shorten(msg, 160) }, ttl: 900 });
    else if (/waiting for your input|idle/i.test(msg)) ingest.overlay({ provider: 'claude', sessionId: sid, status: 'done', activity: { type: 'done', label: '완료 · 확인 필요', detail: shorten(msg, 160) }, ttl: 60 });
  } else if (ev === 'PreToolUse') {
    const act = classifyTool(h.tool_name, h.tool_input);
    ingest.overlay({ provider: 'claude', sessionId: sid, status: act.type === 'ask' ? 'waiting_input' : 'tool', activity: act, ttl: 30 });
  } else if (ev === 'PostToolUse' || ev === 'Stop' || ev === 'UserPromptSubmit' || ev === 'SubagentStop') {
    ingest.overlays.delete('claude:' + sid);
  }
}

// --- HTTP ---
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8' };

// CORS is open (no credentials): logged-in data needs an explicit `Authorization: Bearer` token,
// and cookies only count on our own page (see auth.mjs), so another site can't ride a login.
/** 보안 헤더: 스크립트는 이 서버 것만 · 다른 사이트에 끼워 넣기 금지 · MIME 추측 금지 · 리퍼러 안 보냄 */
function secHeaders(res, p) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (res.req && /https/.test(String(res.req.headers['cf-visitor'] || res.req.headers['x-forwarded-proto'] || ''))) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  if (!p.startsWith('/api/')) res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' ${SELF_HOSTS.map((h) => 'http://' + h).join(' ')}; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || 'null')); } catch { resolve(null); } });
  });
}

function sendJSON(res, status, body, { pub = false, headers = {}, cookie } = {}) {
  if (pub) cors(res);
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers };
  if (cookie) h['Set-Cookie'] = cookie;
  res.writeHead(status, h);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

// sessions sent to the police station's holding cell / the bank vault from the detail panel (persisted)
const PLACE_FILE = path.join(DATA_DIR, 'places.json');
let placeOverrides = {};
try { placeOverrides = JSON.parse(fs.readFileSync(PLACE_FILE, 'utf8')) || {}; } catch {}
function setPlace(id, place) {
  if (place === 'jail' || place === 'vault' || place === 'dungeon') placeOverrides[id] = place; else delete placeOverrides[id];
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PLACE_FILE, JSON.stringify(placeOverrides, null, 1)); } catch (e) { console.error('[places]', e.message); }
}

const PUBLIC_PATHS = new Set(['/api/state', '/api/stream', '/api/events', '/api/hook/claude', '/api/auth/me']);
const SESSION_RE = /^\/api\/session\/([^/]+)\/(detail|summary)$/;
const AGENT_RE = /^\/api\/agent\/([^/]+)\/([^/]+)$/;
const dec = (s) => { try { return decodeURIComponent(s); } catch { return null; } };

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  secHeaders(res, p);
  const ingestPath = p === '/api/events' || p === '/api/hook/claude';
  if (p.startsWith('/api/') && !ingestPath) cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (p === '/api/server/shutdown' && req.method === 'POST') {
    const fwd = !!(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers['cf-ray']);
    let key = ''; try { key = fs.readFileSync(LAUNCHER_KEY, 'utf8').trim(); } catch {}
    const given = String(req.headers['x-aio-launcher'] || '');
    const ok = !fwd && key.length >= 32 && given.length === key.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key)) && SELF_HOSTS.includes(String(req.headers.host || '').toLowerCase());
    if (!ok) return sendJSON(res, 403, { error: 'forbidden' });
    sendJSON(res, 200, { ok: true });
    log('실행기 요청으로 종료합니다');
    setTimeout(() => process.exit(0), 300);
    return;
  }
  const auth = await handleAuth(req, p, readBody);
  if (auth) {
    sendJSON(res, auth.status, auth.body, { pub: auth.public, headers: auth.headers, cookie: auth.cookie });
    if (auth.changed) publish(true); // "configured" flipped
    return;
  }

  if (p === '/api/state') {
    if (!stateJson) publish();
    const viewer = viewerOf(req);
    return sendJSON(res, 200, JSON.stringify(stateFor(state, viewer, accessOpts())), { pub: !viewer });
  }
  if (p === '/api/stream') {
    if (clients.size >= 200) return sendJSON(res, 503, { error: '접속이 너무 많아요' });
    if (!stateJson) publish();
    const viewer = viewerOf(req);
    const token = viewer ? requestToken(req) : null;
    if (!token) cors(res);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    const first = JSON.stringify(stateFor(state, viewer, accessOpts()));
    res.write(`retry: 2000\ndata: ${first}\n\n`);
    clients.set(res, { token, last: first.replace(/"ts":\d+,/, '') });
    const ping = setInterval(() => res.write(': ping\n\n'), 20e3);
    req.on('close', () => { clients.delete(res); clearInterval(ping); });
    return;
  }
  // 세션 신호 입구(이벤트 · 훅)는 이 PC 에서 직접 온 요청만 받는다 (Cloudflare 터널 · 프록시를 거친 요청은 거부)
  const forwarded = !!(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers['cf-ray']);
  if (ingestPath && req.method === 'POST') {
    if (forwarded && !isAuthed(req)) return sendJSON(res, 403, { error: '수집 입구는 이 PC 에서만 쓸 수 있어요' });
    const host = String(req.headers.host || '').toLowerCase(), origin = req.headers.origin;
    if (!SELF_HOSTS.includes(host)) return sendJSON(res, 403, { error: 'host' });                  // DNS 리바인딩 막기
    if (origin && !(origin === 'null' || SELF_HOSTS.some((h) => origin === 'http://' + h)) && !/^(chrome|moz)-extension:/.test(origin)) return sendJSON(res, 403, { error: '다른 사이트에서 보낸 신호는 받지 않아요' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return sendJSON(res, 403, { error: 'cross-site' });
    if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return sendJSON(res, 415, { error: 'JSON 만 받아요' });
  }
  if (p === '/api/events' && req.method === 'POST') {
    const body = await readBody(req);
    const list = Array.isArray(body) ? body : [body];
    let n = 0;
    for (const ev of list.slice(0, 50)) if (ingest.accept(ev)) n++;
    res.writeHead(n ? 200 : 400, { 'Content-Type': 'application/json' });
    collect();
    return res.end(JSON.stringify({ ok: n > 0, accepted: n }));
  }
  if (p === '/api/hook/claude' && req.method === 'POST') {
    const body = await readBody(req);
    if (body) claudeHook(body);
    collect();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('{}');
  }

  // --- logged-in only (bearer token, or cookie on our own page) ---
  if (p === '/api/place') {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: 'login required' });
    if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
    const body = (await readBody(req)) || {};
    if (typeof body.id !== 'string' || !body.id || ![null, undefined, 'jail', 'vault', 'dungeon'].includes(body.place)) return sendJSON(res, 400, { ok: false, error: 'id, place(jail|vault|dungeon|null)' });
    setPlace(body.id, body.place || null);
    collect();
    return sendJSON(res, 200, { ok: true, place: body.place || null });
  }
  const sm = p.match(SESSION_RE);
  const am = p.match(AGENT_RE);
  if (sm || am || p === '/api/insights') {
    if (!isAuthed(req)) {
      // 등급 계정: 이 세션의 대화 · 진행 공개가 허용됐을 때만, 허용된 부분만
      const viewer = viewerOf(req);
      if (!viewer || !sm || sm[2] !== 'detail' || req.method !== 'GET') return sendJSON(res, viewer ? 403 : 401, { error: viewer ? '이 정보는 공개되지 않았어요' : 'login required' });
      const sid = dec(sm[1]);
      const pol = policyOf(sid), defs = metaSettings().disclosureDefault;
      const okC = allowed(pol, defs, 'conversation', viewer.tier), okP = allowed(pol, defs, 'progress', viewer.tier);
      if (!okC && !okP) return sendJSON(res, 403, { error: '이 세션의 상세 정보는 공개되지 않았어요' });
      const r = await details.detail(sid);
      if (r.status !== 200) return sendJSON(res, r.status, r.body);
      const pub = JSON.parse(JSON.stringify(stateFor({ ...state, sessions: [r.body.session] }, viewer, accessOpts()).sessions[0]));
      const body = { session: pub, scan: r.body.scan, conversation: okC ? r.body.conversation : [], progress: okP ? r.body.progress : { turns: [], todos: [], filesTouched: [], commands: [], errors: [], summary: '' }, insights: okP ? r.body.insights : null, tips: okP ? r.body.tips : [], agents: okP ? r.body.agents : [], limited: { conversation: !okC, progress: !okP } };
      return sendJSON(res, 200, body);
    }
    if (p === '/api/insights') {
      if (req.method !== 'GET') return sendJSON(res, 405, { error: 'GET only' });
      const r = await details.global();
      return sendJSON(res, r.status, r.body);
    }
    if (am) {
      const sid = dec(am[1]), aid = dec(am[2]);
      if (!sid || !aid || req.method !== 'GET') return sendJSON(res, 400, { error: 'bad request' });
      const r = await details.agent(sid, aid);
      return sendJSON(res, r.status, r.body);
    }
    const id = dec(sm[1]);
    if (!id) return sendJSON(res, 400, { error: 'bad request' });
    if (sm[2] === 'detail') {
      if (req.method !== 'GET') return sendJSON(res, 405, { error: 'GET only' });
      const r = await details.detail(id);
      return sendJSON(res, r.status, r.body);
    }
    if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
    const s = details.findSession(id);
    if (!s) return sendJSON(res, 404, { error: '세션을 찾을 수 없어요' });
    const an = details.analyzer(s);
    if (!an) return sendJSON(res, 400, { error: '이 세션은 기록 파일이 없어서 AI 요약을 만들 수 없어요' });
    await an.update(true);
    const r = await summarizer.summarize(s, an);
    return sendJSON(res, r.status, r.body);
  }
  if (!handleV6) handleV6 = routesV6({ getState: () => state, archive, collect: safeCollect, hooks, details, tccSync, autoAttend });
  if (p.startsWith('/api/') && (await handleV6(req, res, p, url))) return;
  if (!handleV4) handleV4 = routesV4({ getState: () => state, archive, collect: safeCollect });
  if (p.startsWith('/api/') && (await handleV4(req, res, p, url))) return;
  if (p.startsWith('/api/')) return sendJSON(res, 404, { error: 'not found' });

  // static
  let sp = dec(p);
  if (sp == null) { res.writeHead(400); return res.end(); }
  if (sp === '/') sp = '/index.html';
  const fp = path.resolve(PUBLIC, '.' + sp);
  if (fp !== PUBLIC && !fp.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    log('request error:', req.url, e.stack || e.message);
    try { if (!res.headersSent) sendJSON(res, 500, { error: '서버 오류' }); else res.end(); } catch {}
  });
});
export { handle, collect };

// --- runs unattended (auto-started at logon, no window): log to file, never die on a bad record ---
const LOG = path.resolve(__dirname, '..', 'ai-office.log');
function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}\n`;
  process.stdout.write(line);
  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > 2e6) fs.renameSync(LOG, LOG + '.old');
    fs.appendFileSync(LOG, line);
  } catch {}
}
process.on('uncaughtException', (e) => log('uncaught:', e.stack || e.message));
process.on('unhandledRejection', (e) => log('unhandled:', e?.stack || e));

const openBrowser = () => exec(process.platform === 'win32' ? `start "" "${URL_SELF}"` : `open "${URL_SELF}"`);

server.on('error', async (e) => {
  if (e.code === 'EACCES') {
    log(`포트 ${PORT}을 윈도우가 예약(excludedportrange, Hyper-V/WinNAT)해서 열 수 없어요. 이 PC의 동적 포트 범위(netsh int ipv4 show dynamicport tcp)를 확인하세요.`);
    process.exit(1);
  }
  if (e.code !== 'EADDRINUSE') { log('server error:', e.message); process.exit(1); }
  // single instance: if AI OFFICE already owns this port, just reuse it
  try {
    const r = await fetch(URL_SELF + 'api/state', { signal: AbortSignal.timeout(1500) });
    const j = await r.json();
    if (j && j.mode === 'live') {
      log(`이미 실행 중인 AI OFFICE를 사용합니다 → ${URL_SELF}`);
      if (args.includes('--open')) openBrowser();
      process.exit(0);
    }
  } catch {}
  log(`포트 ${PORT}을 다른 프로그램이 쓰고 있어요. 그 프로그램을 종료하거나 AI-OFFICE.exe 에서 다른 포트를 고르세요.`);
  process.exit(1);
});

const safeCollect = () => { try { collect(); } catch (e) { log('collect error:', e.stack || e.message); } };
// AI_OFFICE_NO_LISTEN=1 → import the handler without opening the port (offline checks only)
// 실행기(AI-OFFICE.exe)용: PID 파일 · 종료 열쇠(이 PC 의 실행기만 아는 무작위 값)
const writePid = () => { try { fs.mkdirSync(path.dirname(PID_FILE), { recursive: true }); fs.writeFileSync(PID_FILE, JSON.stringify({ pid: process.pid, port: PORT, host: HOST, started: Date.now() })); } catch {} };
const clearPid = () => { try { const j = JSON.parse(fs.readFileSync(PID_FILE, 'utf8')); if (j.pid === process.pid) fs.unlinkSync(PID_FILE); } catch {} };
process.on('exit', clearPid);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK']) process.on(sig, () => { log(`종료 신호(${sig})`); process.exit(0); });
if (process.env.AI_OFFICE_NO_LISTEN !== '1') server.listen(PORT, HOST, () => {
  writePid();
  safeCollect();
  setInterval(safeCollect, TICK);
  log(`🏢 AI OFFICE ${URL_SELF} · adapters: ${ADAPTERS.map((a) => a.name).join(', ')} + processes + ingest · sessions: ${state.sessions.length}`);
  if (args.includes('--open')) openBrowser();
});
