import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// cwd for on-demand AI summaries (claude -p). Sessions started there are hidden from the office.
export const SUMMARY_RUNNER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'summary-runner');
const RUNNER_LOW = SUMMARY_RUNNER_DIR.toLowerCase();
export const isRunnerCwd = (cwd) => !!cwd && path.resolve(String(cwd)).toLowerCase().startsWith(RUNNER_LOW);

export const now = () => Date.now();

export function readJSON(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

export function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
}

export function readdirSafe(p) {
  try { return fs.readdirSync(p); } catch { return []; }
}

export function isPidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code === 'EPERM'; }
}

export function shorten(s, n = 60) {
  if (s == null) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function baseName(p) {
  if (!p) return '';
  return String(p).split(/[\\/]/).filter(Boolean).pop() || String(p);
}

export function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}

/**
 * Incremental JSONL tailer. Reads only the last `initialBytes` the first time,
 * then only appended bytes on later calls. Handles truncation/rotation.
 */
export class JsonlTail {
  constructor(file, { initialBytes = 1_500_000, maxStep = 4_000_000 } = {}) {
    this.file = file;
    this.offset = -1;
    this.partial = '';
    this.initialBytes = initialBytes;
    this.maxStep = maxStep;
    this.mtime = 0;
    this.size = 0;
  }
  /** @returns {object[]} newly appended records */
  read() {
    const st = statSafe(this.file);
    if (!st) return [];
    this.mtime = st.mtimeMs;
    if (this.offset >= 0 && st.size === this.size) return [];
    let start;
    let skipFirst = false;
    if (this.offset < 0 || st.size < this.offset) {
      start = Math.max(0, st.size - this.initialBytes);
      skipFirst = start > 0;
      this.partial = '';
    } else {
      start = this.offset;
      if (st.size - start > this.maxStep) { start = st.size - this.maxStep; skipFirst = true; this.partial = ''; }
    }
    const len = st.size - start;
    const buf = Buffer.alloc(len);
    let fd;
    try {
      fd = fs.openSync(this.file, 'r');
      fs.readSync(fd, buf, 0, len, start);
    } catch { return []; }
    finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
    this.offset = st.size;
    this.size = st.size;
    let text = this.partial + buf.toString('utf8');
    const lines = text.split('\n');
    this.partial = lines.pop() ?? '';
    if (skipFirst) lines.shift();
    const out = [];
    for (const l of lines) {
      if (!l || l[0] !== '{') continue;
      try { out.push(JSON.parse(l)); } catch {}
    }
    return out;
  }
}

/** Parse simple YAML-ish frontmatter (name/description/model) from an agent .md */
export function parseFrontmatter(file) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch { return null; }
  const m = txt.match(/^---\s*\n([\s\S]*?)\n---/);
  const fm = {};
  if (m) {
    for (const line of m[1].split('\n')) {
      const mm = line.match(/^(\w[\w-]*):\s*(.*)$/);
      if (mm) fm[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
    }
  }
  if (!fm.name) fm.name = path.basename(file, '.md');
  return fm;
}

/** Push into a ring buffer */
export function pushRing(arr, item, max) {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max);
}

/** Append a timeline item, folding immediate repeats into "×N". */
export function pushFeed(arr, item, max = 40) {
  const last = arr[arr.length - 1];
  if (last && last.text === item.text && last.kind === item.kind) { last.n = (last.n || 1) + 1; last.t = item.t || last.t; return; }
  pushRing(arr, item, max);
}

/** 바깥으로 보내는 주소 검사: https + 공개 호스트만 (내부망 · 이 PC 로 요청을 보내게 하는 SSRF 막기) */
export function publicHttps(v) {
  let x; try { x = new URL(String(v || '')); } catch { return false; }
  if (x.protocol !== 'https:' || x.username || x.password) return false;
  const h = x.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || (!h.includes('.') && !h.includes(':'))) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(h)) return false;
  if (h.includes(':') && (/^(::1?$|fe80:|fc|fd)/.test(h) || h.startsWith('::ffff:'))) return false;
  return true;
}
