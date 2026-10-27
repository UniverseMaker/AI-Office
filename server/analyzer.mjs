// Session analyzer: full incremental scan of one transcript (Claude Code jsonl or Codex rollout) → insights.
// Streams 4 MB chunks with setImmediate between them, remembers the byte offset, then only reads appended bytes.
import fs from 'node:fs';
import path from 'node:path';
import { classifyTool } from './activity.mjs';
import { shorten, baseName, statSafe, readdirSafe, readJSON, now } from './util.mjs';

const CHUNK = 4 << 20;
const CONV_MAX = 300;
const WAIT_CAP = 12 * 3600e3;       // gaps longer than this are "away", not "waiting"
const TOOL_CAP = 6 * 3600e3;        // ignore absurd tool durations
const RUNNING_FOR = 2 * 60e3;       // current turn counts as running if active within this
const PAUSE = 30 * 60e3;            // quiet gaps inside a turn longer than this don't count as work time
const EDIT_TOOLS = /^(Edit|Write|MultiEdit|NotebookEdit)$/;
const CMD_TOOLS = /^(Bash|PowerShell)$/;

const tick = () => new Promise((r) => setImmediate(r));
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const zeroTok = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, thinking: 0 });
export function addTok(a, b, k = 1) { for (const key in a) a[key] += (b[key] || 0) * k; return a; }
const claudeTok = (u) => ({
  input: u.input_tokens || 0, output: u.output_tokens || 0, cacheRead: u.cache_read_input_tokens || 0,
  cacheWrite: u.cache_creation_input_tokens || 0, thinking: u.output_tokens_details?.thinking_tokens || 0,
});

// --- small global gate so a burst of first scans doesn't read 1 GB at once ---
const gate = { active: 0, max: 2, q: [] };
function acquire(priority) {
  if (gate.active < gate.max) { gate.active++; return Promise.resolve(); }
  return new Promise((r) => (priority ? gate.q.unshift(r) : gate.q.push(r))).then(() => { gate.active++; });
}
function release() { gate.active--; const w = gate.q.shift(); if (w) w(); }

/** Read [src.offset, size) line by line in CHUNK steps. src = {file, offset, rest, target}. */
async function pump(src, onLine) {
  const st = await fs.promises.stat(src.file).catch(() => null);
  if (!st) return false;
  if (st.size < src.offset) return 'reset';
  src.target = st.size;
  if (st.size === src.offset) return true;
  const fh = await fs.promises.open(src.file, 'r').catch(() => null);
  if (!fh) return false;
  try {
    while (src.offset < src.target) {
      const len = Math.min(CHUNK, src.target - src.offset);
      const buf = Buffer.allocUnsafe(len);
      const { bytesRead } = await fh.read(buf, 0, len, src.offset);
      if (!bytesRead) break;
      src.offset += bytesRead;
      const data = src.rest.length ? Buffer.concat([src.rest, buf.subarray(0, bytesRead)]) : buf.subarray(0, bytesRead);
      const last = data.lastIndexOf(10);
      if (last < 0) { src.rest = Buffer.from(data); continue; }
      src.rest = Buffer.from(data.subarray(last + 1));
      const lines = data.toString('utf8', 0, last).split('\n');
      for (const l of lines) if (l.length > 1) onLine(l);
      await tick();
    }
  } finally { await fh.close().catch(() => {}); }
  return true;
}
const newSrc = (file) => ({ file, offset: 0, rest: Buffer.alloc(0), target: 0 });

function textOf(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((b) => (typeof b === 'string' ? b : b?.type === 'text' ? b.text : '')).join(' ');
  return '';
}

export class SessionAnalyzer {
  /** @param {{file:string, provider?:'claude'|'codex', convMax?:number, withAgents?:boolean}} o */
  constructor({ file, provider = 'claude', convMax = CONV_MAX, withAgents = true }) {
    this.file = file;
    this.provider = provider;
    this.convMax = convMax;
    this.withAgents = withAgents && provider === 'claude';
    this.running = null;
    this.usedAt = now();
    this.agentFiles = new Map();   // subagent jsonl -> light stats
    this.agentAnalyzers = new Map();
    this.reset();
  }

  reset() {
    this.src = newSrc(this.file);
    this.done = false;
    this.scanMs = 0;
    this.tok = zeroTok();
    this.days = new Map();         // 'YYYY-MM-DD' -> {tools, edits, cmds, prompts, errors, tok, hours[24]}
    this.usageSeen = new Map();    // message.id -> {tok, t}
    this.models = {};
    this.activity = {};
    this.activityMs = {};
    this.errorsByType = {};
    this.toolCount = 0;
    this.errorCount = 0;
    this.hourly = Array(24).fill(0);
    this.pending = new Map();      // tool_use id -> {name, type, label, t, conv, cmd}
    this.turns = [];
    this.turn = null;
    this.turnStat = { count: 0, totalMs: 0, longestMs: 0, list: [] };
    this.userWait = { count: 0, totalMs: 0 };
    this.decisions = { count: 0, totalMs: 0 };
    this.files = new Map();
    this.commands = [];
    this.errors = [];
    this.conv = [];
    this.todos = new Map();
    this.lastPrompt = '';
    this.lastPromptAt = 0;
    this.lastText = '';
    this.lastKind = null;
    this.firstAt = 0;
    this.lastAt = 0;
    this.model = '';
    this.codexTotal = -1;
  }

  get scan() {
    const pct = this.src.target ? Math.min(100, Math.round((this.src.offset / this.src.target) * 1000) / 10) : this.done ? 100 : 0;
    return { done: this.done, pct: this.done && this.src.offset >= this.src.target ? 100 : pct };
  }

  /** Incremental update; concurrent callers share one run. */
  update(priority = false) {
    this.usedAt = now();
    if (!this.running) this.running = this._update(priority).catch(() => {}).finally(() => { this.running = null; });
    return this.running;
  }

  async _update(priority) {
    const first = !this.done;
    if (first) await acquire(priority);
    const t0 = Date.now();
    try {
      let r = await pump(this.src, (l) => this.line(l));
      if (r === 'reset') { this.reset(); r = await pump(this.src, (l) => this.line(l)); }
      this.done = true;
      if (this.withAgents) await this.scanAgents();
    } finally {
      this.scanMs += Date.now() - t0;
      if (first) release();
    }
  }

  // ---------- record dispatch ----------
  line(l) {
    if (l.charCodeAt(0) !== 123) return;
    if (this.provider === 'claude' && l.startsWith('{"type":"') && !/^\{"type":"(user|assistant|system)"/.test(l)) return;
    let r;
    try { r = JSON.parse(l); } catch { return; }
    try {
      if (this.provider === 'codex') return this.codex(r);
      const t = r.timestamp ? Date.parse(r.timestamp) || 0 : 0;
      if (r.type === 'assistant') this.claudeAssistant(r, t);
      else if (r.type === 'user') this.claudeUser(r, t);
      else if (r.type === 'system' && r.subtype === 'compact_boundary') this.push({ t, role: 'system', text: '대화 압축 — 앞부분을 요약하고 계속' });
    } catch {} // one odd record never stops the scan
  }

  day(t) {
    const k = dayKey(t || now());
    let d = this.days.get(k);
    if (!d) { d = { tools: 0, edits: 0, cmds: 0, prompts: 0, errors: 0, tok: zeroTok(), hours: Array(24).fill(0) }; this.days.set(k, d); }
    return d;
  }

  touch(t) {
    if (!t) return;
    if (!this.firstAt) this.firstAt = t;
    if (t > this.lastAt) this.lastAt = t;
    if (this.turn && t > this.turn.end) {
      if (t - this.turn.end > PAUSE) this.turn.pausedMs += t - this.turn.end;
      this.turn.end = t;
    }
  }

  push(item) {
    this.conv.push(item);
    if (this.conv.length > this.convMax + 50) this.conv.splice(0, this.conv.length - this.convMax);
  }

  // ---------- Claude Code ----------
  claudeAssistant(r, t) {
    const m = r.message || {};
    this.touch(t);
    if (m.model && !m.model.startsWith('<')) this.model = m.model;
    if (m.id && m.usage) this.usage(m.id, claudeTok(m.usage), t, this.model);
    for (const b of Array.isArray(m.content) ? m.content : []) {
      if (b?.type === 'thinking' || b?.type === 'redacted_thinking') this.lastKind = 'think';
      else if (b?.type === 'text' && b.text?.trim()) this.assistantText(t, b.text);
      else if (b?.type === 'tool_use') this.toolUse(t, b.id, b.name, b.input || {});
    }
  }

  claudeUser(r, t) {
    if (r.isMeta) return;
    const c = r.message?.content;
    if (Array.isArray(c) && c.some((b) => b?.type === 'tool_result')) {
      this.touch(t);
      for (const b of c) {
        if (b?.type !== 'tool_result') continue;
        const p = this.toolResult(t, b.tool_use_id, !!b.is_error, textOf(b.content));
        if (p?.name === 'TaskCreate') {
          const task = r.toolUseResult?.task;
          if (task?.id) this.todos.set(String(task.id), { id: String(task.id), text: shorten(task.subject || p.input?.subject || '', 120), status: 'pending' });
        }
      }
      return;
    }
    const text = textOf(c).trim();
    if (!text) return;
    if (r.isCompactSummary || text.startsWith('This session is being continued')) return;
    if (text.startsWith('<task-notification>')) {
      this.touch(t);
      const sum = text.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || text.match(/<status>([\s\S]*?)<\/status>/)?.[1] || '백그라운드 작업 알림';
      return this.push({ t, role: 'system', text: '📬 ' + shorten(sum, 300) });
    }
    if (text.startsWith('[Request interrupted')) {
      this.touch(t);
      if (this.turn) this.turn.interrupted = true;
      return this.push({ t, role: 'system', text: '대표님이 작업을 중단함' });
    }
    if (text.startsWith('<command-name>')) {
      const name = text.match(/<command-name>([\s\S]*?)<\/command-name>/)?.[1] || '';
      return this.push({ t, role: 'system', text: `명령 ${shorten(name, 60)}` });
    }
    if (text.startsWith('<')) return; // local-command / system / bash / memory wrappers
    this.startTurn(t, text);
  }

  usage(id, tok, t, model) {
    const prev = this.usageSeen.get(id);
    const at = prev ? prev.t : t;
    const d = this.day(at);
    if (prev) { addTok(this.tok, prev.tok, -1); addTok(d.tok, prev.tok, -1); }
    else if (model) this.models[model] = (this.models[model] || 0) + 1;
    addTok(this.tok, tok); addTok(d.tok, tok);
    this.usageSeen.set(id, { tok, t: at });
    if (this.usageSeen.size > 400) this.usageSeen.delete(this.usageSeen.keys().next().value);
  }

  // ---------- provider-neutral events ----------
  startTurn(t, text) {
    const prev = this.turn;
    if (prev && prev.lastKind === 'text' && t > prev.end && t - prev.end < WAIT_CAP) { this.userWait.count++; this.userWait.totalMs += t - prev.end; }
    this.endTurn();
    this.touch(t);
    this.turn = { start: t, end: t, prompt: shorten(text, 160), tools: 0, edits: 0, cmds: 0, errors: 0, lastText: '', lastKind: 'prompt', interrupted: false, pausedMs: 0 };
    this.lastPrompt = shorten(text, 400);
    this.lastPromptAt = t;
    this.lastKind = 'prompt';
    if (t) this.day(t).prompts++;
    this.push({ t, role: 'user', text: text.slice(0, 2000) });
  }

  endTurn() {
    const u = this.turn;
    if (!u) return;
    this.turn = null;
    const done = this.finishTurn(u, false);
    this.turns.push(done);
    if (this.turns.length > 30) this.turns.shift();
    const s = this.turnStat;
    s.count++; s.totalMs += done.durationMs; s.longestMs = Math.max(s.longestMs, done.durationMs);
    s.list.push(done.durationMs); if (s.list.length > 5000) s.list.shift();
  }

  finishTurn(u, current) {
    const openAsk = [...this.pending.values()].some((p) => p.type === 'ask' && p.t >= u.start);
    let outcome;
    if (u.interrupted) outcome = 'interrupted';
    else if (current && openAsk) outcome = 'waiting';
    else if (u.lastKind === 'text') outcome = 'done';
    else if (current && now() - u.end < RUNNING_FOR) outcome = 'running';
    else outcome = 'stopped';
    return { start: u.start, end: u.end, durationMs: Math.max(0, u.end - u.start - u.pausedMs), pausedMs: u.pausedMs, prompt: u.prompt, tools: u.tools, edits: u.edits, cmds: u.cmds, errors: u.errors, outcome, lastText: u.lastText };
  }

  assistantText(t, text) {
    this.touch(t);
    this.lastKind = 'text';
    this.lastText = shorten(text, 300);
    if (this.turn) { this.turn.lastText = shorten(text, 160); this.turn.lastKind = 'text'; }
    this.push({ t, role: 'assistant', text: String(text).trim().slice(0, 4000) });
  }

  toolUse(t, id, name, input) {
    this.touch(t);
    if (typeof input === 'string') { try { input = JSON.parse(input); } catch { input = { raw: input }; } }
    input = input || {};
    const act = classifyTool(name, input);
    const ty = act.type;
    this.toolCount++;
    this.activity[ty] = (this.activity[ty] || 0) + 1;
    const d = this.day(t);
    d.tools++;
    if (t) { const h = new Date(t).getHours(); this.hourly[h]++; d.hours[h]++; }
    if (ty === 'edit') d.edits++;
    if (ty === 'terminal') d.cmds++;
    this.lastKind = 'tool';
    if (this.turn) { this.turn.tools++; this.turn.lastKind = 'tool'; if (ty === 'edit') this.turn.edits++; if (ty === 'terminal') this.turn.cmds++; }

    const det = String(act.detail || '');
    const same = !det || det.startsWith(act.label.replace(/…$/, ''));
    const conv = { t, role: 'tool', text: same ? shorten(det || act.label, 160) : act.label + ' · ' + shorten(det, 120), tool: { name, type: ty, label: act.label, detail: shorten(act.detail, 300) } };
    this.push(conv);
    const p = { name, type: ty, label: act.label, t, conv, input: name === 'TaskCreate' ? { subject: input.subject } : null };

    // files / commands
    const fp = input.file_path || input.notebook_path;
    if (fp && (EDIT_TOOLS.test(name) || name === 'Read')) {
      const key = process.platform === 'win32' ? String(fp).toLowerCase() : String(fp);
      let f = this.files.get(key);
      if (!f) { f = { path: String(fp), edits: 0, reads: 0, last: 0 }; this.files.set(key, f); }
      if (name === 'Read') f.reads++; else f.edits++;
      f.last = Math.max(f.last, t);
    } else if (ty === 'edit' && this.provider === 'codex') {
      const m = String(input.raw || input.input || input.patch || '').matchAll(/\*\*\* (?:Update|Add) File: (.+)/g);
      for (const x of m) {
        const pth = x[1].trim(); const key = pth.toLowerCase();
        let f = this.files.get(key);
        if (!f) { f = { path: pth, edits: 0, reads: 0, last: 0 }; this.files.set(key, f); }
        f.edits++; f.last = Math.max(f.last, t);
      }
    }
    if (CMD_TOOLS.test(name) || (this.provider === 'codex' && ty === 'terminal')) {
      let cmd = input.command ?? input.cmd ?? '';
      if (Array.isArray(cmd)) cmd = cmd.join(' ');
      p.cmd = { t, command: shorten(cmd, 300), description: shorten(input.description || '', 120), ok: null, durationMs: null };
      this.commands.push(p.cmd);
      if (this.commands.length > 30) this.commands.shift();
    }
    // todos
    if (name === 'TaskUpdate' && input.taskId) {
      const td = this.todos.get(String(input.taskId));
      if (td && input.status) td.status = input.status;
      if (td && input.subject) td.text = shorten(input.subject, 120);
      if (input.status === 'deleted') this.todos.delete(String(input.taskId));
    }
    if ((name === 'TodoWrite' || name === 'write_todos') && Array.isArray(input.todos)) {
      this.todos.clear();
      input.todos.forEach((x, i) => this.todos.set('w' + i, { id: 'w' + i, text: shorten(x.content || x.activeForm || x.description || '', 120), status: x.status || 'pending' }));
    }
    if (name === 'update_plan' && Array.isArray(input.plan)) {
      this.todos.clear();
      input.plan.forEach((x, i) => this.todos.set('p' + i, { id: 'p' + i, text: shorten(x.step, 120), status: x.status || 'pending' }));
    }
    if (id) {
      this.pending.set(id, p);
      if (this.pending.size > 400) for (const [k, v] of this.pending) if (t - v.t > 86400e3) this.pending.delete(k);
    }
  }

  toolResult(t, id, isError, text) {
    this.touch(t);
    const p = this.pending.get(id);
    if (!p) return null;
    this.pending.delete(id);
    const dur = t && p.t ? t - p.t : -1;
    if (dur >= 0 && dur < TOOL_CAP) this.activityMs[p.type] = (this.activityMs[p.type] || 0) + dur;
    if (p.conv && dur >= 0) { p.conv.durationMs = dur; if (isError) p.conv.isError = true; }
    if (p.cmd) { p.cmd.ok = !isError; p.cmd.durationMs = dur >= 0 ? dur : null; }
    if (this.turn) this.turn.lastKind = 'result';
    this.lastKind = 'result';
    if (p.type === 'ask' && dur >= 0 && dur < WAIT_CAP) {
      this.decisions.count++; this.decisions.totalMs += dur;
      this.push({ t, role: 'result', text: '대표 답변 · ' + shorten(text, 600), tool: { name: p.name, type: 'ask', label: p.label, detail: '' } });
    }
    if (isError) {
      this.errorCount++;
      this.errorsByType[p.type] = (this.errorsByType[p.type] || 0) + 1;
      this.day(t).errors++;
      if (this.turn) this.turn.errors++;
      this.errors.push({ t, tool: p.name, type: p.type, label: p.label, text: shorten(text, 240) });
      if (this.errors.length > 20) this.errors.shift();
      this.push({ t, role: 'result', isError: true, text: shorten(text, 600), tool: { name: p.name, type: p.type, label: p.label, detail: '' } });
    } else if (p.type === 'delegate') {
      this.push({ t, role: 'result', text: '팀원 보고 · ' + shorten(text, 600), tool: { name: p.name, type: 'delegate', label: p.label, detail: '' } });
    }
    return p;
  }

  // ---------- Codex rollout ----------
  codex(r) {
    const t = r.timestamp ? Date.parse(r.timestamp) || 0 : 0;
    const p = r.payload || {};
    if (r.type === 'turn_context') { if (p.model) this.model = p.model; return; }
    if (r.type === 'event_msg') {
      switch (p.type) {
        case 'user_message': return this.startTurn(t, String(p.message || ''));
        case 'agent_message': return this.assistantText(t, String(p.message || ''));
        case 'agent_reasoning': this.lastKind = 'think'; return;
        case 'turn_aborted': if (this.turn) this.turn.interrupted = true; return;
        case 'item_completed': { // newer/imported rollouts
          const it = p.item || {};
          const txt = (it.content || []).map((c) => c?.text || '').join(' ').trim();
          if (it.type === 'UserMessage' && txt) return this.startTurn(t, txt);
          if (it.type === 'AgentMessage' && txt) return this.assistantText(t, txt);
          return;
        }
        case 'token_count': {
          const total = p.info?.total_token_usage?.total_tokens;
          const u = p.info?.last_token_usage;
          if (!u || total == null || total === this.codexTotal) return;
          this.codexTotal = total;
          const tok = { input: Math.max(0, (u.input_tokens || 0) - (u.cached_input_tokens || 0)), output: u.output_tokens || 0, cacheRead: u.cached_input_tokens || 0, cacheWrite: u.cache_write_input_tokens || 0, thinking: u.reasoning_output_tokens || 0 };
          addTok(this.tok, tok); addTok(this.day(t).tok, tok);
          if (this.model) this.models[this.model] = (this.models[this.model] || 0) + 1;
          return;
        }
      }
      return;
    }
    if (r.type !== 'response_item') return;
    if (p.type === 'function_call' || p.type === 'custom_tool_call' || p.type === 'local_shell_call') {
      const name = p.name || (p.type === 'local_shell_call' ? 'shell' : 'tool');
      this.toolUse(t, p.call_id || p.id, name, p.arguments ?? p.input ?? p.action ?? {});
    } else if (p.type === 'web_search_call') {
      this.toolUse(t, null, 'web_search', p.action || {});
    } else if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
      const o = p.output;
      const s = typeof o === 'string' ? o : o?.content ?? JSON.stringify(o ?? '');
      const err = (typeof o === 'object' && o?.success === false) || /Exit code: [1-9]|"exit_code":\s*[1-9]/.test(String(s).slice(0, 400));
      this.toolResult(t, p.call_id, err, String(s));
    }
  }

  // ---------- sub-agents (light scan: tool_use count + tokens per file) ----------
  agentDir() { return this.file.replace(/\.jsonl$/, '') + path.sep + 'subagents'; }

  async scanAgents() {
    const dir = this.agentDir();
    for (const f of readdirSafe(dir)) {
      if (!f.endsWith('.jsonl')) continue;
      const fp = path.join(dir, f);
      const st = statSafe(fp);
      if (!st) continue;
      let a = this.agentFiles.get(fp);
      if (!a) {
        const meta = readJSON(fp.replace(/\.jsonl$/, '.meta.json'), {}) || {};
        a = { id: f.slice(0, -6), src: newSrc(fp), type: meta.agentType || 'general-purpose', description: meta.description || '', meta, tools: 0, tok: zeroTok(), seen: new Set(), mtime: 0, birth: st.birthtimeMs || st.ctimeMs };
        this.agentFiles.set(fp, a);
      }
      a.mtime = st.mtimeMs;
      if (st.size === a.src.offset) continue;
      if (st.size < a.src.offset) { a.src = newSrc(fp); a.tools = 0; a.tok = zeroTok(); a.seen.clear(); }
      await pump(a.src, (l) => {
        if (!l.includes('"type":"assistant"')) return;
        let r; try { r = JSON.parse(l); } catch { return; }
        if (r.type !== 'assistant') return;
        const m = r.message || {};
        for (const b of Array.isArray(m.content) ? m.content : []) if (b?.type === 'tool_use') a.tools++;
        if (m.id && m.usage && !a.seen.has(m.id)) { a.seen.add(m.id); addTok(a.tok, claudeTok(m.usage)); }
      });
      await tick();
    }
  }

  /** Full analyzer for one sub-agent (conversation view), cached. */
  agentAnalyzer(agentId) {
    const fp = path.join(this.agentDir(), agentId + '.jsonl');
    let an = this.agentAnalyzers.get(fp);
    if (!an) {
      if (!statSafe(fp)) return null;
      an = new SessionAnalyzer({ file: fp, provider: 'claude', convMax: 200, withAgents: false });
      this.agentAnalyzers.set(fp, an);
    }
    return an;
  }

  delegation(rosterNames = [], recentTypes = null) {
    let agentTools = 0;
    const byType = {};
    const tok = zeroTok();
    for (const a of this.agentFiles.values()) {
      agentTools += a.tools;
      addTok(tok, a.tok);
      const b = byType[a.type] || (byType[a.type] = { runs: 0, tools: 0, lastRun: 0 });
      b.runs++; b.tools += a.tools; b.lastRun = Math.max(b.lastRun, a.mtime);
    }
    const leadTools = this.toolCount;
    const sum = leadTools + agentTools;
    const weekAgo = now() - 7 * 86400e3;
    const used = recentTypes || new Set(Object.entries(byType).filter(([, v]) => v.lastRun >= weekAgo).map(([k]) => k));
    return {
      leadTools, agentTools, leadShare: sum ? Math.round((leadTools / sum) * 1000) / 1000 : 0,
      byType, idleMembers: rosterNames.filter((n) => !used.has(n)), agentTokens: tok, agentRuns: this.agentFiles.size,
    };
  }

  // ---------- views ----------
  todayBucket() { return this.days.get(dayKey(now())); }

  todoView() {
    const items = [...this.todos.values()].filter((x) => x.status !== 'deleted');
    return {
      total: items.length,
      done: items.filter((x) => x.status === 'completed' || x.status === 'done').length,
      inProgress: items.filter((x) => x.status === 'in_progress').length,
      items: items.slice(-50),
    };
  }

  currentTurn() { return this.turn ? this.finishTurn(this.turn, true) : null; }

  turnStats() {
    const s = this.turnStat;
    const list = [...s.list];
    const cur = this.currentTurn();
    if (cur && cur.outcome !== 'running' && cur.outcome !== 'waiting') list.push(cur.durationMs);
    const sorted = list.sort((a, b) => a - b);
    const total = sorted.reduce((a, b) => a + b, 0);
    return {
      count: sorted.length,
      avgMs: sorted.length ? Math.round(total / sorted.length) : 0,
      medianMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0,
      longestMs: sorted.length ? sorted[sorted.length - 1] : 0,
    };
  }

  daily(n = 14) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
      const k = dayKey(d.getTime());
      const b = this.days.get(k);
      out.push({ date: k, count: b?.tools || 0, prompts: b?.prompts || 0, edits: b?.edits || 0, errors: b?.errors || 0, tokensOut: b?.tok.output || 0 });
    }
    return out;
  }

  hotFiles(n = 30) {
    return [...this.files.values()].sort((a, b) => b.edits - a.edits || b.reads - a.reads || b.last - a.last).slice(0, n)
      .map((f) => ({ ...f, name: baseName(f.path) }));
  }

  insights(rosterNames, recentTypes) {
    const today = this.todayBucket();
    return {
      tokens: { total: { ...this.tok }, today: today ? { ...today.tok } : zeroTok() },
      activity: { ...this.activity },
      activityTimeMs: { ...this.activityMs },
      hourly: [...this.hourly],
      daily: this.daily(14),
      models: { ...this.models },
      turnStats: this.turnStats(),
      userWait: { count: this.userWait.count, avgMs: this.userWait.count ? Math.round(this.userWait.totalMs / this.userWait.count) : 0, totalMs: this.userWait.totalMs },
      decisions: { count: this.decisions.count, avgMs: this.decisions.count ? Math.round(this.decisions.totalMs / this.decisions.count) : 0 },
      errorRate: this.toolCount ? Math.round((this.errorCount / this.toolCount) * 1000) / 1000 : 0,
      errors: this.errorCount,
      errorsByType: { ...this.errorsByType },
      toolCount: this.toolCount,
      delegation: this.delegation(rosterNames, recentTypes),
      hotFiles: this.hotFiles(10),
    };
  }
}

// ---------- helpers for text ----------
export function fmtDur(ms) {
  ms = Math.max(0, ms || 0);
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`;
  return `${Math.floor(h / 24)}일 ${h % 24}시간`;
}
export function fmtTok(n) {
  n = n || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
const pct = (x) => Math.round(x * 100);
const TYPE_KO = { terminal: '명령 실행', edit: '코드 수정', read: '파일 읽기', search: '검색', web: '웹 탐색', delegate: '위임', tool: '도구', plan: '할 일', ask: '질문', skill: '스킬', publish: '게시', meeting: '팀 대화' };

/** Heuristic Korean progress summary (no LLM). */
export function progressSummary(an, session) {
  const out = [];
  const t = now();
  if (an.lastPrompt) out.push(`마지막 요청은 "${shorten(an.lastPrompt, 80)}"이에요 (${fmtDur(t - an.lastPromptAt)} 전).`);
  const a = session?.activity || {};
  const st = session?.status;
  if (st === 'waiting_input') out.push(`지금 대표님 결정을 기다리고 있어요${a.detail ? `: "${shorten(a.detail, 80)}"` : ''}.`);
  else if (st === 'waiting_permission') out.push(`지금 승인을 기다리고 있어요${a.detail ? ` (${shorten(a.detail, 60)})` : ''}.`);
  else if (st === 'done') out.push('방금 작업을 마치고 확인을 기다려요.');
  else if (st === 'idle' || st === 'sleeping') out.push(`지금은 쉬고 있어요 (${fmtDur(t - (session.lastActive || t))}째).`);
  else if (st === 'delegating') out.push(`지금 팀원에게 일을 맡기고 지켜보는 중이에요${a.label ? ` (${shorten(a.label, 40)})` : ''}.`);
  else if (a.label) out.push(`지금은 "${shorten(a.label, 50)}" 하는 중이에요.`);
  const cur = an.currentTurn() || an.turns[an.turns.length - 1];
  const td = an.todoView();
  const work = cur?.tools ? `이번 요청에서 도구를 ${cur.tools}번 썼어요(파일 수정 ${cur.edits}번, 명령 ${cur.cmds}번).` : '';
  let todo = '';
  if (td.total) {
    const ip = [...an.todos.values()].find((x) => x.status === 'in_progress');
    todo = `할 일은 ${td.total}개 중 ${td.done}개를 끝냈어요${ip ? ` (진행 중: "${shorten(ip.text, 40)}")` : ''}.`;
  }
  if (work || todo) out.push([work, todo].filter(Boolean).join(' '));
  const ask = [...an.pending.values()].find((p) => p.type === 'ask');
  if (ask) out.push(`열린 질문이 있어요: ${shorten(ask.conv?.tool?.detail || ask.label, 80)}`);
  else if (cur?.errors) out.push(`이번 요청에서 오류가 ${cur.errors}건 있었어요.`);
  return out.slice(0, 4).join(' ');
}

/** Insight sentences backed by data only. */
export function sessionTips(ins, session) {
  const tips = [];
  const d = ins.delegation;
  const sum = d.leadTools + d.agentTools;
  if (session?.kind === 'harness' && d.leadShare > 0.5 && sum >= 20) tips.push(`리더가 작업의 ${pct(d.leadShare)}%를 직접 처리하고 있어요 — 팀원에게 더 나눠보세요`);
  if (d.idleMembers.length) tips.push(`대기 팀원 ${d.idleMembers.length}명: 최근 7일 호출 0회 (${d.idleMembers.slice(0, 4).join(', ')}${d.idleMembers.length > 4 ? ' 외' : ''})`);
  if (ins.decisions.count) tips.push(`대표 결정 평균 응답 ${fmtDur(ins.decisions.avgMs)} (${ins.decisions.count}회)`);
  if (ins.userWait.count >= 3) tips.push(`답변이 끝난 뒤 다음 요청까지 평균 ${fmtDur(ins.userWait.avgMs)} 기다렸어요`);
  if (ins.toolCount >= 20 && ins.errorRate >= 0.05) {
    const top = Object.entries(ins.errorsByType || {}).sort((a, b) => b[1] - a[1])[0];
    tips.push(`오류율 ${pct(ins.errorRate)}%${top ? ` — ${TYPE_KO[top[0]] || top[0]} 실패가 잦아요` : ''}`);
  }
  const hot = ins.hotFiles[0];
  if (hot && hot.edits >= 5) tips.push(`가장 많이 고친 파일: ${hot.name} (${hot.edits}회)`);
  if (ins.tokens.today.output >= 50e3) tips.push(`오늘 출력 토큰 ${fmtTok(ins.tokens.today.output)}`);
  const tk = ins.tokens.total;
  const inAll = tk.input + tk.cacheRead + tk.cacheWrite;
  if (inAll > 1e6 && tk.cacheRead / inAll >= 0.9) tips.push(`캐시 재사용률 ${pct(tk.cacheRead / inAll)}% — 긴 대화를 효율적으로 이어가고 있어요`);
  if (ins.turnStats.longestMs >= 30 * 60e3) tips.push(`가장 오래 걸린 요청 ${fmtDur(ins.turnStats.longestMs)} — 큰 일은 단계별로 나눠 맡기면 확인이 쉬워요`);
  return tips;
}

// ---------- recent agent types in a project (for idle members), cached ----------
const recentCache = new Map();
export function recentAgentTypes(projectDir, days = 7) {
  const c = recentCache.get(projectDir);
  if (c && now() - c.at < 90e3) return c.types;
  const since = now() - days * 86400e3;
  const types = new Set();
  for (const s of readdirSafe(projectDir)) {
    const sub = path.join(projectDir, s, 'subagents');
    for (const f of readdirSafe(sub)) {
      if (!f.endsWith('.meta.json')) continue;
      const st = statSafe(path.join(sub, f.replace(/\.meta\.json$/, '.jsonl'))) || statSafe(path.join(sub, f));
      if (!st || st.mtimeMs < since) continue;
      const m = readJSON(path.join(sub, f));
      if (m?.agentType) types.add(m.agentType);
    }
  }
  recentCache.set(projectDir, { at: now(), types });
  return types;
}
