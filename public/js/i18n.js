// Korean / English UI language. Korean is the source text everywhere; English comes from the dictionary below.
//   AIO.lang                 -> 'ko' | 'en' (persisted in localStorage['aio.lang'])
//   AIO.setLang(l)           -> switch, re-apply static [data-i18n*] text, fire window 'aio:lang' (detail = l)
//   AIO.tr(ko, ...args)      -> English for ko when lang is 'en' (exact match, then regex patterns), else ko.
//                               {0} {1} … in the string are filled from args (both languages).
//   AIO.i18n.add(dict)       -> merge more { ko: en } entries   ·  AIO.i18n.addPattern(re, rep) -> more regex rules
//   AIO.i18n.act(label,type) -> translate a server/demo activity label (type-aware patterns)
//   AIO.i18n.feed(text,kind) -> translate a feed line "<session title> · <event>" (title is never translated)
//   AIO.i18n.apply(root)     -> re-apply static translations under root (default: document)
window.AIO = window.AIO || {};
(function () {
  const KEY = 'aio.lang';
  let lang = 'ko';
  try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'ko') lang = v; } catch {}

  const dict = Object.create(null);
  const patterns = []; // [RegExp, string | fn]
  const add = (d) => { Object.assign(dict, d); };
  const addPattern = (re, rep) => { patterns.push([re, rep]); };
  const fill = (s, args) => (args.length ? s.replace(/\{(\d+)\}/g, (m, i) => (args[i] ?? '')) : s);

  function lookup(ko) {
    const hit = dict[ko];
    if (hit !== undefined) return hit;
    for (const [re, rep] of patterns) { if (re.test(ko)) return ko.replace(re, rep); }
    return undefined;
  }
  function tr(ko, ...args) {
    if (ko == null) return '';
    ko = String(ko);
    if (lang !== 'en') return fill(ko, args);
    const en = lookup(ko);
    return fill(en === undefined ? ko : en, args).replace(/\bjust now ago\b|\bfor just now\b/g, 'just now');
  }

  /** Korean duration ("2시간 5분", "3분", "12초", "1일", "방금") -> English ("2h 5m", "3m", "12s", "1d", "just now") */
  const enDur = (s) => String(s).replace(/방금/g, 'just now').replace(/(\d+)\s*일/g, '$1d').replace(/(\d+)\s*시간/g, '$1h').replace(/(\d+)\s*분/g, '$1m').replace(/(\d+)\s*초/g, '$1s');
  const DUR = '((?:\\d+(?:일|시간|분|초)\\s*)+|방금)';
  const durRe = new RegExp('^' + DUR + '$');

  // ---------------------------------------------------------------- generic dynamic patterns
  addPattern(/^(.+?) ×(\d+)$/, (m, a, n) => `${tr(a)} ×${n}`);
  addPattern(durRe, (m) => enDur(m));
  addPattern(new RegExp('^' + DUR + ' 전$'), (m, d) => (d === '방금' ? 'just now' : `${enDur(d)} ago`));
  addPattern(new RegExp('^' + DUR + '째$'), (m, d) => (d === '방금' ? 'just now' : `for ${enDur(d)}`));
  addPattern(/^(\d+)건$/, '$1 items');
  addPattern(/^(\d+)회$/, '$1×');
  addPattern(/^(\d+)명$/, '$1 people');
  addPattern(/^(\d+)개$/, '$1');
  addPattern(/^(.+) 데스크톱$/, '$1 Desktop');

  // ---------------------------------------------------------------- dictionary
  add({
    // brand / static HTML
    'AI 인공지능 연구원': 'AI Research Institute',
    'AI 연구원': 'AI Institute',
    'AI 세션 캠퍼스': 'AI session campus',
    '데모 캠퍼스': 'Demo campus',
    '{0} · AI 세션 캠퍼스': '{0} · AI session campus',
    '연결 중…': 'Connecting…',
    '재연결 중…': 'Reconnecting…',
    '전체 보기 (F)': 'Fit view (F)',
    '인사이트 대시보드 (I)': 'Insights dashboard (I)',
    '설정 — 표시·알림 (T)': 'Settings — display & alerts (T)',
    '세션 패널 (S)': 'Session panel (S)',
    '설정': 'Settings',
    '로그인': 'Log in',
    '닫기': 'Close',
    '화면 표시': 'Display',
    '데모 모드': 'Demo mode',
    '— 수집기가 꺼져 있어 가상 세션을 보여주고 있어요. 백엔드가 켜지면 이 PC의 실제 AI 세션이 출근합니다.': '— the collector is off, so simulated sessions are shown. Once the backend runs, the real AI sessions on this PC clock in.',
    '대표 결정 필요': 'Needs your decision',
    '지금 일하는 중': 'Working now',
    '전체 세션': 'All sessions',
    '사무실 소식': 'Campus news',
    '소식': 'News',
    '아직 출근한 AI가 없어요': 'No AI has clocked in yet',
    'Claude Code · Codex · Gemini CLI 세션을 열면 자리에 앉아요': 'Open a Claude Code · Codex · Gemini CLI session and it takes a seat',
    '한국어로 보기': '한국어로 보기',
    'Switch to English': 'Switch to English',

    // status labels (providers.js)
    '작업중': 'Working', '생각중': 'Thinking', '지휘중': 'Directing', '결정 필요': 'Needs decision', '승인 대기': 'Awaiting approval',
    '완료': 'Done', '휴식': 'Resting', '졸음': 'Dozing', '접속': 'Online', '대기': 'Standby',

    // sidebar / chips / ticker (ui.js)
    '하네스 팀': 'Harness teams', '팀원·인턴 출동': 'Members & interns out',
    '지금은 결정할 일이 없어요 🎉': 'Nothing to decide right now 🎉',
    '모두 쉬는 중이에요 ☕': 'Everyone is on a break ☕',
    '전체': 'All', '하네스': 'Harness', '앱': 'App', '단일 세션': 'Single session', '세션': 'Session',
    '세션이 없어요': 'No sessions',
    '아직 소식이 없어요': 'No news yet',
    '사무실이 조용해요…': 'All quiet on campus…',
    '대표님 결정이 필요해요': 'Your decision is needed',
    '{0}째': 'for {0}',
    '{0} 전': '{0} ago',
    '이 세션은 퇴근했어요 👋': 'This session has clocked out 👋',
    '인턴': 'Intern', '하네스 팀원': 'Harness member', '인턴 (서브에이전트)': 'Intern (subagent)',
    '작업 중': 'Working', '대기 중': 'Standing by',
    '누적 호출': 'Total runs', '{0}회 · Lv.{1}': '{0} runs · Lv.{1}',
    '시작': 'Started', '방식': 'Mode', '백그라운드': 'Background', '포그라운드': 'Foreground', '깊이 {0}': 'depth {0}', '소속': 'Belongs to',
    '오늘 처리': 'Today', '레벨': 'Level', '출동 중': 'Out now', '근무': 'On duty',
    '🧶 팀 ({0})': '🧶 Team ({0})',
    '이 앱은 실행 여부만 감지돼요. 브리지(유저스크립트·이벤트 API)를 연결하면 대화 상태까지 보여요.': 'Only whether this app is running can be detected. Connect a bridge (userscript / event API) to see its conversation state too.',
    '🔒 로그인하면 <b>대화 내용 · 진행 요약 · 토큰/시간 인사이트 · 팀 위임 분석</b>까지 볼 수 있어요': '🔒 Log in to see <b>conversations · progress summaries · token/time insights · delegation analysis</b>',
    '이름표': 'Name tags', '말풍선': 'Speech bubbles', '위임선(털실)': 'Delegation lines (yarn)',
    '결정 필요 알림·소리': 'Decision alerts & sound', '사이드바': 'Sidebar', '언어': 'Language',
    '관리자 계정이 없어요': 'No admin account yet',
    '관리자 계정은 이 PC에서만 설정해요.': 'The admin account can only be set up on this PC.',
    '관리자 로그인': 'Admin login',
    '로그인하면 대화 내용·진행 요약·인사이트가 보여요.': 'Log in to see conversations, progress summaries and insights.',
    '아이디': 'User ID', '비밀번호': 'Password',
    '서버에 연결하지 못했어요': 'Could not reach the server',
    '잠시 잠겼어요. {0}초 뒤에 다시 해주세요': 'Temporarily locked. Try again in {0}s',
    '로그인 실패': 'Login failed',
    '아이디 또는 비밀번호가 달라요': 'Wrong user ID or password',
    '관리자 계정이 아직 설정되지 않았어요 (node server/set-admin.mjs)': 'No admin account is set up yet (node server/set-admin.mjs)',
    '관리자 로그인됨': 'Logged in as admin',
    '상세 정보가 보이는 상태예요. 화면 공유 전에는 로그아웃하세요.': 'Details are visible. Log out before sharing your screen.',
    '로그아웃': 'Log out',
    '👤 로그인됨': '👤 Logged in', '🔒 로그인': '🔒 Log in', '로그인됨': 'Logged in',
    '{0}층 + 옥상 · ': '{0} floors + rooftop · ',
    '👥 {0}명': '👥 {0}',
    '클릭하면 안으로 들어가요': 'Click to go inside',
    '🔒 로그인하면 자세히': '🔒 Log in for details',

    // jail / vault (detail.js + ui.js)
    '🚔 유치장 보내기': '🚔 Send to jail', '🏦 금고 보관': '🏦 Store in vault', '🔓 석방 / 꺼내기': '🔓 Release / take out',
    '🚔 유치장 수감 중': '🚔 In jail', '🏦 금고 보관 중': '🏦 In the vault', '⏸️ 일시정지': '⏸️ Paused', '🏭 중단': '🏭 Stopped',
    '위치': 'Place', '옮기는 중…': 'Moving…', '옮기지 못했어요: {0}': 'Could not move it: {0}',

    // detail panel (detail.js)
    '읽기': 'Reads', '수정': 'Edits', '명령': 'Commands', '검색': 'Searches', '웹': 'Web', '생각': 'Thinking', '위임': 'Delegation',
    '대화': 'Chat', '계획': 'Planning', '질문': 'Questions', '스킬': 'Skills', '게시': 'Publishing', '도구': 'Tools', '답변': 'Replies',
    '더 보기': 'more',
    '🧶 대화 기록을 풀어보는 중…': '🧶 Unspooling the conversation…',
    '개요': 'Overview', '진행': 'Progress', '인사이트': 'Insights', '팀': 'Team', '서브에이전트': 'Subagents',
    '📚 전체 기록 분석 중… {0}%': '📚 Analyzing full history… {0}%',
    '🔒 로그인이 필요해요.': '🔒 Login required.',
    '로그인하면 대화 내용·진행 요약·인사이트를 볼 수 있어요.': 'Log in to see conversations, progress summaries and insights.',
    '🔎 아직 상세 기록을 찾지 못했어요.': '🔎 No detailed history found yet.',
    '앱 존재만 감지된 세션이거나 기록이 없는 도구예요.': 'Either only the app was detected, or this tool keeps no history.',
    '⚠️ 상세 정보를 불러오지 못했어요': '⚠️ Could not load the details',
    '🧾 진행 상황 요약': '🧾 Progress summary',
    '아직 요약할 만큼 기록이 쌓이지 않았어요.': 'Not enough history to summarize yet.',
    '✨ AI가 요약 중… (로컬 Claude CLI)': '✨ AI is summarizing… (local Claude CLI)',
    '✨ AI 요약': '✨ AI summary',
    '✨ AI로 자세히 요약하기': '✨ Detailed AI summary',
    '오늘 출력 토큰': 'Output tokens today', '입력 {0}': 'input {0}', '누적 출력 토큰': 'Total output tokens', '캐시 {0}': 'cache {0}',
    '평균 턴': 'Avg turn', '{0}턴': '{0} turns', '오류율': 'Error rate', '대표 대기': 'Waiting on you', '{0}회 평균': 'avg of {0}',
    '결정 응답': 'Decision reply', '{0}회': '{0}×',
    '💡 인사이트': '💡 Insights', '📋 할 일 {0}/{1}': '📋 To-dos {0}/{1}', '📨 마지막 요청': '📨 Last request', '🗂️ 정보': '🗂️ Info',
    '프로젝트': 'Project', '경로': 'Path', '모델': 'Model', '권한': 'Permissions',
    '대화만': 'Chat only', '도구만': 'Tools only', '최근 {0}개': 'Last {0}', '아직 대화가 없어요': 'No conversation yet',
    '▶️ 지금 턴': '▶️ Current turn',
    '시작 {0} · {1}째 · 도구 {2} · 수정 {3}': 'Started {0} · for {1} · tools {2} · edits {3}',
    '🕘 최근 턴': '🕘 Recent turns',
    '{0} · {1} · 도구 {2} · 수정 {3} · {4}': '{0} · {1} · tools {2} · edits {3} · {4}',
    '진행중': 'Running', '중단': 'Interrupted',
    '📁 손댄 파일': '📁 Files touched', '파일': 'File', '마지막': 'Last',
    '⌨️ 최근 명령': '⌨️ Recent commands', '⚠️ 오류': '⚠️ Errors', '진행 기록이 아직 없어요': 'No progress recorded yet',
    '🧰 무슨 일을 했나 (도구 호출)': '🧰 What it did (tool calls)', '⏱️ 어디에 시간을 썼나': '⏱️ Where the time went',
    '🕐 시간대별 활동': '🕐 Activity by hour', '📅 최근 14일': '📅 Last 14 days', '🔤 토큰 구성 (누적)': '🔤 Token mix (total)',
    '캐시 읽기': 'Cache read', '입력': 'Input', '캐시 쓰기': 'Cache write', '출력': 'Output',
    '👥 위임 균형': '👥 Delegation balance', '리더 직접 처리': 'Handled by the lead', '리더 {0} · 팀원 {1}': 'lead {0} · members {1}',
    '{0}회 · 도구 {1}': '{0} runs · tools {1}', '😴 최근 7일 호출 0회: {0}': '😴 No calls in 7 days: {0}',
    '🧠 사용 모델': '🧠 Models used', '🔥 가장 많이 고친 파일': '🔥 Most edited files',
    '인사이트를 만들 데이터가 아직 부족해요': 'Not enough data for insights yet',
    '🧶 팀 명부': '🧶 Team roster', '{0} · {1}회 · Lv.{2}': '{0} · {1} runs · Lv.{2}',
    '🎒 최근 서브에이전트 ({0})': '🎒 Recent subagents ({0})', '{0} · 도구 {1} · {2}': '{0} · tools {1} · {2}',
    '서브에이전트 기록이 없어요': 'No subagent history',
    'Claude CLI를 찾지 못해 AI 요약을 쓸 수 없어요.': 'Claude CLI was not found, so AI summaries are unavailable.',
    'Claude CLI 로그인이 필요해요. 터미널에서 claude 를 한 번 실행해 /login 해주세요. (위의 기본 요약은 그대로 쓸 수 있어요)': 'Claude CLI needs a login. Run claude once in a terminal and /login. (The basic summary above still works.)',
    '다른 요약을 만드는 중이에요. 잠시 후 다시 눌러주세요.': 'Another summary is in progress. Try again in a moment.',
    '요약 실패: {0}': 'Summary failed: {0}',
    '이 세션은 기록 파일이 없어서 AI 요약을 만들 수 없어요': 'This session has no log file, so no AI summary can be made',
    '세션을 찾을 수 없어요': 'Session not found',
    '📊 사무실 전체를 집계하는 중…': '📊 Tallying the whole campus…',
    '📊 오늘의 AI 사무실 인사이트': "📊 Today's AI insights",
    '기록 분석 중 {0}%': 'Analyzing history {0}%',
    '출근 세션': 'Active sessions', '오늘 도구 호출': 'Tool calls today', '요청': 'Requests', '출력 토큰': 'Output tokens', '결정 응답 평균': 'Avg decision reply',
    '💡 사무실 점검 (고문 AI 한 줄)': '💡 Check-up (advisor AI one-liners)',
    '🕐 오늘 시간대별 처리량': '🕐 Throughput by hour today', '🏆 오늘 가장 바쁜 직원': '🏆 Busiest today',
    '📁 프로젝트별': '📁 By project', '🤖 AI별': '🤖 By AI', '🧶 하네스 팀 위임 균형': '🧶 Harness delegation balance',
    '리더 {0}': 'lead {0}', '팀원 {0}명': '{0} members', ' · 😴 쉬는 팀원 {0}명 ({1})': ' · 😴 {0} idle ({1})',
    '🙋 지금 결정 기다리는 중': '🙋 Waiting for your decision',

    // activity labels (server adapters / redact GENERIC / demo)
    '생각 중…': 'Thinking…', '작업 준비': 'Getting ready', '보고 완료': 'Reported back', '팀원 작업 지켜보는 중': 'Watching the team work',
    '답변 정리 중': 'Writing the reply', '완료 · 확인 필요': 'Done · needs review', '휴식 중': 'Resting', '졸고 있음': 'Dozing',
    '실행 승인 대기': 'Awaiting run approval', '앱 열림': 'App open', '워크플로 지휘 중': 'Conducting a workflow',
    '대표님 결정 필요': 'Needs your decision', '결과물 게시': 'Publishing results', '잠시 대기': 'Pausing briefly',
    '명령 실행': 'Running a command', '웹 탐색': 'Browsing the web', '할 일 정리': 'Organizing to-dos', '도구 사용': 'Using a tool',
    '작업 계획 세우는 중': 'Planning the work', '리뷰 종합 중': 'Synthesizing reviews', '인턴들 기다리는 중': 'Waiting on interns',
    '명령 실행 승인 대기': 'Awaiting command approval', '팀원': 'a teammate', '코드': 'code',
    '파일 읽는 중': 'Reading a file', '코드 수정 중': 'Editing code', '명령 실행 중': 'Running a command', '검색 중': 'Searching',
    '웹 탐색 중': 'Browsing the web', '팀원에게 위임': 'Delegating to a teammate', '팀 대화 중': 'Team chat', '스킬 사용': 'Using a skill',
    '도구 사용 중': 'Using a tool', '새 요청': 'New request', '오류': 'Error', '알림': 'Notice', '출근': 'Clocked in', '퇴근': 'Clocked out',
    '결정이 필요해요': 'Needs a decision', '승인을 기다려요': 'Awaiting approval', '활동': 'Activity',
    '작업을 마쳤어요': 'Finished the job', '세션 종료 · 퇴근': 'Session ended · clocked out',
    '페이지 이동': 'Navigating', '화면 조작': 'Using the screen', '스크린샷': 'Screenshot', '페이지 스크립트': 'Page script',
    '페이지 읽기': 'Reading the page', '페이지 구조 읽기': 'Reading page structure', '요소 찾기': 'Finding elements', '폼 입력': 'Filling a form',
    '미리보기 열기': 'Opening preview', '창 크기 조절': 'Resizing window', '콘솔 확인': 'Checking console', '네트워크 확인': 'Checking network',
    '새 탭': 'New tab', '탭 확인': 'Checking tabs',
  });

  // ---------------------------------------------------------------- insight tips (server analyzer/details + demo)
  addPattern(/^리더가 작업의 (\d+)%를 직접 처리하고 있어요 — 팀원에게 더 나눠보세요$/, 'The lead is doing $1% of the work itself — hand more to the team');
  addPattern(/^(.+): 리더가 작업의 (\d+)%를 직접 처리 중 — 팀원에게 더 나눠보세요$/, '$1: the lead is doing $2% itself — hand more to the team');
  addPattern(/^블로그 리뉴얼 하네스: 리더가 작업의 (\d+)%를 직접 처리하고 있어요 — 팀원에게 더 나눠보세요$/, 'Blog-renewal harness: the lead is doing $1% itself — hand more to the team');
  addPattern(/^대기 팀원 (\d+)명: 최근 7일 호출 0회(.*)$/, (m, n, rest) => `${n} idle member${n === '1' ? '' : 's'}: no calls in 7 days${rest.replace(/ 외\)$/, ' …)')}`);
  addPattern(/^쉬는 팀원 (\d+)명: (.+) \(최근 7일 호출 0회\)$/, '$1 idle member(s): $2 (no calls in 7 days)');
  addPattern(/^쉬는 팀원: (.+) \(최근 7일 호출 0회\)$/, 'Idle members: $1 (no calls in 7 days)');
  addPattern(/^대표 결정 평균 응답 (\S+(?: \d+분)?)(?: \((\d+)회\))?(.*)$/, (m, d, n, rest) => `Avg decision reply ${enDur(d)}${n ? ` (${n}×)` : ''}${rest === ' — 아침 보고 시간에 몰아서 처리하면 대기가 줄어요' ? ' — batching decisions at a morning check-in cuts waiting' : rest}`);
  addPattern(/^답변이 끝난 뒤 다음 요청까지 평균 (.+) 기다렸어요$/, (m, d) => `On average ${enDur(d)} passed between a reply and your next request`);
  addPattern(/^오류율 (\d+)%(?: — (.+) 실패가 잦아요)?$/, (m, p, ty) => `Error rate ${p}%${ty ? ` — frequent ${tr(ty).toLowerCase()} failures` : ''}`);
  addPattern(/^오류율 (\d+)% — 린트 실패가 반복돼요\. 같은 실수 두 번이면 규칙 한 줄을 추가해 보세요$/, 'Error rate $1% — lint keeps failing. If a mistake repeats, add a one-line rule');
  addPattern(/^(?:오늘 )?가장 많이 고친 파일: (.+) \((\d+)회\)$/, 'Most edited file: $1 ($2 edits)');
  addPattern(/^오늘 출력 토큰 (.+)$/, 'Output tokens today: $1');
  addPattern(/^캐시 재사용률 (\d+)% — 긴 대화를 효율적으로 이어가고 있어요$/, 'Cache reuse $1% — long conversations are being continued efficiently');
  addPattern(/^가장 오래 걸린 요청 (.+) — 큰 일은 단계별로 나눠 맡기면 확인이 쉬워요$/, (m, d) => `Longest request took ${enDur(d)} — splitting big jobs into steps makes review easier`);
  addPattern(/^대표님 결정·승인을 기다리는 세션 (\d+)개 — 가장 오래된 건 (.+)째예요$/, (m, n, d) => `${n} session(s) waiting for your decision/approval — the oldest for ${enDur(d)}`);
  addPattern(/^끝나고 확인을 기다리는 세션 (\d+)개$/, '$1 finished session(s) waiting for review');
  addPattern(/^오늘 작업의 (\d+)%가 "(.+)" 한 세션에 몰려 있어요$/, '$1% of today\'s work is concentrated in one session: "$2"');
  addPattern(/^오늘 가장 바쁜 시간: (\d+)시 \(도구 (\d+)회\)$/, 'Busiest hour today: $1:00 ($2 tool calls)');
  addPattern(/^너무 많이 틀렸어요\. (\d+)초 후에 다시 시도하세요$/, 'Too many wrong attempts. Try again in $1s');

  // ---------------------------------------------------------------- activity labels (type-aware; user data inside is kept verbatim)
  const ACT_RULES = [
    ['read', /^(.+) 읽는 중$/, (m, a) => `Reading ${a === '파일' ? 'a file' : a}`],
    ['search', /^"(.*)" 찾는 중$/, 'Searching "$1"'],
    ['edit', /^(.+) 수정$/, (m, a) => `Editing ${a === '코드' ? 'code' : a}`],
    ['delegate', /^(.+)에게 위임$/, (m, a) => `Delegating to ${tr(a)}`],
    ['delegate', /^(.+)에게 위임: (.*)$/, (m, a, b) => `Delegated to ${tr(a)}: ${b}`],
    ['meeting', /^(.+)[과와] 대화$/, (m, a) => `Talking with ${tr(a)}`],
    ['skill', /^(.+) 사용$/, (m, a) => (a === '스킬' ? 'Using a skill' : `Using ${a}`)],
    ['web', /^브라우저 연속 조작 (\d+)단계$/, 'Browser sequence · $1 steps'],
    ['web', /^(.+) · (.+)$/, (m, a, b) => `${tr(a)} · ${b}`],
    ['done', /^(.+) 보고 완료$/, '$1 reported back'],
    ['error', /^(.+) 실패$/, (m, a) => `${act(a)} failed`],
    ['prompt', /^요청: (.*)$/, 'Request: $1'],
  ];
  function act(label, type) {
    if (label == null || label === '') return '';
    label = String(label);
    if (lang !== 'en') return label;
    const hit = dict[label];
    if (hit !== undefined) return hit;
    // rules for this type first; then the rules whose Korean suffix is distinctive enough to apply to any type
    const SAFE = ['read', 'search', 'delegate', 'done', 'error', 'prompt'];
    for (const [t, re, rep] of ACT_RULES) if ((!type || t === type) && re.test(label)) return label.replace(re, rep);
    if (type) for (const [t, re, rep] of ACT_RULES) if (SAFE.includes(t) && re.test(label)) return label.replace(re, rep);
    return label;
  }
  /** "<session title> · <event>[ ×n]" -> only the event part is translated; "<title> 출근" too */
  function feed(text, kind) {
    text = String(text ?? '');
    if (lang !== 'en') return text;
    if (dict[text] !== undefined) return dict[text];
    const mult = text.match(/ ×\d+$/);
    let body = mult ? text.slice(0, -mult[0].length) : text;
    const tail = mult ? mult[0] : '';
    if (kind === 'enter' || / 출근$/.test(body)) { const m = body.match(/^(.*) 출근$/); if (m) return `${m[1]} clocked in${tail}`; }
    const i = body.lastIndexOf(' · ');
    if (i < 0) return act(body, kind) + tail;
    const head = body.slice(0, i), ev = body.slice(i + 3);
    // "세션 종료 · 퇴근" style exact pairs, else translate the event after the title
    if (dict[ev] !== undefined) return `${head} · ${dict[ev]}${tail}`;
    return `${head} · ${act(ev, kind)}${tail}`;
  }

  // ---------------------------------------------------------------- static HTML
  function apply(root = document) {
    const each = (attr, fn) => root.querySelectorAll('[' + attr + ']').forEach((el) => {
      const src = el.getAttribute(attr) || null;
      fn(el, src);
    });
    // the Korean source text is captured once, on first apply, so it can be restored when switching back
    each('data-i18n', (el, src) => { if (!src) { src = el.textContent.trim(); el.setAttribute('data-i18n', src); } el.textContent = tr(src); });
    each('data-i18n-html', (el, src) => { if (!src) { src = el.innerHTML.trim(); el.setAttribute('data-i18n-html', src); } el.innerHTML = tr(src); });
    for (const a of ['title', 'placeholder', 'aria-label']) {
      each('data-i18n-' + a, (el, src) => { if (!src) { src = el.getAttribute(a) || ''; el.setAttribute('data-i18n-' + a, src); } el.setAttribute(a, tr(src)); });
    }
    if (root === document) {
      document.title = tr('AI 인공지능 연구원');
      const b = document.getElementById('btnLang');
      if (b) { b.textContent = lang === 'en' ? '한' : 'EN'; b.title = lang === 'en' ? '한국어로 보기' : 'Switch to English'; b.setAttribute('aria-label', b.title); }
    }
  }

  function setLang(l) {
    l = l === 'en' ? 'en' : 'ko';
    lang = l;
    try { localStorage.setItem(KEY, l); } catch {}
    document.documentElement.lang = l;
    apply();
    window.dispatchEvent(new CustomEvent('aio:lang', { detail: l }));
  }

  Object.defineProperty(AIO, 'lang', { get: () => lang, configurable: true });
  AIO.setLang = setLang;
  AIO.tr = tr;
  AIO.i18n = { add, addPattern, act, feed, apply, enDur, dict };

  document.documentElement.lang = lang;
  const boot = () => {
    apply();
    const b = document.getElementById('btnLang');
    if (b && !b.dataset.bound) { b.dataset.bound = '1'; b.addEventListener('click', () => setLang(lang === 'en' ? 'ko' : 'en')); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
