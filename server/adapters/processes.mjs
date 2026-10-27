// Detects AI desktop apps / local model servers by process name.
// Gives presence only (no content) — a bridge can add detail via /api/events.
import { execFile } from 'node:child_process';
import { now } from '../util.mjs';

export const APP_CATALOG = [
  { match: /^chatgpt(\.exe)?$/i, provider: 'chatgpt', title: 'ChatGPT 데스크톱' },
  { match: /^cursor(\.exe)?$/i, provider: 'cursor', title: 'Cursor' },
  { match: /^antigravity(\.exe)?$/i, provider: 'gemini', title: 'Antigravity (Gemini)' },
  { match: /^windsurf(\.exe)?$/i, provider: 'windsurf', title: 'Windsurf' },
  { match: /^perplexity(\.exe)?$/i, provider: 'perplexity', title: 'Perplexity' },
  { match: /^(copilot|microsoft\.copilot)(\.exe)?$/i, provider: 'copilot', title: 'Copilot' },
  { match: /^(ollama|ollama app)(\.exe)?$/i, provider: 'ollama', title: 'Ollama (로컬 모델)' },
  { match: /^lm studio(\.exe)?$/i, provider: 'lmstudio', title: 'LM Studio' },
  { match: /^codex(\.exe)?$/i, provider: 'codex', title: 'Codex 앱', soft: true },
  { match: /^gemini(\.exe)?$/i, provider: 'gemini', title: 'Gemini 앱' },
  { match: /^grok(\.exe)?$/i, provider: 'grok', title: 'Grok' },
];

function listProcesses() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, maxBuffer: 8 << 20 }, (err, out) => {
        if (err) return resolve([]);
        resolve(out.split(/\r?\n/).map((l) => l.split('","')[0]?.replace(/^"/, '')).filter(Boolean));
      });
    } else {
      execFile('ps', ['-axo', 'comm='], { maxBuffer: 8 << 20 }, (err, out) => {
        if (err) return resolve([]);
        resolve(out.split('\n').map((l) => l.trim().split('/').pop()).filter(Boolean));
      });
    }
  });
}

export class ProcessAdapter {
  constructor() { this.name = 'processes'; this.found = new Map(); this.at = 0; this.busy = false; }
  available() { return true; }
  refresh() {
    if (this.busy || now() - this.at < 10e3) return;
    this.busy = true;
    listProcesses().then((names) => {
      const seen = new Map();
      for (const n of names) {
        for (const app of APP_CATALOG) {
          if (app.match.test(n)) { const k = app.title; seen.set(k, { ...app, count: (seen.get(k)?.count || 0) + 1 }); }
        }
      }
      for (const [k, v] of seen) if (!this.found.has(k)) v.since = now(); else v.since = this.found.get(k).since;
      this.found = seen;
      this.at = now();
    }).finally(() => { this.busy = false; });
  }
  /** @param {object[]} others sessions from richer adapters, used to skip duplicates */
  scan(others = []) {
    this.refresh();
    const out = [];
    for (const app of this.found.values()) {
      if (app.soft && others.some((s) => s.provider === app.provider)) continue;
      out.push({
        id: 'app:' + app.title,
        provider: app.provider,
        source: 'process',
        app: app.title,
        kind: 'app',
        title: app.title,
        project: '',
        cwd: '',
        model: '',
        status: 'present',
        activity: { type: 'idle', label: '앱 열림', detail: '대화 내용은 브리지(유저스크립트/이벤트 API)를 연결하면 보여요.', since: app.since },
        startedAt: app.since,
        lastActive: app.since,
        stats: { tools: 0, today: 0 },
        level: 1,
        roster: [], agents: [], todos: [], feed: [],
      });
    }
    return out;
  }
}
