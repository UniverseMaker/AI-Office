// Generic event ingestion: anything (hooks, userscripts, other tools) can POST /api/events.
//
// Body (single object or array):
// {
//   provider: "chatgpt" | "gemini" | "claude" | "<any>",   // required
//   sessionId: "abc",                                       // required
//   title?: "...", project?: "...", model?: "...", app?: "...",
//   kind?: "single" | "harness",
//   status?: "working"|"thinking"|"tool"|"delegating"|"waiting_permission"|"waiting_input"|"done"|"idle",
//   activity?: { type: "edit"|"terminal"|..., label: "...", detail?: "..." },
//   agent?: { id, type, description?, status: "working"|"done", activity? },   // upsert a sub-agent
//   tool?: { name, input },          // convenience: classified automatically
//   feed?: "text for the timeline",
//   ttl?: 600                         // seconds to keep the session after last event
//   end?: true                        // remove the session now
// }
import { classifyTool, ICON } from '../activity.mjs';
import { shorten, pushRing, pushFeed, now } from '../util.mjs';

export class IngestAdapter {
  constructor() { this.name = 'ingest'; this.sessions = new Map(); this.overlays = new Map(); }
  available() { return true; }

  accept(ev) {
    if (!ev || typeof ev !== 'object' || !ev.provider || !ev.sessionId) return false;
    if (!/^[a-z0-9_-]{1,24}$/i.test(String(ev.provider)) || String(ev.sessionId).length > 120) return false;
    for (const k of ['title', 'project', 'cwd', 'model', 'app', 'kind', 'prompt', 'feed']) if (ev[k] != null) ev[k] = String(ev[k]).slice(0, k === 'prompt' ? 2000 : 300);
    if (ev.icon != null) ev.icon = String(ev.icon).replace(/[<>&"']/g, '').slice(0, 4);
    if (!this.sessions.has(`${ev.provider}:${ev.sessionId}`) && this.sessions.size >= 300) return false;
    const id = `${ev.provider}:${ev.sessionId}`;
    if (ev.end) { this.sessions.delete(id); return true; }
    const t = now();
    let s = this.sessions.get(id);
    if (!s) {
      s = {
        id, provider: String(ev.provider), source: 'bridge', app: ev.app || '브리지', kind: ev.kind || 'single',
        title: ev.title || ev.sessionId, project: ev.project || '', cwd: ev.cwd || '', model: ev.model || '',
        status: 'idle', activity: { type: 'idle', label: '대기', detail: '', since: t },
        startedAt: t, lastActive: t, turnStartedAt: 0, lastPrompt: '',
        stats: { tools: 0, edits: 0, cmds: 0, reads: 0, searches: 0, web: 0, agents: 0, turns: 0, today: 0 },
        level: 1, roster: [], agents: [], todos: [], feed: [], ttl: 600,
      };
      this.sessions.set(id, s);
    }
    for (const k of ['title', 'project', 'cwd', 'model', 'app', 'kind']) if (ev[k]) s[k] = ev[k];
    if (ev.ttl) { const n = Number(ev.ttl); if (Number.isFinite(n)) s.ttl = Math.max(30, Math.min(86400, n)); }
    if (ev.tool) {
      const act = classifyTool(ev.tool.name, ev.tool.input);
      s.activity = { ...act, since: t };
      s.status = act.type === 'ask' ? 'waiting_input' : act.type === 'delegate' ? 'delegating' : 'tool';
      s.stats.tools++; s.stats.today++;
      pushFeed(s.feed, { t, icon: ICON[act.type] || ICON.tool, kind: act.type, text: act.label });
    }
    if (ev.status) s.status = ev.status;
    if (ev.activity) s.activity = { type: 'tool', label: '', detail: '', ...ev.activity, label: shorten(ev.activity.label, 40), since: t };
    if (ev.status === 'done' && !ev.activity) s.activity = { type: 'done', label: '완료 · 확인 필요', detail: '', since: t };
    if (ev.status === 'idle' && !ev.activity) s.activity = { type: 'idle', label: '휴식 중', detail: '', since: t };
    if (ev.prompt) { s.lastPrompt = shorten(ev.prompt, 140); s.stats.turns++; s.turnStartedAt = t; pushFeed(s.feed, { t, icon: ICON.prompt, kind: 'prompt', text: '요청: ' + shorten(ev.prompt, 70) }); }
    if (ev.feed) pushFeed(s.feed, { t, icon: ev.icon || '•', kind: 'bridge', text: shorten(ev.feed, 80) });
    if (ev.agent?.id) {
      const a = s.agents.find((x) => x.id === ev.agent.id);
      const base = { id: ev.agent.id, type: ev.agent.type || 'helper', description: ev.agent.description || '', status: ev.agent.status || 'working', activity: ev.agent.activity || { type: 'think', label: '작업 중' }, startedAt: t, lastActive: t, depth: 1 };
      if (a) Object.assign(a, ev.agent, { lastActive: t, endedAt: ev.agent.status === 'done' ? t : null });
      else s.agents.push(base);
      if (s.agents.length > 1 || ev.kind === 'harness') s.kind = 'harness';
    }
    s.lastActive = t;
    return true;
  }

  /**
   * Overlay events (e.g. Claude Code hooks) that refine a session another adapter already reports.
   * Stored separately and merged in index.mjs.
   */
  overlay(ev) {
    const id = `${ev.provider}:${ev.sessionId}`;
    this.overlays.set(id, { status: ev.status, activity: ev.activity, at: now(), ttl: (ev.ttl || 120) * 1000 });
  }

  scan() {
    const t = now();
    const out = [];
    for (const [id, s] of this.sessions) {
      if (t - s.lastActive > s.ttl * 1000) { this.sessions.delete(id); continue; }
      s.agents = s.agents.filter((a) => !(a.status === 'done' && t - (a.endedAt || a.lastActive) > 120e3));
      const { ttl, ...pub } = s;
      out.push({ ...pub, feed: s.feed.slice(-25) });
    }
    return out;
  }
}
