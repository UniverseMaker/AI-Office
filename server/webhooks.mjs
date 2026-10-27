// 칸반(업무관리) 연동 웹훅: 세션 상태가 바뀌면 등록한 주소로 POST — 칸반 카드를 알아서 옮기게.
//   상태 → 칸반 열: working(작업중) · review(결정 필요) · done(완료) · idle(대기) · stopped(중단·보관) · closed(종료)
//   본문: { event, column, columnKey, previous, session: { id, title, project, status, activity, task, memo, … }, at }
//   서명: X-AIO-Signature: sha256=<HMAC-SHA256(secret, 본문)>  · X-AIO-Event · 실패하면 3번까지 다시 보낸다.
import { publicHttps } from './util.mjs';
import crypto from 'node:crypto';

export const COLUMN_KEYS = [['working', '작업중'], ['review', '결정 필요'], ['done', '완료'], ['idle', '대기'], ['stopped', '중단 · 보관'], ['closed', '종료']];
export const DEFAULT_COLUMNS = { working: 'In Progress', review: 'Review', done: 'Done', idle: 'To Do', stopped: 'Backlog', closed: 'Done' };

export function columnOf(s) {
  if (!s) return 'closed';
  if (s.status === 'waiting_input' || s.status === 'waiting_permission') return 'review';
  if (['working', 'tool', 'thinking', 'delegating'].includes(s.status)) return 'working';
  if (s.place === 'stopped' || s.place === 'jail' || s.place === 'vault' || s.place === 'dungeon' || s.status === 'sleeping') return 'stopped';
  if (s.status === 'done') return 'done';
  return 'idle';
}
const payloadSession = (s) => ({ id: s.id, title: s.title, project: s.project, provider: s.provider, model: s.model, kind: s.kind, status: s.status, place: s.place, activity: s.activity ? { type: s.activity.type, label: s.activity.label, detail: s.activity.detail } : null, startedAt: s.startedAt, lastActive: s.lastActive, task: s.meta?.task || null, memo: s.meta?.memo || null, tags: s.meta?.tags || null, roster: (s.roster || []).map((r) => r.name) });

export class Webhooks {
  constructor(getHooks) { this.getHooks = getHooks; this.prev = new Map(); this.log = []; this.queue = []; this.sending = false; }
  /** 수집할 때마다: 열(column)이 바뀐 세션만 보낸다 */
  scan(sessions) {
    const hooks = (this.getHooks() || []).filter((h) => h.enabled && h.url);
    const seen = new Set();
    for (const s of sessions) {
      seen.add(s.id);
      const col = columnOf(s), was = this.prev.get(s.id);
      this.prev.set(s.id, col);
      if (was === undefined && !this.primed) continue;          // 서버 켤 때 한꺼번에 쏘지 않는다
      if (was !== col) for (const h of hooks) this.enqueue(h, was === undefined ? 'session.created' : 'session.moved', s, col, was);
    }
    for (const [id, was] of this.prev) if (!seen.has(id)) { this.prev.delete(id); for (const h of hooks) this.enqueue(h, 'session.closed', { id }, 'closed', was); }
    this.primed = true;
    this.flush();
  }
  enqueue(h, event, s, col, was) {
    if (h.events && h.events.length && !h.events.includes(event)) return;
    const body = JSON.stringify({ event, columnKey: col, column: (h.columns || DEFAULT_COLUMNS)[col] || col, previous: was ? (h.columns || DEFAULT_COLUMNS)[was] || was : null, session: s.title !== undefined ? payloadSession(s) : { id: s.id }, at: Date.now() });
    this.queue.push({ h, event, body, tries: 0 });
  }
  async flush() {
    if (this.sending) return;
    this.sending = true;
    try {
      while (this.queue.length) {
        const job = this.queue.shift();
        const r = await this.send(job.h, job.event, job.body);
        if (!r.ok && ++job.tries < 3) setTimeout(() => { this.queue.push(job); this.flush(); }, 5000 * job.tries);
      }
    } finally { this.sending = false; }
  }
  async send(h, event, body) {
    const headers = { 'Content-Type': 'application/json', 'User-Agent': 'AI-Office-Webhook/1', 'X-AIO-Event': event };
    if (h.secret) headers['X-AIO-Signature'] = 'sha256=' + crypto.createHmac('sha256', h.secret).update(body).digest('hex');
    for (const [k, v] of Object.entries(h.headers || {})) if (/^[\w-]+$/.test(k)) headers[k] = String(v);
    let ok = false, status = 0, error = null;
    try { if (!publicHttps(h.url)) throw new Error('https 공개 주소만 보낼 수 있어요'); const r = await fetch(h.url, { method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(8000) }); status = r.status; ok = r.ok; }
    catch (e) { error = e.message; }
    this.log.unshift({ at: Date.now(), hook: h.id, event, ok, status, error });
    this.log.length = Math.min(this.log.length, 50);
    return { ok, status, error };
  }
  /** 설정 화면의 '테스트 보내기' */
  test(h, sample) { return this.send(h, 'test', JSON.stringify({ event: 'test', columnKey: 'working', column: (h.columns || DEFAULT_COLUMNS).working, previous: null, session: sample ? payloadSession(sample) : { id: 'test', title: '테스트 세션' }, at: Date.now() })); }
}
