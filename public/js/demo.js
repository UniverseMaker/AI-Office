// Demo simulator: emits the same state shape as the collector, exercising every behaviour.
(function () {
  const ACTS = {
    read: ['index.html 읽는 중', 'server.mjs 읽는 중', 'README.md 읽는 중', '논문 초안.md 읽는 중'],
    edit: ['office.js 수정', 'style.css 수정', '보고서.md 수정', 'api.py 수정', 'layout.js 수정'],
    terminal: ['npm test', 'git status', 'python train.py', 'pytest -q', 'node build.mjs'],
    search: ['"TODO" 찾는 중', '"useState" 찾는 중', '"결정" 찾는 중'],
    web: ['threads.com', 'docs.python.org', 'arxiv.org', 'github.com'],
    think: ['생각 중…'],
    plan: ['할 일 정리', '작업 계획 세우는 중'],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();

  function mkStats() { return { tools: 0, edits: 0, cmds: 0, reads: 0, searches: 0, web: 0, agents: 0, turns: 1, today: Math.floor(Math.random() * 40) }; }

  function session(o) {
    const t = now();
    return {
      provider: 'claude', source: 'demo', app: 'Claude Code', kind: 'single', project: '', cwd: '', model: 'claude-opus-5-5',
      status: 'idle', activity: { type: 'idle', label: '휴식 중', detail: '', since: t },
      startedAt: t - Math.random() * 3600e3, lastActive: t, turnStartedAt: t, lastPrompt: '', stats: mkStats(), level: 3 + Math.floor(Math.random() * 10),
      roster: [], agents: [], todos: [], feed: [], ...o,
    };
  }

  class Demo {
    constructor() {
      const t = now();
      this.sessions = [
        session({ id: 'claude:demo-harness', title: '블로그 리뉴얼 하네스', project: '블로그 리뉴얼', kind: 'harness', status: 'delegating', level: 14,
          roster: ['architect', 'frontend-builder', 'content-writer', 'design-critic', 'qa-verifier'].map((n, i) => ({ name: n, description: '', runs: 5 + i * 7, level: 2 + i })),
          todos: [{ id: '1', text: '디자인 시스템', status: 'completed' }, { id: '2', text: '메인 페이지', status: 'in_progress' }, { id: '3', text: '글 마이그레이션', status: 'pending' }, { id: '4', text: '검수', status: 'pending' }],
          lastPrompt: '블로그 전체 리뉴얼 진행해줘' }),
        session({ id: 'claude:demo-wf', title: '논문 리뷰 워크플로', project: '논문 리뷰', kind: 'harness', status: 'delegating', level: 9,
          roster: ['method-reviewer', 'stats-checker', 'writing-editor'].map((n, i) => ({ name: n, description: '', runs: 3 + i * 4, level: 2 + i })),
          lastPrompt: '논문 3편 병렬 리뷰' }),
        session({ id: 'claude:demo-weekly', title: '11주차 주간보고 작성', project: '주간보고', status: 'tool', activity: { type: 'edit', label: '주간보고.md 수정', since: t }, level: 8 }),
        session({ id: 'claude:demo-ask', title: '배포 전략 결정', project: 'NextSim', status: 'waiting_input', level: 13,
          activity: { type: 'ask', label: '대표님 결정 필요', detail: '원시 출력(22GB)도 백업에 넣을까요?', since: t } }),
        session({ id: 'claude:demo-sleep', title: '어제 하던 리팩토링', project: '리팩토링', status: 'sleeping', level: 6 }),
        session({ id: 'claude:demo-lounge', title: '논문 그림 수정 (일시정지)', project: '논문', status: 'idle', level: 11 }),
        session({ id: 'claude:demo-pause2', title: '[일시정지] 홈페이지 리뉴얼', project: '홈페이지', status: 'idle', level: 7 }),
        session({ id: 'claude:demo-stop', title: '[중단] 레거시 마이그레이션', project: 'legacy', status: 'idle', level: 12 }),
        session({ id: 'claude:demo-oldteam', title: '[중단] 쇼핑몰 하네스', project: '쇼핑몰', kind: 'harness', status: 'sleeping', level: 10,
          roster: ['shop-builder', 'shop-qa', 'shop-writer'].map((n, i) => ({ name: n, description: '', runs: 4 + i, level: 2 + i })) }),
        session({ id: 'claude:demo-explore', title: '코드베이스 조사', project: 'AddressKG', status: 'delegating', level: 7, activity: { type: 'delegate', label: 'Explore에게 위임', since: t } }),
        session({ id: 'claude:demo-done', title: '인스타 북마크 CSV 추출', project: '인스타', status: 'done', activity: { type: 'done', label: '완료 · 확인 필요', since: t }, level: 9 }),
        session({ id: 'codex:demo-1', provider: 'codex', app: 'Codex CLI', title: '결제 모듈 테스트 보강', project: 'shop-api', status: 'tool', model: 'gpt-5.5-codex', activity: { type: 'terminal', label: 'pytest -q', since: t } }),
        session({ id: 'gemini:demo-1', provider: 'gemini', app: 'Gemini CLI', title: '시장 조사 요약', project: 'research', status: 'thinking', model: 'gemini-3-pro', activity: { type: 'think', label: '생각 중…', since: t } }),
        session({ id: 'app:ChatGPT', provider: 'chatgpt', source: 'process', app: 'ChatGPT 데스크톱', kind: 'app', title: 'ChatGPT 데스크톱', status: 'present', activity: { type: 'idle', label: '앱 열림', detail: '대화 내용은 브리지를 연결하면 보여요.' }, level: 1 }),
        session({ id: 'app:Ollama', provider: 'ollama', source: 'process', app: 'Ollama', kind: 'app', title: 'Ollama (로컬 모델)', status: 'present', activity: { type: 'idle', label: '앱 열림' }, level: 1 }),
      ];
      this.feed = [];
      this.agentSeq = 0;
      this.tickN = 0;
      // seed some running agents
      this.startAgent(this.sessions[0], 'frontend-builder', '메인 페이지 컴포넌트 구현');
      this.startAgent(this.sessions[1], 'method-reviewer', '방법론 검토');
      this.startAgent(this.sessions[1], 'stats-checker', '통계 검증');
      this.startAgent(this.sessions[6], 'Explore', 'API 라우터 구조 파악');
    }

    startAgent(s, type, desc) {
      const t = now();
      const kinds = Object.keys(ACTS).filter((k) => k !== 'plan');
      const k = pick(kinds);
      s.agents.push({ id: 'a' + (++this.agentSeq), type, description: desc, status: 'working', activity: { type: k, label: pick(ACTS[k]), since: t }, startedAt: t, lastActive: t, endsAt: t + 9000 + Math.random() * 16000, depth: 1 });
      s.stats.agents++;
      this.log(s, '👥', `${type}에게 위임: ${desc}`);
    }

    log(s, icon, text) { const f = { t: now(), icon, text }; s.feed.push(f); if (s.feed.length > 25) s.feed.shift(); this.feed.unshift({ ...f, sid: s.id, text: `${s.title.slice(0, 18)} · ${text}` }); this.feed.length = Math.min(this.feed.length, 60); }

    setStatus(s, status, act) {
      const t = now();
      const prev = s.status;
      const same = prev === status && s.activity?.label === act.label;
      if (same) return;
      s.status = status;
      s.activity = { ...act, since: t };
      s.lastActive = t;
      if (status === 'tool' || status === 'working') { s.stats.tools++; s.stats.today++; }
      if (prev !== status && status === 'done') this.feed.unshift({ t, icon: '✅', sid: s.id, text: `${s.title.slice(0, 18)} · 작업을 마쳤어요` });
      if (prev !== status && AIO.isUrgent(status)) this.feed.unshift({ t, icon: '🙋', sid: s.id, text: `${s.title.slice(0, 18)} · 대표님 결정이 필요해요` });
      if (act.label && status !== 'idle') this.log(s, AIO.ACT_ICON[act.type] || '•', act.label);
    }

    step() {
      const t = now();
      this.tickN++;
      for (const s of this.sessions) {
        // agents lifecycle
        for (const a of s.agents) {
          if (a.status === 'working') {
            if (t > a.endsAt) { a.status = 'done'; a.activity = { type: 'done', label: '보고 완료' }; a.endedAt = t; this.log(s, '📄', `${a.type} 보고 완료`); }
            else if (Math.random() < 0.3) { const k = pick(['read', 'edit', 'terminal', 'search', 'web', 'think']); a.activity = { type: k, label: pick(ACTS[k]), since: t }; }
          }
        }
        s.agents = s.agents.filter((a) => !(a.status === 'done' && t - a.endedAt > 20000));
        const r = Math.random();
        switch (s.id) {
          case 'claude:demo-harness': {
            const working = s.agents.filter((a) => a.status === 'working').length;
            if (working < 3 && r < 0.25) {
              const free = s.roster.map((x) => x.name).filter((n) => !s.agents.some((a) => a.type === n && a.status === 'working'));
              if (free.length) this.startAgent(s, pick(free), pick(['헤더 구현', '본문 리라이팅', '색상 검토', '반응형 QA', '구조 설계']));
            }
            if (working) this.setStatus(s, 'delegating', { type: 'delegate', label: '팀원 작업 지켜보는 중' });
            else this.setStatus(s, 'thinking', { type: 'think', label: '생각 중…' });
            if (r > 0.9 && s.todos.some((x) => x.status === 'pending')) { const td = s.todos.find((x) => x.status === 'in_progress'); if (td) td.status = 'completed'; const nx = s.todos.find((x) => x.status === 'pending'); if (nx) nx.status = 'in_progress'; }
            break;
          }
          case 'claude:demo-wf': {
            const working = s.agents.filter((a) => a.status === 'working').length;
            if (working < 3 && r < 0.3) { const free = s.roster.map((x) => x.name).filter((n) => !s.agents.some((a) => a.type === n && a.status === 'working')); if (free.length) this.startAgent(s, pick(free), '논문 ' + (1 + Math.floor(Math.random() * 3)) + '번 리뷰'); }
            this.setStatus(s, working ? 'delegating' : 'thinking', working ? { type: 'delegate', label: '워크플로 지휘 중' } : { type: 'think', label: '리뷰 종합 중' });
            break;
          }
          case 'claude:demo-explore': {
            const working = s.agents.filter((a) => a.status === 'working').length;
            if (working < 2 && r < 0.2) this.startAgent(s, pick(['Explore', 'general-purpose']), pick(['테스트 구조 조사', '의존성 조사', 'DB 스키마 파악']));
            if (working) this.setStatus(s, 'delegating', { type: 'delegate', label: '인턴들 기다리는 중' });
            else this.setStatus(s, 'tool', { type: 'read', label: pick(ACTS.read) });
            break;
          }
          case 'claude:demo-ask': {
            if (this.tickN % 40 === 20) this.setStatus(s, 'tool', { type: 'terminal', label: 'robocopy 백업 실행' });
            else if (this.tickN % 40 === 0) this.setStatus(s, 'waiting_input', { type: 'ask', label: '대표님 결정 필요', detail: '원시 출력(22GB)도 백업에 넣을까요?' });
            break;
          }
          case 'claude:demo-sleep': case 'app:ChatGPT': case 'app:Ollama': case 'claude:demo-pause2': case 'claude:demo-stop': case 'claude:demo-oldteam': break;
          case 'claude:demo-lounge': {
            if (this.tickN % 50 === 25) this.setStatus(s, 'tool', { type: 'edit', label: 'figure3.py 수정' });
            else if (this.tickN % 50 === 40) this.setStatus(s, 'done', { type: 'done', label: '완료 · 확인 필요' });
            else if (this.tickN % 50 === 0) this.setStatus(s, 'idle', { type: 'idle', label: '휴식 중' });
            break;
          }
          case 'claude:demo-done': {
            if (this.tickN % 30 === 10) this.setStatus(s, 'tool', { type: 'terminal', label: 'python export.py' });
            else if (this.tickN % 30 === 18) this.setStatus(s, 'done', { type: 'done', label: '완료 · 확인 필요' });
            break;
          }
          case 'codex:demo-1': {
            if (this.tickN % 24 === 12) this.setStatus(s, 'waiting_permission', { type: 'ask', label: '명령 실행 승인 대기', detail: 'rm -rf build/' });
            else if (this.tickN % 24 > 16 || this.tickN % 24 < 12) { const k = pick(['terminal', 'edit', 'read', 'terminal']); this.setStatus(s, 'tool', { type: k, label: pick(ACTS[k]) }); }
            break;
          }
          case 'gemini:demo-1': {
            if (r < 0.4) { const k = pick(['web', 'think', 'read', 'web']); this.setStatus(s, k === 'think' ? 'thinking' : 'tool', { type: k, label: pick(ACTS[k]) }); }
            break;
          }
          default: {
            if (r < 0.35) {
              const k = pick(['read', 'edit', 'terminal', 'search', 'think', 'plan']);
              this.setStatus(s, k === 'think' ? 'thinking' : 'tool', { type: k, label: pick(ACTS[k]) });
            }
          }
        }
      }
      return { ts: t, host: 'DEMO', mode: 'demo', adapters: ['demo'], sessions: JSON.parse(JSON.stringify(this.sessions)), feed: this.feed.slice(0, 60) };
    }
  }

  AIO.Demo = Demo;
})();
