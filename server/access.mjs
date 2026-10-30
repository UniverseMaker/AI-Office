// 정보공개 세분화: 등급 계정이 볼 수 있는 세션 정보는 **서버에서** 걸러서 보낸다 (브라우저 소스를 열어도 받은 적 없는 정보는 없다).
//   항목: title(제목·프로젝트) · activity(지금 하는 일·마지막 요청·할 일) · stats(통계·팀원) · memo(메모·업무 연결)
//         · conversation(대화 내용) · progress(진행·인사이트) · archive(보관본 열람·내려받기)
//   세션마다 { 항목: 최소 등급 } — 없으면 기본 정책(관리자 설정), 기본 정책도 없으면 관리자만(99).
import { redactSession, redactState } from './redact.mjs';
import { ADMIN_TIER, TIERS } from './auth.mjs';

export const CATS = [
  ['title', '제목 · 프로젝트'], ['activity', '지금 하는 일 · 마지막 요청'], ['stats', '통계 · 팀원 이름'], ['memo', '메모 · 업무 연결'],
  ['conversation', '대화 내용'], ['progress', '진행 · 인사이트'], ['archive', '보관본 열람 · 내려받기'],
];

/** 이 세션의 항목 cat 을 tier 가 볼 수 있나 */
export function allowed(policy, defaults, cat, tier) {
  if (tier >= ADMIN_TIER) return true;
  const need = policy && policy[cat] != null ? policy[cat] : defaults && defaults[cat] != null ? defaults[cat] : ADMIN_TIER;
  return tier >= need;
}

/** 등급 계정용 세션: 비로그인 모양에서 시작해 허용된 항목만 원본에서 다시 채운다 */
function sessionFor(s, tier, policyOf, defaults) {
  const r = redactSession(s);
  const pol = policyOf(s.id);
  const ok = (c) => allowed(pol, defaults, c, tier);
  if (ok('title')) { r.title = s.title; r.project = s.project; r.model = s.model; r.app = s.app; }
  if (ok('activity')) { r.activity = s.activity; r.lastPrompt = s.lastPrompt; r.todos = s.todos; r.turnStartedAt = s.turnStartedAt; }
  if (ok('stats')) { r.stats = s.stats; r.roster = s.roster; r.agents = s.agents; }
  if (ok('memo')) r.meta = s.meta;
  r.wallet = s.wallet;
  r.can = Object.fromEntries(CATS.map(([c]) => [c, ok(c)]));
  return r;
}

/** 보는 사람(viewer: null=비로그인 · {admin} · {tier})에 맞춘 상태 */
/** 직접 만든 캐릭터의 공개 범위: 못 보는 사람에게는 독립 캐릭터는 아예 빼고, 세션에 입힌 인적사항은 원래대로 */
function hideChars(out, tier) {
  const gone = new Set();
  out.sessions = out.sessions.filter((r) => {
    const c = r.custom; if (!c) return true;
    const min = c.seeMin == null ? -1 : c.seeMin;
    if (tier >= min) { delete c.seeMin; return true; }
    if (!c.linked) { gone.add(r.id); return false; }
    r.persona = r.basePersona || null; r.look = null; delete r.bubble; delete r.custom; return true;
  });
  out.sessions.forEach((r) => { delete r.basePersona; });
  if (gone.size) out.feed = (out.feed || []).filter((f) => !gone.has(f.sid));
  return out;
}

export function stateFor(state, viewer, { policyOf, defaults, configured }) {
  if (viewer && viewer.admin) return { ...state, auth: { authed: true, admin: true, user: viewer.user, tierName: '관리자' } };
  return hideChars(stateFor0(state, viewer, { policyOf, defaults, configured }), viewer ? viewer.tier : -1);
}
function stateFor0(state, viewer, { policyOf, defaults, configured }) {
  const base = redactState(state, configured);
  base.ranks = state.ranks;
  base.building = { floors: Object.fromEntries(Object.entries((state.building && state.building.floors) || {}).map(([k, f]) => [k, f.title ? { title: f.title } : {}])) };
  if (!viewer) { base.sessions.forEach((r, i) => { r.wallet = state.sessions[i].wallet; }); return base; }
  const sessions = state.sessions.map((s) => sessionFor(s, viewer.tier, policyOf, defaults));
  const titled = new Map(sessions.map((s) => [s.id, s.can.title]));
  // 소식: 제목을 볼 수 있는 세션만 원문, 나머지는 일반 문구
  const feed = (state.feed || []).map((f, i) => (titled.get(f.sid) ? state.feed[i] : base.feed[i]));
  return { ...base, sessions, feed, auth: { authed: true, admin: false, user: viewer.user, tier: viewer.tier, tierName: TIERS[viewer.tier] } };
}
