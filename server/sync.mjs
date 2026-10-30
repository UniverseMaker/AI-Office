// 세션 동기화(올리기): 다른 컴퓨터에서 내려받아(bundle) 이어서 작업한 대화를 다시 올려 이 PC 에 합친다.
//   형식은 내려받기와 같은 세션 스위처 백업 zip (manifest_version 2). 합치는 규칙도 세션 스위처 복원과 같다:
//     · 대화(.jsonl)는 **줄 단위 병합**이 기본 — 이 PC 줄을 그대로 두고, 올린 쪽에만 있는 줄을 뒤에 붙인다 (어느 쪽 기록도 잃지 않음)
//     · 덮어쓰기는 overwrite 로 고른 대화만 · 보조 기록(sidecars)은 없는 파일만 채운다 · 등록 파일(records)은 없을 때만 넣는다
//   안전장치: 바꾸기 전 원본을 data/sync/backups/<업로드 id>/ 에 두고 되돌리기(undo) 가능 · 지금 돌고 있는 세션은 건너뜀 ·
//            경로 탈출 · zip 폭탄 · 크기 제한 검사 · 한 번에 하나만 반영
//   큰 파일은 Cloudflare 터널(요청당 100MB 제한)을 넘도록 조각(chunk)으로 올린다.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { DATA_DIR } from './auth.mjs';
import { transcriptPath, recordsIndex } from './transfer.mjs';

const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const SYNC_DIR = path.join(DATA_DIR, 'sync');
const UP_DIR = path.join(SYNC_DIR, 'uploads');
const BK_DIR = path.join(SYNC_DIR, 'backups');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOLDER = /^[A-Za-z0-9-]{1,200}$/;
export const LIMITS = { upload: 8 * 2 ** 30, chunk: 64 * 2 ** 20, oneShot: 95 * 2 ** 20, entry: 2 ** 30, total: 16 * 2 ** 30, keepHistory: 30, staleMs: 24 * 3600e3, busyMs: 30e3 };

const now = () => Date.now();
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
/** 줄 나누기: 세션 스위처와 같은 규칙 (개행만 기준 · 빈 줄 버림) — 양쪽을 반드시 같은 방식으로 */
export const linesOf = (text) => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
const newId = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + crypto.randomBytes(4).toString('hex');
const okId = (id) => /^\d{14}-[0-9a-f]{8}$/.test(String(id || ''));
const metaPath = (id) => path.join(UP_DIR, id + '.json');
const zipPath = (id) => path.join(UP_DIR, id + '.zip');
function readMeta(id) { if (!okId(id)) return null; try { return JSON.parse(fs.readFileSync(metaPath(id), 'utf8')); } catch { return null; } }
function writeMeta(m) { fs.mkdirSync(UP_DIR, { recursive: true }); const t = metaPath(m.id) + '.tmp'; fs.writeFileSync(t, JSON.stringify(m, null, 1)); fs.renameSync(t, metaPath(m.id)); }
const pub = (m) => m && { id: m.id, name: m.name, device: m.device, by: m.by, created: m.created, size: m.size, received: m.received, status: m.status, preview: m.preview || null, result: m.result || null, undone: m.undone || null };

// ---------------------------------------------------------------- zip 읽기 (의존성 없음 · stored/deflate · zip64 · 이름 UTF-8)
export class ZipReader {
  constructor(file) {
    this.file = file; this.fd = fs.openSync(file, 'r'); this.size = fs.fstatSync(this.fd).size; this.entries = new Map();
    try { this.readDirectory(); } catch (e) { this.close(); throw e; }
  }
  close() { if (this.fd != null) { try { fs.closeSync(this.fd); } catch {} this.fd = null; } }
  buf(pos, n) { const b = Buffer.alloc(n); const r = fs.readSync(this.fd, b, 0, n, pos); return r === n ? b : b.subarray(0, r); }
  readDirectory() {
    const tail = Math.min(this.size, 65557), t = this.buf(this.size - tail, tail);
    let e = -1; for (let i = t.length - 22; i >= 0; i--) if (t.readUInt32LE(i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('zip 이 아니에요 (끝 표시가 없음)');
    let count = t.readUInt16LE(e + 10), cdSize = t.readUInt32LE(e + 12), cdOff = t.readUInt32LE(e + 16);
    if (count === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {          // zip64
      const loc = e - 20;
      if (loc < 0 || t.readUInt32LE(loc) !== 0x07064b50) throw new Error('zip64 위치 정보를 못 찾았어요');
      const e64 = this.buf(Number(t.readBigUInt64LE(loc + 8)), 56);
      if (e64.readUInt32LE(0) !== 0x06064b50) throw new Error('zip64 끝 표시가 이상해요');
      count = Number(e64.readBigUInt64LE(32)); cdSize = Number(e64.readBigUInt64LE(40)); cdOff = Number(e64.readBigUInt64LE(48));
    }
    if (count > 200000 || cdOff + cdSize > this.size) throw new Error('zip 목차가 이상해요');
    const cd = this.buf(cdOff, cdSize);
    let p = 0, total = 0;
    for (let i = 0; i < count; i++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error('zip 목차가 깨졌어요');
      const flags = cd.readUInt16LE(p + 8), method = cd.readUInt16LE(p + 10), crc = cd.readUInt32LE(p + 16);
      let csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24), off = cd.readUInt32LE(p + 42);
      const nl = cd.readUInt16LE(p + 28), xl = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32);
      const name = cd.toString(flags & 0x800 ? 'utf8' : 'latin1', p + 46, p + 46 + nl).replace(/\\/g, '/');
      // zip64 확장 필드: 0xffffffff 인 값만 순서대로 들어 있다
      let x = p + 46 + nl; const xe = x + xl;
      while (x + 4 <= xe) {
        const id = cd.readUInt16LE(x), sz = cd.readUInt16LE(x + 2);
        if (id === 0x0001) { let q = x + 4; if (usize === 0xffffffff) { usize = Number(cd.readBigUInt64LE(q)); q += 8; } if (csize === 0xffffffff) { csize = Number(cd.readBigUInt64LE(q)); q += 8; } if (off === 0xffffffff) { off = Number(cd.readBigUInt64LE(q)); } }
        x += 4 + sz;
      }
      p += 46 + nl + xl + cl;
      if (name.endsWith('/')) continue;
      if (flags & 1) throw new Error('암호 걸린 zip 은 못 읽어요');
      if (method !== 0 && method !== 8) throw new Error(`지원하지 않는 압축 방식(${method}): ${name}`);
      if (usize > LIMITS.entry) throw new Error(`파일 하나가 너무 커요: ${name}`);
      total += usize; if (total > LIMITS.total) throw new Error('압축을 풀면 너무 커요');
      this.entries.set(name, { name, method, crc, csize, usize, off });
    }
  }
  has(name) { return this.entries.has(name); }
  names(prefix = '') { return [...this.entries.keys()].filter((n) => n.startsWith(prefix)); }
  read(name) {
    const e = this.entries.get(name); if (!e) return null;
    const h = this.buf(e.off, 30);
    if (h.readUInt32LE(0) !== 0x04034b50) throw new Error('zip 파일 머리가 깨졌어요: ' + name);
    const data = this.buf(e.off + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), e.csize);
    const out = e.method === 8 ? zlib.inflateRawSync(data, { maxOutputLength: Math.max(1, e.usize) }) : data;
    if (out.length !== e.usize || (zlib.crc32(out) >>> 0) !== e.crc) throw new Error('zip 내용이 손상됐어요: ' + name);
    return out;
  }
}

// ---------------------------------------------------------------- 받기 (조각 업로드)
function cleanup() {
  let ents = []; try { ents = fs.readdirSync(UP_DIR).filter((f) => f.endsWith('.json')); } catch { return; }
  const metas = ents.map((f) => readMeta(f.slice(0, -5))).filter(Boolean).sort((a, b) => b.created - a.created);
  for (const m of metas) if (m.status !== 'applied' && m.status !== 'undone' && now() - m.created > LIMITS.staleMs) discard(m.id, true);
  for (const m of metas.filter((x) => x.status === 'applied' || x.status === 'undone').slice(LIMITS.keepHistory)) {
    try { fs.rmSync(path.join(BK_DIR, m.id), { recursive: true, force: true }); fs.rmSync(metaPath(m.id), { force: true }); } catch {}
  }
}
export function createUpload({ name, size, device, by }) {
  cleanup();
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return { error: 'size(바이트)를 알려 주세요' };
  if (n > LIMITS.upload) return { error: `너무 커요 (최대 ${LIMITS.upload / 2 ** 30}GB) — 세션을 나눠서 올려 주세요` };
  const m = { id: newId(), name: String(name || 'upload.zip').slice(0, 120), device: String(device || '').slice(0, 80), by: by || 'api', created: now(), size: n, received: 0, status: 'receiving' };
  fs.mkdirSync(UP_DIR, { recursive: true }); fs.writeFileSync(zipPath(m.id), ''); writeMeta(m);
  return { upload_id: m.id, chunk_max: LIMITS.chunk, size: n };
}
/** 조각 하나를 offset 자리에 이어 붙인다 (offset 은 지금까지 받은 크기와 같아야 함 — 끊겼으면 GET 으로 received 를 보고 이어서) */
export function receiveChunk(id, offset, req) {
  return new Promise((resolve) => {
    const m = readMeta(id);
    if (!m) { req.resume(); return resolve({ status: 404, body: { error: '업로드를 찾을 수 없어요' } }); }
    if (m.status !== 'receiving') { req.resume(); return resolve({ status: 409, body: { error: `이미 다 받은 업로드예요 (${m.status})` } }); }
    if (Number(offset) !== m.received) { req.resume(); return resolve({ status: 409, body: { error: 'offset 이 맞지 않아요', received: m.received } }); }
    let got = 0, failed = false;
    const ws = fs.createWriteStream(zipPath(id), { flags: 'r+', start: m.received });
    const fail = (status, error) => { if (failed) return; failed = true; req.unpipe(ws); ws.destroy(); req.resume(); try { fs.truncateSync(zipPath(id), m.received); } catch {} resolve({ status, body: { error, received: m.received } }); };
    req.on('data', (c) => { got += c.length; if (got > LIMITS.chunk) fail(413, `조각은 ${LIMITS.chunk / 2 ** 20}MB 까지예요`); else if (m.received + got > m.size) fail(413, '처음에 알려 준 size 보다 커요'); });
    req.on('aborted', () => fail(400, '전송이 끊겼어요 — 같은 offset 으로 다시 보내 주세요'));
    ws.on('error', (e) => fail(500, e.message));
    ws.on('finish', () => {
      if (failed) return;
      m.received += got;
      if (m.received === m.size) m.status = 'ready';
      writeMeta(m);
      resolve({ status: 200, body: { upload_id: id, received: m.received, size: m.size, complete: m.status === 'ready' } });
    });
    req.pipe(ws);
  });
}
/** 한 번에 올리기 (작은 zip): 요청 본문 전체 → 업로드 하나 */
export async function receiveWhole(req, info) {
  const len = Number(req.headers['content-length'] || 0);
  if (!len) { req.resume(); return { status: 411, body: { error: 'Content-Length 가 필요해요' } }; }
  if (len > LIMITS.oneShot) { req.resume(); return { status: 413, body: { error: `한 번에는 ${LIMITS.oneShot / 2 ** 20}MB 까지예요 — 큰 파일은 /uploads 로 조각내서 올려 주세요` } }; }
  const c = createUpload({ ...info, size: len });
  if (c.error) { req.resume(); return { status: 400, body: c }; }
  const r = await receiveChunk(c.upload_id, 0, req);
  if (r.status !== 200) { discard(c.upload_id, true); return r; }
  if (!r.body.complete) { discard(c.upload_id, true); return { status: 400, body: { error: '본문이 Content-Length 보다 짧아요' } }; }
  return { status: 200, body: { upload_id: c.upload_id } };
}
export function discard(id, quiet) {
  const m = readMeta(id); if (!m) return false;
  try { fs.rmSync(zipPath(id), { force: true }); } catch {}
  if (m.status === 'applied') { if (!quiet) { m.zipRemoved = true; writeMeta(m); } return true; }   // 반영한 기록 · 백업은 되돌리기용으로 남긴다
  try { fs.rmSync(metaPath(id), { force: true }); } catch {}
  return true;
}
export const getUpload = (id) => pub(readMeta(id));
export function listUploads() {
  cleanup();
  let ents = []; try { ents = fs.readdirSync(UP_DIR).filter((f) => f.endsWith('.json')); } catch {}
  return ents.map((f) => readMeta(f.slice(0, -5))).filter(Boolean).sort((a, b) => b.created - a.created).map((m) => ({ ...pub(m), preview: m.preview ? { summary: m.preview.summary } : null }));
}

// ---------------------------------------------------------------- 미리 보기 (무엇이 어떻게 합쳐질지 — 아무것도 바꾸지 않음)
function manifestOf(z) {
  const raw = z.read('manifest.json');
  if (!raw) throw new Error('manifest.json 이 없어요 (세션 스위처 백업 형식이 아니에요)');
  let man; try { man = JSON.parse(raw.toString('utf8')); } catch { throw new Error('manifest.json 을 읽을 수 없어요'); }
  if (!man || !Array.isArray(man.code)) throw new Error('manifest.json 에 code 목록이 없어요');
  return man;
}
const fileSha = (fp) => { try { return sha(fs.readFileSync(fp)); } catch { return null; } };
/** 이 PC 기준 한 대화의 상태 */
export function sessionStatus(sid, liveIds = new Set()) {
  const fp = UUID.test(sid) ? transcriptPath(sid) : null;
  if (!fp) return { cli_session_id: sid, exists: false };
  const buf = fs.readFileSync(fp), st = fs.statSync(fp);
  return { cli_session_id: sid, exists: true, transcript_folder: path.basename(path.dirname(fp)), sha256: sha(buf), lines: linesOf(buf.toString('utf8')).length, size: st.size, last_activity: st.mtimeMs, live: liveIds.has(sid) || now() - st.mtimeMs < LIMITS.busyMs };
}
export function preview(id, liveIds = new Set()) {
  const m = readMeta(id);
  if (!m) return { status: 404, body: { error: '업로드를 찾을 수 없어요' } };
  if (m.status === 'receiving') return { status: 409, body: { error: `아직 다 안 받았어요 (${m.received}/${m.size})` } };
  if (!fs.existsSync(zipPath(id))) return { status: 410, body: { error: '올린 파일이 지워졌어요 (반영 후 정리됨)' }, preview: m.preview };
  let z;
  try { z = new ZipReader(zipPath(id)); } catch (e) { return { status: 400, body: { error: e.message } }; }
  try {
    const man = manifestOf(z), base = (man.sync && man.sync.base) || {};
    const recs = recordsIndex();
    const sessions = [], warnings = [];
    for (const it of man.code) {
      const sid = String(it.cli_session_id || '');
      if (!UUID.test(sid)) { warnings.push(`세션 id 가 이상해서 건너뜀: ${sid.slice(0, 60)}`); continue; }
      const row = { cli_session_id: sid, title: String(it.title || '').slice(0, 200), transcript_folder: FOLDER.test(it.transcript_folder || '') ? it.transcript_folder : null };
      const tName = `transcripts/${sid}.jsonl`;
      row.sidecars = z.names(`sidecars/${sid}/`).length;
      row.record = z.has(`records/${sid}.json`) ? (recs.has(sid) ? 'exists' : 'new') : 'none';
      if (!z.has(tName)) { row.status = 'no_transcript'; sessions.push(row); continue; }
      const remote = z.read(tName), rLines = linesOf(remote.toString('utf8'));
      row.remote_lines = rLines.length;
      const fp = transcriptPath(sid);
      if (!fp) { row.status = 'new'; row.add_lines = rLines.length; sessions.push(row); continue; }
      const local = fs.readFileSync(fp), lLines = linesOf(local.toString('utf8')), lSet = new Set(lLines), rSet = new Set(rLines);
      const add = rLines.filter((l) => !lSet.has(l)).length, only = lLines.filter((l) => !rSet.has(l)).length;
      Object.assign(row, { server_lines: lLines.length, add_lines: add, server_only_lines: only, server_folder: path.basename(path.dirname(fp)) });
      row.status = !add && !only ? 'same' : !add ? 'server_newer' : !only ? 'remote_newer' : 'diverged';
      const b = base[sid];
      if (b && b.sha256) row.server_changed_since_export = b.sha256 !== sha(local);
      const st = fs.statSync(fp);
      row.live = liveIds.has(sid) || now() - st.mtimeMs < LIMITS.busyMs;
      // 보조 기록: 이 PC 에 없는 파일 수
      const side = path.join(path.dirname(fp), sid);
      row.sidecars_new = z.names(`sidecars/${sid}/`).filter((n) => { const rel = safeRel(n.slice(`sidecars/${sid}/`.length)); return rel && !fs.existsSync(path.join(side, rel)); }).length;
      sessions.push(row);
    }
    const count = (s) => sessions.filter((x) => x.status === s).length;
    const summary = { sessions: sessions.length, new: count('new'), remote_newer: count('remote_newer'), diverged: count('diverged'), same: count('same'), server_newer: count('server_newer'), live: sessions.filter((x) => x.live).length, add_lines: sessions.reduce((a, x) => a + (x.add_lines || 0), 0) };
    const p = { at: now(), source_computer: String(man.source_computer || '').slice(0, 80), created_at: man.created_at || null, exported_from: man.sync ? { server: man.sync.server, exported_at: man.sync.exported_at } : null, summary, sessions, warnings };
    m.preview = p; m.status = m.status === 'ready' ? 'previewed' : m.status; writeMeta(m);
    return { status: 200, body: { upload_id: id, ...p } };
  } catch (e) { return { status: 400, body: { error: e.message } }; }
  finally { z.close(); }
}

// ---------------------------------------------------------------- 반영
/** zip 안 상대 경로 → 안전한 상대 경로 (.. · 절대 경로 · 드라이브 문자 거부) */
function safeRel(rel) {
  const parts = String(rel).split('/').filter(Boolean);
  if (!parts.length || parts.some((s) => s === '..' || s === '.' || /[:\0]/.test(s) || /^[A-Za-z]:/.test(s))) return null;
  return parts.join(path.sep);
}
const inside = (root, p) => { const r = path.resolve(root) + path.sep; return path.resolve(p).startsWith(r); };
function atomicWrite(fp, data) { fs.mkdirSync(path.dirname(fp), { recursive: true }); const t = fp + '.aio-sync.tmp'; fs.writeFileSync(t, data); fs.renameSync(t, fp); }
let applying = false;
/**
 * opt: { ids?: [...] 반영할 대화(없으면 전부) · overwrite?: [...] 덮어쓸 대화 · records?: true · force_live?: false · folder_map?: { "원격 폴더": "이 PC 폴더" } }
 */
export function apply(id, opt = {}, liveIds = new Set()) {
  if (applying) return { status: 423, body: { error: '다른 동기화를 반영하는 중이에요 — 잠시 뒤에 다시' } };
  const m = readMeta(id);
  if (!m) return { status: 404, body: { error: '업로드를 찾을 수 없어요' } };
  if (m.status === 'applied') return { status: 409, body: { error: '이미 반영한 업로드예요', result: m.result } };
  if (m.status === 'receiving') return { status: 409, body: { error: `아직 다 안 받았어요 (${m.received}/${m.size})` } };
  if (!fs.existsSync(zipPath(id))) return { status: 410, body: { error: '올린 파일이 없어요' } };
  applying = true;
  let z;
  try {
    z = new ZipReader(zipPath(id));
    const man = manifestOf(z);
    const pick = Array.isArray(opt.ids) && opt.ids.length ? new Set(opt.ids.map(String)) : null;
    const over = new Set((opt.overwrite || []).map(String));
    const fmap = opt.folder_map && typeof opt.folder_map === 'object' ? opt.folder_map : {};
    const wantRecords = opt.records !== false;
    const recs = recordsIndex();
    const stage = recs.stageDir();                              // 이 PC 의 Claude Desktop 등록 폴더 (가장 최근 기록이 있는 곳)
    const bk = path.join(BK_DIR, id);
    const undo = [];                                            // { kind: 'restore'|'delete', path, backup?, sha }
    const res = { transcripts: 0, merged: 0, overwritten: 0, created: 0, unchanged: 0, sidecars: 0, records: 0, skipped: [], warnings: [], sessions: [] };
    for (const it of man.code) {
      const sid = String(it.cli_session_id || '');
      if (!UUID.test(sid) || (pick && !pick.has(sid))) continue;
      const tName = `transcripts/${sid}.jsonl`;
      if (!z.has(tName)) { res.skipped.push({ cli_session_id: sid, reason: 'zip 에 대화 파일이 없음' }); continue; }
      const existing = transcriptPath(sid);
      if (existing && !opt.force_live && (liveIds.has(sid) || now() - fs.statSync(existing).mtimeMs < LIMITS.busyMs)) { res.skipped.push({ cli_session_id: sid, reason: '이 PC 에서 지금 쓰는 중인 세션 (force_live 로 강제 가능)' }); continue; }
      let folder = existing ? path.basename(path.dirname(existing)) : (fmap[it.transcript_folder] || it.transcript_folder || 'restored');
      if (!FOLDER.test(folder)) { res.warnings.push(`폴더 이름이 이상해서 restored 로: ${String(folder).slice(0, 60)}`); folder = 'restored'; }
      const dst = existing || path.join(PROJECTS, folder, sid + '.jsonl');
      if (!inside(PROJECTS, dst)) { res.skipped.push({ cli_session_id: sid, reason: '경로가 이상함' }); continue; }
      const remote = z.read(tName);
      let out, how;
      if (!existing) { out = remote; how = 'created'; }
      else {
        const local = fs.readFileSync(existing);
        if (over.has(sid)) { out = remote; how = 'overwritten'; }
        else {
          const lLines = linesOf(local.toString('utf8')), seen = new Set(lLines), add = [];
          for (const l of linesOf(remote.toString('utf8'))) if (!seen.has(l)) { seen.add(l); add.push(l); }
          if (!add.length) { res.unchanged++; res.sessions.push({ cli_session_id: sid, title: it.title, result: 'unchanged' }); out = null; }
          else { out = Buffer.from([...lLines, ...add].join('\n') + '\n', 'utf8'); how = 'merged'; }
        }
        if (out && !(how === 'overwritten' && sha(local) === sha(out))) {
          const b = path.join(bk, 'transcripts', sid + '.jsonl');
          fs.mkdirSync(path.dirname(b), { recursive: true }); fs.writeFileSync(b, local);
          undo.push({ kind: 'restore', path: existing, backup: b });
        } else if (out) { res.unchanged++; out = null; }
      }
      if (out) {
        atomicWrite(dst, out);
        if (how === 'created') undo.push({ kind: 'delete', path: dst });
        undo[undo.length - 1].sha = sha(out);
        res.transcripts++; res[how]++;
        res.sessions.push({ cli_session_id: sid, title: it.title, result: how, folder: path.basename(path.dirname(dst)) });
      }
      // 보조 기록: 없는 파일만 채운다 (이 PC 에서 이어 쓴 기록을 덮지 않게)
      const sideRoot = path.join(path.dirname(dst), sid);
      for (const n of z.names(`sidecars/${sid}/`)) {
        const rel = safeRel(n.slice(`sidecars/${sid}/`.length));
        const fp = rel && path.join(sideRoot, rel);
        if (!fp || !inside(sideRoot, fp)) { res.warnings.push(`보조 기록 경로가 이상해서 건너뜀: ${n.slice(0, 80)}`); continue; }
        if (fs.existsSync(fp)) continue;
        try { atomicWrite(fp, z.read(n)); undo.push({ kind: 'delete', path: fp }); res.sidecars++; } catch (e) { res.warnings.push(`보조 기록 실패: ${rel} (${e.message})`); }
      }
      // 등록 파일(Claude Desktop 사이드바): 이 PC 에 같은 세션 기록이 없을 때만
      if (wantRecords && z.has(`records/${sid}.json`) && !recs.has(sid)) {
        if (!stage) res.warnings.push('이 PC 에 Claude Desktop 등록 폴더가 없어 사이드바 등록은 건너뜀');
        else {
          try {
            const raw = z.read(`records/${sid}.json`), rec = JSON.parse(raw.toString('utf8'));
            if (rec.cliSessionId !== sid) throw new Error('세션 id 가 다름');
            let name = /^local_[\w-]{1,120}\.json$/.test(it.record_name || '') ? it.record_name : `local_${sid}.json`;
            const fp = path.join(stage, name);
            if (!inside(stage, fp) || fs.existsSync(fp)) throw new Error('같은 이름 파일이 있음');
            atomicWrite(fp, raw); undo.push({ kind: 'delete', path: fp }); res.records++;
          } catch (e) { res.warnings.push(`등록 파일 건너뜀: ${String(it.title || sid).slice(0, 40)} (${e.message})`); }
        }
      }
    }
    m.status = 'applied'; m.applied = now(); m.undo = undo; m.options = { ids: pick ? [...pick] : null, overwrite: [...over], records: wantRecords, force_live: !!opt.force_live, folder_map: fmap };
    m.result = { ...res, at: m.applied };
    writeMeta(m);
    try { fs.rmSync(zipPath(id), { force: true }); } catch {}       // 반영했으면 올린 zip 은 지운다 (원본 백업은 남김)
    return { status: 200, body: { upload_id: id, ...res } };
  } catch (e) { return { status: 400, body: { error: e.message } }; }
  finally { if (z) z.close(); applying = false; }
}

/** 되돌리기: 반영 전 원본으로. 반영 뒤에 또 바뀐 파일은 force 없이는 건드리지 않는다 */
export function undo(id, force = false) {
  const m = readMeta(id);
  if (!m) return { status: 404, body: { error: '업로드를 찾을 수 없어요' } };
  if (m.status !== 'applied') return { status: 409, body: { error: `반영한 업로드만 되돌릴 수 있어요 (${m.status})` } };
  const changed = (m.undo || []).filter((u) => u.sha && fs.existsSync(u.path) && fileSha(u.path) !== u.sha);
  if (changed.length && !force) return { status: 409, body: { error: '반영한 뒤에 다시 바뀐 대화가 있어요 — 되돌리면 그 사이 기록이 사라져요 (force: true 로 강제)', changed: changed.map((u) => path.basename(u.path)) } };
  let restored = 0, deleted = 0; const warnings = [];
  for (const u of [...(m.undo || [])].reverse()) {
    try {
      if (!inside(PROJECTS, u.path) && !inside(path.join(process.env.APPDATA || '', 'Claude'), u.path) && !inside(path.join(process.env.LOCALAPPDATA || '', 'Packages'), u.path)) throw new Error('경로가 이상함');
      if (u.kind === 'restore') { atomicWrite(u.path, fs.readFileSync(u.backup)); restored++; }
      else if (u.kind === 'delete' && fs.existsSync(u.path)) { fs.rmSync(u.path, { force: true }); deleted++; }
    } catch (e) { warnings.push(`${path.basename(u.path)}: ${e.message}`); }
  }
  m.status = 'undone'; m.undone = { at: now(), restored, deleted, warnings }; writeMeta(m);
  return { status: 200, body: { upload_id: id, restored, deleted, warnings } };
}
