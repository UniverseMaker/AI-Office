// 세션 전송 API: 「클로드 코드세션 스위처」(Claude-Desktop-Application-Cowork-and-Code-Session-Transfer)가
// 이 PC 의 Claude Code 대화를 통째로 내려받아 자기 컴퓨터에 복원할 수 있게, 그 프로그램의 백업 형식 그대로 zip 을 만든다.
//   claude_sessions_<ts>.zip
//     manifest.json                     { manifest_version: 2, created_at, source_computer, code: [...], cowork: [], warnings }
//     transcripts/<cliSessionId>.jsonl  대화 원문
//     sidecars/<cliSessionId>/…         보조 기록(subagents/ · tool-results/)
//     records/<cliSessionId>.json       Claude Desktop 등록 파일(있으면, 원본 바이트 그대로)
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';

const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Claude Desktop 등록 파일: cliSessionId → { path, title, mtime } (가장 최근 것) */
function scanRecords() {
  const roots = [path.join(process.env.APPDATA || '', 'Claude', 'claude-code-sessions')];
  try { for (const d of fs.readdirSync(path.join(process.env.LOCALAPPDATA || '', 'Packages'))) if (/^Claude_/.test(d)) roots.push(path.join(process.env.LOCALAPPDATA, 'Packages', d, 'LocalCache', 'Roaming', 'Claude', 'claude-code-sessions')); } catch {}
  const out = new Map();
  const walk = (dir, depth) => {
    let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory() && depth < 4) walk(fp, depth + 1);
      else if (e.isFile() && /^local_.*\.json$/.test(e.name)) {
        try {
          const st = fs.statSync(fp); if (st.size > 2e6) continue;
          const rec = JSON.parse(fs.readFileSync(fp, 'utf8'));
          const sid = rec.cliSessionId;
          if (!sid) continue;
          const cur = out.get(sid);
          if (!cur || st.mtimeMs > cur.mtime) out.set(sid, { path: fp, title: rec.title || '', mtime: st.mtimeMs });
        } catch {}
      }
    }
  };
  for (const r of roots) walk(r, 0);
  return out;
}

/** 대화 첫 사용자 문장 (제목이 없을 때) */
function guessTitle(fp) {
  try {
    const fd = fs.openSync(fp, 'r'); const buf = Buffer.alloc(65536); const n = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd);
    for (const line of buf.slice(0, n).toString('utf8').split('\n')) {
      let r; try { r = JSON.parse(line); } catch { continue; }
      if (r.type === 'summary' && r.summary) return String(r.summary).slice(0, 80);
      if (r.type === 'user' && r.message) { const c = r.message.content; const t = typeof c === 'string' ? c : (c || []).find((b) => b.type === 'text')?.text; if (t && !t.startsWith('<')) return t.replace(/\s+/g, ' ').slice(0, 80); }
    }
  } catch {}
  return '';
}
function dirStats(d) { let n = 0, size = 0; const walk = (x) => { let es; try { es = fs.readdirSync(x, { withFileTypes: true }); } catch { return; } for (const e of es) { const fp = path.join(x, e.name); if (e.isDirectory()) walk(fp); else { n++; try { size += fs.statSync(fp).size; } catch {} } } }; walk(d); return { n, size }; }

/** 이 PC 의 모든 대화 (보조 기록은 대화에 딸려 셈) */
export function listConversations(liveTitles = new Map()) {
  const recs = scanRecords();
  const out = [];
  let dirs = []; try { dirs = fs.readdirSync(PROJECTS, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch {}
  for (const d of dirs) {
    let files; try { files = fs.readdirSync(path.join(PROJECTS, d.name)); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const sid = f.slice(0, -6);
      if (!UUID.test(sid)) continue;
      const fp = path.join(PROJECTS, d.name, f);
      let st; try { st = fs.statSync(fp); } catch { continue; }
      const side = path.join(PROJECTS, d.name, sid);
      const sc = fs.existsSync(side) ? dirStats(side) : { n: 0, size: 0 };
      const rec = recs.get(sid);
      out.push({ cli_session_id: sid, title: liveTitles.get(sid) || rec?.title || guessTitle(fp) || `(제목 없음) ${sid.slice(0, 8)}`, transcript_folder: d.name, size: st.size + sc.size, transcript_size: st.size, sidecar_files: sc.n, last_activity: st.mtimeMs, has_record: !!rec, live: liveTitles.has(sid) });
    }
  }
  return out.sort((a, b) => b.last_activity - a.last_activity);
}

// ---------------------------------------------------------------- 스트리밍 zip (deflate, UTF-8 이름, zip64 없음 → 4GB 미만)
function dosTime(d) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
class ZipStream {
  constructor(res) { this.res = res; this.off = 0; this.cd = []; }
  write(b) { this.res.write(b); this.off += b.length; }
  addFile(name, data, mtime = new Date()) {
    const nameB = Buffer.from(name.replace(/\\/g, '/'), 'utf8');
    const crc = zlib.crc32(data) >>> 0;
    const comp = zlib.deflateRawSync(data, { level: 6 });
    const { time, date } = dosTime(mtime);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nameB.length, 26); h.writeUInt16LE(0, 28);
    const at = this.off;
    if (at + 30 + nameB.length + comp.length > 0xfffffff0) throw new Error('4GB 를 넘어요 — 세션을 나눠서 받아 주세요');
    this.write(h); this.write(nameB); this.write(comp);
    this.cd.push({ nameB, crc, csize: comp.length, usize: data.length, time, date, at });
  }
  end() {
    const start = this.off;
    for (const e of this.cd) {
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(e.time, 12); c.writeUInt16LE(e.date, 14);
      c.writeUInt32LE(e.crc, 16); c.writeUInt32LE(e.csize, 20); c.writeUInt32LE(e.usize, 24); c.writeUInt16LE(e.nameB.length, 28); c.writeUInt32LE(e.at, 42);
      this.write(c); this.write(e.nameB);
    }
    const z = Buffer.alloc(22);
    z.writeUInt32LE(0x06054b50, 0); z.writeUInt16LE(this.cd.length, 8); z.writeUInt16LE(this.cd.length, 10); z.writeUInt32LE(this.off - start, 12); z.writeUInt32LE(start, 16);
    this.write(z);
    this.res.end();
  }
}

/** zip 번들을 응답으로 흘려보낸다. ids = null 이면 전부 */
export async function streamBundle(res, ids, liveTitles) {
  const all = listConversations(liveTitles);
  const pick = ids ? all.filter((c) => ids.includes(c.cli_session_id)) : all;
  const recs = scanRecords();
  const ts = new Date(), stamp = ts.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="claude_sessions_${stamp}.zip"`, 'Cache-Control': 'no-store' });
  const z = new ZipStream(res);
  const man = { manifest_version: 2, created_at: ts.toISOString().slice(0, 19), source_computer: os.hostname(), source: 'ai-office', code: [], cowork: [], warnings: [] };
  for (const c of pick) {
    const dir = path.join(PROJECTS, c.transcript_folder);
    const entry = { cli_session_id: c.cli_session_id, title: c.title, transcript: false, record: false, size: c.size, sidecar_files: 0, transcript_folder: c.transcript_folder };
    try { const fp = path.join(dir, c.cli_session_id + '.jsonl'); z.addFile(`transcripts/${c.cli_session_id}.jsonl`, await fsp.readFile(fp), fs.statSync(fp).mtime); entry.transcript = true; }
    catch (e) { man.warnings.push(`대화 파일 복사 실패: ${c.title} (${e.message})`); }
    const side = path.join(dir, c.cli_session_id);
    if (fs.existsSync(side)) {
      const walk = async (x, rel) => { for (const e of await fsp.readdir(x, { withFileTypes: true })) { const fp = path.join(x, e.name), r = rel + '/' + e.name; if (e.isDirectory()) await walk(fp, r); else { try { z.addFile(`sidecars/${c.cli_session_id}${r}`, await fsp.readFile(fp), fs.statSync(fp).mtime); entry.sidecar_files++; } catch {} } } };
      try { await walk(side, ''); } catch (e) { man.warnings.push(`보조 기록 복사 실패: ${c.title} (${e.message})`); }
    }
    const rec = recs.get(c.cli_session_id);
    if (rec) { try { z.addFile(`records/${c.cli_session_id}.json`, await fsp.readFile(rec.path)); entry.record = true; entry.record_name = path.basename(rec.path); } catch {} }
    man.code.push(entry);
  }
  z.addFile('manifest.json', Buffer.from(JSON.stringify(man, null, 2), 'utf8'));
  z.end();
}

export function transcriptPath(sid) {
  if (!UUID.test(sid)) return null;
  let dirs = []; try { dirs = fs.readdirSync(PROJECTS); } catch {}
  for (const d of dirs) { const fp = path.join(PROJECTS, d, sid + '.jsonl'); if (fs.existsSync(fp)) return fp; }
  return null;
}
