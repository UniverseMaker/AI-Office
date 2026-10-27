// 행정관리시스템(MGM) 연동: 근태(출퇴근) · 전자결재 · 업무보고 · 일정 · 물품/장비 · 게시판을 AI OFFICE 안에서 보고 처리한다.
//
// 보안 설계 (docs/SECURITY.md 의 "행정관리 연동" 참고)
//   · 토큰: 관리자 계정 금고(vault.mjs)에만. 관리자가 로그인해 있어야 풀리고, 브라우저 · 응답 · 로그에 절대 안 나간다.
//   · 토큰은 저장할 때의 API 주소(origin)에 묶임 → 주소를 바꾸면 토큰을 다시 넣기 전엔 안 보낸다.
//   · 관리자만(isAuthed) · HTTPS 만 · 리다이렉트 따라가지 않음 · 15초 시간 제한 · 응답 2MB 제한.
//   · 경로 허용목록 + 쿼리 키 허용목록 + 쓰기 본문 필드 허용목록. 삭제(DELETE) · 인사(직원/부서) 변경 · 근태 보정은 아예 막음.
//   · 속도 제한(읽기 120/분 · 쓰기 20/분) · 감사 기록(data/mgm-audit.jsonl: 시각 · 사람 · 경로 · 결과, 본문/토큰은 안 남김).
//   · 외부 주소(터널)로 들어온 요청은 기본으로 읽기만 (설정에서 켜야 쓰기 가능).
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './auth.mjs';
import * as vault from './vault.mjs';

const OWNER = '@admin';
const AUDIT = path.join(DATA_DIR, 'mgm-audit.jsonl');
export const DEFAULT_MGM = { base: 'https://mgm.example.com/api.php/v1', externalWrite: false };
const MAX_BYTES = 2 * 1024 * 1024;
const originOf = (u) => { try { return new URL(u).origin; } catch { return ''; } };

const secret = () => { try { return JSON.parse(vault.get(OWNER, 'mgm') || 'null'); } catch { return null; } };
export function setToken(token, base) {
  if (!token) return vault.set(OWNER, 'mgm', null);
  const t = String(token).trim();
  if (!/^mgm_[A-Za-z0-9]{16,128}$/.test(t)) return 'bad';
  return vault.set(OWNER, 'mgm', JSON.stringify({ token: t, origin: originOf(base || DEFAULT_MGM.base) }));
}
export const tokenStatus = () => ({ hasToken: vault.has(OWNER, 'mgm'), unlocked: vault.isUnlocked(OWNER) });

// ---------------------------------------------------------------- 허용목록
const ID = '[A-Za-z0-9_.-]{1,64}';
const GET_OK = [
  /^\/me$/, /^\/users$/, new RegExp(`^/users/${ID}$`), /^\/employees$/, new RegExp(`^/employees/${ID}$`), /^\/departments$/,
  /^\/attendance\/today$/, /^\/attendance$/, /^\/approvals$/, new RegExp(`^/approvals/${ID}$`),
  /^\/reportdocs$/, new RegExp(`^/reportdocs/${ID}$`), /^\/events$/, new RegExp(`^/events/${ID}$`),
  /^\/equipment$/, new RegExp(`^/equipment/${ID}$`), /^\/boards$/, /^\/posts$/, new RegExp(`^/posts/${ID}$`),
];
const EV = ['title', 'start', 'end', 'allDay', 'scope', 'description', 'location', 'category', 'color', 'attendees', 'reminders'];
/** 쓰기: [메서드, 경로, 받을 수 있는 필드] — 여기 없으면 거부 (DELETE · 인사 · 근태 보정 없음) */
const WRITE_OK = [
  ['POST', /^\/attendance\/punch$/, ['kind']],
  ['POST', /^\/approvals$/, ['title', 'content', 'line', 'submit', 'docType', 'refId', 'deptId']],
  ['PATCH', new RegExp(`^/approvals/${ID}$`), ['title', 'content', 'line', 'ifUpdatedAt']],
  ['POST', new RegExp(`^/approvals/${ID}/submit$`), ['ifUpdatedAt']],
  ['POST', new RegExp(`^/approvals/${ID}/(approve|reject|withdraw)$`), ['comment']],
  ['POST', /^\/reportdocs$/, ['period', 'periodKey', 'periodStart', 'periodEnd', 'title', 'sections', 'submit']],
  ['PATCH', new RegExp(`^/reportdocs/${ID}$`), ['title', 'sections', 'periodStart', 'periodEnd', 'ifUpdatedAt']],
  ['POST', new RegExp(`^/reportdocs/${ID}/submit$`), ['ifUpdatedAt']],
  ['POST', /^\/events$/, EV],
  ['PATCH', new RegExp(`^/events/${ID}$`), [...EV, 'ifUpdatedAt']],
  ['POST', /^\/posts$/, ['boardId', 'title', 'body', 'category', 'tags']],
  ['PATCH', new RegExp(`^/posts/${ID}$`), ['title', 'body', 'category', 'tags', 'ifUpdatedAt']],
  ['PATCH', new RegExp(`^/equipment/${ID}$`), ['location', 'status', 'note', 'userName', 'userAffiliation', 'managerName', 'ifUpdatedAt']],
];
const QUERY_OK = new Set(['limit', 'offset', 'box', 'status', 'from', 'to', 'q', 'period', 'periodKey', 'boardId', 'scope', 'updatedSince', 'deptId', 'category', 'employeeId', 'userId', 'assetNo', 'all', 'authorUserId']);

/** 경로 · 쿼리 · 본문 검사. 통과하면 { path, body } 아니면 { error } */
export function vet(method, sub, search, body) {
  if (!/^\/[A-Za-z0-9_./-]*$/.test(sub) || sub.includes('..') || sub.includes('//')) return { error: '이상한 경로예요' };
  let qs = '';
  if (search) {
    const out = new URLSearchParams();
    for (const [k, v] of new URLSearchParams(search)) {
      if (!QUERY_OK.has(k)) return { error: `허용되지 않은 조회 조건: ${k}` };
      if (v.length > 120 || /[\u0000-\u001f]/.test(v)) return { error: '조회 조건 값이 이상해요' };
      out.append(k, v);
    }
    qs = out.toString() ? '?' + out.toString() : '';
  }
  if (method === 'GET') return GET_OK.some((re) => re.test(sub)) ? { path: sub + qs } : { error: '허용되지 않은 조회예요' };
  const rule = WRITE_OK.find(([m, re]) => m === method && re.test(sub));
  if (!rule) return { error: method === 'DELETE' ? 'AI OFFICE 에서는 삭제할 수 없어요 (행정관리 화면에서 하세요)' : '허용되지 않은 요청이에요' };
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const bad = Object.keys(b).filter((k) => !rule[2].includes(k));
  if (bad.length) return { error: `받을 수 없는 필드: ${bad.join(', ')}` };
  if (sub === '/attendance/punch' && !['in', 'out'].includes(b.kind)) return { error: 'kind 는 in 또는 out' };
  return { path: sub + qs, body: b };
}

// ---------------------------------------------------------------- 속도 제한 · 감사 기록
const hits = { r: [], w: [] };
export function rateOk(write) {
  const now = Date.now(), arr = write ? hits.w : hits.r, cap = write ? 20 : 120;
  while (arr.length && now - arr[0] > 60e3) arr.shift();
  if (arr.length >= cap) return false;
  arr.push(now); return true;
}
export function audit(entry) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(AUDIT, JSON.stringify({ at: Date.now(), ...entry }) + '\n');
    const st = fs.statSync(AUDIT);
    if (st.size > 1.5e6) { const lines = fs.readFileSync(AUDIT, 'utf8').trim().split('\n'); fs.writeFileSync(AUDIT, lines.slice(-2000).join('\n') + '\n'); }
  } catch {}
}
export function auditTail(n = 200) {
  try { return fs.readFileSync(AUDIT, 'utf8').trim().split('\n').slice(-n).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; }
}

/** 응답에서 토큰 흔적 지우기 (/me 의 token.prefix 등) */
function scrub(j) {
  if (j && j.data && j.data.token && typeof j.data.token === 'object') { const { prefix, ...rest } = j.data.token; j.data.token = rest; }
  return j;
}

/** MGM API 호출 (서버에서만 — 토큰은 여기서만 붙는다) */
export async function mgm(cfg, method, p, body) {
  const base = String(cfg.base || DEFAULT_MGM.base).replace(/\/+$/, '');
  if (!/^https:\/\/[^\s/]+\/\S*$/.test(base + '/')) return { status: 400, body: { ok: false, error: { code: 'bad_base', message: 'HTTPS 주소만 쓸 수 있어요' } } };
  if (!vault.isUnlocked(OWNER)) return { status: 423, body: { ok: false, error: { code: 'vault_locked', message: '계정 금고가 잠겨 있어요 — 관리자로 다시 로그인하면 열려요' } } };
  const s = secret();
  if (!s || !s.token) return { status: 400, body: { ok: false, error: { code: 'no_token', message: '행정관리 토큰이 설정되지 않았어요' } } };
  if (s.origin !== originOf(base)) return { status: 400, body: { ok: false, error: { code: 'origin_mismatch', message: '저장된 토큰은 다른 주소용이에요 — 이 주소로 토큰을 다시 넣어 주세요' } } };
  try {
    const headers = { Authorization: 'Bearer ' + s.token, Accept: 'application/json', 'User-Agent': 'AI-Office/1' };
    let m = method;
    if (method === 'PATCH') { m = 'POST'; headers['X-HTTP-Method-Override'] = 'PATCH'; }
    if (body) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + p, { method: m, redirect: 'error', headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    const len = Number(r.headers.get('content-length') || 0);
    if (len > MAX_BYTES) return { status: 502, body: { ok: false, error: { code: 'too_large', message: '응답이 너무 커요' } } };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return { status: 502, body: { ok: false, error: { code: 'too_large', message: '응답이 너무 커요' } } };
    let j = null; try { j = JSON.parse(buf.toString('utf8')); } catch {}
    return { status: r.status, body: j ? scrub(j) : { ok: false, error: { code: 'bad_response', message: `HTTP ${r.status}` } } };
  } catch (e) { return { status: 502, body: { ok: false, error: { code: 'network', message: e.name === 'TimeoutError' ? '행정관리 서버 응답이 없어요' : '행정관리 서버에 연결하지 못했어요' } } }; }
}

// ---------------------------------------------------------------- 업무보고 초안 (AI 세션 기록으로)
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${pad(w)}`;
}
/** 이번 주(월~일) AI 세션 활동으로 주간 업무보고 초안 — 관리자가 보고 고친 뒤에만 보낸다 */
export function weeklyDraft(sessions) {
  const now = new Date(), mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  const mine = (sessions || []).filter((s) => s.kind !== 'app' && (s.lastActive || 0) >= mon.getTime());
  mine.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
  const byProj = new Map();
  for (const s of mine) { const k = String(s.project || '기타').split(/[\\/]/).filter(Boolean).pop() || '기타'; if (!byProj.has(k)) byProj.set(k, []); byProj.get(k).push(s); }
  const done = [], plan = [];
  for (const [proj, list] of byProj) {
    done.push(`■ ${proj}`);
    for (const s of list.slice(0, 8)) {
      const todos = (s.todos || []).filter((t) => t && t.content);
      const fin = todos.filter((t) => t.status === 'completed').length;
      done.push(`  - ${String(s.title || '세션').slice(0, 80)}${todos.length ? ` (할 일 ${fin}/${todos.length})` : ''}`);
      for (const t of todos.filter((t) => t.status !== 'completed').slice(0, 3)) plan.push(`  - [${proj}] ${String(t.content).slice(0, 100)}`);
    }
  }
  return {
    period: 'weekly', periodKey: isoWeek(now), periodStart: ymd(mon), periodEnd: ymd(sun),
    title: `${isoWeek(now).replace('-W', '년 ')}주차 업무보고`,
    sections: [
      { key: 'done', label: '금주 실적', body: done.join('\n') || '(이번 주 AI 세션 활동 없음)' },
      { key: 'plan', label: '차주 계획', body: plan.join('\n') || '' },
      { key: 'issue', label: '이슈 · 건의', body: '' },
    ],
    stats: { sessions: mine.length, projects: byProj.size },
  };
}
