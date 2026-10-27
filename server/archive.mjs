// 세션 보관함: 서버 폴더 안 archive/ 에 동작 중인 세션을 통째로 복제해 둔다 (다른 AI 플랫폼으로 옮겨 쓰기 위해).
//   archive/<세션>/
//     meta.json          세션 정보(제목·프로젝트·모델·팀원 …) + 원본 파일 크기/시각
//     source.jsonl       원본 기록 파일 그대로 (Claude Code / Codex 형식)
//     subagents/         서브에이전트 기록 (있으면)
//     conversation.json  정규화한 대화 (역할 · 시각 · 글/이미지/도구 호출/결과)
//     edited.json        사용자가 고친 대화 (있으면 이게 우선) — 저장만으로는 원본을 건드리지 않는다
//     backups/           「실제 세션에 반영」 직전의 원본 기록 (되돌리기용)
// v6 「실제 세션에 반영」: 편집본을 Claude Code 원본 기록(.jsonl)에 써 넣어, 그 세션을 이어서 열면 고친 대화로 이어진다.
//   안전장치: Claude 기록만 · 작업 중/방금 바뀐 세션 거부 · 보관 뒤 원본이 바뀌었으면 거부 · 순서 바꾸기 거부 ·
//   도구 호출/결과 · 생각(서명) 블록은 건드리지 않음 · 도구 호출과 결과 사이 끼워넣기 거부 · 원본 백업 후 원자적 교체 · 백업으로 되돌리기
//     media/             대화에 오간 이미지 파일
// 내보내기: portable JSON(ai-office-session/v1) · OpenAI messages · Markdown · 원본 JSONL. 가져오기: portable JSON · OpenAI messages.
import fs from 'node:fs';
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ARCHIVE_DIR = path.resolve(process.env.AI_OFFICE_ARCHIVE_DIR || path.join(__dirname, '..', 'archive'));
const MAX_PART = 20000;
const safe = (id) => { const x = String(id).replace(/[^\w.-]+/g, '_').slice(0, 120); return /^\.+$/.test(x) ? '_' : x; };
const dirOf = (id) => path.join(ARCHIVE_DIR, safe(id));
const readJSON = async (f, d = null) => { try { return JSON.parse(await fsp.readFile(f, 'utf8')); } catch { return d; } };
const writeJSON = (f, v) => fsp.writeFile(f, JSON.stringify(v, null, 1));
const clip = (s) => { s = typeof s === 'string' ? s : JSON.stringify(s ?? ''); return s.length > MAX_PART ? s.slice(0, MAX_PART) + `\n…(${s.length - MAX_PART}자 생략)` : s; };
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

/** 한 줄(JSON 레코드) → 정규화 메시지 (Claude Code · Codex 둘 다) */
function normalize(rec, media) {
  const ts = Date.parse(rec.timestamp || rec.ts || '') || null;
  const parts = [];
  const pushContent = (c) => {
    if (typeof c === 'string') { if (c.trim()) parts.push({ type: 'text', text: c }); return; }
    for (const b of c || []) {
      if (!b || typeof b !== 'object') continue;
      if (b.type === 'text' || b.type === 'input_text' || b.type === 'output_text') { if (b.text?.trim()) parts.push({ type: 'text', text: b.text }); }
      else if (b.type === 'thinking') { if (b.thinking) parts.push({ type: 'thinking', text: clip(b.thinking) }); }
      else if (b.type === 'tool_use') parts.push({ type: 'tool_use', name: b.name, input: clip(b.input) });
      else if (b.type === 'tool_result') {
        const inner = Array.isArray(b.content) ? b.content : [{ type: 'text', text: typeof b.content === 'string' ? b.content : JSON.stringify(b.content ?? '') }];
        const txt = inner.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
        parts.push({ type: 'tool_result', text: clip(txt), isError: !!b.is_error });
        for (const x of inner) if (x.type === 'image') { const m = media(x); if (m) parts.push(m); }
      } else if (b.type === 'image' || b.type === 'input_image') { const m = media(b); if (m) parts.push(m); }
    }
  };
  if (rec.message && (rec.type === 'user' || rec.type === 'assistant')) {
    pushContent(rec.message.content);
    if (!parts.length) return null;
    const onlyResults = parts.every((p) => p.type === 'tool_result' || p.type === 'image');
    return { role: rec.type === 'user' ? (onlyResults ? 'tool' : 'user') : 'assistant', ts, parts, sub: rec.isSidechain || undefined };
  }
  const p = rec.payload;
  if (rec.type === 'response_item' && p) {
    if (p.type === 'message') { pushContent(p.content); return parts.length ? { role: p.role === 'user' ? 'user' : p.role === 'developer' || p.role === 'system' ? 'system' : 'assistant', ts, parts } : null; }
    if (p.type === 'function_call') return { role: 'assistant', ts, parts: [{ type: 'tool_use', name: p.name, input: clip(p.arguments) }] };
    if (p.type === 'function_call_output') return { role: 'tool', ts, parts: [{ type: 'tool_result', text: clip(p.output?.content ?? p.output) }] };
  }
  return null;
}

async function parseTranscript(file, dir, withMedia) {
  const text = await fsp.readFile(file, 'utf8');
  const messages = [];
  let n = 0;
  if (withMedia) await fsp.mkdir(path.join(dir, 'media'), { recursive: true });
  const media = (b) => {
    const src = b.source || {};
    const mime = src.media_type || b.mime_type || 'image/png';
    if (!withMedia) return { type: 'image', mime, file: null };
    const data = src.data || (typeof b.image_url === 'string' && b.image_url.startsWith('data:') ? b.image_url.split(',')[1] : null);
    if (!data) return null;
    const name = `${String(++n).padStart(4, '0')}.${EXT[mime] || 'bin'}`;
    try { fs.writeFileSync(path.join(dir, 'media', name), Buffer.from(data, 'base64')); } catch { return null; }
    return { type: 'image', mime, file: name };
  };
  const lines = text.split('\n');
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    if (!line.trim()) continue;
    let rec; try { rec = JSON.parse(line); } catch { continue; }
    const m = normalize(rec, media);
    if (m) { m.ln = ln; if (rec.uuid) m.uuid = rec.uuid; messages.push(m); }   // 원본 줄 번호 · uuid — 「실제 세션에 반영」에 쓴다
  }
  messages.forEach((m, i) => { m.i = i; });
  return messages;
}

const sessionInfo = (s) => ({ id: s.id, title: s.title || '', project: s.project || '', cwd: s.cwd || '', provider: s.provider, app: s.app || '', model: s.model || '', kind: s.kind, roster: (s.roster || []).map((r) => r.name), startedAt: s.startedAt || null, lastActive: s.lastActive || null });

export class Archive {
  constructor({ fileFor, settings }) { this.fileFor = fileFor; this.settings = settings; this.busy = false; this.lastRun = 0; this.status = { at: 0, saved: 0, errors: 0 }; }

  /** 세션 하나 복제 (원본이 바뀌었을 때만). force=true 면 무조건 */
  async snapshot(s, force = false) {
    const f = this.fileFor(s);
    if (!f) return { ok: false, error: '기록 파일이 없는 세션이에요' };
    const st = fs.statSync(f.file, { throwIfNoEntry: false });
    if (!st) return { ok: false, error: '기록 파일을 찾지 못했어요' };
    const dir = dirOf(s.id);
    const meta = await readJSON(path.join(dir, 'meta.json'), null);
    if (!force && meta && meta.srcSize === st.size && meta.srcMtime === st.mtimeMs) { if (meta.session?.title !== s.title) { meta.session = sessionInfo(s); await writeJSON(path.join(dir, 'meta.json'), meta); } return { ok: true, skipped: true }; }
    await fsp.mkdir(dir, { recursive: true });
    await fsp.copyFile(f.file, path.join(dir, 'source.jsonl'));
    const subDir = f.file.replace(/\.jsonl$/, '') + path.sep + 'subagents';
    if (fs.existsSync(subDir)) { await fsp.mkdir(path.join(dir, 'subagents'), { recursive: true }); for (const x of await fsp.readdir(subDir)) await fsp.copyFile(path.join(subDir, x), path.join(dir, 'subagents', x)).catch(() => {}); }
    const messages = await parseTranscript(f.file, dir, this.settings().archiveMedia);
    await writeJSON(path.join(dir, 'conversation.json'), messages);
    await writeJSON(path.join(dir, 'meta.json'), { format: 'ai-office-archive/v1', id: s.id, provider: f.provider, session: sessionInfo(s), srcFile: f.file, srcSize: st.size, srcMtime: st.mtimeMs, savedAt: Date.now(), count: messages.length, media: messages.reduce((k, m) => k + m.parts.filter((p) => p.type === 'image').length, 0), imported: false });
    return { ok: true, count: messages.length };
  }

  /** 주기 작업: 살아 있는 세션 전부 (바뀐 것만) */
  async tick(sessions) {
    const set = this.settings();
    if (!set.archiveAuto || this.busy || Date.now() - this.lastRun < set.archiveEveryMin * 60e3) return;
    this.busy = true; this.lastRun = Date.now();
    let saved = 0, errors = 0;
    try { for (const s of sessions) { try { const r = await this.snapshot(s); if (r.ok && !r.skipped) saved++; } catch { errors++; } } }
    finally { this.busy = false; this.status = { at: Date.now(), saved, errors }; }
  }

  async list() {
    await fsp.mkdir(ARCHIVE_DIR, { recursive: true });
    const out = [];
    for (const d of await fsp.readdir(ARCHIVE_DIR)) {
      const m = await readJSON(path.join(ARCHIVE_DIR, d, 'meta.json'));
      if (!m) continue;
      const edited = fs.existsSync(path.join(ARCHIVE_DIR, d, 'edited.json'));
      out.push({ id: m.id, title: m.session?.title || '', project: m.session?.project || '', provider: m.provider || m.session?.provider || '', model: m.session?.model || '', kind: m.session?.kind || '', savedAt: m.savedAt, count: m.count, media: m.media || 0, edited, imported: !!m.imported, size: m.srcSize || 0 });
    }
    return out.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  async get(id) {
    const dir = dirOf(id);
    const meta = await readJSON(path.join(dir, 'meta.json'));
    if (!meta) return null;
    const edited = await readJSON(path.join(dir, 'edited.json'));
    const messages = edited || (await readJSON(path.join(dir, 'conversation.json'), []));
    return { meta, messages, edited: !!edited };
  }

  /** 사용자가 고친 대화 저장 (원본 conversation.json · source.jsonl 은 그대로) */
  async saveEdits(id, messages) {
    const dir = dirOf(id);
    if (!(await readJSON(path.join(dir, 'meta.json')))) return false;
    const clean = (Array.isArray(messages) ? messages : []).slice(0, 50000).map((m, i) => ({ i, role: ['user', 'assistant', 'tool', 'system'].includes(m.role) ? m.role : 'user', ts: Number(m.ts) || null, parts: (Array.isArray(m.parts) ? m.parts : [{ type: 'text', text: String(m.text ?? '') }]).map((p) => ({ ...p, text: p.text != null ? String(p.text) : undefined })), edited: m.edited || undefined, ...(Number.isInteger(m.ln) && m.ln >= 0 ? { ln: m.ln } : {}), ...(typeof m.uuid === 'string' && /^[\w-]{8,64}$/.test(m.uuid) ? { uuid: m.uuid } : {}) }));
    await writeJSON(path.join(dir, 'edited.json'), clean);
    return true;
  }
  /**
   * 편집본을 실제 세션 기록(Claude Code .jsonl)에 반영. live = 지금 상태의 세션(있으면).
   * 돌려주는 값: { ok, edited, inserted, deleted, skipped[], backup } 또는 { ok:false, error }
   */
  async applyToSource(id, live) {
    const dir = dirOf(id);
    const meta = await readJSON(path.join(dir, 'meta.json'));
    const edited = await readJSON(path.join(dir, 'edited.json'));
    const orig = await readJSON(path.join(dir, 'conversation.json'), []);
    if (!meta || !edited) return { ok: false, error: '저장된 편집본이 없어요' };
    if (meta.imported || !meta.srcFile) return { ok: false, error: '가져온 대화라 되돌려 쓸 원본 세션이 없어요' };
    if ((meta.provider || meta.session?.provider) !== 'claude') return { ok: false, error: '지금은 Claude Code 세션 기록만 반영할 수 있어요' };
    if (!orig.length || orig.some((m) => !Number.isInteger(m.ln))) return { ok: false, error: '예전 형식 보관본이에요 — 「다시 보관」 후 다시 편집해 주세요' };
    if (live && ['working', 'tool', 'thinking', 'delegating', 'waiting_input', 'waiting_permission'].includes(live.status)) return { ok: false, error: '세션이 작업 중이에요 — 멈춘(응답 완료 · 대기) 뒤에 반영하세요' };
    const st = fs.statSync(meta.srcFile, { throwIfNoEntry: false });
    if (!st) return { ok: false, error: '원본 기록 파일을 찾지 못했어요' };
    if (Date.now() - st.mtimeMs < 60e3) return { ok: false, error: '원본이 방금 바뀌었어요 — 1분 뒤에 다시 시도하세요' };
    if (st.size !== meta.srcSize || st.mtimeMs !== meta.srcMtime) return { ok: false, error: '보관한 뒤 원본에 대화가 더 쌓였어요 — 「다시 보관」으로 최신화한 뒤 편집을 다시 적용하세요' };
    const text = await fsp.readFile(meta.srcFile, 'utf8');
    const lines = text.split('\n');
    const recs = lines.map((l) => { if (!l.trim()) return null; try { return JSON.parse(l); } catch { return null; } });
    const byLn = new Map(orig.map((m) => [m.ln, m]));
    let last = -1;
    for (const m of edited) if (Number.isInteger(m.ln)) { if (!byLn.has(m.ln) || m.ln <= last) return { ok: false, error: '메시지 순서 바꾸기는 실제 세션에 반영할 수 없어요' }; last = m.ln; }
    const keep = new Set(edited.filter((m) => Number.isInteger(m.ln)).map((m) => m.ln));
    const skipped = [];
    const hasTool = (rec) => Array.isArray(rec?.message?.content) && rec.message.content.some((b) => b && (b.type === 'tool_use' || b.type === 'tool_result'));
    // 지우기: 도구 호출/결과 레코드는 못 지운다(짝이 깨지면 세션을 못 이어 감)
    const del = new Set();
    for (const m of orig) if (!keep.has(m.ln)) { if (hasTool(recs[m.ln])) skipped.push(`#${m.i + 1} 도구 호출/결과라 지우지 않았어요`); else del.add(m.ln); }
    // 글 고치기: text 블록만
    let nEdit = 0;
    const textOf = (parts) => (parts || []).filter((p) => p.type === 'text').map((p) => p.text || '');
    for (const m of edited) {
      if (!Number.isInteger(m.ln)) continue;
      const o = byLn.get(m.ln), rec = recs[m.ln];
      const a = textOf(o.parts), b = textOf(m.parts);
      if ((m.parts || []).some((p, k) => p.type === 'thinking' && p.text !== (o.parts[k] || {}).text)) skipped.push(`#${m.i + 1} 생각 블록은 서명 때문에 고칠 수 없어요`);
      if (a.length === b.length && a.every((t, k) => t === b[k])) continue;
      if (!rec || !rec.message) continue;
      const c = rec.message.content;
      if (typeof c === 'string') { rec.message.content = b.join('\n\n'); nEdit++; continue; }
      if (!Array.isArray(c)) continue;
      const tb = c.filter((x) => x && x.type === 'text');
      if (tb.length !== b.length) {
        if (tb.length && b.length) { tb[0].text = b.join('\n\n'); for (const x of tb.slice(1)) x.text = ''; rec.message.content = c.filter((x) => !(x && x.type === 'text' && x.text === '')); nEdit++; }
        else skipped.push(`#${m.i + 1} 글 블록 수가 달라 반영하지 못했어요`);
        continue;
      }
      tb.forEach((x, k) => { x.text = b[k]; }); nEdit++;
    }
    // 끼워넣기: 앞 메시지 바로 뒤에 새 레코드 (앞이 도구 호출이면 거부)
    const ins = new Map();                 // 앞 원본 ln(-1 = 맨 앞) → [새 메시지…]
    let prevLn = -1;
    for (const m of edited) {
      if (Number.isInteger(m.ln)) { prevLn = m.ln; continue; }
      const t = textOf(m.parts).join('\n\n').trim();
      if (!t) continue;
      if (prevLn >= 0 && Array.isArray(recs[prevLn]?.message?.content) && recs[prevLn].message.content.some((b) => b && b.type === 'tool_use')) { skipped.push('도구 호출과 그 결과 사이에는 끼워 넣을 수 없어요'); continue; }
      if (!ins.has(prevLn)) ins.set(prevLn, []);
      ins.get(prevLn).push({ role: m.role === 'assistant' ? 'assistant' : 'user', text: t });
    }
    const tmpl = recs.find((r) => r && r.uuid && r.sessionId) || {};
    const mk = (role, txt, parent, ts) => ({ parentUuid: parent, isSidechain: false, userType: tmpl.userType || 'external', cwd: tmpl.cwd, sessionId: tmpl.sessionId, version: tmpl.version, gitBranch: tmpl.gitBranch,
      type: role, uuid: crypto.randomUUID(), timestamp: new Date(ts).toISOString(),
      message: role === 'user' ? { role: 'user', content: txt } : { id: 'msg_aio_' + crypto.randomBytes(8).toString('hex'), type: 'message', role: 'assistant', model: 'ai-office-edit', content: [{ type: 'text', text: txt }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } });
    // 지운 레코드를 가리키던 자식은 지운 레코드의 부모로 (연쇄)
    const remap = new Map();
    for (const ln of del) { const r = recs[ln]; if (r && r.uuid) remap.set(r.uuid, r.parentUuid ?? null); }
    const resolve = (u) => { let k = 0; while (u && remap.has(u) && k++ < 10000) u = remap.get(u); return u; };
    const out = [];
    const firstMsgLn = orig[0].ln;
    let nIns = 0;
    const emitIns = (afterLn, parentUuid, ts) => {
      let parent = parentUuid;
      for (const x of ins.get(afterLn) || []) { const r = mk(x.role, x.text, parent, ts + 1 + nIns); out.push(JSON.stringify(r)); parent = r.uuid; nIns++; }
      return parent;
    };
    // 끼운 레코드 다음의 원래 메시지 하나는 마지막으로 끼운 레코드를 부모로
    const relinkAfter = new Map();
    for (let ln = 0; ln < lines.length; ln++) {
      const r = recs[ln];
      if (ln === firstMsgLn && ins.has(-1)) { const p0 = r && r.parentUuid != null ? r.parentUuid : null; const p = emitIns(-1, p0, Date.parse(r?.timestamp || '') || Date.now()); relinkAfter.set(p0 ?? '__root__', p); }
      if (del.has(ln)) continue;
      if (!r) { if (lines[ln].trim()) out.push(lines[ln]); continue; }
      if (r.parentUuid !== undefined) {
        let pu = resolve(r.parentUuid);
        const key = pu ?? '__root__';
        if (relinkAfter.has(key) && byLn.has(ln)) { pu = relinkAfter.get(key); relinkAfter.delete(key); }
        r.parentUuid = pu;
      }
      out.push(JSON.stringify(r));
      if (ins.has(ln) && r.uuid) { const p = emitIns(ln, r.uuid, Date.parse(r.timestamp || '') || Date.now()); relinkAfter.set(r.uuid, p); }
    }
    if (!nEdit && !nIns && !del.size) return { ok: false, error: '원본과 달라진 내용이 없어요', skipped };
    // 백업 → 원자적 교체
    const bdir = path.join(dir, 'backups');
    await fsp.mkdir(bdir, { recursive: true });
    const backup = `source-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
    await fsp.copyFile(meta.srcFile, path.join(bdir, backup));
    const tmp = meta.srcFile + '.aio-tmp';
    await fsp.writeFile(tmp, out.join('\n') + (text.endsWith('\n') ? '\n' : ''));
    await fsp.rename(tmp, meta.srcFile);
    await fsp.rm(path.join(dir, 'edited.json'), { force: true });
    meta.appliedAt = Date.now(); meta.lastBackup = backup;
    await writeJSON(path.join(dir, 'meta.json'), meta);
    return { ok: true, edited: nEdit, inserted: nIns, deleted: del.size, skipped, backup };
  }
  /** 마지막 반영 되돌리기: 백업을 원본 자리로 */
  async restoreSource(id, live) {
    const dir = dirOf(id);
    const meta = await readJSON(path.join(dir, 'meta.json'));
    if (!meta || !meta.lastBackup || !meta.srcFile) return { ok: false, error: '되돌릴 백업이 없어요' };
    if (live && ['working', 'tool', 'thinking', 'delegating'].includes(live.status)) return { ok: false, error: '세션이 작업 중이에요 — 멈춘 뒤에 되돌리세요' };
    const b = path.join(dir, 'backups', path.basename(meta.lastBackup));
    if (!fs.existsSync(b)) return { ok: false, error: '백업 파일이 없어요' };
    await fsp.copyFile(meta.srcFile, path.join(dir, 'backups', `before-restore-${Date.now()}.jsonl`)).catch(() => {});
    await fsp.copyFile(b, meta.srcFile);
    delete meta.lastBackup; meta.restoredAt = Date.now();
    await writeJSON(path.join(dir, 'meta.json'), meta);
    return { ok: true };
  }
  /** 보관본 폴더의 진짜 세션 id (요청한 id 가 별칭이면 다를 수 있음) */
  async realId(id) { const m = await readJSON(path.join(dirOf(id), 'meta.json')); return m ? m.id : null; }
  async resetEdits(id) { await fsp.rm(path.join(dirOf(id), 'edited.json'), { force: true }); return true; }

  mediaPath(id, name) {
    if (!/^[\w.-]+$/.test(name)) return null;
    const fp = path.join(dirOf(id), 'media', name);
    return fs.existsSync(fp) ? fp : null;
  }

  /** 내보내기: fmt = json(portable) | openai | md | jsonl */
  async export(id, fmt) {
    const a = await this.get(id);
    if (!a) return null;
    const base = safe(a.meta.session?.title || id).slice(0, 60) || 'session';
    if (fmt === 'jsonl') { const fp = path.join(dirOf(id), 'source.jsonl'); return fs.existsSync(fp) ? { name: base + '.jsonl', type: 'application/x-ndjson', body: await fsp.readFile(fp) } : null; }
    const dataUrl = (p) => { const fp = p.file && this.mediaPath(id, p.file); return fp ? `data:${p.mime};base64,${fs.readFileSync(fp).toString('base64')}` : null; };
    if (fmt === 'md') {
      const L = [`# ${a.meta.session?.title || id}`, '', `- 프로젝트: ${a.meta.session?.project || ''}`, `- 모델: ${a.meta.session?.model || ''}`, `- 보관: ${new Date(a.meta.savedAt || Date.now()).toISOString()}`, ''];
      for (const m of a.messages) {
        L.push(`## ${{ user: '🙋 사용자', assistant: '🤖 AI', tool: '🔧 도구 결과', system: '⚙️ 시스템' }[m.role] || m.role}${m.ts ? ` · ${new Date(m.ts).toLocaleString('ko-KR')}` : ''}`, '');
        for (const p of m.parts) {
          if (p.type === 'text') L.push(p.text, '');
          else if (p.type === 'thinking') L.push('<details><summary>생각</summary>', '', p.text, '', '</details>', '');
          else if (p.type === 'tool_use') L.push(`**도구 호출: ${p.name}**`, '```json', p.input, '```', '');
          else if (p.type === 'tool_result') L.push(p.isError ? '**⚠️ 오류 결과**' : '**결과**', '```', p.text, '```', '');
          else if (p.type === 'image') L.push(p.file ? `![이미지](media/${p.file})` : '(이미지)', '');
        }
      }
      return { name: base + '.md', type: 'text/markdown; charset=utf-8', body: L.join('\n') };
    }
    if (fmt === 'openai') {
      const messages = [];
      for (const m of a.messages) {
        const content = [];
        for (const p of m.parts) {
          if (p.type === 'text') content.push({ type: 'text', text: p.text });
          else if (p.type === 'tool_use') content.push({ type: 'text', text: `[도구 호출 ${p.name}] ${p.input}` });
          else if (p.type === 'tool_result') content.push({ type: 'text', text: `[도구 결과] ${p.text}` });
          else if (p.type === 'image') { const u = dataUrl(p); if (u) content.push({ type: 'image_url', image_url: { url: u } }); }
        }
        if (content.length) messages.push({ role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user', content });
      }
      return { name: base + '.openai.json', type: 'application/json', body: JSON.stringify({ messages }, null, 1) };
    }
    const messages = a.messages.map((m) => ({ ...m, parts: m.parts.map((p) => (p.type === 'image' ? { ...p, data: dataUrl(p) } : p)) }));
    return { name: base + '.aio.json', type: 'application/json', body: JSON.stringify({ format: 'ai-office-session/v1', exportedAt: Date.now(), session: a.meta.session, edited: a.edited, messages }, null, 1) };
  }

  /** 가져오기: ai-office-session/v1 또는 { messages: [{ role, content }] } (OpenAI/Anthropic 형식) */
  async import(body, name) {
    if (!body || !Array.isArray(body.messages)) return { ok: false, error: 'messages 배열이 있는 JSON 이어야 해요' };
    const id = `import:${Date.now().toString(36)}`;
    const dir = dirOf(id);
    await fsp.mkdir(path.join(dir, 'media'), { recursive: true });
    let n = 0;
    const toPart = (p) => {
      if (typeof p === 'string') return { type: 'text', text: p };
      if (p.type === 'image' || p.type === 'image_url') {
        const url = p.data || p.image_url?.url || (p.source?.data ? `data:${p.source.media_type};base64,${p.source.data}` : null);
        const mm = typeof url === 'string' && url.match(/^data:([^;]+);base64,(.*)$/);
        if (!mm) return { type: 'text', text: '(이미지)' };
        const file = `${String(++n).padStart(4, '0')}.${EXT[mm[1]] || 'bin'}`;
        fs.writeFileSync(path.join(dir, 'media', file), Buffer.from(mm[2], 'base64'));
        return { type: 'image', mime: mm[1], file };
      }
      if (p.type === 'text' || p.type === 'input_text' || p.type === 'output_text') return { type: 'text', text: String(p.text || '') };
      if (p.type === 'tool_use' || p.type === 'tool_result' || p.type === 'thinking') return { ...p, data: undefined };
      return { type: 'text', text: JSON.stringify(p) };
    };
    const messages = body.messages.map((m, i) => ({ i, role: ['user', 'assistant', 'tool', 'system'].includes(m.role) ? m.role : 'user', ts: m.ts || null, parts: Array.isArray(m.parts) ? m.parts.map(toPart) : Array.isArray(m.content) ? m.content.map(toPart) : [toPart(String(m.content ?? m.text ?? ''))] }));
    const session = { id, title: body.session?.title || name || '가져온 대화', project: body.session?.project || '', provider: body.session?.provider || 'import', model: body.session?.model || '', kind: body.session?.kind || 'single' };
    await writeJSON(path.join(dir, 'conversation.json'), messages);
    await writeJSON(path.join(dir, 'meta.json'), { format: 'ai-office-archive/v1', id, provider: session.provider, session, savedAt: Date.now(), count: messages.length, media: n, imported: true });
    return { ok: true, id, count: messages.length };
  }
}
