// 칸반(FlowBoard · TCC) 연동: AI OFFICE 안에서 보드를 보고 조작하고, 세션 ↔ 카드를 연결해 세션이 바뀌면 카드를 알아서 갱신한다.
//   토큰은 계정 금고(vault.mjs, 관리자 계정)에만 — 관리자가 로그인해 있어야 풀린다. 화면 · API 응답 · 배포본 어디에도 안 나간다.
//   토큰은 저장할 때의 API 주소(origin)에 묶인다: 주소를 다른 곳으로 바꾸면 토큰을 다시 넣기 전엔 안 보낸다(토큰 빼돌리기 방지).
//   설정(주소·보드·자동화)은 meta settings.tcc.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './auth.mjs';
import * as vault from './vault.mjs';

const OWNER = '@admin';
const SECRET = path.join(DATA_DIR, 'secrets.json');
// 옛 버전(평문 data/secrets.json)에서 옮겨 오기: 금고 대기함으로 봉인하고 평문은 지운다
try {
  const old = JSON.parse(fs.readFileSync(SECRET, 'utf8')) || {};
  if (old.tccToken) {
    vault.addPending(OWNER, 'tcc', JSON.stringify({ token: String(old.tccToken), origin: 'https://flowboard.example.com' }));
    delete old.tccToken;
    if (Object.keys(old).length) fs.writeFileSync(SECRET, JSON.stringify(old, null, 1)); else fs.unlinkSync(SECRET);
  }
} catch {}
const originOf = (u) => { try { return new URL(u).origin; } catch { return ''; } };
const secret = () => { try { return JSON.parse(vault.get(OWNER, 'tcc') || 'null'); } catch { return null; } };
export function setToken(token, base) {
  if (!token) return vault.set(OWNER, 'tcc', null);
  return vault.set(OWNER, 'tcc', JSON.stringify({ token: String(token).trim().slice(0, 200), origin: originOf(base || DEFAULT_TCC.base) }));
}
export const hasToken = () => vault.has(OWNER, 'tcc');
export const tokenStatus = () => ({ hasToken: hasToken(), unlocked: vault.isUnlocked(OWNER) });
const token = (base) => { const s = secret(); return s && s.token && s.origin === originOf(base) ? s.token : ''; };

export const DEFAULT_TCC = {
  base: 'https://flowboard.example.com/api.php/v1',
  project: '',                 // 기본 보드 KEY (자동 생성 카드가 들어갈 곳)
  autoSync: true,              // 연결된 카드 자동 갱신
  autoCreate: false,           // 새 세션마다 카드 자동 생성 + 연결
  statusMap: { working: 'In Progress', review: 'In Review', done: 'In Review', idle: '', stopped: 'Pending', closed: '' },
  comments: { status: true, prompt: true, done: true },
  checklist: true,
};

/** FlowBoard API 호출 (서버에서만 — 토큰은 여기서만 붙는다) */
export async function tcc(cfg, method, p, body) {
  const base = String(cfg.base || DEFAULT_TCC.base).replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) return { status: 400, body: { ok: false, error: { code: 'bad_base', message: 'HTTPS 주소만 쓸 수 있어요' } } };
  if (!vault.isUnlocked(OWNER)) return { status: 423, body: { ok: false, error: { code: 'vault_locked', message: '계정 금고가 잠겨 있어요 — 관리자로 다시 로그인하면 열려요' } } };
  const t = token(base);
  if (!t) return { status: 400, body: { ok: false, error: { code: 'no_token', message: hasToken() ? '저장된 토큰은 다른 주소용이에요 — 이 주소로 토큰을 다시 넣어 주세요' : 'FlowBoard 토큰이 설정되지 않았어요' } } };
  try {
    const r = await fetch(base + p, { method, redirect: 'error', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', 'User-Agent': 'AI-Office/1' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, body: j || { ok: false, error: { code: 'bad_response', message: `HTTP ${r.status}` } } };
  } catch (e) { return { status: 502, body: { ok: false, error: { code: 'network', message: e.message } } }; }
}

// 화면이 프록시로 쓸 수 있는 경로 (그 밖은 거부)
const ALLOW = [
  ['GET', /^\/(me|projects|statuses|priorities|labels|users)$/], ['GET', /^\/projects\/[\w-]+(\/sprints)?$/],
  ['GET', /^\/issues$/], ['GET', /^\/issues\/[\w-]+(\/comments)?$/],
  ['POST', /^\/issues$/], ['POST', /^\/issues\/[\w-]+\/(comments|checklist)$/],
  ['PATCH', /^\/issues\/[\w-]+$/], ['PATCH', /^\/issues\/[\w-]+\/checklist\/[\w-]+$/],
];
export const allowedProxy = (method, p) => ALLOW.some(([m, re]) => m === method && re.test(p));

/** 세션 → 새 카드 내용 */
export function cardFromSession(s, project) {
  const lines = [`AI OFFICE 세션에서 만든 카드예요.`, '', `- 세션: ${s.title || s.id}`, `- 프로젝트 폴더: ${s.project || ''}`, `- 모델: ${s.model || ''}`, `- 종류: ${s.kind === 'harness' ? '하네스 팀 (' + (s.roster || []).map((r) => r.name).join(', ') + ')' : '단일 세션'}`, `- 세션 id: ${s.id}`];
  if (s.lastPrompt) lines.push('', '마지막 요청:', String(s.lastPrompt).slice(0, 1500));
  return { project, title: `[AI] ${String(s.title || s.id).slice(0, 180)}`, description: lines.join('\n'), status: 'In Progress', assignee: 'me', type: 'Task' };
}

const COLUMN_LABEL = { working: '🟢 작업 중', review: '🙋 결정 필요', done: '✅ 응답 완료', idle: '☕ 대기', stopped: '⏸️ 중단', closed: '👋 세션 종료' };

/**
 * 연결된 카드 자동 갱신기. collect() 마다 scan(sessions) — 바뀐 것만 모아 카드마다 한 번에 보낸다(카드당 최소 20초 간격).
 * link 기록: meta.sessions[id].task = { key, id, title, url, project, sync, checklist: { 할일문구: itemId } }
 */
export class TccSync {
  constructor({ getCfg, getLink, setLink, columnOf, log }) { Object.assign(this, { getCfg, getLink, setLink, columnOf, log }); this.prev = new Map(); this.last = new Map(); this.busy = false; this.queue = new Map(); this.history = []; this.created = new Set(); }
  note(entry) { this.history.unshift({ at: Date.now(), ...entry }); this.history.length = Math.min(this.history.length, 60); }
  scan(sessions) {
    const cfg = { ...DEFAULT_TCC, ...(this.getCfg() || {}) };
    if (!hasToken() || !vault.isUnlocked(OWNER)) return;
    const seen = new Set();
    for (const s of sessions) {
      seen.add(s.id);
      const link = this.getLink(s.id);
      if (!link || !link.key) {
        if (cfg.autoCreate && cfg.project && s.kind !== 'app' && !this.created.has(s.id) && this.prev.has(s.id)) { this.created.add(s.id); this.autoCreate(s, cfg); }
        this.prev.set(s.id, { col: this.columnOf(s) });
        continue;
      }
      if (!cfg.autoSync || link.sync === false) continue;
      const col = this.columnOf(s);
      const todos = (s.todos || []).filter((t) => t && t.content);
      const doneN = todos.filter((t) => t.status === 'completed').length;
      const cur = { col, prompt: s.lastPrompt || '', todos: todos.map((t) => `${t.status}:${t.content}`).join('|'), progress: todos.length ? Math.round((doneN / todos.length) * 100) : null };
      const was = this.prev.get(s.id);
      this.prev.set(s.id, cur);
      if (!was) continue;                                    // 처음 본 순간은 기준만 잡는다
      const job = this.queue.get(link.key) || { key: link.key, sid: s.id, patch: {}, comments: [], todos: null };
      if (was.col !== col) {
        const st = cfg.statusMap[col];
        if (st) job.patch.status = st;
        if (cfg.comments.status) job.comments.push(`🤖 AI OFFICE · ${COLUMN_LABEL[col] || col}${s.activity?.label ? ` — ${s.activity.label}` : ''}${s.activity?.detail ? `\n${String(s.activity.detail).slice(0, 400)}` : ''}`);
        if (col === 'done' && cfg.comments.done && s.lastPrompt) job.comments.push(`✅ 요청 처리 완료: "${String(s.lastPrompt).slice(0, 300)}"`);
      }
      if (cfg.comments.prompt && was.prompt !== cur.prompt && cur.prompt) job.comments.push(`📝 새 요청: ${String(cur.prompt).slice(0, 1500)}`);
      if (cur.progress != null && cur.progress !== was.progress) job.patch.progress = cur.progress;
      if (cfg.checklist && cur.todos !== was.todos) job.todos = todos;
      if (Object.keys(job.patch).length || job.comments.length || job.todos) this.queue.set(link.key, job);
    }
    for (const id of [...this.prev.keys()]) if (!seen.has(id)) {
      const link = this.getLink(id);
      this.prev.delete(id);
      if (link && link.key && cfg.autoSync && link.sync !== false) {
        const st = cfg.statusMap.closed;
        const job = this.queue.get(link.key) || { key: link.key, sid: id, patch: {}, comments: [], todos: null };
        if (st) job.patch.status = st;
        if (cfg.comments.status) job.comments.push('👋 AI OFFICE · 세션이 종료됐어요 (퇴근)');
        this.queue.set(link.key, job);
      }
    }
    this.flush(cfg);
  }
  async autoCreate(s, cfg) {
    const r = await tcc(cfg, 'POST', '/issues', cardFromSession(s, cfg.project));
    if (r.body && r.body.ok) { const c = r.body.data; this.setLink(s.id, { key: c.key, id: c.id, title: c.title, url: c.webUrl, project: c.projectKey, sync: true }); this.note({ key: c.key, ok: true, what: '자동 생성 · 연결' }); }
    else this.note({ key: '-', ok: false, what: '자동 생성 실패', error: r.body?.error?.message });
  }
  async flush(cfg) {
    if (this.busy) return;
    this.busy = true;
    try {
      for (const [key, job] of [...this.queue]) {
        if (Date.now() - (this.last.get(key) || 0) < 20000) continue;          // 카드당 20초에 한 번
        this.queue.delete(key); this.last.set(key, Date.now());
        const errs = [];
        if (Object.keys(job.patch).length) { const r = await tcc(cfg, 'PATCH', `/issues/${encodeURIComponent(key)}`, job.patch); if (!r.body?.ok) errs.push(r.body?.error?.message || r.status); }
        for (const text of job.comments.slice(0, 4)) { const r = await tcc(cfg, 'POST', `/issues/${encodeURIComponent(key)}/comments`, { text }); if (!r.body?.ok) errs.push(r.body?.error?.message || r.status); }
        if (job.todos) {
          const link = this.getLink(job.sid) || {};
          const map = { ...(link.checklist || {}) };
          for (const t of job.todos.slice(0, 40)) {
            const text = String(t.content).slice(0, 200), done = t.status === 'completed';
            const cur = map[text];
            if (!cur) { const r = await tcc(cfg, 'POST', `/issues/${encodeURIComponent(key)}/checklist`, { text }); if (r.body?.ok) { map[text] = { id: r.body.data.id, done: false }; if (done) { await tcc(cfg, 'PATCH', `/issues/${encodeURIComponent(key)}/checklist/${r.body.data.id}`, { done: true }); map[text].done = true; } } }
            else if (cur.done !== done) { const r = await tcc(cfg, 'PATCH', `/issues/${encodeURIComponent(key)}/checklist/${cur.id}`, { done }); if (r.body?.ok) cur.done = done; }
          }
          this.setLink(job.sid, { ...link, checklist: map });
        }
        this.note({ key, ok: !errs.length, what: [Object.keys(job.patch).map((k) => `${k}=${job.patch[k]}`).join(', '), job.comments.length ? `댓글 ${job.comments.length}` : '', job.todos ? '체크리스트' : ''].filter(Boolean).join(' · '), error: errs[0] });
      }
    } catch (e) { this.log && this.log('tcc:', e.message); }
    finally { this.busy = false; if (this.queue.size) setTimeout(() => this.flush(cfg), 21000); }
  }
}
