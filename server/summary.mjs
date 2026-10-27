// On-demand AI progress summary via the local Claude Code CLI (`claude -p`), one job at a time.
// Runs in data/summary-runner (hidden from the office) without saving a session.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SUMMARY_RUNNER_DIR, statSafe, shorten, baseName, now } from './util.mjs';

const TIMEOUT = 120e3;
const MAX_DIGEST = 12000;
const CANDIDATES = [
  path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude'),
  path.join(os.homedir(), '.local', 'bin', 'claude'),
];
const BASE_ARGS = ['-p', '--no-session-persistence', '--tools', '', '--strict-mcp-config', '--disable-slash-commands'];

const PROMPT = `아래는 한 AI 코딩 세션의 작업 기록을 줄인 것이다. 도구를 쓰지 말고 텍스트로만 답하라. 기록에 없는 내용은 추측하지 마라.
1) "진행 요약" 제목 아래, 이 세션이 무엇을 요청받았고 지금 어디까지 진행됐는지 한국어로 5~8줄.
2) "다음 단계 제안" 제목 아래, 바로 해볼 만한 구체적인 다음 단계 3개를 번호로.
마크다운은 제목과 목록 정도만 쓴다.

--- 기록 ---
`;

const ROLE = { user: '대표', assistant: 'AI', tool: '도구', result: '결과', system: '시스템' };

export function buildDigest(s, an) {
  const head = [];
  head.push(`세션: ${s.title || ''} · 프로젝트: ${s.project || ''} · 모델: ${s.model || an.model || ''} · 상태: ${s.status}`);
  if (s.activity?.label) head.push(`지금 하는 일: ${s.activity.label}${s.activity.detail ? ' — ' + shorten(s.activity.detail, 160) : ''}`);
  if (an.lastPrompt) head.push(`마지막 요청: ${shorten(an.lastPrompt, 600)}`);
  const td = an.todoView();
  if (td.total) head.push('할 일:\n' + td.items.slice(-15).map((x) => `- [${x.status === 'completed' ? 'x' : x.status === 'in_progress' ? '~' : ' '}] ${shorten(x.text, 100)}`).join('\n'));
  const files = an.hotFiles(10).filter((f) => f.edits);
  if (files.length) head.push('많이 고친 파일: ' + files.map((f) => `${baseName(f.path)}(${f.edits})`).join(', '));
  const cmds = an.commands.slice(-5);
  if (cmds.length) head.push('최근 명령:\n' + cmds.map((c) => `- ${c.ok === false ? '(실패) ' : ''}${shorten(c.command, 140)}`).join('\n'));
  const lim = { user: 600, assistant: 700, tool: 160, result: 240, system: 160 };
  let conv = an.conv.slice(-40).map((c) => `[${ROLE[c.role] || c.role}] ${shorten(c.text, lim[c.role] || 200)}`);
  let text = head.join('\n') + '\n\n최근 대화(오래된 → 최신):\n' + conv.join('\n');
  while (text.length > MAX_DIGEST && conv.length > 5) {
    conv = conv.slice(1);
    text = head.join('\n') + '\n\n최근 대화(오래된 → 최신):\n' + conv.join('\n');
  }
  return text.slice(0, MAX_DIGEST);
}

// don't let a summary run inherit this machine's live Claude Code session wiring
function cleanEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_PREVIEW_|CLAUDE_AGENT_SDK_|CLAUDE_CODE_(?!GIT_BASH_PATH))/.test(k)) continue;
    env[k] = v;
  }
  return env;
}

function run(cli, args, input) {
  return new Promise((resolve) => {
    let out = '', err = '', done = false;
    const p = spawn(cli, args, { cwd: SUMMARY_RUNNER_DIR, env: cleanEnv(), windowsHide: true });
    const timer = setTimeout(() => { if (!done) { err += '\n시간 초과'; try { p.kill(); } catch {} } }, TIMEOUT);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { done = true; clearTimeout(timer); resolve({ code: -1, out, err: err + e.message }); });
    p.on('close', (code) => { done = true; clearTimeout(timer); resolve({ code, out, err }); });
    p.stdin.on('error', () => {});
    p.stdin.end(input);
  });
}

export class Summarizer {
  constructor() { this.cache = new Map(); this.busy = false; }

  cli() { return CANDIDATES.find((p) => statSafe(p)?.isFile()) || null; }

  /** @returns {Promise<{status:number, body:object}>} */
  async summarize(s, an) {
    const key = s.id;
    const size = an.src.target || an.src.offset;
    const c = this.cache.get(key);
    if (c && c.size === size) return { status: 200, body: { summary: c.summary, generatedAt: c.generatedAt, cached: true, model: c.model } };
    const cli = this.cli();
    if (!cli) return { status: 501, body: { error: 'Claude Code CLI(claude.exe)를 찾을 수 없어요. ~/.local/bin/claude.exe 를 설치하면 AI 요약을 쓸 수 있어요.' } };
    if (this.busy) return { status: 429, body: { error: '다른 세션 요약을 만드는 중이에요. 잠시 후 다시 눌러주세요.', retryAfter: 10 } };
    this.busy = true;
    try {
      fs.mkdirSync(SUMMARY_RUNNER_DIR, { recursive: true });
      const input = PROMPT + buildDigest(s, an);
      // haiku first; if a flag/model is rejected, fall back to the default model, then to bare `-p`
      const flagErr = (r) => (r.code !== 0 || !r.out.trim()) && !/시간 초과/.test(r.err) && /unknown|invalid|option|argument|model/i.test(r.err);
      let model = 'haiku';
      let r = await run(cli, [...BASE_ARGS, '--model', 'haiku'], input);
      if (flagErr(r)) { model = 'default'; r = await run(cli, BASE_ARGS, input); }
      if (flagErr(r)) r = await run(cli, ['-p'], input);
      if (r.code !== 0 && /not logged in|\/login/i.test(r.err + r.out))
        return { status: 503, body: { error: 'Claude Code CLI가 로그인돼 있지 않아요. 터미널에서 claude 를 한 번 실행해 /login 하면 AI 요약을 쓸 수 있어요.' } };
      if (r.code !== 0 || !r.out.trim()) {
        const msg = /시간 초과/.test(r.err) ? 'AI 요약이 2분 안에 끝나지 않았어요.' : `AI 요약에 실패했어요: ${shorten(r.err || r.out || `exit ${r.code}`, 200)}`;
        return { status: 502, body: { error: msg } };
      }
      const v = { size, summary: r.out.trim(), generatedAt: now(), model };
      this.cache.set(key, v);
      if (this.cache.size > 50) this.cache.delete(this.cache.keys().next().value);
      return { status: 200, body: { summary: v.summary, generatedAt: v.generatedAt, cached: false, model } };
    } finally {
      this.busy = false;
    }
  }
}
