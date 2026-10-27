// Authed detail APIs: per-session analysis, sub-agent conversation, global insights.
// Analyzers start lazily on first request and keep their byte offset afterwards.
import path from 'node:path';
import { SessionAnalyzer, progressSummary, sessionTips, recentAgentTypes, zeroTok, addTok, fmtDur, fmtTok } from './analyzer.mjs';
import { readJSON, startOfToday, now, shorten } from './util.mjs';

const IDLE_DROP = 30 * 60e3;   // forget analyzers of vanished sessions after this
const WAITING = new Set(['waiting_input', 'waiting_permission', 'done']);

/** wait for p, but no longer than ms */
function within(p, ms) {
  let tm;
  return Promise.race([p, new Promise((r) => { tm = setTimeout(r, ms); })]).finally(() => clearTimeout(tm));
}

export class Details {
  constructor({ claude, codex, getState }) {
    this.claude = claude;
    this.codex = codex;
    this.getState = getState;
    this.pool = new Map();   // transcript file -> SessionAnalyzer
  }

  findSession(id) { return (this.getState().sessions || []).find((s) => s.id === id) || null; }

  fileFor(s) {
    const raw = s.id.slice(s.id.indexOf(':') + 1);
    if (s.provider === 'claude' && s.source !== 'bridge' && this.claude) {
      const file = this.claude.findTranscript(raw, s.cwd);
      return file ? { file, provider: 'claude' } : null;
    }
    if (s.provider === 'codex' && s.source === 'transcript' && this.codex) {
      for (const [fp, ro] of this.codex.rollouts) if ((ro.meta?.id || path.basename(fp, '.jsonl')) === raw) return { file: fp, provider: 'codex' };
    }
    return null;
  }

  analyzer(s) {
    const f = this.fileFor(s);
    if (!f) return null;
    let an = this.pool.get(f.file);
    if (!an) { an = new SessionAnalyzer(f); this.pool.set(f.file, an); }
    return an;
  }

  prune() {
    const live = new Set();
    for (const s of this.getState().sessions || []) { const f = this.fileFor(s); if (f) live.add(f.file); }
    for (const [k, an] of this.pool) if (!live.has(k) && !an.running && now() - an.usedAt > IDLE_DROP) this.pool.delete(k);
  }

  rosterNames(s) { return (s.roster || []).map((r) => r.name); }
  recentTypes(an) { return an.provider === 'claude' ? recentAgentTypes(path.dirname(an.file)) : new Set(); }

  // ---------- GET /api/session/<id>/detail ----------
  async detail(id) {
    const s = this.findSession(id);
    if (!s) return { status: 404, body: { error: '세션을 찾을 수 없어요 (종료됐거나 아직 수집 전이에요)' } };
    const an = this.analyzer(s);
    if (!an) return { status: 200, body: this.shallow(s) };
    await within(an.update(true), 1500);
    const ins = an.insights(this.rosterNames(s), s.kind === 'harness' ? this.recentTypes(an) : null);
    if (s.kind !== 'harness') ins.delegation.idleMembers = [];
    const agents = await this.agentList(s, an);
    this.prune();
    return {
      status: 200,
      body: {
        session: s,
        scan: an.scan,
        conversation: an.conv.slice(-an.convMax),
        progress: {
          turns: an.turns.slice(-30),
          currentTurn: an.currentTurn(),
          todos: an.todos.size ? an.todoView() : todoFromSession(s),
          filesTouched: an.hotFiles(30),
          commands: an.commands.slice(-30),
          errors: an.errors.slice(-20),
          summary: progressSummary(an, s),
        },
        insights: ins,
        tips: sessionTips(ins, s),
        agents,
      },
    };
  }

  /** sessions we can't analyze (bridge / process / gemini): what the adapter already has */
  shallow(s) {
    return {
      session: s, scan: { done: true, pct: 100 }, conversation: [],
      progress: { turns: [], currentTurn: null, todos: todoFromSession(s), filesTouched: [], commands: [], errors: [], summary: s.lastPrompt ? `마지막 요청은 "${shorten(s.lastPrompt, 80)}"이에요.` : '' },
      insights: null, tips: [], agents: (s.agents || []).map((a) => ({ ...a, tools: a.tools || 0, lastText: '', recent: [] })),
    };
  }

  async agentList(s, an) {
    const files = [...an.agentFiles.values()].sort((a, b) => b.mtime - a.mtime).slice(0, 20);
    const pairs = files.map((a) => [a, an.agentAnalyzer(a.id)]);
    await within(Promise.all(pairs.map(([, x]) => x?.update())), 1500);
    const t = now();
    return pairs.map(([a, x]) => {
      const live = (s.agents || []).find((g) => g.id === a.id);
      const status = live ? live.status : t - a.mtime < 15e3 && x?.lastKind !== 'text' ? 'working' : 'done';
      return {
        id: a.id, type: a.type, description: shorten(a.description, 120), status,
        startedAt: x?.firstAt || a.birth, endedAt: status === 'done' ? (x?.lastAt || a.mtime) : null,
        tools: a.tools, model: a.meta.model || x?.model || '', background: a.meta.requestShape === 'background',
        lastText: x?.lastText || '', recent: x ? x.conv.slice(-15) : [],
      };
    });
  }

  // ---------- GET /api/agent/<sid>/<agentId> ----------
  async agent(sid, agentId) {
    if (!/^[\w-]{1,80}$/.test(agentId)) return { status: 400, body: { error: '잘못된 팀원 id' } };
    const s = this.findSession(sid);
    if (!s) return { status: 404, body: { error: '세션을 찾을 수 없어요' } };
    const an = this.analyzer(s);
    if (!an || an.provider !== 'claude') return { status: 404, body: { error: '이 세션은 팀원 기록이 없어요' } };
    const id = agentId.startsWith('agent-') ? agentId : 'agent-' + agentId;
    const x = an.agentAnalyzer(id);
    if (!x) return { status: 404, body: { error: '팀원 기록을 찾을 수 없어요' } };
    await within(x.update(true), 3000);
    const meta = readJSON(x.file.replace(/\.jsonl$/, '.meta.json'), {}) || {};
    const live = (s.agents || []).find((g) => g.id === id);
    return {
      status: 200,
      body: {
        id, sessionId: sid,
        meta: { agentType: meta.agentType || 'general-purpose', description: meta.description || '', model: meta.model || x.model || '', spawnDepth: meta.spawnDepth || 1, background: meta.requestShape === 'background' },
        status: live ? live.status : now() - x.lastAt < 15e3 && x.lastKind !== 'text' ? 'working' : 'done',
        activity: live?.activity || null,
        startedAt: x.firstAt, lastActive: x.lastAt,
        scan: x.scan, tools: x.toolCount, activityCounts: { ...x.activity }, tokens: { ...x.tok }, models: { ...x.models },
        lastText: x.lastText, todos: x.todoView(),
        conversation: x.conv.slice(-200),
      },
    };
  }

  // ---------- GET /api/insights ----------
  async global() {
    const t = now();
    const today0 = startOfToday();
    const sessions = (this.getState().sessions || []).filter((s) => s.kind !== 'app');
    const rows = sessions.map((s) => ({ s, an: this.analyzer(s) }));
    await within(Promise.all(rows.map((r) => r.an?.update())), 1200);
    this.prune();

    let off = 0, size = 0, allDone = true;
    const today = { tools: 0, edits: 0, cmds: 0, prompts: 0, tokensIn: 0, tokensOut: 0, tokensCacheRead: 0, sessionsActive: 0 };
    const tok = zeroTok();
    const byProvider = {}, byProject = {};
    const hourlyToday = Array(24).fill(0);
    const decisions = { count: 0, totalMs: 0 };
    const board = [], teams = [];
    const idleTotal = new Set();

    for (const { s, an } of rows) {
      if (an) { off += an.src.offset; size += an.src.target || an.src.offset; if (!an.done) allDone = false; }
      const b = an?.done ? an.todayBucket() : null;
      const tools = b ? b.tools : s.stats?.today || 0;
      if (b) {
        today.edits += b.edits; today.cmds += b.cmds; today.prompts += b.prompts;
        addTok(tok, b.tok);
        b.hours.forEach((n, h) => { hourlyToday[h] += n; });
      }
      today.tools += tools;
      if ((s.lastActive || 0) >= today0) today.sessionsActive++;
      const p = byProvider[s.provider] || (byProvider[s.provider] = { sessions: 0, tools: 0 });
      p.sessions++; p.tools += tools;
      const pj = s.project || '(기타)';
      const q = byProject[pj] || (byProject[pj] = { project: pj, tools: 0, sessions: 0 });
      q.tools += tools; q.sessions++;
      board.push({ id: s.id, title: s.title, provider: s.provider, today: tools });
      if (an?.done) { decisions.count += an.decisions.count; decisions.totalMs += an.decisions.totalMs; }
      if (s.kind === 'harness' && an) {
        const d = an.delegation(this.rosterNames(s), this.recentTypes(an));
        d.idleMembers.forEach((n) => idleTotal.add(`${s.project}/${n}`));
        teams.push({ id: s.id, title: s.title, members: (s.roster || []).length, idleMembers: d.idleMembers, leadShare: d.leadShare, leadTools: d.leadTools, agentTools: d.agentTools });
      }
    }
    today.tokensIn = tok.input + tok.cacheWrite;
    today.tokensOut = tok.output;
    today.tokensCacheRead = tok.cacheRead;

    const waitingNow = sessions.filter((s) => WAITING.has(s.status))
      .map((s) => ({ id: s.id, title: s.title, status: s.status, sinceMs: Math.max(0, t - (s.activity?.since || s.lastActive || t)) }))
      .sort((a, b) => b.sinceMs - a.sinceMs);
    const leaderboard = board.sort((a, b) => b.today - a.today).slice(0, 10);
    const dec = { count: decisions.count, avgMs: decisions.count ? Math.round(decisions.totalMs / decisions.count) : 0 };

    // tips — only what the numbers support
    const tips = [];
    const ask = waitingNow.filter((w) => w.status !== 'done');
    if (ask.length) tips.push(`대표님 결정·승인을 기다리는 세션 ${ask.length}개 — 가장 오래된 건 ${fmtDur(ask[0].sinceMs)}째예요`);
    const unchecked = waitingNow.filter((w) => w.status === 'done').length;
    if (unchecked) tips.push(`끝나고 확인을 기다리는 세션 ${unchecked}개`);
    if (today.tools >= 30 && leaderboard[0] && leaderboard[0].today / today.tools > 0.5)
      tips.push(`오늘 작업의 ${Math.round((leaderboard[0].today / today.tools) * 100)}%가 "${shorten(leaderboard[0].title, 30)}" 한 세션에 몰려 있어요`);
    for (const tm of teams) if (tm.leadShare > 0.5 && tm.leadTools + tm.agentTools >= 20) tips.push(`${shorten(tm.title, 30)}: 리더가 작업의 ${Math.round(tm.leadShare * 100)}%를 직접 처리 중 — 팀원에게 더 나눠보세요`);
    if (idleTotal.size) tips.push(`대기 팀원 ${idleTotal.size}명: 최근 7일 호출 0회`);
    if (dec.count) tips.push(`대표 결정 평균 응답 ${fmtDur(dec.avgMs)} (${dec.count}회)`);
    const peak = hourlyToday.reduce((m, n, h) => (n > hourlyToday[m] ? h : m), 0);
    if (hourlyToday[peak] >= 10) tips.push(`오늘 가장 바쁜 시간: ${peak}시 (도구 ${hourlyToday[peak]}회)`);
    if (today.tokensOut >= 50e3) tips.push(`오늘 출력 토큰 ${fmtTok(today.tokensOut)}`);

    return {
      status: 200,
      body: {
        scan: { done: allDone, pct: size ? Math.round((off / size) * 1000) / 10 : 100 },
        today, byProvider,
        byProject: Object.values(byProject).sort((a, b) => b.tools - a.tools),
        leaderboard, waitingNow, decisions: dec, teams, hourlyToday, tips,
      },
    };
  }
}

function todoFromSession(s) {
  const items = s.todos || [];
  return {
    total: items.length,
    done: items.filter((x) => x.status === 'completed' || x.status === 'done').length,
    inProgress: items.filter((x) => x.status === 'in_progress').length,
    items,
  };
}
