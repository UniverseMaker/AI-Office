// Claude Code adapter: live registry (~/.claude/sessions) + transcripts + subagents + harness roster.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  JsonlTail, readJSON, readdirSafe, statSafe, isPidAlive, shorten, baseName,
  startOfToday, parseFrontmatter, pushRing, pushFeed, now, SUMMARY_RUNNER_DIR, isRunnerCwd,
} from '../util.mjs';
import { classifyTool, ICON, levelFrom } from '../activity.mjs';

const BUILTIN_AGENTS = new Set(['general-purpose', 'Explore', 'Plan', 'claude-code-guide', 'statusline-setup', 'fork', 'claude', 'output-style-setup']);
const DONE_WINDOW = 30 * 60e3;      // "완료 · 확인 필요" for 30 min
const SLEEP_AFTER = 3 * 3600e3;     // asleep at desk after 3h idle
const AGENT_KEEP = 120e3;           // keep finished agents 2 min for exit animation
const ORPHAN_WINDOW = 5 * 60e3;     // transcripts without registry entry, active within 5 min
const UUID_JSONL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;
const ALL_EVERY = 30e3;             // 전체 대화 목록 · 계정별 등록 파일은 30초마다 다시 훑는다

export const encodeCwd = (cwd) => String(cwd).replace(/[^A-Za-z0-9]/g, '-');

/** Parses a stream of Claude Code transcript records into a live picture. */
class Transcript {
  constructor(file, opts) {
    this.tail = new JsonlTail(file, opts);
    this.pending = new Map();
    this.lastKind = null;          // 'think' | 'text' | 'tool' | 'prompt' | 'result'
    this.lastText = '';
    this.lastAt = 0;
    this.title = { custom: '', ai: '' };
    this.model = '';
    this.effort = '';
    this.permissionMode = '';
    this.stats = { tools: 0, edits: 0, cmds: 0, reads: 0, searches: 0, web: 0, agents: 0, turns: 0, today: 0 };
    this.feed = [];
    this.todos = new Map();
    this.pendingTaskCreate = new Map();
    this.agentTypesCalled = new Set();
    this.workflowSeen = false;
    this.teamSeen = false;
    this.turnStartedAt = 0;
    this.lastPrompt = '';
    this.errors = 0;
  }

  update() {
    const recs = this.tail.read();
    const today = startOfToday();
    for (const r of recs) this.ingest(r, today);
    return recs.length;
  }

  ingest(r, today) {
    const t = r.timestamp ? Date.parse(r.timestamp) : 0;
    // only real conversation records count as activity (metadata records are rewritten periodically)
    if (t && (r.type === 'user' || r.type === 'assistant')) this.lastAt = Math.max(this.lastAt, t);
    switch (r.type) {
      case 'custom-title': this.title.custom = r.customTitle || this.title.custom; return;
      case 'ai-title': this.title.ai = r.aiTitle || this.title.ai; return;
      case 'mode': return;
      case 'last-prompt': return;
      case 'system':
        if (r.subtype === 'turn_duration' || r.subtype === 'stop_hook_summary') this.lastTurnEnd = t;
        return;
      case 'user': return this.ingestUser(r, t, today);
      case 'assistant': return this.ingestAssistant(r, t, today);
      default: return;
    }
  }

  ingestUser(r, t, today) {
    if (r.permissionMode) this.permissionMode = r.permissionMode;
    if (r.isMeta) return;
    const c = r.message?.content;
    if (Array.isArray(c) && c.some((b) => b?.type === 'tool_result')) {
      for (const b of c) {
        if (b?.type !== 'tool_result') continue;
        const p = this.pending.get(b.tool_use_id);
        this.pending.delete(b.tool_use_id);
        if (b.is_error && p) { this.errors++; pushFeed(this.feed, { t, icon: ICON.error, kind: 'error', text: `${p.act.label} 실패` }); }
        if (p?.name === 'TaskCreate') {
          const task = r.toolUseResult?.task;
          if (task?.id) this.todos.set(String(task.id), { id: String(task.id), text: task.subject || p.input?.subject || '', status: 'pending' });
        }
      }
      this.lastKind = 'result';
      return;
    }
    let text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b?.type === 'text').map((b) => b.text).join(' ') : '';
    text = String(text || '').trim();
    if (!text) return;
    if (text.startsWith('<task-notification>')) {
      const sum = text.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || text.match(/<status>([\s\S]*?)<\/status>/)?.[1] || '백그라운드 작업 알림';
      pushFeed(this.feed, { t, icon: '📬', kind: 'notify', text: shorten(sum, 80) });
      return;
    }
    if (text.startsWith('<') && /^<(command|local-command|system|bash-|user-memory)/.test(text)) return;
    this.stats.turns++;
    this.turnStartedAt = t;
    this.lastKind = 'prompt';
    this.lastPrompt = shorten(text, 140);
    pushFeed(this.feed, { t, icon: ICON.prompt, kind: 'prompt', text: '요청: ' + shorten(text, 70) });
  }

  ingestAssistant(r, t, today) {
    const m = r.message || {};
    if (m.model && !m.model.startsWith('<')) this.model = m.model;
    if (r.effort) this.effort = r.effort;
    const blocks = Array.isArray(m.content) ? m.content : [];
    for (const b of blocks) {
      if (b?.type === 'thinking' || b?.type === 'redacted_thinking') { this.lastKind = 'think'; }
      else if (b?.type === 'text' && b.text?.trim()) {
        this.lastKind = 'text';
        this.lastText = shorten(b.text, 160);
      } else if (b?.type === 'tool_use') {
        const act = classifyTool(b.name, b.input);
        this.pending.set(b.id, { name: b.name, input: b.input, start: t || now(), act });
        this.lastKind = 'tool';
        const s = this.stats;
        s.tools++; if (t >= today) s.today++;
        if (act.type === 'edit') s.edits++;
        else if (act.type === 'terminal') s.cmds++;
        else if (act.type === 'read') s.reads++;
        else if (act.type === 'search') s.searches++;
        else if (act.type === 'web') s.web++;
        else if (act.type === 'delegate') s.agents++;
        if (b.name === 'Agent' || b.name === 'Task') { const st = b.input?.subagent_type; if (st) this.agentTypesCalled.add(st); }
        if (b.name === 'Workflow') this.workflowSeen = true;
        if (b.name === 'SendMessage' || b.name === 'TeamCreate') this.teamSeen = true;
        if (b.name === 'TaskUpdate' && b.input?.taskId) {
          const td = this.todos.get(String(b.input.taskId));
          if (td && b.input.status) td.status = b.input.status;
          if (td && b.input.status === 'deleted') this.todos.delete(String(b.input.taskId));
        }
        if (b.name === 'TodoWrite' && Array.isArray(b.input?.todos)) {
          this.todos.clear();
          b.input.todos.forEach((td, i) => this.todos.set('w' + i, { id: 'w' + i, text: td.content || td.activeForm || '', status: td.status || 'pending' }));
        }
        pushFeed(this.feed, { t, icon: ICON[act.type] || ICON.tool, kind: act.type, text: act.label });
      }
    }
  }

  currentTool() {
    let best = null;
    for (const p of this.pending.values()) if (!best || p.start >= best.start) best = p;
    return best;
  }
}

export class ClaudeAdapter {
  constructor({ home = os.homedir(), opts = () => ({}) } = {}) {
    this.opts = opts;               // () => { allSessions, allSessionsDays, allSessionsArchived }
    this.allAt = 0; this.all = [];
    this.root = path.join(home, '.claude');
    this.home = home;
    this.transcripts = new Map();   // sessionId -> Transcript
    this.agentTails = new Map();    // agent file -> Transcript
    this.fileCache = new Map();     // sessionId -> transcript path
    this.rosterCache = new Map();   // cwd -> {at, roster, dir}
    this.runsCache = new Map();     // projectDir -> {at, counts}
    this.orphans = [];
    this.orphanAt = 0;
    this.name = 'claude';
  }

  available() { return !!statSafe(this.root); }

  findTranscript(sessionId, cwd) {
    const cached = this.fileCache.get(sessionId);
    if (cached && statSafe(cached)) return cached;
    const projects = path.join(this.root, 'projects');
    let p = cwd ? path.join(projects, encodeCwd(cwd), sessionId + '.jsonl') : null;
    if (!p || !statSafe(p)) {
      p = null;
      for (const d of readdirSafe(projects)) {
        const q = path.join(projects, d, sessionId + '.jsonl');
        if (statSafe(q)) { p = q; break; }
      }
    }
    if (p) this.fileCache.set(sessionId, p);
    return p;
  }

  roster(cwd) {
    const c = this.rosterCache.get(cwd);
    if (c && now() - c.at < 60e3) return c;
    let dir = cwd, found = null;
    for (let i = 0; i < 6 && dir; i++) {
      const a = path.join(dir, '.claude', 'agents');
      if (statSafe(a) && path.resolve(dir) !== path.resolve(this.home)) { found = a; break; }
      const up = path.dirname(dir);
      if (up === dir) break;
      dir = up;
    }
    const roster = [];
    if (found) {
      for (const f of readdirSafe(found)) {
        if (!f.endsWith('.md')) continue;
        const fm = parseFrontmatter(path.join(found, f));
        if (fm) roster.push({ name: fm.name, description: shorten(fm.description || '', 120), model: fm.model || '' });
      }
    }
    const v = { at: now(), roster, dir: found };
    this.rosterCache.set(cwd, v);
    return v;
  }

  /** count past runs per agentType in a project transcript dir (for Lv.) */
  agentRuns(projectDir) {
    const c = this.runsCache.get(projectDir);
    if (c && now() - c.at < 90e3) return c.counts;
    const counts = {};
    for (const s of readdirSafe(projectDir)) {
      const sub = path.join(projectDir, s, 'subagents');
      for (const f of readdirSafe(sub)) {
        if (!f.endsWith('.meta.json')) continue;
        const m = readJSON(path.join(sub, f));
        if (m?.agentType) counts[m.agentType] = (counts[m.agentType] || 0) + 1;
      }
    }
    this.runsCache.set(projectDir, { at: now(), counts });
    return counts;
  }

  scanAgents(sessionFile) {
    const dir = path.join(sessionFile.replace(/\.jsonl$/, ''), 'subagents');
    const out = [];
    const t = now();
    const allTypes = new Set();
    for (const f of readdirSafe(dir)) {
      if (!f.endsWith('.jsonl')) continue;
      const fp = path.join(dir, f);
      const st = statSafe(fp);
      if (!st) continue;
      const meta = readJSON(fp.replace(/\.jsonl$/, '.meta.json'), {}) || {};
      if (meta.agentType) allTypes.add(meta.agentType);
      const age = t - st.mtimeMs;
      if (age > 6 * 3600e3) continue;
      let tr = this.agentTails.get(fp);
      if (!tr) { tr = new Transcript(fp, { initialBytes: 300_000 }); this.agentTails.set(fp, tr); }
      tr.update();
      const pend = tr.currentTool();
      const quiet = age > 8e3;
      const finished = (quiet && tr.lastKind === 'text' && tr.pending.size === 0) || age > 15 * 60e3;
      if (finished && age > AGENT_KEEP) continue;
      const act = pend ? pend.act : tr.lastKind === 'think' ? { type: 'think', label: '생각 중…', detail: '' } : { type: 'think', label: '작업 준비', detail: '' };
      out.push({
        id: f.replace(/\.jsonl$/, ''),
        type: meta.agentType || 'general-purpose',
        description: shorten(meta.description || '', 80),
        status: finished ? 'done' : 'working',
        activity: finished ? { type: 'done', label: '보고 완료', detail: tr.lastText } : { ...act, since: pend?.start || tr.lastAt },
        startedAt: st.birthtimeMs || st.ctimeMs,
        lastActive: st.mtimeMs,
        endedAt: finished ? st.mtimeMs : null,
        depth: meta.spawnDepth || 1,
        background: meta.requestShape === 'background',
        model: meta.model || tr.model,
        tools: tr.stats.tools,
      });
    }
    return { agents: out, allTypes };
  }

  buildSession({ sessionId, cwd, reg, file, rec = null, dormant = false }) {
    let tr = this.transcripts.get(sessionId);
    if (!tr && file) { tr = new Transcript(file, dormant ? { initialBytes: 400_000 } : undefined); this.transcripts.set(sessionId, tr); }
    if (tr) tr.update();
    const st = file ? statSafe(file) : null;
    const t = now();
    const lastActive = Math.max(tr?.lastAt || 0, reg?.statusUpdatedAt || 0) || st?.mtimeMs || 0;
    const regStatus = String(reg?.status || (t - (tr?.lastAt || 0) < 30e3 && tr?.lastKind !== 'text' ? 'busy' : 'idle'));

    // --- agents / harness
    // 쉬고 있는 대화는 서브에이전트 폴더를 매번 훑지 않는다 (10분 안에 바뀐 것만)
    const { agents, allTypes } = file && !(dormant && st && t - st.mtimeMs > 600e3) ? this.scanAgents(file) : { agents: [], allTypes: new Set() };
    const { roster: defined } = this.roster(cwd);
    const definedNames = new Set(defined.map((r) => r.name));
    const custom = new Set([...allTypes, ...(tr?.agentTypesCalled || [])].filter((x) => !BUILTIN_AGENTS.has(x)));
    const usesRoster = [...custom].some((x) => definedNames.has(x));
    const harness = usesRoster || custom.size >= 2 || !!tr?.workflowSeen || !!tr?.teamSeen;
    let roster = [];
    if (harness) {
      const runs = file ? this.agentRuns(path.dirname(file)) : {};
      const names = new Set([...defined.map((r) => r.name), ...custom]);
      roster = [...names].map((n) => {
        const d = defined.find((r) => r.name === n);
        return { name: n, description: d?.description || '', runs: runs[n] || 0, level: levelFrom(runs[n] || 0) };
      });
    }

    // --- status
    const pend = tr?.currentTool();
    const pendingAsk = tr && [...tr.pending.values()].find((p) => p.act.type === 'ask');
    let status, activity;
    const idleFor = t - Math.max(reg?.statusUpdatedAt || 0, lastActive);
    if (pendingAsk) {
      status = 'waiting_input';
      activity = { ...pendingAsk.act, since: pendingAsk.start };
    } else if (/wait|perm|action|block|approv/i.test(regStatus)) {
      status = 'waiting_permission';
      activity = { type: 'ask', label: '승인 대기', detail: pend?.act.label || '', since: reg?.statusUpdatedAt };
    } else if (regStatus === 'busy') {
      if (pend) {
        status = pend.act.type === 'delegate' ? 'delegating' : 'tool';
        activity = { ...pend.act, since: pend.start };
      } else if (agents.some((a) => a.status === 'working') && tr?.lastKind !== 'think') {
        status = 'delegating';
        activity = { type: 'delegate', label: '팀원 작업 지켜보는 중', detail: '', since: lastActive };
      } else if (tr?.lastKind === 'text') {
        status = 'working';
        activity = { type: 'talk', label: '답변 정리 중', detail: tr.lastText, since: tr.lastAt };
      } else {
        status = 'thinking';
        activity = { type: 'think', label: '생각 중…', detail: tr?.lastPrompt || '', since: tr?.lastAt || t };
      }
    } else {
      if (tr?.lastKind === 'text' && idleFor < DONE_WINDOW) {
        status = 'done';
        activity = { type: 'done', label: '완료 · 확인 필요', detail: tr.lastText, since: lastActive };
      } else if (idleFor < SLEEP_AFTER) {
        status = 'idle';
        activity = { type: 'idle', label: '휴식 중', detail: tr?.lastText || '', since: lastActive };
      } else {
        status = 'sleeping';
        activity = { type: 'idle', label: '졸고 있음', detail: '', since: lastActive };
      }
    }

    const sizeKB = (st?.size || 0) / 1024;
    const level = Math.max(1, Math.floor(Math.log2(Math.max(1, sizeKB / 40))) + 1);
    const title = reg?.name || tr?.title.custom || rec?.title || tr?.title.ai || baseName(cwd);
    return {
      id: 'claude:' + sessionId,
      provider: 'claude',
      source: reg ? 'registry' : 'transcript',
      dormant: dormant || undefined,     // 프로그램이 안 떠 있는(다른 계정 · 닫힌) 대화 — 전체 보기로 들어옴
      app: reg?.entrypoint === 'claude-desktop' ? 'Claude 데스크톱' : reg?.entrypoint === 'cli' ? 'Claude Code CLI' : (reg?.entrypoint || 'Claude Code'),
      kind: harness ? 'harness' : 'single',
      title: shorten(title, 60),
      project: baseName(cwd),
      cwd,
      model: tr?.model || '',
      effort: tr?.effort || '',
      permissionMode: tr?.permissionMode || '',
      pid: reg?.pid || null,
      status,
      activity: { ...activity, label: shorten(activity.label, 40), detail: shorten(activity.detail, 200) },
      startedAt: reg?.startedAt || st?.birthtimeMs || lastActive,
      lastActive,
      turnStartedAt: tr?.turnStartedAt || 0,
      lastPrompt: tr?.lastPrompt || '',
      stats: { ...(tr?.stats || {}), errors: tr?.errors || 0 },
      level,
      roster,
      agents,
      todos: tr ? [...tr.todos.values()].filter((x) => x.status !== 'deleted').slice(-12) : [],
      feed: tr ? tr.feed.slice(-25) : [],
    };
  }

  scan() {
    const sessions = [];
    const seen = new Set();
    const regDir = path.join(this.root, 'sessions');
    for (const f of readdirSafe(regDir)) {
      if (!/^\d+\.json$/.test(f)) continue;
      const reg = readJSON(path.join(regDir, f));
      if (!reg?.sessionId || !isPidAlive(reg.pid)) continue;
      if (isRunnerCwd(reg.cwd)) continue; // our own summary runs
      if (seen.has(reg.sessionId)) continue;
      seen.add(reg.sessionId);
      const file = this.findTranscript(reg.sessionId, reg.cwd);
      try { sessions.push(this.buildSession({ sessionId: reg.sessionId, cwd: reg.cwd, reg, file })); }
      catch (e) { console.error('[claude] session', reg.sessionId, e.message); }
    }
    // transcripts that are active but not in the registry (older CLI / SDK runs)
    if (now() - this.orphanAt > 15e3) {
      this.orphanAt = now();
      this.orphans = [];
      const projects = path.join(this.root, 'projects');
      const runnerDir = encodeCwd(SUMMARY_RUNNER_DIR).toLowerCase();
      for (const d of readdirSafe(projects)) {
        if (d.toLowerCase() === runnerDir) continue;
        const pd = path.join(projects, d);
        for (const f of readdirSafe(pd)) {
          if (!f.endsWith('.jsonl')) continue;
          const st = statSafe(path.join(pd, f));
          if (st && now() - st.mtimeMs < ORPHAN_WINDOW) this.orphans.push({ sessionId: f.slice(0, -6), file: path.join(pd, f) });
        }
      }
    }
    for (const o of this.orphans) {
      if (seen.has(o.sessionId)) continue;
      const cwd = this.cwdFromTranscript(o.file);
      if (isRunnerCwd(cwd)) continue;
      try { sessions.push(this.buildSession({ sessionId: o.sessionId, cwd, reg: null, file: o.file })); } catch {}
    }
    // 모든 계정의 모든 대화 (Claude Desktop 계정 폴더의 등록 파일은 같은 대화를 가리키는 포인터일 뿐 — 대화 원문은 이 PC 에 하나)
    //   돌고 있지 않아도 보이게: 다른 계정으로 바꿔 둔 동안 · 창을 닫은 대화도 쉬는 자리에 앉아 있다
    const o = this.opts() || {};
    if (o.allSessions !== false) {
      for (const c of this.allConversations(o)) {
        if (seen.has(c.sessionId) || sessions.some((s) => s.id === 'claude:' + c.sessionId)) continue;
        seen.add(c.sessionId);
        try { sessions.push(this.buildSession({ sessionId: c.sessionId, cwd: c.cwd, reg: null, file: c.file, rec: c.rec, dormant: true })); } catch {}
      }
    }
    // drop trackers for sessions that vanished
    for (const id of this.transcripts.keys()) if (!sessions.some((s) => s.id === 'claude:' + id)) this.transcripts.delete(id);
    return sessions;
  }

  /** 계정 폴더 전체의 등록 파일: cliSessionId → { title, archived(모든 계정에서 보관됨), lastActivityAt, cwd } */
  recordIndex() {
    const roots = [path.join(process.env.APPDATA || '', 'Claude', 'claude-code-sessions')];
    try { for (const d of readdirSafe(path.join(process.env.LOCALAPPDATA || '', 'Packages'))) if (/^Claude_/.test(d)) roots.push(path.join(process.env.LOCALAPPDATA, 'Packages', d, 'LocalCache', 'Roaming', 'Claude', 'claude-code-sessions')); } catch {}
    const out = new Map();
    const walk = (dir, depth) => {
      let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory() && depth < 4) walk(fp, depth + 1);
        else if (e.isFile() && /^local_.*\.json$/.test(e.name)) {
          const st = statSafe(fp); if (!st || st.size > 2e6) continue;
          const r = readJSON(fp); const sid = r && r.cliSessionId; if (!sid) continue;
          const cur = out.get(sid), act = Number(r.lastActivityAt) || st.mtimeMs;
          if (!cur) out.set(sid, { title: r.title || '', archived: !!r.isArchived, lastActivityAt: act, cwd: r.cwd || r.originCwd || '' });
          else { cur.archived = cur.archived && !!r.isArchived; if (act > cur.lastActivityAt) { cur.lastActivityAt = act; if (r.title) cur.title = r.title; if (r.cwd) cur.cwd = r.cwd; } }
        }
      }
    };
    for (const r of roots) walk(r, 0);
    return out;
  }
  /** ~/.claude/projects 의 모든 대화(보조 기록 제외) — 30초 캐시 */
  allConversations(o) {
    if (now() - this.allAt > ALL_EVERY) {
      this.allAt = now();
      const recs = this.recordIndex(), projects = path.join(this.root, 'projects');
      const runnerDir = encodeCwd(SUMMARY_RUNNER_DIR).toLowerCase();
      const list = [];
      for (const d of readdirSafe(projects)) {
        if (d.toLowerCase() === runnerDir) continue;
        const pd = path.join(projects, d);
        for (const f of readdirSafe(pd)) {
          if (!UUID_JSONL.test(f)) continue;
          const file = path.join(pd, f), st = statSafe(file); if (!st || !st.size) continue;
          const sessionId = f.slice(0, -6), rec = recs.get(sessionId) || null;
          list.push({ sessionId, file, rec, mtime: st.mtimeMs, cwd: (rec && rec.cwd) || null });
        }
      }
      this.all = list;
    }
    const days = Number(o.allSessionsDays) || 0, cut = days > 0 ? now() - days * 864e5 : 0;
    return this.all.filter((c) => (o.allSessionsArchived || !(c.rec && c.rec.archived)) && c.mtime >= cut).map((c) => {
      if (!c.cwd) { c.cwd = this.cwdFromTranscript(c.file) || null; }
      return c;
    }).filter((c) => !isRunnerCwd(c.cwd));
  }

  cwdFromTranscript(file) {
    const tr = this.transcripts.get(path.basename(file, '.jsonl'));
    if (tr?.cwd) return tr.cwd;
    try {
      const fd = fs.openSync(file, 'r');
      const buf = Buffer.alloc(64 * 1024);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      const m = buf.toString('utf8', 0, n).match(/"cwd":"((?:[^"\\]|\\.)*)"/);
      if (m) return JSON.parse('"' + m[1] + '"');
    } catch {}
    return path.basename(path.dirname(file));
  }
}
