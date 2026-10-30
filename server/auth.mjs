// Auth: 관리자 1명(data/auth.json, set-admin.mjs 로만) + 관리자가 발급하는 등급 계정(data/users.json).
// 비밀번호는 scrypt 해시만 저장. 세션 토큰은 data/tokens.json { token: { exp, u } } (u 없으면 관리자).
// Cookie `aio_session` (HttpOnly, SameSite=Strict). Requests from a foreign Origin/Host are never authed.
// v6: 로그인 토큰은 sha256 해시로만 저장(파일이 새도 그대로 못 씀). 로그인 기록마다 계정 금고(vault.mjs) 열쇠 사본(vk)을 그 토큰으로 감싸 둔다.
import crypto from 'node:crypto';
import * as vault from './vault.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, now } from './util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// AI_OFFICE_DATA_DIR only for offline tests (keeps the real password file untouched)
export const DATA_DIR = path.resolve(process.env.AI_OFFICE_DATA_DIR || path.join(__dirname, '..', 'data'));
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const TOKEN_FILE = path.join(DATA_DIR, 'tokens.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
/** 계정 등급 (낮은 → 높은). 관리자는 99 */
export const TIERS = ['방문자', '방문연구원', '연구원', '연수연구원', '선임연구원', '책임연구원', '연구조교수', '연구부교수', '연구교수', '조교수', '부교수', '교수'];
export const ADMIN_TIER = 99;
let users = readJSON(USERS_FILE, {}) || {};
const COOKIE = 'aio_session';
const TTL = 30 * 86400e3;
const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;
const MAX_FAILS = 5;
const LOCK_MS = 30e3;
import { SELF_ORIGINS as SO, SELF_HOSTS as SH } from './config.mjs';
export const SELF_ORIGINS = new Set(SO);
const SELF_HOSTS = new Set(SH);

let auth = readJSON(AUTH_FILE);
let tokens = loadTokens();
let fails = 0;
let lockUntil = 0;
const ipFails = new Map();             // ip → { n, until, strikes, at }
let inflight = 0;
const ipOf = (req) => String(req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'local').trim().slice(0, 64);

function H(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }
/** 계정 금고 이름: 관리자 '@admin', 등급 계정 'u:<아이디>' */
export const acctOf = (u) => (u ? 'u:' + u : '@admin');
function loadTokens() {
  const raw = readJSON(TOKEN_FILE, {}) || {};
  const hashed = raw && raw.v === 2 && raw.t;                 // v2: { v:2, t: { sha256(token): rec } } · 옛 형식은 평문 토큰이 키 → 해시로 바꿔 다시 저장
  const src = hashed ? raw.t : raw;
  const t = now();
  const m = new Map();
  for (const [k, v] of Object.entries(src || {})) {
    if (!/^[0-9a-f]{64}$/.test(k)) continue;
    const rec = typeof v === 'number' ? { exp: v, u: null } : v && typeof v.exp === 'number' ? { exp: v.exp, u: v.u || null, ...(v.vk ? { vk: String(v.vk) } : {}) } : null;
    if (rec && rec.exp > t) m.set(hashed ? k : H(k), rec);
  }
  if (!hashed && Object.keys(raw || {}).length) { try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ v: 2, t: Object.fromEntries(m) }, null, 1)); } catch {} }
  return m;
}

function writeJSON(file, obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1));
  fs.renameSync(tmp, file);
}
const saveTokens = () => { try { writeJSON(TOKEN_FILE, { v: 2, t: Object.fromEntries(tokens) }); } catch {} };
/** 그 계정의 로그인이 하나도 안 남았으면 금고를 잠근다 */
function lockIfGone(u) { for (const v of tokens.values()) if ((v.u || null) === (u || null)) return; vault.lock(acctOf(u)); }
/** 로그인된 요청이 올 때: 금고가 잠겨 있으면 이 토큰으로 풀고, 이 로그인 기록에 열쇠 사본이 없으면 만들어 둔다 */
function touchVault(rec, raw) {
  try {
    const a = acctOf(rec.u);
    if (!vault.isUnlocked(a)) vault.unlockWithToken(a, raw, rec.vk);
    if (vault.isUnlocked(a) && !rec.vk) { const vk = vault.wrapForToken(a, raw); if (vk) { rec.vk = vk; saveTokens(); } }
  } catch {}
}

const scrypt = (pw, salt) => new Promise((res, rej) =>
  crypto.scrypt(String(pw), Buffer.from(salt, 'hex'), KEYLEN, SCRYPT, (e, k) => (e ? rej(e) : res(k))));

export async function makeHash(user, pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { user: String(user), salt, hash: (await scrypt(pw, salt)).toString('hex'), createdAt: now() };
}

// The admin account is fixed and lives only in data/auth.json (set with `node server/set-admin.mjs`),
// so pick up changes made there while the server is running.
let authMtime = 0;
function reloadAuth() {
  try {
    const m = fs.statSync(AUTH_FILE).mtimeMs;
    if (m !== authMtime) {
      const first = authMtime === 0;
      authMtime = m; auth = readJSON(AUTH_FILE);
      if (!first) tokens = loadTokens(); // account replaced via set-admin: drop old sessions
    }
  } catch { auth = null; authMtime = 0; }
}

const sameText = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

/** 로그인 확인 → 관리자면 { u: null }, 등급 계정이면 { u: 아이디 }, 실패면 null */
async function verify(user, pw) {
  reloadAuth();
  if (!isConfigured() || typeof pw !== 'string' || typeof user !== 'string') return null;
  const id = user.trim();
  if (sameText(id, auth.user || '')) {
    const k = await scrypt(pw, auth.salt), want = Buffer.from(auth.hash, 'hex');
    return k.length === want.length && crypto.timingSafeEqual(k, want) ? { u: null } : null;
  }
  const rec = Object.hasOwn(users, id) ? users[id] : null;
  if (!rec || rec.disabled) { await scrypt(pw, auth.salt); return null; }   // 시간 차로 아이디 존재 여부를 알 수 없게
  const k = await scrypt(pw, rec.salt), want = Buffer.from(rec.hash, 'hex');
  return k.length === want.length && crypto.timingSafeEqual(k, want) ? { u: id } : null;
}

// ---------------------------------------------------------------- 등급 계정 (관리자만 만든다)
const saveUsers = () => writeJSON(USERS_FILE, users);
const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9._-]{3,32}$/.test(id);
export function listUsers() { return Object.entries(users).map(([id, r]) => ({ id, name: r.name || '', tier: r.tier, tierName: TIERS[r.tier] || '', created: r.created, disabled: !!r.disabled, last: r.last || 0 })); }
export async function createUser({ id, password, tier, name }) {
  reloadAuth();
  if (!validId(id)) return { ok: false, error: '아이디는 영문·숫자·._- 3~32자' };
  if (id === auth?.user || Object.hasOwn(users, id) || ['__proto__', 'constructor', 'prototype'].includes(id)) return { ok: false, error: '이미 있는 아이디예요' };
  if (typeof password !== 'string' || password.length < 8) return { ok: false, error: '비밀번호는 8자 이상' };
  const t = Number(tier);
  if (!(t >= 0 && t < TIERS.length)) return { ok: false, error: '등급을 골라 주세요' };
  const salt = crypto.randomBytes(16).toString('hex');
  users[id] = { salt, hash: (await scrypt(password, salt)).toString('hex'), tier: t, name: String(name || '').slice(0, 40), created: now() };
  saveUsers();
  return { ok: true };
}
export async function updateUser(id, { tier, password, name, disabled }) {
  const r = users[id];
  if (!r) return { ok: false, error: '없는 계정이에요' };
  if (tier != null) { const t = Number(tier); if (!(t >= 0 && t < TIERS.length)) return { ok: false, error: '등급 오류' }; r.tier = t; }
  if (name != null) r.name = String(name).slice(0, 40);
  if (disabled != null) r.disabled = !!disabled;
  if (password) { if (String(password).length < 8) return { ok: false, error: '비밀번호는 8자 이상' }; r.salt = crypto.randomBytes(16).toString('hex'); r.hash = (await scrypt(password, r.salt)).toString('hex'); }
  if (password) { try { await vault.unlockWithPassword(acctOf(id), String(password)); } catch {} }   // 풀려 있던 금고는 새 비밀번호로 다시 감싼다
  if (password || disabled) { for (const [k, v] of tokens) if (v.u === id) tokens.delete(k); saveTokens(); vault.lock(acctOf(id)); }   // 비번 바꾸거나 정지하면 로그아웃 + 금고 잠금
  saveUsers();
  return { ok: true };
}
export function deleteUser(id) {
  if (!users[id]) return false;
  delete users[id]; saveUsers();
  vault.destroy(acctOf(id));
  for (const [k, v] of tokens) if (v.u === id) tokens.delete(k);
  saveTokens();
  return true;
}

export const isConfigured = () => !!(auth?.user && auth?.salt && auth?.hash);
export const AUTH_PATH = AUTH_FILE;

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** true when the request comes from our own page (no foreign Origin/Host, not cross-site). */
export function sameSite(req) {
  const o = req.headers.origin;
  if (o && !SELF_ORIGINS.has(o)) return false;
  const h = String(req.headers.host || '').toLowerCase();
  if (h && !SELF_HOSTS.has(h)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  return true;
}

function tokenOf(req) {
  const t = parseCookies(req)[COOKIE];
  return t && /^[0-9a-f]{64}$/.test(t) ? t : null;
}
/** `Authorization: Bearer <token>` — lets the page log in from any origin (file://, another host) without cookies */
function bearerOf(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer\s+([0-9a-f]{64})$/i);
  return m ? m[1].toLowerCase() : null;
}

/** for long-lived SSE streams: is this token still logged in? */
export function tokenValid(t) { reloadAuth(); const r = t ? tokens.get(H(t)) : null; return !!r && r.exp > now() && isConfigured() && (!r.u || (users[r.u] && !users[r.u].disabled)); }
/** 토큰 → 보는 사람 { admin, user, tier } (없으면 null = 비로그인) */
export function viewerOfToken(t) {
  if (!t || !tokenValid(t)) return null;
  const r = tokens.get(H(t));
  touchVault(r, t);
  if (!r.u) return { admin: true, user: auth?.user || 'admin', tier: ADMIN_TIER };
  const u = users[r.u];
  return { admin: false, user: r.u, name: u.name || '', tier: u.tier, tierName: TIERS[u.tier] };
}
const reqToken = (req) => bearerOf(req) || (sameSite(req) ? tokenOf(req) : null);
export function viewerOf(req) { reloadAuth(); return isConfigured() ? viewerOfToken(reqToken(req)) : null; }
export const requestToken = (req) => bearerOf(req) || tokenOf(req);

export function isAuthed(req) {
  reloadAuth();
  if (!isConfigured()) return false;
  // bearer tokens are explicit (a foreign page can't read them), so they work from any origin;
  // cookies are sent automatically, so they only count on our own page
  const t = bearerOf(req) || (sameSite(req) ? tokenOf(req) : null);
  if (!t) return false;
  const r = tokens.get(H(t));
  if (!r) return false;
  if (r.exp < now()) { tokens.delete(H(t)); saveTokens(); lockIfGone(r.u); return false; }
  if (!r.u) touchVault(r, t);
  return !r.u;                                     // 관리 API 는 관리자만 (등급 계정은 viewerOf 로 따로)
}

async function issue(u = null, pw = null) {
  const t = crypto.randomBytes(32).toString('hex');
  const at = now();
  for (const [k, v] of tokens) if (v.exp < at) tokens.delete(k);
  const rec = { exp: at + TTL, u };
  if (pw != null) { try { await vault.unlockWithPassword(acctOf(u), pw); const vk = vault.wrapForToken(acctOf(u), t); if (vk) rec.vk = vk; } catch (e) { console.error('[vault]', e.message); } }
  tokens.set(H(t), rec);
  if (u && users[u]) { users[u].last = at; try { saveUsers(); } catch {} }
  saveTokens();
  return { token: t, cookie: `${COOKIE}=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL / 1000}` };
}
const CLEAR = `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

/**
 * Handles /api/auth/*. Returns null when the path isn't an auth route,
 * otherwise { status, body, cookie?, public? } for index.mjs to send.
 */
export async function handleAuth(req, pathname, readBody) {
  if (!pathname.startsWith('/api/auth/')) return null;
  const route = pathname.slice('/api/auth/'.length);
  reloadAuth();
  if (route === 'me') { const v = viewerOf(req); return { status: 200, body: { configured: isConfigured(), authed: !!v, admin: !!v?.admin, user: v?.user || null, tier: v?.tier ?? null, tierName: v ? (v.admin ? '관리자' : v.tierName) : null }, public: true }; }
  if (req.method !== 'POST') return { status: 405, body: { ok: false, error: 'POST만 돼요' } };
  // login/logout work from any origin: they only hand out / revoke a bearer token (no cookie needed),
  // brute force is limited by the lockout below, and the server only listens on 127.0.0.1
  const body = (await readBody(req)) || {};

  // fixed admin account: never created or changed from the web
  if (route === 'setup' || route === 'change') return { status: 403, body: { ok: false, error: '관리자 계정은 이 PC에서 node server/set-admin.mjs 로만 설정해요' } };

  if (route === 'login') {
    if (!isConfigured()) return { status: 409, body: { ok: false, error: '관리자 계정이 아직 설정되지 않았어요 (node server/set-admin.mjs)', configured: false } };
    const t = now();
    const ip = ipOf(req);
    const rec = ipFails.get(ip) || { n: 0, until: 0, strikes: 0, at: t };
    const until = Math.max(lockUntil, rec.until);
    if (until > t) {
      const retryAfter = Math.ceil((until - t) / 1000);
      return { status: 429, body: { ok: false, error: `너무 많이 틀렸어요. ${retryAfter}초 후에 다시 시도하세요`, retryAfter }, headers: { 'Retry-After': String(retryAfter) } };
    }
    if (inflight >= 2) return { status: 429, body: { ok: false, error: '로그인 요청이 몰렸어요. 잠시 후 다시 시도하세요', retryAfter: 2 }, headers: { 'Retry-After': '2' } };
    // 실패를 먼저 센다 (동시에 쏟아지는 요청이 잠금 검사를 모두 통과하지 못하게)
    if (t - rec.at > 15 * 60e3) { rec.n = 0; rec.strikes = Math.max(0, rec.strikes - 1); }
    rec.n++; rec.at = t; ipFails.set(ip, rec);
    if (ipFails.size > 5000) for (const [k, v] of ipFails) if (v.until < t && t - v.at > 3600e3) ipFails.delete(k);
    inflight++;
    let who = null;
    try { who = await verify(body.user, body.password); } finally { inflight--; }
    if (who) {
      fails = 0; rec.n = 0; rec.strikes = 0;
      const { token, cookie } = await issue(who.u, body.password);
      // the cookie only helps on our own page; everywhere else the client keeps the token itself
      return { status: 200, body: { ok: true, token }, cookie: sameSite(req) ? cookie : null, public: true };
    }
    if (rec.n >= MAX_FAILS) { rec.n = 0; rec.until = now() + Math.min(15 * 60e3, LOCK_MS * 2 ** rec.strikes); rec.strikes++; }   // 30초 → 1분 → 2분 … 최대 15분
    if (++fails >= 50) { fails = 0; lockUntil = now() + 60e3; }                                                                // 여러 곳에서 몰아치면 전체 1분
    return { status: 401, body: { ok: false, error: '아이디 또는 비밀번호가 달라요' }, public: true };
  }

  if (route === 'logout') {
    let n = 0;
    for (const tk of [bearerOf(req), tokenOf(req)]) { const r = tk && tokens.get(H(tk)); if (r && tokens.delete(H(tk))) { n++; lockIfGone(r.u); } }
    if (n) saveTokens();
    return { status: 200, body: { ok: true }, cookie: CLEAR, public: true };
  }
  return { status: 404, body: { ok: false, error: 'not found' } };
}
