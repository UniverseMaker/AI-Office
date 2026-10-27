// Provider-agnostic mapping: tool call -> office activity.
import { shorten, baseName } from './util.mjs';

export const ICON = {
  read: '📖', edit: '✍️', terminal: '⌨️', search: '🔎', web: '🌐', think: '💭',
  delegate: '👥', meeting: '💬', plan: '📋', ask: '🙋', skill: '🧰', publish: '🚀',
  tool: '🔧', talk: '💬', idle: '☕', done: '✅', error: '⚠️', prompt: '📨', permission: '✋',
};

const BROWSER_KO = {
  navigate: '페이지 이동', computer: '화면 조작', screenshot: '스크린샷', javascript_tool: '페이지 스크립트', get_page_text: '페이지 읽기',
  read_page: '페이지 구조 읽기', find: '요소 찾기', form_input: '폼 입력', preview_start: '미리보기 열기', resize_window: '창 크기 조절',
  read_console_messages: '콘솔 확인', read_network_requests: '네트워크 확인', tabs_create: '새 탭', tabs_context: '탭 확인',
};

const pick = (o, ...keys) => { for (const k of keys) if (o && o[k] != null && o[k] !== '') return o[k]; return ''; };

/**
 * @param {string} name tool name (any provider)
 * @param {object} input tool arguments
 * @returns {{type:string,label:string,detail:string}}
 */
export function classifyTool(name = '', input = {}) {
  const n = String(name);
  const low = n.toLowerCase();
  if (typeof input === 'string') { try { input = JSON.parse(input); } catch { input = { raw: input }; } }
  input = input || {};
  const file = baseName(pick(input, 'file_path', 'path', 'notebook_path', 'filename', 'absolute_path', 'file'));

  // --- Claude Code + generic names ---
  if (/^(read|view|notebookread|read_file|readfile|read_many_files|cat)$/i.test(n))
    return { type: 'read', label: `${file || '파일'} 읽는 중`, detail: pick(input, 'file_path', 'path') };
  if (/^(edit|multiedit|write|notebookedit|write_file|replace|edit_file|create_file|apply_patch|str_replace.*)$/i.test(n) || low.includes('apply_patch'))
    return { type: 'edit', label: `${file || patchTarget(input) || '코드'} 수정`, detail: pick(input, 'file_path', 'path') || shorten(input.raw || input.input, 80) };
  if (/^(bash|powershell|shell|run_shell_command|exec_command|local_shell|container\.exec|terminal|bashoutput|monitor|killshell|taskstop)$/i.test(n) || low.endsWith('run_in_terminal')) {
    let cmd = pick(input, 'command', 'cmd', 'description');
    if (Array.isArray(cmd)) cmd = cmd.join(' ');
    cmd = String(cmd).replace(/^(bash|powershell)(\.exe)?\s+-(lc|c|command)\s+/i, '');
    return { type: 'terminal', label: shorten(cmd || '명령 실행', 40), detail: shorten(cmd, 200) };
  }
  if (/^(grep|glob|ls|list_directory|search_file_content|glob_tool|toolsearch|find|search_files|codebase_search|file_search)$/i.test(n))
    return { type: 'search', label: `"${shorten(pick(input, 'pattern', 'query', 'path'), 24)}" 찾는 중`, detail: pick(input, 'pattern', 'query') };
  if (low.startsWith('mcp__') && /browser|chrome|playwright|puppeteer/i.test(low)) {
    const tool = n.split('__').slice(2).join('_');
    const ko = BROWSER_KO[tool] || tool.replace(/_/g, ' ');
    let host = ''; try { host = new URL(pick(input, 'url')).host; } catch {}
    if (tool === 'browser_batch' && Array.isArray(input.actions)) return { type: 'web', label: `브라우저 연속 조작 ${input.actions.length}단계`, detail: '' };
    return { type: 'web', label: host ? `${ko} · ${host}` : ko, detail: shorten(pick(input, 'url', 'text', 'query', 'action_summary', 'action'), 160) };
  }
  if (/^(webfetch|websearch|web_search|google_web_search|web_fetch|browser.*|fetch)$/i.test(n) || /navigate|playwright|puppeteer/i.test(low)) {
    const u = pick(input, 'url', 'query', 'q');
    let host = u; try { host = new URL(u).host; } catch {}
    return { type: 'web', label: shorten(host || '웹 탐색', 32), detail: shorten(u, 200) };
  }
  if (/^(agent|task|spawn_agent|delegate|subagent|dispatch_agent)$/i.test(n))
    return { type: 'delegate', label: `${pick(input, 'subagent_type', 'agent', 'name') || '팀원'}에게 위임`, detail: shorten(pick(input, 'description', 'prompt', 'message'), 120) };
  if (/^workflow$/i.test(n)) return { type: 'delegate', label: '워크플로 지휘 중', detail: shorten(pick(input, 'name', 'description'), 120) };
  if (/^(sendmessage|send_message|teamcreate|message_agent)$/i.test(n))
    return { type: 'meeting', label: `${pick(input, 'to', 'recipient') || '팀원'}과 대화`, detail: shorten(pick(input, 'message', 'content'), 120) };
  if (/^(taskcreate|taskupdate|todowrite|todo_write|update_plan|tasklist|taskget|write_todos)$/i.test(n))
    return { type: 'plan', label: shorten(pick(input, 'subject', 'activeForm') || '할 일 정리', 30), detail: shorten(pick(input, 'description', 'explanation'), 120) };
  if (/^(askuserquestion|exitplanmode|request_user_input|ask_user)$/i.test(n)) {
    const q = input.questions?.[0]?.question || pick(input, 'question', 'plan');
    return { type: 'ask', label: '대표님 결정 필요', detail: shorten(q, 160) };
  }
  if (/^skill$/i.test(n)) return { type: 'skill', label: `${pick(input, 'skill') || '스킬'} 사용`, detail: shorten(pick(input, 'args'), 120) };
  if (/^artifact$/i.test(n)) return { type: 'publish', label: '결과물 게시', detail: shorten(pick(input, 'file_path', 'url'), 120) };
  if (/^(sleep|wait|schedulewakeup)$/i.test(n)) return { type: 'think', label: '잠시 대기', detail: '' };
  if (low.startsWith('mcp__')) {
    const parts = n.split('__');
    const server = parts[1] || 'mcp';
    const tool = parts.slice(2).join('_');
    if (/browser|chrome/i.test(server)) return { type: 'web', label: shorten(tool.replace(/_/g, ' '), 28), detail: shorten(pick(input, 'url', 'text', 'query'), 160) };
    return { type: 'tool', label: shorten(`${tool || server}`, 28), detail: server };
  }
  return { type: 'tool', label: shorten(n || '도구 사용', 28), detail: shorten(JSON.stringify(input), 160) };
}

function patchTarget(input) {
  const s = String(input.raw || input.input || input.patch || '');
  const m = s.match(/\*\*\* (?:Update|Add|Delete) File: (.+)/);
  return m ? baseName(m[1].trim()) : '';
}

export function levelFrom(n) {
  return Math.max(1, Math.floor(Math.sqrt((n || 0) / 3)) + 1);
}
