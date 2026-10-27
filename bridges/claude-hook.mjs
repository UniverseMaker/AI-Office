#!/usr/bin/env node
// Claude Code hook → AI OFFICE.  Optional: transcripts already give most of the picture;
// this adds the one thing transcripts can't show — "permission prompt is open right now".
//
// ~/.claude/settings.json
//   "hooks": {
//     "Notification":     [{ "hooks": [{ "type": "command", "command": "node \"<path>/bridges/claude-hook.mjs\"" }] }],
//     "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node \"<path>/bridges/claude-hook.mjs\"" }] }],
//     "Stop":             [{ "hooks": [{ "type": "command", "command": "node \"<path>/bridges/claude-hook.mjs\"" }] }]
//   }
//
// Never blocks Claude: 700 ms timeout, always exits 0, prints nothing.
const PORT = 17777; // fixed
let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { body += c; });
process.stdin.on('end', async () => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 700);
    await fetch(`http://127.0.0.1:${PORT}/api/hook/claude`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body || '{}', signal: ctrl.signal });
    clearTimeout(timer);
  } catch {}
  process.exit(0);
});
setTimeout(() => process.exit(0), 1500);
