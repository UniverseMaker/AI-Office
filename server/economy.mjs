// 사내 재화(💰 코인): 세션이 일한 시간만큼 번다 → 알아서 밥 먹고 · 차 사고 · 집 산다. (data/economy.json)
//   일하는 중 1분 = 기본 1코인 (설정에서 배율) · 하네스 팀은 일하는 팀원 1명당 +0.5
//   월급제(v6): 직급(레벨) 기본급 × 근속 연수 인상률 → 매일 일급으로 지급(놓친 날은 최대 7일치까지 소급). 급여명세 30건 보관.
//               재직(일하는 중·쉬는 중) 100% · 휴직(중단) 50% · 정직(감옥·던전) 0%. 일한 시간 코인은 '성과급'으로 따로.
//   자동 소비: 배고프면 음식, 목표(집 → 차 → 취미) 가격이 모이면 큰 것을 산다. 관리자가 직접 사 주거나 지급할 수도 있다.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './auth.mjs';

const FILE = path.join(DATA_DIR, 'economy.json');
export const SHOP = [
  { id: 'coffee', cat: 'food', icon: '☕', name: '아메리카노', price: 5 },
  { id: 'kimbap', cat: 'food', icon: '🍙', name: '김밥', price: 8 },
  { id: 'ramen', cat: 'food', icon: '🍜', name: '라면', price: 10 },
  { id: 'chicken', cat: 'food', icon: '🍗', name: '치킨', price: 25 },
  { id: 'pizza', cat: 'food', icon: '🍕', name: '피자', price: 30 },
  { id: 'sushi', cat: 'food', icon: '🍣', name: '초밥', price: 60 },
  { id: 'hanwoo', cat: 'food', icon: '🥩', name: '한우 오마카세', price: 200 },
  { id: 'bike', cat: 'car', icon: '🚲', name: '자전거', price: 80 },
  { id: 'scooter', cat: 'car', icon: '🛵', name: '스쿠터', price: 300 },
  { id: 'compact', cat: 'car', icon: '🚗', name: '경차', price: 1200 },
  { id: 'sedan', cat: 'car', icon: '🚙', name: '세단', price: 3500 },
  { id: 'sports', cat: 'car', icon: '🏎️', name: '스포츠카', price: 9000 },
  { id: 'heli', cat: 'car', icon: '🚁', name: '헬리콥터', price: 30000 },
  { id: 'gosiwon', cat: 'home', icon: '🛏️', name: '고시원', price: 150 },
  { id: 'oneroom', cat: 'home', icon: '🏠', name: '원룸', price: 600 },
  { id: 'apt', cat: 'home', icon: '🏢', name: '아파트', price: 4000 },
  { id: 'house', cat: 'home', icon: '🏡', name: '마당 있는 집', price: 12000 },
  { id: 'penthouse', cat: 'home', icon: '🌆', name: '펜트하우스', price: 40000 },
  { id: 'island', cat: 'home', icon: '🏝️', name: '개인 섬', price: 150000 },
  { id: 'laptop', cat: 'hobby', icon: '💻', name: '최신 노트북', price: 400 },
  { id: 'console', cat: 'hobby', icon: '🎮', name: '게임기', price: 250 },
  { id: 'guitar', cat: 'hobby', icon: '🎸', name: '기타', price: 180 },
  { id: 'puppy', cat: 'hobby', icon: '🐶', name: '반려견', price: 500 },
  { id: 'trip', cat: 'hobby', icon: '✈️', name: '해외여행', price: 1500 },
];
const byId = new Map(SHOP.map((x) => [x.id, x]));
let db = { wallets: {} };
try { db = { wallets: {}, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}
let dirty = false;
setInterval(() => { if (!dirty) return; dirty = false; try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db)); } catch {} }, 15e3).unref();

const W = (id) => db.wallets[id] || (db.wallets[id] = { coins: 0, earned: 0, workMs: 0, items: [], meals: 0, last: null });

// ---------------------------------------------------------------- 월급제
export const PAY_DEFAULT = { payOn: true, payBase: 3000, payStep: 8, payRaise: 5, payYearDays: 7 };
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const round = (n) => Math.round(n);
/** 급여표: 레벨 기본급 → 근속 인상 → 근무 상태 반영. 월급 · 주급 · 일급 · 시급 */
export function payOf(s, cfg = {}, now = Date.now()) {
  const c = { ...PAY_DEFAULT, ...cfg };
  const lv = Math.max(1, s.level || 1);
  const base = c.payBase * (1 + (c.payStep / 100) * (lv - 1));                 // 레벨 1단계마다 기본급 +payStep%
  const days = Math.max(0, (now - (s.startedAt || now)) / 864e5);
  const years = Math.floor(days / Math.max(1, c.payYearDays));                 // 근속 1년 = 실제 payYearDays 일
  const raise = Math.pow(1 + c.payRaise / 100, years);
  const pl = s.place;
  const [status, factor] = pl === 'jail' || pl === 'dungeon' ? ['정직', 0] : pl === 'stopped' ? ['휴직', 0.5] : ['재직', 1];
  const monthly = base * raise * factor;
  const nextYearIn = (years + 1) * c.payYearDays - days;
  return { level: lv, base: round(base), years, raisePct: Math.round((raise - 1) * 1000) / 10, status, factor,
    monthly: round(monthly), weekly: round((monthly * 12) / 52), daily: round(monthly / 30), hourly: Math.round((monthly / 30 / 8) * 10) / 10,
    nextRaiseDays: Math.max(0, Math.round(nextYearIn * 10) / 10), nextMonthly: round(base * Math.pow(1 + c.payRaise / 100, years + 1) * factor), yearDays: c.payYearDays };
}
/** 하루에 한 번 일급 지급 (놓친 날은 7일치까지) */
function payroll(s, w, cfg, now) {
  const today = dayKey(now);
  if (!w.payDay) { w.payDay = today; dirty = true; return null; }             // 처음 본 날은 기준만
  if (w.payDay === today) return null;
  let n = Math.round((new Date(today + 'T00:00:00') - new Date(w.payDay + 'T00:00:00')) / 864e5);
  n = Math.max(1, Math.min(7, n));
  const p = payOf(s, cfg, now);
  const perf = Math.floor(w.perfToday || 0);
  const amount = p.daily * n;
  w.coins += amount; w.earned += amount; w.salaryTotal = (w.salaryTotal || 0) + amount;
  const slip = { at: now, day: today, days: n, base: p.base, years: p.years, raisePct: p.raisePct, status: p.status, daily: p.daily, amount, perf };
  w.slips = [slip, ...(w.slips || [])].slice(0, 30);
  w.payDay = today; w.perfToday = 0; dirty = true;
  return amount > 0 ? slip : null;
}
const own = (w, id) => w.items.some((x) => x.id === id);
const best = (w, cat) => { let b = null; for (const x of w.items) { const it = byId.get(x.id); if (it && it.cat === cat && (!b || it.price > b.price)) b = it; } return b; };

function buy(w, it, by = 'auto') {
  if (w.coins < it.price) return false;
  w.coins = Math.round((w.coins - it.price) * 100) / 100;
  if (it.cat === 'food') w.meals++; else w.items.push({ id: it.id, at: Date.now(), by });
  w.last = { id: it.id, icon: it.icon, name: it.name, at: Date.now(), by };
  dirty = true;
  return true;
}

/** 매 수집 주기: 일한 만큼 벌고, 가끔 알아서 쓴다. 돌려주는 값 = 이번에 산 것들 (소식용) */
export function tick(sessions, dtMs, rate = 1, auto = true, pay = null) {
  const bought = [], now = Date.now();
  for (const s of sessions) {
    if (s.kind === 'app') continue;
    if (pay && pay.payOn !== false) { const slip = payroll(s, W(s.id), pay, now); if (slip) bought.push({ sid: s.id, pay: slip }); }
    const busy = ['working', 'tool', 'thinking', 'delegating'].includes(s.status);
    const w = W(s.id);
    if (busy) {
      const team = (s.agents || []).filter((a) => a.status === 'working').length;
      const gain = (dtMs / 60000) * rate * (1 + 0.5 * team);
      w.coins += gain; w.earned += gain; w.workMs += dtMs; w.perfToday = (w.perfToday || 0) + gain; w.perfTotal = (w.perfTotal || 0) + gain; dirty = true;
    }
    // 자동 소비 (대략 2분에 한 번꼴로 살펴본다)
    if (!auto || Math.random() > dtMs / 120000) continue;
    const goals = [['home', 0.5], ['car', 0.3], ['hobby', 0.2]];
    let did = null;
    for (const [cat] of goals) {
      const have = best(w, cat);
      const next = SHOP.filter((x) => x.cat === cat && !own(w, x.id) && (!have || x.price > have.price)).sort((a, b) => a.price - b.price)[0];
      if (next && w.coins >= next.price * 1.15) { if (buy(w, next)) { did = next; break; } }
    }
    if (!did && w.coins > 12 && Math.random() < 0.35) {
      const foods = SHOP.filter((x) => x.cat === 'food' && x.price <= Math.max(5, w.coins * 0.08));
      const f = foods[Math.floor(Math.random() * foods.length)];
      if (f && buy(w, f)) did = f;
    }
    if (did) bought.push({ sid: s.id, item: did });
  }
  return bought;
}

/** 상태에 붙일 지갑 요약 */
export function walletOf(id, s = null, pay = null) {
  const w = db.wallets[id];
  const p = s && pay && pay.payOn !== false ? payOf(s, pay) : null;
  if (!w) return { coins: 0, earned: 0, workMin: 0, home: null, car: null, items: [], meals: 0, last: null, pay: p, slips: [] };
  const icon = (cat) => { const b = best(w, cat); return b ? { id: b.id, icon: b.icon, name: b.name } : null; };
  return { coins: Math.floor(w.coins), earned: Math.floor(w.earned), workMin: Math.round(w.workMs / 60000), home: icon('home'), car: icon('car'), items: w.items.map((x) => byId.get(x.id)).filter(Boolean).map((x) => ({ id: x.id, icon: x.icon, name: x.name, cat: x.cat })), meals: w.meals, last: w.last, pay: p, slips: (w.slips || []).slice(0, 10), salaryTotal: Math.floor(w.salaryTotal || 0), perfTotal: Math.floor(w.perfTotal || 0), perfToday: Math.floor(w.perfToday || 0) };
}
export function adminBuy(id, itemId) { const it = byId.get(itemId); if (!it) return { ok: false, error: '없는 상품' }; const w = W(id); if (it.cat !== 'food' && own(w, it.id)) return { ok: false, error: '이미 가지고 있어요' }; return buy(w, it, 'admin') ? { ok: true } : { ok: false, error: '코인이 모자라요' }; }
export function grant(id, coins) { const n = Number(coins); if (!Number.isFinite(n)) return { ok: false }; const w = W(id); w.coins = Math.max(0, w.coins + n); dirty = true; return { ok: true }; }
export const leaderboard = () => Object.entries(db.wallets).map(([id, w]) => ({ id, coins: Math.floor(w.coins), earned: Math.floor(w.earned) })).sort((a, b) => b.earned - a.earned);
