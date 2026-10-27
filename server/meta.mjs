// 세션 메타 저장소 (data/meta.json): 메모 · 결정 알림 해제 · '지금 일하는 중' 고정 · 원하는 동작 · 자리 배치/고정 · 직급/직책 ·
// 업무관리시스템 연결 정보(task) · 태그. 그리고 외부 연동용 API 키(해시만 저장).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from './auth.mjs';

const FILE = path.join(DATA_DIR, 'meta.json');
let db = { sessions: {}, settings: {}, keys: [], building: { floors: {} } };
try { db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 1)); } catch (e) { console.error('[meta]', e.message); } }, 200);
}

export const DEFAULT_SETTINGS = {
  archiveAuto: true, archiveEveryMin: 2, archiveMedia: true,
  rankScheme: 'academic', rankCustom: '',          // 직급 체계: academic(방문자~교수) · corporate(사원~부장) · custom(쉼표로)
  disclosureDefault: {},                           // 등급 계정 기본 공개 정책 { 항목: 최소 등급 } — 비어 있으면 전부 관리자만
  econRate: 1, econAuto: true,                     // 사내 재화: 일한 1분당 코인 · 자동 소비
  webhooks: [],                                    // 칸반 연동 웹훅 [{ id, name, url, secret, enabled, events, columns, headers }]
  tcc: null,                                       // FlowBoard(TCC) 칸반 연동 설정 (토큰은 data/secrets.json)
  payOn: true, payBase: 3000, payStep: 8, payRaise: 5, payYearDays: 7,   // 월급제: 기본 월급 · 레벨당 +% · 근속 1년당 인상% · 근속 1년 = 실제 며칠
  personaAuto: true,                               // 이름 · 국적을 정하지 않은 세션도 자동으로 사람처럼 (세션마다 늘 같은 인물)
  mgm: null,                                       // 행정관리(MGM) 연동 설정 { base, externalWrite } — 토큰은 계정 금고에
};
export const settings = () => ({ ...DEFAULT_SETTINGS, ...db.settings });
export function setSettings(patch) {
  for (const [k, v] of Object.entries(patch || {})) if (k in DEFAULT_SETTINGS) db.settings[k] = v;
  save();
  return settings();
}

/** 결정 알림 해제 키: 같은 질문이 계속 떠 있는 동안만 해제가 유지되고, 새 질문이 오면 다시 알린다 */
export const urgentKey = (s) => `${s.status}|${s.activity?.detail || s.activity?.label || ''}`;

const FIELDS = { memo: 'string', dismiss: 'string', pinned: 'boolean', action: 'string', assign: 'object', lock: 'boolean', rank: 'string', role: 'string', task: 'object', tags: 'object', disclose: 'object', persona: 'object' };
/** 세션별 정보공개 정책 { 항목: 최소 등급 } */
export const policyOf = (id) => (db.sessions[id] && db.sessions[id].disclose) || null;
export const getMeta = (id) => db.sessions[id] || null;
export const allMeta = () => db.sessions;
export function patchMeta(id, patch) {
  if (typeof id !== 'string' || !id) return null;
  const m = db.sessions[id] || {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (!(k in FIELDS)) continue;
    if (v === null || v === '' || v === false) { delete m[k]; continue; }
    if (typeof v !== FIELDS[k]) continue;
    m[k] = k === 'memo' ? String(v).slice(0, 20000) : v;
  }
  if (patch && 'memo' in patch) m.memoAt = Date.now();
  if (Object.keys(m).filter((k) => k !== 'memoAt').length) db.sessions[id] = m; else delete db.sessions[id];
  save();
  return db.sessions[id] || {};
}

/** collect() 에서 세션마다: 메모·제어값을 붙이고, 해제한 결정 알림은 '완료(확인)' 로 내린다 */
export function applyMeta(s) {
  const m = db.sessions[s.id];
  if (!m) return;
  if (m.dismiss && (s.status === 'waiting_input' || s.status === 'waiting_permission')) {
    if (m.dismiss === urgentKey(s)) { s.status = 'done'; s.dismissed = true; }
    else { delete m.dismiss; save(); }            // 새 질문 → 해제 풀림
  }
  s.ctl = { action: m.action, assign: m.assign, lock: m.lock, pinned: m.pinned, rank: m.rank, role: m.role };
  s.meta = { memo: m.memo, memoAt: m.memoAt, task: m.task, tags: m.tags };
}

// ---------------------------------------------------------------- 빌딩 관리: 층 이름 · 테이블 그룹 업무 (모두에게 보이는 배치 정보)
export const building = () => db.building || { floors: {} };
/** patch = { key: 층 원래 이름, title?, groups?: { [i]: { task, note } } } */
export function setBuilding(patch) {
  const B = db.building || (db.building = { floors: {} });
  B.floors = B.floors || {};
  const k = String(patch?.key || '').slice(0, 80);
  if (!k) return B;
  const f = B.floors[k] || {};
  if ('title' in patch) { const t = String(patch.title || '').trim().slice(0, 40); if (t) f.title = t; else delete f.title; }
  if (patch.groups && typeof patch.groups === 'object') {
    f.groups = f.groups || {};
    for (const [i, g] of Object.entries(patch.groups)) {
      const task = String(g?.task || '').trim().slice(0, 40), note = String(g?.note || '').trim().slice(0, 300);
      if (task || note) f.groups[i] = { task, note }; else delete f.groups[i];
    }
    if (!Object.keys(f.groups).length) delete f.groups;
  }
  if (Object.keys(f).length) B.floors[k] = f; else delete B.floors[k];
  save();
  return B;
}

// ---------------------------------------------------------------- 계정 옵션 (테마 · 색 · 폰트 · 레이아웃) — 로그인한 계정마다
export const getPrefs = (user = 'admin') => (db.prefs && db.prefs[user]) || null;
export function setPrefs(p, user = 'admin') {
  if (!p || typeof p !== 'object') return getPrefs(user);
  const s = JSON.stringify(p);
  if (s.length > 20000) return getPrefs(user);
  db.prefs = db.prefs || {};
  db.prefs[user] = JSON.parse(s);
  save();
  return db.prefs[user];
}

// ---------------------------------------------------------------- API keys (업무관리시스템 등 외부 연동)
const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');
/** scope: full(읽기·메타 수정·보관함) · read(읽기만) · transfer(세션 전송 — 대화 원문 내려받기만) */
export function createKey(name, scope = 'full') {
  const key = 'aio_' + crypto.randomBytes(24).toString('hex');
  const rec = { id: crypto.randomBytes(6).toString('hex'), name: String(name || '연동 키').slice(0, 60), hash: hashKey(key), created: Date.now(), last: 0, prefix: key.slice(0, 10), scope: ['full', 'read', 'transfer'].includes(scope) ? scope : 'full' };
  db.keys.push(rec); save();
  return { ...rec, hash: undefined, key };            // 원문 키는 이때 한 번만 보여 준다
}
export const listKeys = () => db.keys.map(({ hash, ...r }) => r);
export function revokeKey(id) { const n = db.keys.length; db.keys = db.keys.filter((k) => k.id !== id); save(); return db.keys.length < n; }
/** 요청의 API 키 → 키 기록(scope 포함) 또는 null */
export function keyOf(req) {
  const h = req.headers['x-api-key'] || (String(req.headers.authorization || '').match(/^Bearer\s+(aio_[0-9a-f]+)$/) || [])[1];
  if (!h) return null;
  const rec = db.keys.find((k) => k.hash === hashKey(String(h)));
  if (!rec) return null;
  if (Date.now() - rec.last > 60e3) { rec.last = Date.now(); save(); }
  return { ...rec, scope: rec.scope || 'full' };
}
export const keyValid = (req) => !!keyOf(req);
