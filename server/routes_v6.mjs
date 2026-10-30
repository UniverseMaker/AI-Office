// v6 API: 등급 계정 · 정보공개 정책 · 사내 재화 · 칸반 웹훅 · 세션 전송(세션 스위처 연동)
//   관리자 전용: /api/users · /api/disclose · /api/econ/* · /api/webhooks/*
//   전송: /api/transfer/v1/*  ← 내려받기: API 키 scope transfer · sync · full / 올리기 · 동기화: scope sync · full (또는 관리자 로그인). 문서: GET /api/transfer/v1 · /docs/sync-api.html
import fs from 'node:fs';
import crypto from 'node:crypto';
import { isAuthed, listUsers, createUser, updateUser, deleteUser, TIERS } from './auth.mjs';
import { patchMeta, settings, setSettings, keyOf } from './meta.mjs';
import { CATS } from './access.mjs';
import * as econ from './economy.mjs';
import { COLUMN_KEYS, DEFAULT_COLUMNS } from './webhooks.mjs';
import { listConversations, streamBundle, transcriptPath } from './transfer.mjs';
import * as sync from './sync.mjs';
import { tcc, DEFAULT_TCC, setToken, hasToken, tokenStatus, allowedProxy, cardFromSession } from './tcc.mjs';
import { getMeta } from './meta.mjs';
import * as M from './mgm.mjs';
import * as chars from './characters.mjs';
import { localNames } from './names.mjs';
import { cleanPersona, randomName, randomNation, nationList, personaOf, MBTI, HOBBY, GENDERS } from './persona.mjs';
import * as vault from './vault.mjs';
import { viewerOf, DATA_DIR } from './auth.mjs';
import path from 'node:path';

const TIMER_FILE = path.join(DATA_DIR, 'timer.json');
import { publicHttps } from './util.mjs';
let timerDb = {}; try { timerDb = JSON.parse(fs.readFileSync(TIMER_FILE, 'utf8')) || {}; } catch {}

const dec = (s) => { try { return decodeURIComponent(s); } catch { return null; } };
function readJSONBody(req, limit = 1e6) {
  return new Promise((resolve) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { req.destroy(); resolve(null); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')); } catch { resolve(null); } });
  });
}
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };

export const TRANSFER_DOCS = {
  name: 'AI OFFICE 세션 전송 · 동기화 API', version: 'v1',
  for: '클로드 코드세션 스위처 (github.com/UniverseMaker/Claude-Desktop-Application-Cowork-and-Code-Session-Transfer) · 오프라인 작업 도구 · 그 밖의 백업 도구',
  docs_html: '/docs/sync-api.html',
  auth: 'Authorization: Bearer aio_… 또는 X-API-Key: aio_… — 관리 센터 › 연동 › API 키. 내려받기만: scope "transfer" · 올리기(동기화)까지: scope "sync" (또는 "full"). 관리자 로그인 토큰도 됨.',
  format: '세션 스위처 백업 형식(manifest_version 2) zip — manifest.json · transcripts/<id>.jsonl · sidecars/<id>/… · records/<id>.json. 내려받은 zip 의 manifest.sync.base 에 각 대화의 지문(sha256)이 들어 있어, 다시 올릴 때 이 PC 쪽도 그 사이 바뀌었는지 알려 준다.',
  flow: ['1) GET /bundle?ids=… 로 내려받기', '2) 다른 컴퓨터에서 이어서 작업', '3) 그 컴퓨터의 대화를 같은 형식 zip 으로 묶어 올리기 (작으면 POST /sync, 크면 POST /uploads → PUT 조각 → POST /uploads/{id}/preview)', '4) 미리 보기 확인 후 POST /uploads/{id}/apply — 줄 단위 병합(기본) · 고른 대화만 덮어쓰기', '5) 문제 있으면 POST /uploads/{id}/undo'],
  merge: '대화는 줄 단위 병합: 이 PC 의 줄은 그대로, 올린 쪽에만 있는 줄을 뒤에 붙임(어느 쪽도 잃지 않음). overwrite 로 고른 대화만 올린 것으로 바꿈. 보조 기록은 없는 파일만 채움. 등록 파일은 이 PC 에 없을 때만. 지금 돌고 있는 세션은 건너뜀(force_live). 바꾸기 전 원본은 서버에 백업 → undo.',
  endpoints: [
    ['GET', '/api/transfer/v1/sessions', '이 PC 의 모든 Claude Code 대화 목록 (cli_session_id · title · transcript_folder · size · sidecar_files · last_activity · has_record · live)', 'transfer'],
    ['GET', '/api/transfer/v1/bundle', '전부 담은 zip (세션 스위처 백업 형식 + sync.base 지문)', 'transfer'],
    ['GET', '/api/transfer/v1/bundle?ids=<id>,<id>', '고른 대화만 담은 zip', 'transfer'],
    ['GET', '/api/transfer/v1/sessions/{cli_session_id}/transcript', '대화 원문 .jsonl 하나', 'transfer'],
    ['GET', '/api/transfer/v1/status?ids=<id>,<id>', '대화별 지금 상태 (exists · sha256 · lines · size · last_activity · live) — 올리기 전에 이 PC 쪽이 바뀌었는지 확인', 'transfer'],
    ['POST', '/api/transfer/v1/sync?dry_run=1', '작은 zip(95MB 이하)을 본문으로 한 번에 올리기 → 미리 보기. dry_run 없이 보내면 바로 반영 (쿼리: ids · overwrite · records=0 · force_live=1)', 'sync'],
    ['POST', '/api/transfer/v1/uploads', '조각 업로드 시작 { size, name?, device? } → { upload_id, chunk_max }', 'sync'],
    ['PUT', '/api/transfer/v1/uploads/{upload_id}?offset=<n>', 'zip 조각(64MB 이하)을 offset 자리에 이어 붙이기 → { received, complete }', 'sync'],
    ['GET', '/api/transfer/v1/uploads', '올린 기록 (받는 중 · 미리 봄 · 반영 · 되돌림)', 'sync'],
    ['GET', '/api/transfer/v1/uploads/{upload_id}', '업로드 하나 (받은 크기 · 미리 보기 · 반영 결과)', 'sync'],
    ['POST', '/api/transfer/v1/uploads/{upload_id}/preview', '무엇이 어떻게 합쳐질지 (아무것도 바꾸지 않음): 대화마다 new · remote_newer · diverged · same · server_newer', 'sync'],
    ['POST', '/api/transfer/v1/uploads/{upload_id}/apply', '반영 { ids?, overwrite?, records?, force_live?, folder_map? }', 'sync'],
    ['POST', '/api/transfer/v1/uploads/{upload_id}/undo', '반영 전으로 되돌리기 { force? }', 'sync'],
    ['DELETE', '/api/transfer/v1/uploads/{upload_id}', '받은 파일 버리기 (반영한 기록 · 백업은 남김)', 'sync'],
  ],
};

// 칸반 프록시 허용목록 (쿼리 키 · 쓰기 본문 필드) — FlowBoard API v1 문서 기준
const TCC_Q = new Set(['project', 'status', 'assignee', 'type', 'priority', 'label', 'sprint', 'done', 'updatedSince', 'q', 'sort', 'limit', 'offset', 'compact']);
const TCC_ISSUE = ['project', 'title', 'description', 'type', 'status', 'priority', 'assignee', 'labels', 'sprintId', 'startDate', 'dueDate', 'progress', 'storyPoints', 'estimatedHours', 'spentHours', 'parentId', 'category'];
function vetTccQuery(search) {
  if (!search) return { qs: '' };
  const out = new URLSearchParams();
  for (const [k, v] of new URLSearchParams(search)) { if (!TCC_Q.has(k)) return { error: `허용되지 않은 조회 조건: ${k}` }; if (v.length > 200 || /[\u0000-\u001f]/.test(v)) return { error: '조회 조건 값이 이상해요' }; out.append(k, v); }
  const s = out.toString(); return { qs: s ? '?' + s : '' };
}
function vetTccBody(method, sub, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: '본문은 JSON 객체여야 해요' };
  const allow = /\/comments$/.test(sub) ? ['text'] : /\/checklist(\/[\w-]+)?$/.test(sub) ? ['text', 'done'] : method === 'PATCH' ? TCC_ISSUE.filter((k) => k !== 'project') : TCC_ISSUE;
  const bad = Object.keys(b).filter((k) => !allow.includes(k));
  return bad.length ? { error: `받을 수 없는 필드: ${bad.join(', ')}` } : { body: b };
}

export function routesV6({ getState, archive, collect, hooks, tccSync, autoAttend }) {
  const tccCfg = () => ({ ...DEFAULT_TCC, ...(settings().tcc || {}) });
  const mgmCfg = () => ({ ...M.DEFAULT_MGM, ...(settings().mgm || {}) });
  const external = (req) => !!(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers['cf-ray']);
  const liveTitles = () => new Map((getState().sessions || []).filter((s) => s.provider === 'claude').map((s) => [s.id.slice(s.id.indexOf(':') + 1), s.title || '']));

  return async function handleV6(req, res, p, url) {
    // ---------------------------------------------------------------- 세션 전송 · 동기화 API
    if (p === '/api/transfer/v1' || p.startsWith('/api/transfer/v1/')) {
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      if (p === '/api/transfer/v1') { json(res, 200, TRANSFER_DOCS); return true; }
      const key = keyOf(req), adm = isAuthed(req);
      const canRead = adm || (key && ['transfer', 'sync', 'full'].includes(key.scope));
      const canWrite = adm || (key && ['sync', 'full'].includes(key.scope));
      if (!canRead) { req.resume(); json(res, 401, { error: '전송 권한이 있는 API 키가 필요해요 (scope: transfer · sync)' }); return true; }
      const q = p.slice('/api/transfer/v1'.length);
      const live = () => new Set(liveTitles().keys());
      const ids = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5000) : null);
      if (req.method === 'GET') {
        if (q === '/sessions') { json(res, 200, { sessions: listConversations(liveTitles()) }); return true; }
        if (q === '/bundle') { await streamBundle(res, ids(url.searchParams.get('ids')), liveTitles()); return true; }
        if (q === '/status') { const L = live(); json(res, 200, { sessions: (ids(url.searchParams.get('ids')) || []).slice(0, 500).map((id) => sync.sessionStatus(id, L)) }); return true; }
        const m = q.match(/^\/sessions\/([^/]+)\/transcript$/);
        if (m) {
          const fp = transcriptPath(dec(m[1]) || '');
          if (!fp) { json(res, 404, { error: '대화를 찾을 수 없어요' }); return true; }
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Content-Disposition': `attachment; filename="${m[1]}.jsonl"`, 'Cache-Control': 'no-store' });
          fs.createReadStream(fp).pipe(res); return true;
        }
      }
      // ---- 올리기 · 동기화 (쓰기 권한)
      const isUp = q === '/sync' || q === '/uploads' || q.startsWith('/uploads/');
      if (isUp && !canWrite) { req.resume(); json(res, 403, { error: '올리기(동기화)는 scope "sync" 또는 "full" 키가 필요해요' }); return true; }
      const by = adm ? '관리자' : `키 ${key.name}`;
      const send = (r) => json(res, r.status, r.body);
      if (q === '/uploads' && req.method === 'GET') { json(res, 200, { uploads: sync.listUploads() }); return true; }
      if (q === '/uploads' && req.method === 'POST') { const b = (await readJSONBody(req, 1e5)) || {}; const r = sync.createUpload({ name: b.name, size: b.size, device: b.device, by }); json(res, r.error ? 400 : 200, r); return true; }
      if (q === '/sync' && req.method === 'POST') {
        const up = await sync.receiveWhole(req, { name: url.searchParams.get('name') || 'sync.zip', device: url.searchParams.get('device') || '', by });
        if (up.status !== 200) { send(up); return true; }
        const id = up.body.upload_id, pv = sync.preview(id, live());
        if (pv.status !== 200 || url.searchParams.get('dry_run') === '1') { send(pv); return true; }
        const r = sync.apply(id, { ids: ids(url.searchParams.get('ids')), overwrite: ids(url.searchParams.get('overwrite')) || [], records: url.searchParams.get('records') !== '0', force_live: url.searchParams.get('force_live') === '1' }, live());
        json(res, r.status, { ...r.body, preview: pv.body.summary }); return true;
      }
      const u = q.match(/^\/uploads\/(\d{14}-[0-9a-f]{8})(\/(preview|apply|undo))?$/);
      if (u) {
        const id = u[1], act = u[3];
        if (!act && req.method === 'PUT') { send(await sync.receiveChunk(id, Number(url.searchParams.get('offset')), req)); return true; }
        if (!act && req.method === 'GET') { const m2 = sync.getUpload(id); json(res, m2 ? 200 : 404, m2 || { error: '업로드를 찾을 수 없어요' }); return true; }
        if (!act && req.method === 'DELETE') { json(res, sync.discard(id) ? 200 : 404, { ok: true }); return true; }
        if (req.method === 'POST' && act === 'preview') { send(sync.preview(id, live())); return true; }
        if (req.method === 'POST' && act === 'apply') { const b = (await readJSONBody(req, 1e6)) || {}; send(sync.apply(id, { ids: Array.isArray(b.ids) ? b.ids : null, overwrite: Array.isArray(b.overwrite) ? b.overwrite : [], records: b.records !== false, force_live: !!b.force_live, folder_map: b.folder_map }, live())); return true; }
        if (req.method === 'POST' && act === 'undo') { const b = (await readJSONBody(req, 1e4)) || {}; send(sync.undo(id, !!b.force)); return true; }
      }
      req.resume();
      json(res, req.method === 'GET' ? 404 : 405, { error: 'not found', docs: '/api/transfer/v1' }); return true;
    }

    // ---------------------------------------------------------------- 업무타이머 기록 (로그인한 계정마다)
    if (p === '/api/timer') {
      const v = viewerOf(req);
      if (!v) { json(res, 401, { error: 'login required' }); return true; }
      const k = v.admin ? '@admin' : v.user;
      if (req.method === 'POST') { const b = await readJSONBody(req, 2e6); if (b && typeof b === 'object') { timerDb[k] = { settings: b.settings || {}, pomodoroSessions: Array.isArray(b.pomodoroSessions) ? b.pomodoroSessions.slice(-3000) : [] }; try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(TIMER_FILE, JSON.stringify(timerDb)); } catch {} } json(res, 200, { ok: true }); return true; }
      json(res, 200, { data: timerDb[k] || null }); return true;
    }
    const admin = p.startsWith('/api/company') || p === '/api/bank' || p.startsWith('/api/chars') || p.startsWith('/api/persona') || p.startsWith('/api/tcc/') || p.startsWith('/api/mgm/') || p === '/api/vault' || p === '/api/users' || p.startsWith('/api/users/') || p === '/api/disclose' || p.startsWith('/api/econ') || p.startsWith('/api/webhooks');
    if (!admin) return false;
    if (!isAuthed(req)) { json(res, 401, { error: '관리자 로그인이 필요해요' }); return true; }

    // ---------------------------------------------------------------- 회사 관리 · 은행
    const bankCfg = () => { const st = settings(); return Object.fromEntries(Object.keys(econ.BANK_DEFAULT).map((k) => [k, st[k] ?? econ.BANK_DEFAULT[k]])); };
    const who = () => (viewerOf(req) || {}).user || 'admin';
    const emp = () => (getState().sessions || []).filter((s) => s.kind !== 'app').map((s) => ({
      id: s.id, name: (s.persona && s.persona.name) || s.title || s.id, nameKo: s.persona && s.persona.nameKo, nameEn: s.persona && s.persona.nameEn, title: s.title || '', flag: s.persona ? s.persona.flag : '', provider: s.provider,
      custom: !!(s.custom && !s.custom.linked), level: s.level || 1, place: s.place, status: s.status, rank: (s.ctl && s.ctl.rank) || '', role: (s.ctl && s.ctl.role) || '',
      wallet: s.wallet || null }));
    if (p === '/api/company' && req.method === 'GET') {
      const st = settings();
      json(res, 200, { ...econ.company(bankCfg()), employees: emp(), pay: { payOn: st.payOn, payBase: st.payBase, payStep: st.payStep, payRaise: st.payRaise, payYearDays: st.payYearDays }, econRate: st.econRate });
      return true;
    }
    if (p === '/api/company/ledger' && req.method === 'GET') { json(res, 200, { ledger: econ.ledgerOf(String(url.searchParams.get('id') || '')) }); return true; }
    if (req.method === 'POST' && (p === '/api/company/pay' || p === '/api/company/bulk' || p === '/api/company/fund' || p === '/api/company/salary' || p === '/api/bank')) {
      const b = (await readJSONBody(req, 20000)) || {};
      const memo = String(b.memo || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 80);
      const known = new Set(emp().map((e) => e.id));
      let r;
      if (p === '/api/company/fund') r = econ.companyFund(b.amount, memo, who());
      else if (p === '/api/company/bulk') {
        const ids = (Array.isArray(b.ids) && b.ids.length ? b.ids : [...known]).filter((x) => known.has(x)).slice(0, 500);
        let n = 0;
        for (const id of ids) {
          const e = emp().find((x) => x.id === id);
          const amt = b.kind === 'salary' && (b.amount == null || b.amount === '') ? (e && e.wallet && e.wallet.pay ? e.wallet.pay.monthly : 0) : Number(b.amount);
          if (amt && econ.companyPay(id, b.kind, amt, memo, who(), bankCfg()).ok) n++;
        }
        r = { ok: true, count: n };
      } else {
        if (typeof b.id !== 'string' || !known.has(b.id)) { json(res, 404, { ok: false, error: '지금 없는 직원이에요' }); return true; }
        if (p === '/api/bank') r = econ.bankOp(b.id, String(b.op || ''), b.amount, bankCfg());
        else if (p === '/api/company/salary') r = econ.setSalary(b.id, b.monthly);
        else {
          const e = emp().find((x) => x.id === b.id);
          const amt = b.kind === 'salary' && (b.amount == null || b.amount === '') ? (e && e.wallet && e.wallet.pay ? e.wallet.pay.monthly : 0) : b.amount;
          r = econ.companyPay(b.id, String(b.kind || 'bonus'), amt, memo, who(), bankCfg());
        }
      }
      collect(); json(res, r && r.ok ? 200 : 400, r || { ok: false }); return true;
    }

    // ---------------------------------------------------------------- 직접 만든 캐릭터
    if (p === '/api/chars' && req.method === 'GET') {
      const st = getState();
      const live = (st.sessions || []).filter((s) => s.source !== 'custom' && s.kind !== 'app').map((s) => ({ id: s.id, title: s.title || s.id, provider: s.provider }));
      const list = chars.list().map((c) => { const ln = localNames(c.nat, c.name); const id = c.sessionId || 'custom:' + c.id; const s = (st.sessions || []).find((x) => x.id === id); return { ...c, nameKo: ln.ko, nameEn: ln.en, step: chars.currentStep(c), live: !!s, wallet: s && s.wallet ? { coins: s.wallet.coins, pay: s.wallet.pay } : null, place: s ? s.place : null, ctl: s ? s.ctl : null }; });
      json(res, 200, { list, genders: GENDERS, tiers: TIERS, sessions: live, behaviors: chars.BEHAVIORS, works: chars.WORK_TYPES, hats: chars.HATS, nations: nationList(), mbti: MBTI }); return true;
    }
    if (p === '/api/chars/random') {   // 🎲 무작위 인적사항 (?nat=KR 이면 그 나라 이름)
      const seed = Math.random().toString(36).slice(2), q = url.searchParams.get('nat') || '';
      const nat = nationList().some((n) => n.code === q) ? q : randomNation(seed);
      const g0 = url.searchParams.get('gender'), gender = g0 === 'M' || g0 === 'F' ? g0 : Math.random() < 0.5 ? 'M' : 'F';
      const pz = personaOf('rnd:' + seed, { nat, gender, name: randomName(nat, seed, gender) }, true);
      json(res, 200, { name: pz.name, gender, nat: pz.nat, age: pz.age, mbti: pz.mbti, city: pz.city, hobby: pz.hobby }); return true;
    }
    if (p === '/api/chars' && req.method === 'POST') { const b = (await readJSONBody(req, 50000)) || {}; const r = chars.create(b); if (r.ok && b.coins != null) econ.setCoins('custom:' + r.char.id, b.coins); collect(); json(res, r.ok ? 200 : 400, r); return true; }
    const cm = p.match(/^\/api\/chars\/([0-9a-f]{10})(\/coins)?$/);
    if (cm) {
      const c = chars.get(cm[1]);
      if (!c) { json(res, 404, { ok: false, error: '없는 캐릭터예요' }); return true; }
      if (cm[2]) { const b = (await readJSONBody(req, 2000)) || {}; const r = econ.setCoins(c.sessionId || 'custom:' + c.id, b.coins); collect(); json(res, r.ok ? 200 : 400, r); return true; }
      if (req.method === 'DELETE' || (req.method === 'POST' && req.headers['x-http-method-override'] === 'DELETE')) { chars.remove(c.id); collect(); json(res, 200, { ok: true }); return true; }
      if (req.method === 'POST' || req.method === 'PATCH') { const b = (await readJSONBody(req, 50000)) || {}; const r = chars.update(c.id, b); if (r.ok && b.coins != null) econ.setCoins(r.char.sessionId || 'custom:' + c.id, b.coins); collect(); json(res, r.ok ? 200 : 400, r); return true; }
    }

    // ---------------------------------------------------------------- 캐릭터 이름 · 국적 (직접 / 무작위)
    if (p === '/api/persona/nations') { json(res, 200, { nations: nationList(), genders: GENDERS, mbti: MBTI, hobby: HOBBY, auto: settings().personaAuto !== false }); return true; }
    if (p === '/api/persona' && req.method === 'POST') {
      const b = (await readJSONBody(req, 20000)) || {};
      if (typeof b.id !== 'string' || !b.id) { json(res, 400, { ok: false, error: '세션 id 가 필요해요' }); return true; }
      if (b.clear) { patchMeta(b.id, { persona: null }); collect(); json(res, 200, { ok: true, persona: personaOf(b.id, null, settings().personaAuto !== false) }); return true; }
      const cur = personaOf(b.id, (getMeta(b.id) || {}).persona, true) || {};
      let next = { ...((getMeta(b.id) || {}).persona || {}), ...(cleanPersona(b.persona) || {}) };
      const seed = Math.random().toString(36).slice(2);
      if (b.random === 'all') next.gender = Math.random() < 0.5 ? 'M' : 'F';
      if (b.random === 'nat' || b.random === 'all') { next.nat = randomNation(seed); next.name = randomName(next.nat, seed, next.gender || cur.gender); delete next.city; }
      else if (b.random === 'name') next.name = randomName(next.nat || cur.nat, seed, next.gender || cur.gender);
      if (b.random === 'all') { delete next.age; delete next.mbti; delete next.hobby; next.age = 24 + Math.floor(Math.random() * 32); }
      patchMeta(b.id, { persona: cleanPersona(next) });
      collect(); json(res, 200, { ok: true, persona: personaOf(b.id, cleanPersona(next), true) }); return true;
    }

    // ---------------------------------------------------------------- 계정 금고 상태 (값은 절대 안 보냄)
    if (p === '/api/vault') { json(res, 200, vault.status('@admin')); return true; }

    // ---------------------------------------------------------------- 행정관리(MGM) 연동 — 보안 규칙은 server/mgm.mjs 머리말
    if (p.startsWith('/api/mgm/')) {
      const who = (viewerOf(req) || {}).user || 'admin', ext = external(req);
      // 쓰기 요청은 JSON 으로만 (폼 · 단순 요청으로 위조 불가) · 브라우저가 알려 준 출처가 남이면 거부
      if (req.method !== 'GET' && !/^application\/json/i.test(String(req.headers['content-type'] || ''))) { json(res, 415, { ok: false, error: { code: 'json_only', message: 'JSON 요청만 받아요' } }); return true; }
      if (req.headers['sec-fetch-site'] === 'cross-site') { json(res, 403, { ok: false, error: { code: 'cross_site', message: '다른 사이트에서 온 요청이에요' } }); return true; }
      if (p === '/api/mgm/config') {
        if (req.method === 'POST') {
          const b = (await readJSONBody(req, 20000)) || {}, c = mgmCfg(), n = b.cfg || {};
          const base = typeof n.base === 'string' && /^https:\/\/[A-Za-z0-9.-]+(:\d+)?\/[^\s]*$/.test(n.base) ? n.base.slice(0, 300) : c.base;
          if (base !== c.base && !b.token) { json(res, 400, { ok: false, error: { code: 'need_token', message: '주소를 바꾸면 토큰도 다시 넣어야 해요 (토큰은 주소에 묶여 있어요)' } }); return true; }
          if (typeof b.token === 'string') {
            if (ext) { json(res, 403, { ok: false, error: { code: 'external', message: '토큰은 이 PC(로컬 주소)에서만 넣을 수 있어요' } }); return true; }
            const r = M.setToken(b.token, base);
            if (r === 'bad') { json(res, 400, { ok: false, error: { code: 'bad_token', message: 'mgm_ 로 시작하는 토큰이 아니에요' } }); return true; }
            if (!r) { json(res, 423, { ok: false, error: { code: 'vault_locked', message: '계정 금고가 잠겨 있어요 — 다시 로그인한 뒤 넣어 주세요' } }); return true; }
            M.audit({ who, ext, method: 'TOKEN', path: b.token ? '토큰 저장' : '토큰 삭제', status: 200 });
          }
          if (ext && ((n.externalWrite != null && !!n.externalWrite !== !!c.externalWrite) || base !== c.base)) { json(res, 403, { ok: false, error: { code: 'external', message: '보안 설정(외부 쓰기 · 주소)은 이 PC(로컬 주소)에서만 바꿀 수 있어요' } }); return true; }
          let auto = { ...M.AUTO_DEFAULT, ...(c.auto || {}) };
          if (n.auto && typeof n.auto === 'object') {
            if (ext) { json(res, 403, { ok: false, error: { code: 'external', message: '자동 출퇴근 설정은 이 PC(로컬 주소)에서만 바꿀 수 있어요' } }); return true; }
            const x = n.auto;
            auto = { on: x.on != null ? !!x.on : auto.on, signal: x.signal === 'any' ? 'any' : x.signal === 'prompt' ? 'prompt' : auto.signal,
              idleMin: Math.max(5, Math.min(240, Math.round(Number(x.idleMin) || auto.idleMin))), startHour: Math.max(0, Math.min(23, Math.round(Number(x.startHour ?? auto.startHour)))), weekdaysOnly: x.weekdaysOnly != null ? !!x.weekdaysOnly : auto.weekdaysOnly };
            M.audit({ who, ext, method: 'CONFIG', path: `자동 출퇴근 ${auto.on ? '켜기' : '끄기'}`, status: 200 });
          }
          setSettings({ mgm: { base, externalWrite: n.externalWrite != null ? !!n.externalWrite : !!c.externalWrite, auto } });
        }
        json(res, 200, { cfg: mgmCfg(), ...M.tokenStatus(), external: ext, auto: autoAttend ? autoAttend.status() : null }); return true;
      }
      if (p === '/api/mgm/audit') { json(res, 200, { log: M.auditTail(200) }); return true; }
      if (p === '/api/mgm/draft') { json(res, 200, { ok: true, draft: M.weeklyDraft(getState().sessions) }); return true; }
      if (p.startsWith('/api/mgm/proxy/')) {
        const sub = '/' + p.slice('/api/mgm/proxy/'.length);
        const method = req.method === 'POST' && /^(PATCH)$/i.test(String(req.headers['x-http-method-override'] || '')) ? 'PATCH' : req.method;
        const write = method !== 'GET';
        if (write && ext && !mgmCfg().externalWrite) { M.audit({ who, ext, method, path: sub, status: 403, code: 'external_write' }); json(res, 403, { ok: false, error: { code: 'external_write', message: '외부 주소에서는 행정 처리(쓰기)가 꺼져 있어요 — 연동 설정에서 켤 수 있어요' } }); return true; }
        if (!M.rateOk(write)) { json(res, 429, { ok: false, error: { code: 'rate', message: '요청이 너무 많아요. 잠시 후 다시 시도하세요' } }); return true; }
        const body = write ? await readJSONBody(req, 200000) : null;
        const v = M.vet(method, sub, url.search || '', body);
        if (v.error) { M.audit({ who, ext, method, path: sub, status: 403, code: 'blocked' }); json(res, 403, { ok: false, error: { code: 'not_allowed', message: v.error } }); return true; }
        const r = await M.mgm(mgmCfg(), method, v.path, write ? v.body : null);
        if (write || r.status >= 400) M.audit({ who, ext, method, path: sub, status: r.status, code: r.body && r.body.error ? r.body.error.code : undefined });
        json(res, r.status, r.body); return true;
      }
      json(res, 404, { ok: false, error: { code: 'not_found', message: 'not found' } }); return true;
    }

    // ---------------------------------------------------------------- 칸반(FlowBoard) 연동
    if (p === '/api/tcc/config') {
      if (req.method === 'POST') {
        const b = (await readJSONBody(req)) || {};
        const c = tccCfg(), n = b.cfg || {};
        if (external(req) && (typeof b.token === 'string' || (n.base && n.base !== c.base))) { json(res, 403, { ok: false, error: '토큰 · 주소는 이 PC(로컬 주소)에서만 바꿀 수 있어요' }); return true; }
        const nextBase = /^https:\/\/[^\s]+$/.test(n.base || '') ? String(n.base) : c.base;
        if (typeof b.token === 'string' && !setToken(b.token, nextBase)) { json(res, 423, { ok: false, error: '계정 금고가 잠겨 있어요 — 다시 로그인한 뒤 토큰을 넣어 주세요' }); return true; }
        const next = { ...c,
          base: nextBase,
          project: n.project != null ? String(n.project).slice(0, 40) : c.project,
          autoSync: n.autoSync != null ? !!n.autoSync : c.autoSync, autoCreate: n.autoCreate != null ? !!n.autoCreate : c.autoCreate, checklist: n.checklist != null ? !!n.checklist : c.checklist,
          statusMap: { ...c.statusMap, ...Object.fromEntries(Object.entries(n.statusMap || {}).map(([k2, v2]) => [k2, String(v2 || '').slice(0, 40)])) },
          comments: { ...c.comments, ...(n.comments || {}) } };
        setSettings({ tcc: next });
      }
      json(res, 200, { cfg: tccCfg(), ...tokenStatus(), history: tccSync ? tccSync.history : [] }); return true;
    }
    if (p.startsWith('/api/tcc/proxy/')) {
      const sub = '/' + p.slice('/api/tcc/proxy/'.length);
      const method = req.method === 'POST' && req.headers['x-http-method-override'] === 'PATCH' ? 'PATCH' : req.method;
      if (!allowedProxy(method, sub)) { json(res, 403, { ok: false, error: { code: 'not_allowed', message: '허용되지 않은 칸반 요청이에요' } }); return true; }
      if (method !== 'GET' && !/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) { json(res, 415, { ok: false, error: { code: 'json_only', message: 'JSON 요청만 받아요' } }); return true; }
      if (!M.rateOk(method !== 'GET')) { json(res, 429, { ok: false, error: { code: 'rate', message: '요청이 너무 많아요. 잠시 후 다시 시도하세요' } }); return true; }
      const qv = vetTccQuery(url.search || '');
      if (qv.error) { json(res, 403, { ok: false, error: { code: 'not_allowed', message: qv.error } }); return true; }
      const body0 = method === 'GET' ? null : await readJSONBody(req, 2e6);
      const bv = method === 'GET' ? { body: null } : vetTccBody(method, sub, body0);
      if (bv.error) { json(res, 403, { ok: false, error: { code: 'not_allowed', message: bv.error } }); return true; }
      const r = await tcc(tccCfg(), method, sub + qv.qs, bv.body);
      if (method !== 'GET') M.audit({ who: (viewerOf(req) || {}).user || 'admin', ext: external(req), method, path: 'tcc' + sub, status: r.status });
      json(res, r.status, r.body); return true;
    }
    if (p === '/api/tcc/link' && req.method === 'POST') {
      const b = (await readJSONBody(req)) || {};
      const s = (getState().sessions || []).find((x) => x.id === b.id);
      if (!b.id) { json(res, 400, { ok: false, error: '세션 id 가 필요해요' }); return true; }
      if (b.key === null) { patchMeta(b.id, { task: null }); collect(); json(res, 200, { ok: true }); return true; }
      let card = null;
      if (b.create) {
        if (!s) { json(res, 404, { ok: false, error: '세션을 찾을 수 없어요' }); return true; }
        const r = await tcc(tccCfg(), 'POST', '/issues', { ...cardFromSession(s, b.project || tccCfg().project), ...(b.title ? { title: String(b.title).slice(0, 500) } : {}) });
        if (!r.body?.ok) { json(res, r.status, { ok: false, error: r.body?.error?.message || '카드를 만들지 못했어요' }); return true; }
        card = r.body.data;
      } else {
        const r = await tcc(tccCfg(), 'GET', `/issues/${encodeURIComponent(String(b.key || ''))}`);
        if (!r.body?.ok) { json(res, r.status, { ok: false, error: r.body?.error?.message || '카드를 찾지 못했어요' }); return true; }
        card = r.body.data;
        await tcc(tccCfg(), 'POST', `/issues/${encodeURIComponent(card.key)}/comments`, { text: `🔗 AI OFFICE 세션과 연결됐어요: ${s ? s.title || s.id : b.id}` });
      }
      patchMeta(b.id, { task: { key: card.key, id: card.id, title: card.title, url: card.webUrl, project: card.projectKey, sync: b.sync !== false } });
      collect(); json(res, 200, { ok: true, card }); return true;
    }
    if (p === '/api/tcc/sync' && req.method === 'POST') { const b = (await readJSONBody(req)) || {}; const m = getMeta(b.id); if (m && m.task) patchMeta(b.id, { task: { ...m.task, sync: !!b.sync } }); collect(); json(res, 200, { ok: true }); return true; }

    // ---------------------------------------------------------------- 등급 계정
    if (p === '/api/users') {
      if (req.method === 'GET') { json(res, 200, { users: listUsers(), tiers: TIERS, cats: CATS }); return true; }
      if (req.method === 'POST') { const r = await createUser((await readJSONBody(req)) || {}); json(res, r.ok ? 200 : 400, r); return true; }
    }
    const um = p.match(/^\/api\/users\/([A-Za-z0-9._-]+)$/);
    if (um) {
      if (req.method === 'DELETE') { json(res, 200, { ok: deleteUser(um[1]) }); return true; }
      if (req.method === 'PATCH' || req.method === 'POST') { const r = await updateUser(um[1], (await readJSONBody(req)) || {}); json(res, r.ok ? 200 : 400, r); return true; }
    }
    // ---------------------------------------------------------------- 정보공개 정책 (세션별 · 기본)
    if (p === '/api/disclose' && req.method === 'POST') {
      const b = (await readJSONBody(req)) || {};
      const clean = (pol) => { const o = {}; for (const [c] of CATS) { const v = pol && pol[c]; if (v === '' || v == null) continue; const n = Number(v); if (n >= 0 && n <= 99) o[c] = n; } return o; };
      if (b.default) setSettings({ disclosureDefault: clean(b.default) });
      if (b.id) patchMeta(b.id, { disclose: Object.keys(clean(b.policy)).length ? clean(b.policy) : null });
      collect(); json(res, 200, { ok: true, defaults: settings().disclosureDefault }); return true;
    }
    // ---------------------------------------------------------------- 사내 재화
    if (p === '/api/econ' && req.method === 'GET') { json(res, 200, { shop: econ.SHOP, leaderboard: econ.leaderboard(), rate: settings().econRate, auto: settings().econAuto }); return true; }
    if (p === '/api/econ/buy' && req.method === 'POST') { const b = (await readJSONBody(req)) || {}; const r = econ.adminBuy(String(b.id || ''), String(b.item || '')); collect(); json(res, r.ok ? 200 : 400, r); return true; }
    if (p === '/api/econ/grant' && req.method === 'POST') { const b = (await readJSONBody(req)) || {}; const r = econ.grant(String(b.id || ''), b.coins); collect(); json(res, r.ok ? 200 : 400, r); return true; }
    // ---------------------------------------------------------------- 칸반 웹훅
    if (p === '/api/webhooks' && req.method === 'GET') { json(res, 200, { hooks: settings().webhooks, log: hooks.log, columns: COLUMN_KEYS, defaults: DEFAULT_COLUMNS }); return true; }
    if (p === '/api/webhooks' && req.method === 'POST') {
      const b = (await readJSONBody(req)) || {};
      const list = (Array.isArray(b.hooks) ? b.hooks : []).slice(0, 10).map((h) => ({
        id: /^[0-9a-f]{8}$/.test(h.id || '') ? h.id : crypto.randomBytes(4).toString('hex'),
        name: String(h.name || '칸반').slice(0, 40), url: publicHttps(h.url) ? String(h.url).slice(0, 500) : '', secret: String(h.secret || '').slice(0, 200), enabled: !!h.enabled,
        events: Array.isArray(h.events) ? h.events.filter((e) => ['session.created', 'session.moved', 'session.closed'].includes(e)) : [],
        columns: Object.fromEntries(COLUMN_KEYS.map(([k]) => [k, String((h.columns || {})[k] || DEFAULT_COLUMNS[k]).slice(0, 60)])),
        headers: Object.fromEntries(Object.entries(h.headers || {}).filter(([k]) => /^[\w-]{1,40}$/.test(k)).slice(0, 5).map(([k, v]) => [k, String(v).slice(0, 300)])),
      }));
      setSettings({ webhooks: list }); json(res, 200, { ok: true, hooks: list }); return true;
    }
    if (p === '/api/webhooks/test' && req.method === 'POST') {
      const b = (await readJSONBody(req)) || {};
      const h = settings().webhooks.find((x) => x.id === b.id);
      if (!h || !h.url) { json(res, 400, { ok: false, error: '저장된 웹훅이 없어요' }); return true; }
      const sample = (getState().sessions || [])[0];
      json(res, 200, await hooks.test(h, sample)); return true;
    }
    json(res, 404, { error: 'not found' }); return true;
  };
}
