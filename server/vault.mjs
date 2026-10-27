// 계정 금고: 외부 시스템 토큰(FlowBoard 칸반 · 행정관리 …)을 "계정에 묶어서" 암호화해 둔다.
//
//   · 계정마다 무작위 데이터키(DEK, 32바이트) 하나 — 항목은 DEK 로 AES-256-GCM 암호화 (항목 이름을 AAD 로 묶어 바꿔치기 방지)
//   · DEK 는 디스크에 평문으로 없다. 두 가지 "열쇠"로만 감싸 둔다:
//       ① 비밀번호 → scrypt → KEK 로 감싼 사본 (data/vault.json)
//       ② 로그인 토큰 → HKDF 로 감싼 사본 (data/tokens.json 의 그 로그인 기록 — 토큰 자체는 해시만 저장하므로 서버 파일만으론 못 푼다)
//   · 그래서 서버가 막 켜졌을 땐 잠겨 있고, 그 계정이 로그인하거나 로그인된 화면이 접속해야 메모리에서 풀린다.
//     그 계정의 로그인이 모두 끝나면(로그아웃) 다시 잠근다.
//   · 처음 넣는 토큰(설치 시 CLI)은 "대기함"에 기계 키로 잠깐 봉인해 두었다가, 그 계정이 처음 풀릴 때 금고로 옮기고 지운다.
//   · 화면 · API 응답 · 로그 어디에도 평문을 내보내지 않는다(get 은 서버 내부 연동 모듈만 쓴다).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(process.env.AI_OFFICE_DATA_DIR || path.join(__dirname, '..', 'data'));
const FILE = path.join(DATA_DIR, 'vault.json');
const PENDING_KEY = path.join(DATA_DIR, 'vault.pending.key');
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const NAME_RE = /^[a-z][a-z0-9_-]{0,31}$/;

const deks = new Map();                 // 계정 → 풀린 DEK (메모리에만)

function load() { try { const j = JSON.parse(fs.readFileSync(FILE, 'utf8')); return j && j.v === 1 && j.accounts ? j : { v: 1, accounts: {} }; } catch { return { v: 1, accounts: {} }; } }
function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}
const b64 = (b) => Buffer.from(b).toString('base64');
const unb64 = (s) => Buffer.from(String(s || ''), 'base64');

function seal(key, plain, aad) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad) c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(Buffer.from(plain)), c.final()]);
  return b64(Buffer.concat([iv, c.getAuthTag(), ct]));
}
function open(key, blob, aad) {
  const raw = unb64(blob);
  if (raw.length < 29) throw new Error('short');
  const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  if (aad) d.setAAD(Buffer.from(aad));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]);
}
const kek = (pw, salt) => new Promise((res, rej) => crypto.scrypt(String(pw), unb64(salt), 32, SCRYPT, (e, k) => (e ? rej(e) : res(k))));
const tokKey = (token, acct) => Buffer.from(crypto.hkdfSync('sha256', Buffer.from(String(token)), Buffer.from('aio-vault-v1'), Buffer.from('session:' + acct), 32));

function pendingKey(create) {
  try { const k = Buffer.from(fs.readFileSync(PENDING_KEY, 'utf8').trim(), 'hex'); if (k.length === 32) return k; } catch {}
  if (!create) return null;
  const k = crypto.randomBytes(32);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PENDING_KEY, k.toString('hex'), { mode: 0o600 });
  return k;
}

/** 금고가 풀렸을 때: 대기함 항목을 금고로 옮긴다 */
function absorbPending(acct, dek) {
  const db = load(), a = db.accounts[acct];
  if (!a || !a.pending || !Object.keys(a.pending).length) return;
  const pk = pendingKey(false);
  if (!pk) return;
  a.items = a.items || {};
  for (const [name, blob] of Object.entries(a.pending)) {
    try { const v = open(pk, blob, 'pending:' + acct + ':' + name); a.items[name] = seal(dek, v, acct + ':' + name); } catch {}
  }
  delete a.pending;
  a.updated = Date.now();
  save(db);
  if (!Object.values(db.accounts).some((x) => x.pending && Object.keys(x.pending).length)) { try { fs.unlinkSync(PENDING_KEY); } catch {} }
}

function fresh(acct) { return { salt: b64(crypto.randomBytes(16)), pw: null, items: {}, created: Date.now() }; }

/** 비밀번호 로그인 성공 직후. 금고가 없으면 만들고, 있으면 푼다. (비밀번호가 바뀌어 못 풀면: 메모리에 풀린 키가 있으면 새 비밀번호로 다시 감싸고, 없으면 새 금고) */
export async function unlockWithPassword(acct, pw) {
  const db = load();
  let a = db.accounts[acct];
  let dek = null;
  if (a && a.pw) { try { dek = open(await kek(pw, a.salt), a.pw, 'pw:' + acct); } catch { dek = null; } }
  if (!dek && deks.has(acct)) dek = deks.get(acct);
  if (!dek) {
    if (a && a.pw) { a.lost = { at: Date.now(), items: Object.keys(a.items || {}) }; }   // 비밀번호가 바뀌어 옛 금고는 못 연다 → 새로 시작(대기함은 유지)
    const pending = a && a.pending;
    a = db.accounts[acct] = { ...fresh(acct), ...(pending ? { pending } : {}), ...(a && a.lost ? { lost: a.lost } : {}) };
    dek = crypto.randomBytes(32);
  }
  a.salt = b64(crypto.randomBytes(16));
  a.pw = seal(await kek(pw, a.salt), dek, 'pw:' + acct);
  a.updated = Date.now();
  db.accounts[acct] = a;
  save(db);
  deks.set(acct, dek);
  absorbPending(acct, dek);
  return true;
}

/** 로그인 토큰용 감싼 사본 (풀려 있을 때만) */
export function wrapForToken(acct, token) {
  const dek = deks.get(acct);
  return dek ? seal(tokKey(token, acct), dek, 'tok:' + acct) : null;
}
/** 서버 재시작 뒤 로그인된 화면이 접속하면 그 토큰으로 푼다 */
export function unlockWithToken(acct, token, wrapped) {
  if (deks.has(acct)) return true;
  if (!wrapped) {
    // 금고가 아직 없는 계정(처음 쓰는 경우) — 로그인된 사람이니 새로 만들어 이 토큰에 묶는다 (비밀번호 사본은 다음 비밀번호 로그인 때 추가)
    const db = load(), a = db.accounts[acct];
    if (a && (a.pw || Object.keys(a.items || {}).length)) return false;      // 진짜 금고가 있으면 비밀번호가 필요
    if (!a) { db.accounts[acct] = fresh(acct); save(db); }
    const dek = crypto.randomBytes(32);
    deks.set(acct, dek); absorbPending(acct, dek);
    return true;
  }
  try { const dek = open(tokKey(token, acct), wrapped, 'tok:' + acct); deks.set(acct, dek); absorbPending(acct, dek); return true; } catch { return false; }
}
/** 이미 있는 금고 · 토큰 사본 없음 · 메모리에도 없음 → 비밀번호로 다시 로그인해야 함 */
export const needsPassword = (acct) => !deks.has(acct) && !!load().accounts[acct];
export const isUnlocked = (acct) => deks.has(acct);
export function lock(acct) { const k = deks.get(acct); if (k) k.fill(0); deks.delete(acct); }
/** 계정을 지울 때 */
export function destroy(acct) { lock(acct); const db = load(); if (db.accounts[acct]) { delete db.accounts[acct]; save(db); } }

export function get(acct, name) {
  const dek = deks.get(acct);
  if (!dek || !NAME_RE.test(name)) return null;
  const a = load().accounts[acct];
  const blob = a && a.items && a.items[name];
  if (!blob) return null;
  try { return open(dek, blob, acct + ':' + name).toString('utf8'); } catch { return null; }
}
/** 값 저장 · 지우기 (value 가 빈 값이면 지움). 잠겨 있으면 false */
export function set(acct, name, value) {
  const dek = deks.get(acct);
  if (!dek || !NAME_RE.test(name)) return false;
  const db = load();
  const a = db.accounts[acct] || (db.accounts[acct] = fresh(acct));
  a.items = a.items || {};
  if (value == null || value === '') delete a.items[name]; else a.items[name] = seal(dek, String(value), acct + ':' + name);
  a.updated = Date.now();
  save(db);
  return true;
}
/** 저장돼 있는지만 (잠겨 있어도 알 수 있음 — 값은 안 보임) */
export function has(acct, name) { const a = load().accounts[acct]; return !!(a && ((a.items && a.items[name]) || (a.pending && a.pending[name]))); }
export function status(acct) {
  const a = load().accounts[acct];
  return { exists: !!a, unlocked: deks.has(acct), items: Object.keys((a && a.items) || {}), pending: Object.keys((a && a.pending) || {}), hasPassword: !!(a && a.pw), lost: a && a.lost ? a.lost : null };
}
/** 설치용: 아직 로그인 전인 계정에 토큰을 넣어 둔다 (대기함 — 그 계정이 처음 풀릴 때 금고로 옮겨진다) */
export function addPending(acct, name, value) {
  if (!NAME_RE.test(name)) throw new Error('bad name');
  if (deks.has(acct)) return set(acct, name, value);
  const db = load();
  const a = db.accounts[acct] || (db.accounts[acct] = fresh(acct));
  a.pending = a.pending || {};
  a.pending[name] = seal(pendingKey(true), String(value), 'pending:' + acct + ':' + name);
  save(db);
  return true;
}
