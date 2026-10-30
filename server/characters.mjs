// 직접 만든 캐릭터 (data/characters.json) — 관리자가 이름 · 국적 · 외모 · 레벨 · 직급 · 돈 · 행동 · 위치를 정한다.
//   · 독립 캐릭터: AI 세션 없이 사무실에 출근하는 직원. 수집할 때마다 가상 세션(id 'custom:<id>')으로 끼워 넣어
//                 자리 배치 · 이름표 · 지갑 · 월급 · 자리 지정(빌딩 관리) · 감옥/금고 같은 기존 기능을 그대로 쓴다.
//   · 세션 배정: 실제 AI 세션 하나에 이 캐릭터의 인적사항 · 외모 · 말풍선을 입힌다(가상 세션은 만들지 않음).
//   행동: 일하기(작업 종류) · 생각 · 회의 · 휴식 · 밖에서 쉬기 · 잠자기 · 패턴(여러 행동을 정한 분만큼 돌아가며 반복)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from './auth.mjs';
import { NATIONS, MBTI } from './persona.mjs';

const FILE = path.join(DATA_DIR, 'characters.json');
export const HATS = ['beanie', 'beret', 'bucket', 'headphones', 'cap', 'bow', 'shades', 'ears', 'none'];
export const WORK_TYPES = { edit: '코드 수정 중', terminal: '명령 실행 중', read: '문서 읽는 중', search: '검색 중', web: '웹 탐색 중', plan: '할 일 정리', talk: '답변 정리 중', publish: '결과물 정리' };
export const BEHAVIORS = { work: '💻 일하기', think: '💭 생각하기', meeting: '🗣️ 회의', rest: '☕ 실내 휴식', outside: '🌳 밖에서 쉬기', sleep: '😴 잠자기', pattern: '🔁 패턴 반복' };
const NAT = new Set(NATIONS.map((n) => n.code));

let db = { list: [] };
try { db = { list: [], ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}
const save = () => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 1)); fs.renameSync(tmp, FILE); } catch {} };

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : d; };

/** 입력 정리 (모르는 키는 버림) */
export function clean(o, prev = {}) {
  const c = { ...prev };
  const has = (k) => o && Object.prototype.hasOwnProperty.call(o, k);
  if (has('name')) c.name = str(o.name, 24) || prev.name || '새 직원';
  if (has('nat')) c.nat = NAT.has(o.nat) ? o.nat : prev.nat || 'KR';
  if (has('gender')) c.gender = ['M', 'F', 'X'].includes(o.gender) ? o.gender : 'X';
  if (has('age')) c.age = num(o.age, 18, 99, prev.age || 30);
  if (has('mbti')) c.mbti = MBTI.includes(String(o.mbti).toUpperCase()) ? String(o.mbti).toUpperCase() : '';
  if (has('city')) c.city = str(o.city, 20);
  if (has('hobby')) c.hobby = str(o.hobby, 20);
  if (has('hat')) c.hat = HATS.includes(o.hat) ? o.hat : 'beanie';
  if (has('color')) c.color = /^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color : '#e2667f';
  if (has('level')) c.level = num(o.level, 1, 99, 1);
  if (has('rank')) c.rank = str(o.rank, 20);
  if (has('role')) c.role = str(o.role, 20);
  if (has('project')) c.project = str(o.project, 40);
  if (has('payroll')) c.payroll = !!o.payroll;
  if (has('sessionId')) c.sessionId = typeof o.sessionId === 'string' && o.sessionId && !o.sessionId.startsWith('custom:') ? o.sessionId.slice(0, 200) : '';
  if (has('behavior')) c.behavior = BEHAVIORS[o.behavior] ? o.behavior : 'work';
  if (has('work')) c.work = WORK_TYPES[o.work] ? o.work : 'edit';
  if (has('label')) c.label = str(o.label, 40);
  if (has('bubble')) c.bubble = str(o.bubble, 60);
  if (has('pattern')) c.pattern = (Array.isArray(o.pattern) ? o.pattern : []).slice(0, 12)
    .map((p) => ({ act: BEHAVIORS[p && p.act] && p.act !== 'pattern' ? p.act : 'work', min: num(p && p.min, 1, 600, 30), label: str(p && p.label, 40) }));
  if (has('hidden')) c.hidden = !!o.hidden;
  // 공개 범위: 'public'(비로그인 포함 모두) · 'admin'(나만) · 0~11(그 등급 이상 로그인 계정)
  if (has('see')) c.see = o.see === 'public' || o.see === 'admin' ? o.see : Number.isInteger(+o.see) && +o.see >= 0 && +o.see <= 11 ? +o.see : 'public';
  return c;
}

export const list = () => db.list;
export const get = (id) => db.list.find((c) => c.id === id) || null;
export function create(o) {
  if (db.list.length >= 200) return { ok: false, error: '캐릭터는 200명까지 만들 수 있어요' };
  const c = clean({ see: 'public', name: '새 직원', nat: 'KR', age: 30, hat: 'beanie', color: '#e2667f', level: 1, behavior: 'work', work: 'edit', payroll: true, pattern: [], ...o }, {});
  c.id = crypto.randomBytes(5).toString('hex');
  c.createdAt = Date.now();
  db.list.push(c); save();
  return { ok: true, char: c };
}
export function update(id, o) {
  const i = db.list.findIndex((c) => c.id === id);
  if (i < 0) return { ok: false, error: '없는 캐릭터예요' };
  db.list[i] = { ...clean(o, db.list[i]), id, createdAt: db.list[i].createdAt, updatedAt: Date.now() };
  save();
  return { ok: true, char: db.list[i] };
}
export function remove(id) { const n = db.list.length; db.list = db.list.filter((c) => c.id !== id); if (db.list.length !== n) save(); return db.list.length !== n; }

/** 패턴이면 지금 차례의 행동 · 남은 분 */
export function currentStep(c, now = Date.now()) {
  if (c.behavior !== 'pattern' || !(c.pattern && c.pattern.length)) return { act: c.behavior === 'pattern' ? 'work' : c.behavior, label: c.label, left: null, i: -1 };
  const total = c.pattern.reduce((k, p) => k + p.min, 0) * 60e3;
  let t = (now - (c.updatedAt || c.createdAt || 0)) % total;
  for (let i = 0; i < c.pattern.length; i++) { const d = c.pattern[i].min * 60e3; if (t < d) return { act: c.pattern[i].act, label: c.pattern[i].label || c.label, left: Math.ceil((d - t) / 60e3), i }; t -= d; }
  return { act: c.pattern[0].act, label: c.pattern[0].label, left: null, i: 0 };
}

const personaOf = (c) => ({ name: c.name, gender: c.gender || 'X', nat: c.nat, age: c.age, mbti: c.mbti || undefined, city: c.city || undefined, hobby: c.hobby || undefined });
const look = (c) => ({ hat: c.hat === 'none' ? null : c.hat, accent: c.color });
/** 볼 수 있는 최소 등급: -1 = 비로그인도 · 99 = 관리자만 */
export const seeMin = (c) => (c.see === 'admin' ? 99 : c.see === 'public' || c.see == null ? -1 : +c.see);

/** 수집할 때마다: 독립 캐릭터 → 가상 세션, 세션 배정 캐릭터 → 그 세션에 인적사항 입히기 */
export function inject(sessions, now = Date.now()) {
  const out = [];
  for (const c of db.list) {
    if (c.hidden) continue;
    const step = currentStep(c, now);
    if (c.sessionId) {
      const s = sessions.find((x) => x.id === c.sessionId);
      if (s) { s.custom = { id: c.id, linked: true, persona: personaOf(c), seeMin: seeMin(c) }; s.look = look(c); if (c.bubble) s.bubble = c.bubble; }
      continue;
    }
    const busy = step.act === 'work' || step.act === 'think' || step.act === 'meeting';
    const type = step.act === 'think' ? 'think' : step.act === 'meeting' ? 'meeting' : step.act === 'work' ? (c.work || 'edit') : 'idle';
    const s = {
      id: 'custom:' + c.id, provider: 'custom', source: 'custom', kind: 'single', app: '직접 만든 캐릭터',
      title: c.name, project: c.project || '', cwd: '', model: '', effort: '', permissionMode: '', pid: null,
      status: step.act === 'sleep' ? 'sleeping' : step.act === 'think' ? 'thinking' : busy ? 'working' : 'idle',
      activity: { type, label: step.label || (step.act === 'work' ? WORK_TYPES[c.work || 'edit'] : BEHAVIORS[step.act].slice(2).trim()), detail: step.left ? `패턴 · ${step.left}분 남음` : '', since: now },
      startedAt: c.createdAt, lastActive: step.act === 'sleep' ? now - 8 * 3600e3 : now, turnStartedAt: 0, lastPrompt: '',
      stats: { tools: 0, edits: 0, cmds: 0, reads: 0, searches: 0, web: 0, agents: 0, turns: 0, today: 0 },
      level: c.level || 1, roster: [], agents: [], todos: [], feed: [],
      custom: { id: c.id, behavior: c.behavior, act: step.act, persona: personaOf(c), rank: c.rank, role: c.role, noPay: c.payroll === false, seeMin: seeMin(c) },
      look: look(c), bubble: c.bubble || '',
      place: step.act === 'rest' ? 'paused' : step.act === 'sleep' ? 'stopped' : 'active',
    };
    out.push(s);
  }
  return out;
}
/** applyMeta 뒤에: 행동이 원하는 동작(회의 · 밖)과 직급을 ctl 에 (관리자가 빌딩 관리에서 정한 게 우선) */
export function afterMeta(s) {
  if (!s.custom || s.custom.linked) return;
  s.ctl = { ...(s.ctl || {}) };
  if (!s.ctl.action || s.ctl.action === 'auto') { if (s.custom.act === 'meeting') s.ctl.action = 'meet'; else if (s.custom.act === 'outside') s.ctl.action = 'outside'; else if (s.custom.act === 'work' || s.custom.act === 'think') s.ctl.action = s.ctl.assign ? s.ctl.action : undefined; }
  if (s.custom.rank && !s.ctl.rank) s.ctl.rank = s.custom.rank;
  if (s.custom.role && !s.ctl.role) s.ctl.role = s.custom.role;
}
