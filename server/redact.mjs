// Public (not logged-in) view of the state: "간단한 내용만" — who is working and roughly on what, no content.

export const GENERIC = {
  read: '파일 읽는 중', edit: '코드 수정 중', terminal: '명령 실행 중', search: '검색 중', web: '웹 탐색 중',
  think: '생각 중…', delegate: '팀원에게 위임', meeting: '팀 대화 중', plan: '할 일 정리', ask: '결정 필요',
  skill: '스킬 사용', publish: '결과물 게시', tool: '도구 사용 중', talk: '답변 정리 중', idle: '휴식 중',
  done: '완료', prompt: '새 요청', error: '오류', notify: '알림', enter: '출근', leave: '퇴근',
  waiting_input: '결정이 필요해요', waiting_permission: '승인을 기다려요',
};
const label = (type) => GENERIC[type] || GENERIC.tool;

// generic app names that are safe to show as-is
const KNOWN_APPS = new Set(['Claude 데스크톱', 'Claude Code CLI', 'Claude Code', 'Gemini CLI', 'Qwen Code', 'Codex', 'Codex Desktop', '브리지']);
const PROVIDER_APP = { claude: 'Claude Code', codex: 'Codex', gemini: 'Gemini', qwen: 'Qwen Code', chatgpt: 'ChatGPT', cursor: 'Cursor' };

function genericApp(s) {
  if (s.source === 'process' || KNOWN_APPS.has(s.app)) return s.app; // process titles come from a fixed catalog
  if (s.provider === 'claude') return /데스크톱|desktop/i.test(s.app) ? 'Claude 데스크톱' : /cli/i.test(s.app) ? 'Claude Code CLI' : 'Claude Code';
  if (s.provider === 'codex') return /desktop/i.test(s.app) ? 'Codex Desktop' : 'Codex';
  return PROVIDER_APP[s.provider] || '외부 AI';
}

const genericAct = (a = {}) => ({ type: a.type || 'idle', since: a.since || 0, label: label(a.type || 'idle'), detail: '' });

export function redactSession(s) {
  const roster = (s.roster || []).map((r, i) => ({ name: `팀원 ${i + 1}`, description: '', runs: r.runs || 0, level: r.level || 1 }));
  const idx = new Map((s.roster || []).map((r, i) => [r.name, i]));
  const todos = s.todos || [];
  return {
    id: s.id, provider: s.provider, source: s.source, kind: s.kind, app: genericApp(s),
    title: '', project: '', cwd: '', model: '', effort: '', permissionMode: '', pid: null,
    persona: s.persona || null,
    status: s.status, level: s.level, place: s.place, placeOverride: s.placeOverride, ctl: s.ctl ? { action: s.ctl.action, assign: s.ctl.assign, lock: s.ctl.lock, pinned: s.ctl.pinned } : s.ctl, dismissed: s.dismissed,
    activity: genericAct(s.activity),
    startedAt: s.startedAt, lastActive: s.lastActive, turnStartedAt: s.turnStartedAt || 0,
    lastPrompt: '',
    stats: { today: s.stats?.today || 0 },
    roster,
    agents: (s.agents || []).map((a) => ({
      id: a.id, type: idx.has(a.type) ? roster[idx.get(a.type)].name : 'helper', description: '',
      status: a.status, activity: genericAct(a.activity), depth: a.depth || 1, background: !!a.background,
      startedAt: a.startedAt, lastActive: a.lastActive, endedAt: a.endedAt ?? null,
    })),
    todos: [],
    todoCounts: { total: todos.length, done: todos.filter((t) => t.status === 'completed' || t.status === 'done').length },
    feed: [],
  };
}

export function redactState(state, configured) {
  return {
    ts: state.ts, host: '', mode: state.mode, adapters: state.adapters,
    sessions: (state.sessions || []).map(redactSession),
    feed: (state.feed || []).map((f) => ({ t: f.t, icon: f.icon, sid: f.sid, kind: f.kind, text: GENERIC[f.kind] || '활동' })),
    auth: { authed: false, configured },
    building: state.building,
  };
}
