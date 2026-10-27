// Provider registry — add a new AI here (colors, accessories, short code). Nothing else is provider-specific.
window.AIO = window.AIO || {};

AIO.PROVIDERS = {
  claude:     { label: 'Claude',     short: 'C', yarn: '#f6eee2', accent: '#d97757', accent2: '#f4b08f', hats: ['beanie', 'beret', 'bucket', 'beanie'], logo: '✳' },
  codex:      { label: 'Codex',      short: 'X', yarn: '#f3f3ef', accent: '#10a37f', accent2: '#7fe0c4', hats: ['headphones', 'cap'],            logo: '◎' },
  chatgpt:    { label: 'ChatGPT',    short: 'P', yarn: '#eef4f0', accent: '#19a974', accent2: '#a6e6cc', hats: ['cap', 'beanie'],                logo: '◎' },
  gemini:     { label: 'Gemini',     short: 'G', yarn: '#eef1fb', accent: '#4e7cf6', accent2: '#b07ce8', hats: ['beret', 'bow'],                 logo: '✦' },
  qwen:       { label: 'Qwen',       short: 'Q', yarn: '#f1eefb', accent: '#6f5bd9', accent2: '#c8bdf5', hats: ['beret', 'beanie'],              logo: '◆' },
  cursor:     { label: 'Cursor',     short: 'U', yarn: '#efefef', accent: '#2d2d2d', accent2: '#9a9a9a', hats: ['shades', 'cap'],                logo: '▲' },
  copilot:    { label: 'Copilot',    short: 'K', yarn: '#f0eff9', accent: '#7c5cff', accent2: '#5cc8ff', hats: ['headphones'],                   logo: '❖' },
  windsurf:   { label: 'Windsurf',   short: 'W', yarn: '#eef7f7', accent: '#0fa3a3', accent2: '#8fe3e3', hats: ['bucket'],                       logo: '≋' },
  perplexity: { label: 'Perplexity', short: 'R', yarn: '#eef6f6', accent: '#1f8a8a', accent2: '#9ed9d9', hats: ['bucket'],                       logo: '✱' },
  ollama:     { label: 'Ollama',     short: 'O', yarn: '#fbfaf6', accent: '#555555', accent2: '#d6d0c4', hats: ['ears'],                         logo: '🦙' },
  lmstudio:   { label: 'LM Studio',  short: 'M', yarn: '#f3f0fb', accent: '#5a4fcf', accent2: '#b7b0f0', hats: ['headphones'],                   logo: '◈' },
  grok:       { label: 'Grok',       short: 'Z', yarn: '#ededed', accent: '#111111', accent2: '#777777', hats: ['shades'],                       logo: '✕' },
  generic:    { label: 'AI',         short: 'A', yarn: '#f3efe8', accent: '#8b7d6b', accent2: '#cbbfae', hats: ['beanie'],                       logo: '●' },
};
AIO.provider = (p) => AIO.PROVIDERS[p] || { ...AIO.PROVIDERS.generic, label: p || 'AI' };

AIO.STATUS = {
  working:            { label: '작업중',    color: '#3fb27f', icon: '⌨️', zone: 'desk' },
  tool:               { label: '작업중',    color: '#3fb27f', icon: '⌨️', zone: 'desk' },
  thinking:           { label: '생각중',    color: '#6f9cf0', icon: '💭', zone: 'desk' },
  delegating:         { label: '지휘중',    color: '#a67be0', icon: '👥', zone: 'desk' },
  waiting_input:      { label: '결정 필요', color: '#e5534b', icon: '🙋', zone: 'desk', urgent: true },
  waiting_permission: { label: '승인 대기', color: '#e5534b', icon: '✋', zone: 'desk', urgent: true },
  done:               { label: '완료',      color: '#4e9cf6', icon: '✅', zone: 'desk' },
  idle:               { label: '휴식',      color: '#b8a58c', icon: '☕', zone: 'lounge' },
  sleeping:           { label: '졸음',      color: '#a39c94', icon: '💤', zone: 'desk' },
  present:            { label: '접속',      color: '#c3a86b', icon: '🖥️', zone: 'desk' },
  standby:            { label: '대기',      color: '#b8a58c', icon: '·',  zone: 'desk' },
};
// .label follows the UI language (AIO.tr from i18n.js); .ko keeps the Korean source for comparisons
for (const v of Object.values(AIO.STATUS)) {
  v.ko = v.label;
  Object.defineProperty(v, 'label', { get() { return AIO.tr ? AIO.tr(this.ko) : this.ko; }, enumerable: true, configurable: true });
}
AIO.status = (s) => AIO.STATUS[s] || AIO.STATUS.idle;
AIO.isBusy = (s) => s === 'working' || s === 'tool' || s === 'thinking' || s === 'delegating';
AIO.isUrgent = (s) => s === 'waiting_input' || s === 'waiting_permission';

AIO.ACT_ICON = {
  read: '📖', edit: '✍️', terminal: '⌨️', search: '🔎', web: '🌐', think: '💭', delegate: '👥', meeting: '💬',
  plan: '📋', ask: '🙋', skill: '🧰', publish: '🚀', tool: '🔧', talk: '💬', idle: '☕', done: '✅', error: '⚠️',
};

AIO.hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
AIO.rand = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };

AIO.fmtDur = (ms) => {
  const en = AIO.lang === 'en';
  if (!ms || ms < 0) return en ? 'just now' : '방금';
  const s = Math.floor(ms / 1000);
  if (s < 60) return en ? `${s}s` : `${s}초`;
  const m = Math.floor(s / 60);
  if (m < 60) return en ? `${m}m` : `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return en ? `${h}h ${m % 60}m` : `${h}시간 ${m % 60}분`;
  return en ? `${Math.floor(h / 24)}d` : `${Math.floor(h / 24)}일`;
};
AIO.fmtTime = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
AIO.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
