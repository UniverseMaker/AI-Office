// v4 API: 세션 메타(메모·알림 해제·고정·동작·배치) · 설정 · 세션 보관함 · 외부 연동(업무관리시스템) API.
//   로그인(관리자) 전용: /api/meta · /api/settings · /api/keys · /api/archive/*
//   외부 연동: /api/v1/*  ← API 키(Authorization: Bearer aio_… 또는 X-API-Key) 또는 관리자 로그인. 문서: GET /api/v1
import fs from 'node:fs';
import { isAuthed, viewerOf } from './auth.mjs';
import { allowed } from './access.mjs';
import { policyOf } from './meta.mjs';
import { allMeta, patchMeta, settings, setSettings, createKey, listKeys, revokeKey, keyValid, keyOf, urgentKey, building, setBuilding, getPrefs, setPrefs } from './meta.mjs';

const dec = (s) => { try { return decodeURIComponent(s); } catch { return null; } };
function readBig(req, limit = 80e6) {
  return new Promise((resolve) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { req.destroy(); resolve(null); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')); } catch { resolve(null); } });
  });
}
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const file = (res, f, download) => { res.writeHead(200, { 'Content-Type': f.type, 'Cache-Control': 'no-store', ...(download ? { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}` } : {}) }); res.end(f.body); };
const IMG = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

/** 외부 시스템에 내보낼 세션 모양 (필요한 것만) */
const apiSession = (s) => ({
  id: s.id, title: s.title, project: s.project, cwd: s.cwd, provider: s.provider, app: s.app, model: s.model, kind: s.kind,
  status: s.status, place: s.place, activity: s.activity ? { type: s.activity.type, label: s.activity.label, detail: s.activity.detail, since: s.activity.since } : null,
  startedAt: s.startedAt, lastActive: s.lastActive, level: s.level, today: s.stats?.today || 0,
  roster: (s.roster || []).map((r) => ({ name: r.name, level: r.level, runs: r.runs })), agents: (s.agents || []).map((a) => ({ id: a.id, type: a.type, status: a.status, description: a.description })),
  meta: s.meta || {}, ctl: s.ctl || {}, dismissed: !!s.dismissed, urgentKey: urgentKey(s),
});

const DOCS = {
  name: 'AI OFFICE 세션 API', version: 'v1',
  auth: 'Authorization: Bearer aio_… (설정 › 관리자 › 연동 API 키에서 발급) 또는 X-API-Key 헤더. 관리자 로그인 토큰도 됨.',
  endpoints: [
    ['GET', '/api/v1/sessions', '살아 있는 세션 목록 (상태·활동·메타·팀원)'],
    ['GET', '/api/v1/sessions/{id}', '세션 하나'],
    ['PATCH', '/api/v1/sessions/{id}', '메타 수정 — { memo, task: { id, url, title, status }, tags: [], pinned, rank, role }'],
    ['GET', '/api/v1/sessions/{id}/conversation', '보관본 대화 (지금 한 번 복제 후 반환)'],
    ['GET', '/api/v1/archive', '보관함 목록 (종료된 세션 포함)'],
    ['GET', '/api/v1/archive/{id}', '보관본 대화 전체'],
    ['GET', '/api/v1/archive/{id}/export?fmt=json|openai|md|jsonl', '내려받기'],
    ['POST', '/api/v1/archive/import', '가져오기 — ai-office-session/v1 또는 { messages: [{ role, content }] }'],
    ['GET', '/api/v1/events?since={ms}', '최근 사무실 소식 (폴링용)'],
  ],
};

export function routesV4({ getState, archive, collect }) {
  const sessionById = (id) => (getState().sessions || []).find((s) => s.id === id) || null;

  async function archiveRoutes(req, res, p, url) {
    if (p === '/api/archive' && req.method === 'GET') return json(res, 200, { items: await archive.list(), status: archive.status, dir: 'archive/' });
    if (p === '/api/archive/snapshot' && req.method === 'POST') {
      const b = (await readBig(req, 1e6)) || {};
      const list = b.all ? getState().sessions || [] : [sessionById(b.id)].filter(Boolean);
      if (!list.length) return json(res, 404, { ok: false, error: '세션을 찾을 수 없어요' });
      let saved = 0; const errors = [];
      for (const s of list) { try { const r = await archive.snapshot(s, true); if (r.ok) saved++; else if (!b.all) errors.push(r.error); } catch (e) { errors.push(e.message); } }
      return json(res, errors.length && !saved ? 400 : 200, { ok: saved > 0, saved, error: errors[0] });
    }
    if (p === '/api/archive/import' && req.method === 'POST') {
      const b = await readBig(req);
      const r = await archive.import(b?.data || b, b?.name);
      return json(res, r.ok ? 200 : 400, r);
    }
    const m = p.match(/^\/api\/archive\/([^/]+)(?:\/(export|edits|media|apply|restore)(?:\/([^/]+))?)?$/);
    if (!m) return json(res, 404, { error: 'not found' });
    const id = dec(m[1]);
    if (!m[2]) {
      if (req.method === 'GET') { const a = await archive.get(id); return a ? json(res, 200, a) : json(res, 404, { error: '보관본이 없어요' }); }
      if (req.method === 'PUT' || req.method === 'POST') { const b = await readBig(req); return (await archive.saveEdits(id, b?.messages)) ? json(res, 200, { ok: true }) : json(res, 404, { ok: false, error: '보관본이 없어요' }); }
    }
    if ((m[2] === 'apply' || m[2] === 'restore') && req.method === 'POST') {
      const live = (getState().sessions || []).find((s) => s.id === id);
      const r = m[2] === 'apply' ? await archive.applyToSource(id, live) : await archive.restoreSource(id, live);
      if (r.ok && live) await archive.snapshot(live, true).catch(() => {});
      collect();
      return json(res, r.ok ? 200 : 409, r);
    }
    if (m[2] === 'edits' && req.method === 'DELETE') return json(res, 200, { ok: await archive.resetEdits(id) });
    if (m[2] === 'export') { const f = await archive.export(id, url.searchParams.get('fmt') || 'json'); return f ? file(res, f, true) : json(res, 404, { error: '보관본이 없어요' }); }
    if (m[2] === 'media' && m[3]) {
      const fp = archive.mediaPath(id, dec(m[3]));
      if (!fp) return json(res, 404, { error: 'no media' });
      return file(res, { type: IMG[fp.split('.').pop()] || 'application/octet-stream', body: fs.readFileSync(fp) }, false);
    }
    return json(res, 405, { error: 'method' });
  }

  /** true 를 돌려주면 처리 완료 */
  return async function handleV4(req, res, p, url) {
    // ---- 외부 연동 API
    if (p === '/api/v1' || p.startsWith('/api/v1/')) {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      if (p === '/api/v1') { json(res, 200, DOCS); return true; }
      const key = keyOf(req), adm = isAuthed(req);
      if (!key && !adm) { json(res, 401, { error: 'API 키가 필요해요 (Authorization: Bearer aio_…)' }); return true; }
      if (!adm && key.scope === 'transfer') { json(res, 403, { error: '전송 전용 키예요 — /api/transfer/v1 만 쓸 수 있어요' }); return true; }
      if (!adm && key.scope === 'read' && req.method !== 'GET') { json(res, 403, { error: '읽기 전용 키예요' }); return true; }
      const q = p.slice('/api/v1'.length);
      if (q === '/sessions' && req.method === 'GET') { json(res, 200, { sessions: (getState().sessions || []).map(apiSession) }); return true; }
      if (q === '/events' && req.method === 'GET') { const since = +url.searchParams.get('since') || 0; json(res, 200, { feed: (getState().feed || []).filter((f) => f.t > since) }); return true; }
      let m = q.match(/^\/sessions\/([^/]+)(\/conversation)?$/);
      if (m) {
        const s = sessionById(dec(m[1]));
        if (!s) { json(res, 404, { error: '세션을 찾을 수 없어요' }); return true; }
        if (m[2]) { await archive.snapshot(s).catch(() => {}); const a = await archive.get(s.id); json(res, a ? 200 : 404, a || { error: '기록 파일이 없는 세션이에요' }); return true; }
        if (req.method === 'GET') { json(res, 200, apiSession(s)); return true; }
        if (req.method === 'PATCH' || req.method === 'POST') { const b0 = (await readBig(req, 1e6)) || {}; const b = {}; for (const k of ['memo', 'task', 'tags', 'pinned', 'rank', 'role']) if (k in b0) b[k] = b0[k]; const meta = patchMeta(s.id, b); collect(); json(res, 200, { ok: true, meta }); return true; }
      }
      if (q.startsWith('/archive')) { await archiveRoutes(req, res, '/api' + q, url); return true; }
      json(res, 404, { error: 'not found', docs: '/api/v1' }); return true;
    }
    if (!(p === '/api/meta' || p === '/api/settings' || p === '/api/building' || p === '/api/prefs' || p.startsWith('/api/keys') || p.startsWith('/api/archive'))) return false;
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (!isAuthed(req)) {
      // 등급 계정: '보관본' 공개가 허용된 세션만 읽기 (목록 · 대화 · 내려받기 · 이미지)
      const viewer = viewerOf(req);
      if (!viewer || !p.startsWith('/api/archive') || req.method !== 'GET') { json(res, viewer ? 403 : 401, { error: viewer ? '관리자만 쓸 수 있어요' : 'login required' }); return true; }
      const defs = settings().disclosureDefault, ok = (id) => allowed(policyOf(id), defs, 'archive', viewer.tier);
      if (p === '/api/archive') { json(res, 200, { items: (await archive.list()).filter((it) => ok(it.id)), status: null }); return true; }
      const m = p.match(/^\/api\/archive\/([^/]+)/);
      const rid = m ? dec(m[1]) : null;
      if (!m || !rid || (await archive.realId(rid)) !== rid || !ok(rid)) { json(res, 403, { error: '이 보관본은 공개되지 않았어요' }); return true; }
      if (/\/edits$/.test(p)) { json(res, 403, { error: '관리자만' }); return true; }
      await archiveRoutes(req, res, p, url); return true;
    }
    if (p === '/api/meta') {
      if (req.method === 'GET') { json(res, 200, { sessions: allMeta(), settings: settings(), archive: archive.status }); return true; }
      const b = (await readBig(req, 1e6)) || {};
      const meta = patchMeta(b.id, b.patch || {});
      if (!meta) { json(res, 400, { ok: false, error: 'id 가 필요해요' }); return true; }
      collect(); json(res, 200, { ok: true, meta }); return true;
    }
    if (p === '/api/prefs') { if (req.method === 'POST') setPrefs(await readBig(req, 1e5)); json(res, 200, { prefs: getPrefs() }); return true; }
    if (p === '/api/building') { if (req.method === 'POST') { setBuilding((await readBig(req, 1e6)) || {}); collect(); } json(res, 200, { building: building() }); return true; }
    if (p === '/api/settings') { if (req.method === 'POST') { const b = (await readBig(req, 1e6)) || {}; for (const k of ['webhooks', 'tcc', 'mgm']) delete b[k]; setSettings(b); } json(res, 200, { settings: settings() }); return true; }
    if (p === '/api/keys') {
      if (req.method === 'POST') { const b = (await readBig(req, 1e5)) || {}; json(res, 200, createKey(b.name, b.scope)); return true; }
      json(res, 200, { keys: listKeys() }); return true;
    }
    const km = p.match(/^\/api\/keys\/([\w]+)$/);
    if (km && req.method === 'DELETE') { json(res, 200, { ok: revokeKey(km[1]) }); return true; }
    await archiveRoutes(req, res, p, url);
    return true;
  };
}
