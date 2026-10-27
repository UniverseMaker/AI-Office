// Gemini CLI (and forks with the same chat format, e.g. Qwen Code) adapter.
// ~/.gemini/tmp/<projectHash|name>/chats/session-*.json
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { readJSON, readdirSafe, statSafe, shorten, baseName, startOfToday, now } from '../util.mjs';
import { classifyTool, ICON } from '../activity.mjs';

const ACTIVE_WINDOW = 3 * 3600e3;
const DONE_WINDOW = 30 * 60e3;

export class GeminiAdapter {
  constructor({ home = os.homedir(), dirName = '.gemini', provider = 'gemini', app = 'Gemini CLI' } = {}) {
    this.root = path.join(home, dirName, 'tmp');
    this.provider = provider;
    this.app = app;
    this.cache = new Map(); // file -> {mtime, session}
    this.name = provider;
    this.projectMap = readJSON(path.join(home, dirName, 'projects.json'), {})?.projects || {};
  }
  available() { return !!statSafe(this.root); }

  projectName(dirName, projDir) {
    try { const r = fs.readFileSync(path.join(projDir, '.project_root'), 'utf8').trim(); if (r) return r; } catch {}
    for (const [cwd, name] of Object.entries(this.projectMap)) if (name === dirName) return cwd;
    return dirName.length > 20 ? dirName.slice(0, 8) : dirName;
  }

  parse(file, cwd) {
    const j = readJSON(file);
    if (!j || !Array.isArray(j.messages)) return null;
    const today = startOfToday();
    const stats = { tools: 0, edits: 0, cmds: 0, reads: 0, searches: 0, web: 0, agents: 0, turns: 0, today: 0 };
    const feed = [];
    let lastPrompt = '', lastText = '', lastKind = null, pending = null, approval = null, model = '', turnStartedAt = 0, lastAt = 0;
    for (const m of j.messages) {
      const t = Date.parse(m.timestamp || '') || 0;
      if (t) lastAt = Math.max(lastAt, t);
      const text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((c) => c.text || '').join(' ') : '';
      if (m.type === 'user') {
        stats.turns++; lastPrompt = shorten(text, 140); lastKind = 'prompt'; turnStartedAt = t; pending = null;
        feed.push({ t, icon: ICON.prompt, kind: 'prompt', text: '요청: ' + shorten(text, 70) });
      } else if (m.type === 'gemini' || m.type === 'model' || m.type === 'assistant') {
        if (m.model) model = m.model;
        if (m.thoughts?.length) lastKind = 'think';
        if (text.trim()) { lastKind = 'text'; lastText = shorten(text, 160); }
        for (const tc of m.toolCalls || []) {
          const act = classifyTool(tc.name, tc.args);
          stats.tools++; if (t >= today) stats.today++;
          if (act.type === 'edit') stats.edits++; else if (act.type === 'terminal') stats.cmds++; else if (act.type === 'read') stats.reads++; else if (act.type === 'search') stats.searches++; else if (act.type === 'web') stats.web++;
          feed.push({ t: Date.parse(tc.timestamp || '') || t, icon: ICON[act.type] || ICON.tool, kind: act.type, text: act.label });
          const s = String(tc.status || '');
          if (/executing|scheduled|validating/.test(s)) { pending = { act, start: t }; lastKind = 'tool'; }
          else if (/awaiting/.test(s)) { approval = { act, start: t }; }
          else if (pending && pending.act === act) pending = null;
        }
      } else if (m.type === 'error') {
        feed.push({ t, icon: ICON.error, kind: 'error', text: shorten(text, 70) });
      }
    }
    return { j, stats, feed: feed.slice(-25), lastPrompt, lastText, lastKind, pending, approval, model, turnStartedAt, lastAt, cwd };
  }

  scan() {
    const sessions = [];
    const t = now();
    for (const d of readdirSafe(this.root)) {
      const projDir = path.join(this.root, d);
      const chats = path.join(projDir, 'chats');
      for (const f of readdirSafe(chats)) {
        if (!f.endsWith('.json')) continue;
        const fp = path.join(chats, f);
        const st = statSafe(fp);
        if (!st || t - st.mtimeMs > ACTIVE_WINDOW) continue;
        let c = this.cache.get(fp);
        if (!c || c.mtime !== st.mtimeMs) {
          const parsed = this.parse(fp, this.projectName(d, projDir));
          if (!parsed) continue;
          c = { mtime: st.mtimeMs, p: parsed };
          this.cache.set(fp, c);
        }
        const p = c.p;
        const last = Math.max(p.lastAt, st.mtimeMs);
        const idleFor = t - last;
        let status, activity;
        if (p.approval) { status = 'waiting_permission'; activity = { type: 'ask', label: '실행 승인 대기', detail: p.approval.act.label, since: p.approval.start }; }
        else if ((p.lastKind === 'prompt' || p.lastKind === 'tool' || p.lastKind === 'think') && idleFor < 5 * 60e3) {
          if (p.pending) { status = 'tool'; activity = { ...p.pending.act, since: p.pending.start }; }
          else { status = 'thinking'; activity = { type: 'think', label: '생각 중…', detail: p.lastPrompt, since: last }; }
        } else if (p.lastKind === 'text' && idleFor < DONE_WINDOW) { status = 'done'; activity = { type: 'done', label: '완료 · 확인 필요', detail: p.lastText, since: last }; }
        else { status = 'idle'; activity = { type: 'idle', label: '휴식 중', detail: '', since: last }; }
        const id = p.j.sessionId || f.replace(/\.json$/, '');
        sessions.push({
          id: `${this.provider}:${id}`,
          provider: this.provider,
          source: 'transcript',
          app: this.app,
          kind: 'single',
          title: shorten(p.lastPrompt || baseName(p.cwd) || this.app, 60),
          project: baseName(p.cwd),
          cwd: p.cwd,
          model: p.model,
          status,
          activity: { ...activity, label: shorten(activity.label, 40), detail: shorten(activity.detail, 200) },
          startedAt: Date.parse(p.j.startTime || '') || st.birthtimeMs,
          lastActive: last,
          turnStartedAt: p.turnStartedAt,
          lastPrompt: p.lastPrompt,
          stats: p.stats,
          level: Math.max(1, Math.floor(Math.log2(Math.max(1, st.size / 1024 / 40))) + 1),
          roster: [], agents: [], todos: [],
          feed: p.feed,
        });
      }
    }
    return sessions;
  }
}
