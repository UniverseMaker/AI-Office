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

const W = (id) => db.wallets[id] || (db.wallets[id] = { coins: 0, earned: 0, workMs: 0, items: [], meals: 0, last: null, loan: 0, deposit: 0 });

// ---------------------------------------------------------------- 월급제
export const PAY_DEFAULT = { payOn: true, payBase: 3000, payStep: 8, payRaise: 5, payYearDays: 7 };
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const round = (n) => Math.round(n);
/** 급여표: 레벨 기본급 → 근속 인상 → 근무 상태 반영. 월급 · 주급 · 일급 · 시급 */
export function payOf(s, cfg = {}, now = Date.now(), override = null) {
  const c = { ...PAY_DEFAULT, ...cfg };
  const lv = Math.max(1, s.level || 1);
  const base = c.payBase * (1 + (c.payStep / 100) * (lv - 1));                 // 레벨 1단계마다 기본급 +payStep%
  const days = Math.max(0, (now - (s.startedAt || now)) / 864e5);
  const years = Math.floor(days / Math.max(1, c.payYearDays));                 // 근속 1년 = 실제 payYearDays 일
  const raise = Math.pow(1 + c.payRaise / 100, years);
  const pl = s.place;
  const [status, factor] = pl === 'jail' || pl === 'dungeon' ? ['정직', 0] : pl === 'stopped' ? ['휴직', 0.5] : ['재직', 1];
  const monthly = (override != null ? override : base * raise) * factor;   // 회사 관리에서 정한 개별 월급이 있으면 그걸로
  const nextYearIn = (years + 1) * c.payYearDays - days;
  return { level: lv, base: round(base), years, raisePct: Math.round((raise - 1) * 1000) / 10, status, factor,
    monthly: round(monthly), weekly: round((monthly * 12) / 52), daily: round(monthly / 30), hourly: Math.round((monthly / 30 / 8) * 10) / 10,
    nextRaiseDays: Math.max(0, Math.round(nextYearIn * 10) / 10), nextMonthly: round((override != null ? override : base * Math.pow(1 + c.payRaise / 100, years + 1)) * factor), yearDays: c.payYearDays, override: override != null };
}
/** 하루에 한 번 일급 지급 (놓친 날은 7일치까지) */
function payroll(s, w, cfg, now) {
  const today = dayKey(now);
  if (!w.payDay) { w.payDay = today; dirty = true; return null; }             // 처음 본 날은 기준만
  if (w.payDay === today) return null;
  let n = Math.round((new Date(today + 'T00:00:00') - new Date(w.payDay + 'T00:00:00')) / 864e5);
  n = Math.max(1, Math.min(7, n));
  const p = payOf(s, cfg, now, w.salaryOverride);
  const perf = Math.floor(w.perfToday || 0);
  const amount = p.daily * n;
  w.lastMonthly = p.monthly || w.lastMonthly;
  fromCompany(w, amount, '월급(일급)', `${n}일치 · ${p.status}`, 'auto', cfg); w.earned += amount; w.salaryTotal = (w.salaryTotal || 0) + amount;
  autoRepay(w, amount, { ...BANK_DEFAULT, ...cfg });
  const slip = { at: now, day: today, days: n, base: p.base, years: p.years, raisePct: p.raisePct, status: p.status, daily: p.daily, amount, perf };
  w.slips = [slip, ...(w.slips || [])].slice(0, 30);
  w.payDay = today; w.perfToday = 0; dirty = true;
  return amount > 0 ? slip : null;
}
const own = (w, id) => w.items.some((x) => x.id === id);
const best = (w, cat) => { let b = null; for (const x of w.items) { const it = byId.get(x.id); if (it && it.cat === cat && (!b || it.price > b.price)) b = it; } return b; };

function buy(w, it, by = 'auto', credit = false) {
  if (w.coins < it.price && !credit) return false;
  w.coins = Math.round((w.coins - it.price) * 100) / 100;
  led(w, credit && w.coins < 0 ? '외상 구매' : '구매', -it.price, it.icon + ' ' + it.name);
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
    if (pay && pay.payOn !== false && !(s.custom && s.custom.noPay)) { const slip = payroll(s, W(s.id), pay, now); if (slip) bought.push({ sid: s.id, pay: slip }); }
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
    if (!did && w.coins <= 12 && pay && pay.bankCredit !== false && Math.random() < 0.08) {   // 돈이 없어도 배는 고프다 → 외상
      const f = SHOP.filter((x) => x.cat === 'food' && x.price <= 10)[Math.floor(Math.random() * 3)];
      if (f && buy(w, f, 'auto', true)) did = f;
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
  const p = s && pay && pay.payOn !== false ? payOf(s, pay, Date.now(), w ? w.salaryOverride : null) : null;
  if (w && p && p.monthly) w.lastMonthly = p.monthly;
  if (!w) return { coins: 0, earned: 0, workMin: 0, home: null, car: null, items: [], meals: 0, last: null, pay: p, slips: [] };
  const icon = (cat) => { const b = best(w, cat); return b ? { id: b.id, icon: b.icon, name: b.name } : null; };
  return { coins: Math.floor(w.coins), earned: Math.floor(w.earned), workMin: Math.round(w.workMs / 60000), home: icon('home'), car: icon('car'), items: w.items.map((x) => byId.get(x.id)).filter(Boolean).map((x) => ({ id: x.id, icon: x.icon, name: x.name, cat: x.cat })), meals: w.meals, last: w.last, pay: p, slips: (w.slips || []).slice(0, 10), salaryTotal: Math.floor(w.salaryTotal || 0), perfTotal: Math.floor(w.perfTotal || 0), perfToday: Math.floor(w.perfToday || 0),
    loan: Math.round(w.loan || 0), deposit: Math.round(w.deposit || 0), status: w.status || '정상', credit: creditOf(w, { ...BANK_DEFAULT, ...(pay || {}) }), interestTotal: Math.round(w.interestTotal || 0), bonusTotal: Math.round(w.bonusTotal || 0), salaryOverride: w.salaryOverride ?? null, ledger: (w.ledger || []).slice(0, 12) };
}
export function adminBuy(id, itemId) { const it = byId.get(itemId); if (!it) return { ok: false, error: '없는 상품' }; const w = W(id); if (it.cat !== 'food' && own(w, it.id)) return { ok: false, error: '이미 가지고 있어요' }; return buy(w, it, 'admin') ? { ok: true } : { ok: false, error: '코인이 모자라요' }; }
/** 지갑 코인을 정확히 이 값으로 (직접 만든 캐릭터 설정) */
export function setCoins(id, coins) { const n = Number(coins); if (!Number.isFinite(n) || Math.abs(n) > 1e12) return { ok: false, error: '숫자' }; const w = W(id); const d = n - w.coins; w.coins = n; led(w, '잔고 설정', d, '관리자가 잔고를 직접 정함' + (n < 0 ? ' (마이너스 → 대출로 전환돼요)' : '')); dirty = true; return { ok: true }; }
export function grant(id, coins) { const n = Number(coins); if (!Number.isFinite(n)) return { ok: false }; const w = W(id); w.coins += n; led(w, n >= 0 ? '지급' : '차감', n, '관리자'); dirty = true; return { ok: true }; }
// ---------------------------------------------------------------- 은행 · 회사 자금
//   잔고(coins)는 마이너스가 될 수 있다 → 마이너스가 되는 순간 그만큼 '대출'로 바뀌고 잔고는 0.
//   대출은 매일 복리 이자(bankLoanRate %/일). 한도(월급 × bankLimitMonths)를 넘으면 신용불량 + 가산 이자(bankLateAdd %/일) → 점점 구렁텅이.
//   월급날 일급의 bankAutoRepay % 를 자동 상환. 예금에는 bankDepositRate %/일 이자. 월급 · 성과금은 회사 자금에서 나간다(companyPays).
export const BANK_DEFAULT = { bankLoanRate: 1.5, bankLateAdd: 1, bankDepositRate: 0.1, bankLimitMonths: 6, bankAutoRepay: 30, bankJail: false, bankCredit: true, companyPays: true };
const DAY = 864e5;
const r2 = (n) => Math.round(n * 100) / 100;
if (!db.company) db.company = { fund: 1000000, ledger: [] };
const C = () => db.company;
function led(w, kind, amount, memo) {
  w.ledger = [{ at: Date.now(), kind, amount: r2(amount), bal: r2(w.coins), loan: r2(w.loan || 0), memo: memo || '' }, ...(w.ledger || [])].slice(0, 80);
  dirty = true;
}
function cled(kind, amount, memo, who) {
  const c = C(); c.ledger = [{ at: Date.now(), kind, amount: r2(amount), fund: r2(c.fund), memo: memo || '', who: who || '' }, ...(c.ledger || [])].slice(0, 200);
  dirty = true;
}
/** 회사 자금에서 직원에게 (amount<0 이면 직원 → 회사) */
function fromCompany(w, amount, kind, memo, who, cfg) {
  w.coins += amount;
  if (!cfg || cfg.companyPays !== false) { C().fund -= amount; cled(kind, -amount, memo, who); }
  led(w, kind, amount, memo);
}
const limitOf = (w, cfg) => Math.max(1000, (w.lastMonthly || 3000) * (cfg.bankLimitMonths || 6));
function statusOf(w, cfg) {
  const loan = w.loan || 0; if (loan <= 0.5) return '정상';
  const lim = limitOf(w, cfg);
  return loan > lim ? '신용불량' : loan > lim * 0.5 ? '주의' : '대출 중';
}
const creditOf = (w, cfg) => Math.max(300, Math.min(950, Math.round(900 - ((w.loan || 0) / limitOf(w, cfg)) * 450 + Math.min(50, (w.deposit || 0) / 2000))));
/** 모든 지갑: 마이너스 → 대출 전환, 이자, 신용 상태. 돌려주는 값 = 새로 신용불량이 된 지갑 id */
export function bankTick(cfgIn, now = Date.now()) {
  const cfg = { ...BANK_DEFAULT, ...(cfgIn || {}) }, defaulted = [];
  for (const [id, w] of Object.entries(db.wallets)) {
    if (w.coins < 0) { const d = -w.coins; w.coins = 0; w.loan = (w.loan || 0) + d; led(w, '마이너스 → 대출', d, '잔고가 마이너스라 대출로 처리'); }
    const last = w.bankAt || now; w.bankAt = now;
    const dt = Math.max(0, Math.min(now - last, 7 * DAY));
    if (dt > 0) {
      const st0 = statusOf(w, cfg);
      if ((w.loan || 0) > 0) {
        const rate = (cfg.bankLoanRate + (st0 === '신용불량' ? cfg.bankLateAdd : 0)) / 100;
        const add = w.loan * (Math.pow(1 + rate, dt / DAY) - 1);
        w.loan += add; w.interestTotal = (w.interestTotal || 0) + add; w.interestToday = (w.interestToday || 0) + add; dirty = true;
      }
      if ((w.deposit || 0) > 0) { const add = w.deposit * (Math.pow(1 + cfg.bankDepositRate / 100, dt / DAY) - 1); w.deposit += add; w.depositInterest = (w.depositInterest || 0) + add; dirty = true; }
    }
    const day = dayKey(now);
    if (w.interestDay !== day) { if ((w.interestToday || 0) >= 0.01) led(w, '대출 이자', -w.interestToday, (statusOf(w, cfg) === '신용불량' ? '연체 가산 · ' : '') + '하루치 이자가 대출에 붙음'); w.interestDay = day; w.interestToday = 0; }
    const st = statusOf(w, cfg);
    if (st === '신용불량' && w.status !== '신용불량') defaulted.push(id);
    w.status = st;
  }
  return defaulted;
}
/** 월급날 자동 상환 */
function autoRepay(w, salary, cfg) {
  if (!(w.loan > 0) || !(salary > 0)) return;
  const amt = Math.min(w.loan, w.coins, salary * (cfg.bankAutoRepay || 0) / 100);
  if (amt <= 0) return;
  w.coins -= amt; w.loan -= amt; led(w, '자동 상환', -amt, `월급의 ${cfg.bankAutoRepay}%`);
}
/** 관리자 · 회사: 은행 업무 */
export function bankOp(id, op, amount, cfgIn) {
  const cfg = { ...BANK_DEFAULT, ...(cfgIn || {}) }, w = W(id), a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return { ok: false, error: '0보다 큰 금액' };
  if (op === 'deposit') { if (w.coins < a) return { ok: false, error: '잔고가 모자라요' }; w.coins -= a; w.deposit = (w.deposit || 0) + a; led(w, '예금', -a, '잔고 → 예금'); }
  else if (op === 'withdraw') { if ((w.deposit || 0) < a) return { ok: false, error: '예금이 모자라요' }; w.deposit -= a; w.coins += a; led(w, '예금 출금', a, '예금 → 잔고'); }
  else if (op === 'borrow') { w.loan = (w.loan || 0) + a; w.coins += a; led(w, '대출', a, `일 ${cfg.bankLoanRate}% 복리`); }
  else if (op === 'repay') { const p = Math.min(a, w.loan || 0); if (p <= 0) return { ok: false, error: '갚을 대출이 없어요' }; w.coins -= p; w.loan -= p; led(w, '상환', -p, w.coins < 0 ? '잔고가 모자라 마이너스 → 다시 대출로 잡혀요' : ''); }
  else return { ok: false, error: '모르는 업무' };
  w.status = statusOf(w, cfg); dirty = true;
  return { ok: true };
}
/** 회사: 월급 · 성과금 · 벌금 · 조정 (amount 는 직원 기준 +/-) */
export function companyPay(id, kind, amount, memo, who, cfgIn) {
  const cfg = { ...BANK_DEFAULT, ...(cfgIn || {}) }, a = Number(amount);
  if (!Number.isFinite(a) || a === 0) return { ok: false, error: '금액을 넣어 주세요' };
  if (Math.abs(a) > 1e9) return { ok: false, error: '금액이 너무 커요' };
  const w = W(id);
  const label = { salary: '월급(수동)', bonus: '성과금', fine: '벌금 · 감봉', adjust: '조정' }[kind] || '조정';
  fromCompany(w, kind === 'fine' ? -Math.abs(a) : a, label, memo, who, cfg);
  if (kind === 'salary') { w.salaryTotal = (w.salaryTotal || 0) + a; autoRepay(w, a, cfg); }
  if (kind === 'bonus') { w.bonusTotal = (w.bonusTotal || 0) + a; w.earned += a; }
  return { ok: true };
}
/** 회사 자금 넣기 · 빼기 */
export function companyFund(amount, memo, who) { const a = Number(amount); if (!Number.isFinite(a) || a === 0) return { ok: false, error: '금액' }; C().fund += a; cled(a > 0 ? '자금 투입' : '자금 인출', a, memo, who); return { ok: true }; }
export function setSalary(id, monthly) { const w = W(id); if (monthly == null || monthly === '') delete w.salaryOverride; else { const n = Number(monthly); if (!Number.isFinite(n) || n < 0 || n > 1e8) return { ok: false, error: '0 이상 금액' }; w.salaryOverride = Math.round(n); } dirty = true; return { ok: true }; }
export function company(cfgIn) {
  const cfg = { ...BANK_DEFAULT, ...(cfgIn || {}) }, c = C();
  let loans = 0, deposits = 0, coins = 0, bad = 0;
  for (const w of Object.values(db.wallets)) { loans += w.loan || 0; deposits += w.deposit || 0; coins += w.coins || 0; if (statusOf(w, cfg) === '신용불량') bad++; }
  return { fund: Math.round(c.fund), ledger: (c.ledger || []).slice(0, 60), loans: Math.round(loans), deposits: Math.round(deposits), coins: Math.round(coins), bad, bank: cfg };
}
export function ledgerOf(id) { const w = db.wallets[id]; return w ? (w.ledger || []) : []; }

export const leaderboard = () => Object.entries(db.wallets).map(([id, w]) => ({ id, coins: Math.floor(w.coins), earned: Math.floor(w.earned) })).sort((a, b) => b.earned - a.earned);
