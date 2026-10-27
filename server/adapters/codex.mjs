// OpenAI Codex (CLI / Desktop / IDE) adapter: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { JsonlTail, readdirSafe, statSafe, shorten, baseName, startOfToday, pushRing, pushFeed, now } from '../util.mjs';
import { classifyTool, ICON } from '../activity.mjs';

const ACTIVE_WINDOW = 3 * 3600e3;
const DONE_WINDOW = 30 * 60e3;

class Rollout {
  constructor(file) {
    this.tail = new JsonlTail(file, { initialBytes: 800_000 });
    this.meta = {};
    this.model = '';
    this.pending = new Map();
    this.taskOpen = false;
    this.lastKind = null;
    this.lastText = '';
    this.lastAt = 0;
    this.approval = null;
    this.stats = { tools: 0, edits: 0, cmds: 0, reads: 0, searches: 0, web: 0, agents: 0, turns: 0, today: 0 };
    this.feed = [];
    this.todos = new Map();
    this.lastPrompt = '';
    this.turnStartedAt = 0;
    this.imported = false;
  }
  update() {
    const today = startOfToday();
    for (const r of this.tail.read()) {
      const t = r.timestamp ? Date.parse(r.timestamp) : 0;
      if (t) this.lastAt = Math.max(this.lastAt, t);
      const p = r.payload || {};
      if (r.type === 'session_meta') { this.meta = p; if (String(p.cli_version || '').includes('import') || p.source === 'import') this.imported = true; continue; }
      if (r.type === 'turn_context') { if (p.model) this.model = p.model; continue; }
      if (r.type === 'event_msg') this.event(p, t, today);
      else if (r.type === 'response_item') this.item(p, t, today);
    }
  }
  event(p, t) {
    switch (p.type) {
      case 'task_started': this.taskOpen = true; this.turnStartedAt = t; this.lastKind = 'think'; this.approval = null; if (String(p.turn_id || '').startsWith('external-import')) this.imported = true; break;
      case 'task_complete': case 'turn_aborted': this.taskOpen = false; this.pending.clear(); this.approval = null; if (p.type === 'turn_aborted') this.lastKind = 'aborted'; break;
      case 'user_message': this.stats.turns++; this.lastPrompt = shorten(p.message, 140); this.lastKind = 'prompt'; pushFeed(this.feed, { t, icon: ICON.prompt, kind: 'prompt', text: '요청: ' + shorten(p.message, 70) }); break;
      case 'agent_message': this.lastKind = 'text'; this.lastText = shorten(p.message, 160); break;
      case 'agent_reasoning': case 'agent_reasoning_raw_content': this.lastKind = 'think'; break;
      case 'exec_approval_request': case 'apply_patch_approval_request': case 'request_permissions':
        this.approval = { label: p.type === 'exec_approval_request' ? '명령 실행 승인 대기' : '코드 수정 승인 대기', detail: shorten([].concat(p.command || p.reason || '').join(' '), 160), since: t }; break;
      case 'exec_command_end': case 'patch_apply_end': this.approval = null; break;
      case 'update_plan': case 'plan_update':
        if (Array.isArray(p.plan)) { this.todos.clear(); p.plan.forEach((s, i) => this.todos.set(String(i), { id: String(i), text: s.step, status: s.status })); }
        break;
    }
  }
  item(p, t, today) {
    if (p.type === 'function_call' || p.type === 'custom_tool_call' || p.type === 'local_shell_call' || p.type === 'web_search_call') {
      const name = p.name || (p.type === 'local_shell_call' ? 'shell' : p.type === 'web_search_call' ? 'web_search' : 'tool');
      const input = p.arguments ?? p.input ?? p.action ?? {};
      const act = classifyTool(name, input);
      const id = p.call_id || p.id || String(t);
      if (p.type !== 'web_search_call') this.pending.set(id, { name, start: t || now(), act });
      this.lastKind = 'tool';
      const s = this.stats; s.tools++; if (t >= today) s.today++;
      if (act.type === 'edit') s.edits++; else if (act.type === 'terminal') s.cmds++; else if (act.type === 'search') s.searches++; else if (act.type === 'web') s.web++; else if (act.type === 'delegate') s.agents++;
      if (name === 'update_plan') { try { const a = typeof input === 'string' ? JSON.parse(input) : input; if (Array.isArray(a.plan)) { this.todos.clear(); a.plan.forEach((x, i) => this.todos.set(String(i), { id: String(i), text: x.step, status: x.status })); } } catch {} }
      pushFeed(this.feed, { t, icon: ICON[act.type] || ICON.tool, kind: act.type, text: act.label });
    } else if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
      this.pending.delete(p.call_id);
      this.lastKind = 'result';
    } else if (p.type === 'reasoning') {
      this.lastKind = 'think';
    } else if (p.type === 'message' && p.role === 'assistant') {
      const txt = (p.content || []).map((c) => c.text || '').join(' ');
      if (txt.trim()) { this.lastKind = 'text'; this.lastText = shorten(txt, 160); }
    }
  }
}

export class CodexAdapter {
  constructor({ home = os.homedir() } = {}) {
    this.root = path.join(home, '.codex');
    this.rollouts = new Map();
    this.index = new Map();
    this.indexAt = 0;
    this.listAt = 0;
    this.files = [];
    this.name = 'codex';
  }
  available() { return !!statSafe(path.join(this.root, 'sessions')); }

  loadIndex() {
    if (now() - this.indexAt < 30e3) return;
    this.indexAt = now();
    try {
      const txt = fs.readFileSync(path.join(this.root, 'session_index.jsonl'), 'utf8');
      for (const l of txt.split('\n')) { try { const j = JSON.parse(l); if (j.id) this.index.set(j.id, j.thread_name); } catch {} }
    } catch {}
  }

  listFiles() {
    if (now() - this.listAt < 10e3) return this.files;
    this.listAt = now();
    const out = [];
    const base = path.join(this.root, 'sessions');
    for (let back = 0; back < 3; back++) {
      const d = new Date(Date.now() - back * 86400e3);
      const dir = path.join(base, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'));
      for (const f of readdirSafe(dir)) {
        if (!f.endsWith('.jsonl')) continue;
        const fp = path.join(dir, f);
        const st = statSafe(fp);
        if (st && now() - st.mtimeMs < ACTIVE_WINDOW) out.push(fp);
      }
    }
    this.files = out.slice(-16);
    return this.files;
  }

  scan() {
    this.loadIndex();
    const sessions = [];
    const files = this.listFiles();
    for (const fp of files) {
      let ro = this.rollouts.get(fp);
      if (!ro) { ro = new Rollout(fp); this.rollouts.set(fp, ro); }
      ro.update();
      if (ro.imported) continue;
      const st = statSafe(fp);
      const t = now();
      const last = Math.max(ro.lastAt, st?.mtimeMs || 0);
      const idleFor = t - last;
      const pend = [...ro.pending.values()].pop();
      let status, activity;
      if (ro.approval) { status = 'waiting_permission'; activity = { type: 'ask', ...ro.approval }; }
      else if (ro.taskOpen && idleFor < 20 * 60e3) {
        if (pend) { status = pend.act.type === 'delegate' ? 'delegating' : 'tool'; activity = { ...pend.act, since: pend.start }; }
        else if (ro.lastKind === 'text') { status = 'working'; activity = { type: 'talk', label: '답변 정리 중', detail: ro.lastText, since: last }; }
        else { status = 'thinking'; activity = { type: 'think', label: '생각 중…', detail: ro.lastPrompt, since: last }; }
      } else if (ro.lastKind === 'text' && idleFor < DONE_WINDOW) { status = 'done'; activity = { type: 'done', label: '완료 · 확인 필요', detail: ro.lastText, since: last }; }
      else { status = 'idle'; activity = { type: 'idle', label: '휴식 중', detail: '', since: last }; }
      const id = ro.meta.id || path.basename(fp, '.jsonl');
      const cwd = ro.meta.cwd || '';
      sessions.push({
        id: 'codex:' + id,
        provider: 'codex',
        source: 'transcript',
        app: ro.meta.originator || 'Codex',
        kind: 'single',
        title: shorten(this.index.get(id) || ro.lastPrompt || baseName(cwd) || 'Codex 세션', 60),
        project: baseName(cwd),
        cwd,
        model: ro.model || ro.meta.model_provider || '',
        status,
        activity: { ...activity, label: shorten(activity.label, 40), detail: shorten(activity.detail, 200) },
        startedAt: Date.parse(ro.meta.timestamp || '') || st?.birthtimeMs || last,
        lastActive: last,
        turnStartedAt: ro.turnStartedAt,
        lastPrompt: ro.lastPrompt,
        stats: ro.stats,
        level: Math.max(1, Math.floor(Math.log2(Math.max(1, (st?.size || 0) / 1024 / 40))) + 1),
        roster: [],
        agents: [],
        todos: [...ro.todos.values()],
        feed: ro.feed.slice(-25),
      });
    }
    for (const k of this.rollouts.keys()) if (!files.includes(k)) this.rollouts.delete(k);
    return sessions;
  }
}
