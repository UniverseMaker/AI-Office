// 회사 관리 — 관리 센터 › 💼 회사. 직원(AI 세션 · 직접 만든 캐릭터) 급여 · 성과금 · 벌금 · 개별 월급 · 은행(예금 · 대출 · 상환) · 회사 자금.
//   잔고는 마이너스가 될 수 있고, 마이너스는 바로 대출로 바뀌어 매일 복리 이자가 붙는다(한도 넘으면 신용불량 + 가산 이자).
(function () {
  const esc = AIO.esc, tr = (...a) => AIO.tr(...a);
  const P = { host: null, data: null, sel: null, q: '', filter: 'all', sort: 'pay', err: null, showSet: false };
  const n = (v) => Math.round(Number(v) || 0).toLocaleString();
  const money = (v) => `<span class="${Number(v) < 0 ? 'neg' : ''}">${n(v)}</span>`;
  const PLACE = { jail: '정직(감옥)', dungeon: '정직(던전)', stopped: '휴직', vault: '금고', paused: '재직', active: '재직' };
  const ST_C = { '정상': '#2fb27f', '대출 중': '#4e7cf6', '주의': '#e9a23b', '신용불량': '#e5534b' };
  const toast = (m) => { const t = document.createElement('div'); t.className = 'mg-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  async function call(path, body) {
    const r = await AIO.auth.api(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  }
  async function load() { try { P.data = await call('/api/company'); P.err = null; } catch (e) { P.err = e.message; } render(); }

  function list() {
    const q = P.q.trim().toLowerCase();
    let L = (P.data.employees || []).filter((e) => !q || [e.name, e.title, e.rank].some((x) => String(x || '').toLowerCase().includes(q)));
    const w = (e) => e.wallet || {};
    if (P.filter === 'debt') L = L.filter((e) => w(e).loan > 0);
    if (P.filter === 'bad') L = L.filter((e) => w(e).status === '신용불량');
    if (P.filter === 'custom') L = L.filter((e) => e.custom);
    const key = { pay: (e) => -((w(e).pay || {}).monthly || 0), coins: (e) => -(w(e).coins || 0), loan: (e) => -(w(e).loan || 0), name: (e) => e.name };
    const f = key[P.sort] || key.pay;
    return L.sort((a, b) => { const x = f(a), y = f(b); return typeof x === 'string' ? x.localeCompare(y) : x - y; });
  }

  function kpis() {
    const E = P.data.employees || [], D = P.data;
    const payroll = E.reduce((k, e) => k + ((e.wallet && e.wallet.pay && e.wallet.pay.monthly) || 0), 0);
    const tile = (l, v, cls = '') => `<div class="co-kpi ${cls}"><small>${tr(l)}</small><b>${v}</b></div>`;
    return `<div class="co-kpis">${tile('🏢 회사 자금', money(D.fund), D.fund < 0 ? 'bad' : 'main')}${tile('👥 직원', E.length)}${tile('💵 월 급여 총액', n(payroll))}${tile('👛 총 잔고', money(D.coins))}${tile('🐷 총 예금', n(D.deposits))}${tile('💸 총 대출', `<span class="neg">${n(D.loans)}</span>`, D.loans > 0 ? 'warn' : '')}${tile('🚨 신용불량', D.bad, D.bad ? 'bad' : '')}</div>`;
  }

  function row(e) {
    const w = e.wallet || {}, p = w.pay || {};
    const st = w.status || '정상';
    return `<tr class="${P.sel === e.id ? 'on' : ''}" data-co-row="${esc(e.id)}">
      <td><b>${esc(e.flag || '')} ${esc(AIO.pname(e))}</b>${e.custom ? ` <span class="co-tag">🧑 ${tr('직접')}</span>` : ''}<small>${esc(e.title && e.title !== e.name ? e.title : '')}</small></td>
      <td>${esc(e.rank || '')}<small>Lv.${e.level}</small></td>
      <td>${esc(tr(PLACE[e.place] || '재직'))}</td>
      <td class="num" data-l="${tr('월급')}">${n(p.monthly)}${w.salaryOverride != null ? ' <span class="co-tag" title="' + tr('개별 월급') + '">✏️</span>' : ''}</td>
      <td class="num" data-l="${tr('잔고')}">${money(w.coins)}</td><td class="num" data-l="${tr('예금')}">${n(w.deposit)}</td><td class="num" data-l="${tr('대출')}">${w.loan ? `<span class="neg">${n(w.loan)}</span>` : '—'}</td>
      <td class="co-cr" data-l="${tr('신용')}"><span class="co-st" style="--c:${ST_C[st] || '#8a7f72'}">${esc(tr(st))}</span><small>${w.credit || ''}</small></td>
      <td class="co-acts"><button data-co="pay1" data-v="${esc(e.id)}" title="${tr('월급 한 달치 지급')}">💵</button><button data-co="bonus1" data-v="${esc(e.id)}" title="${tr('성과금')}">🎁</button><button data-co="fine1" data-v="${esc(e.id)}" title="${tr('벌금 · 감봉')}">🔻</button></td></tr>`;
  }

  function detail() {
    const e = (P.data.employees || []).find((x) => x.id === P.sel);
    if (!e) return `<div class="muted co-pad">${tr('직원을 고르면 급여 · 은행 업무를 할 수 있어요')}</div>`;
    const w = e.wallet || {}, p = w.pay || {};
    let h = `<div class="co-d"><div class="co-dh"><b>${esc(e.flag || '')} ${esc(AIO.pname(e))}</b><span class="co-st" style="--c:${ST_C[w.status] || '#8a7f72'}">${esc(tr(w.status || '정상'))} · ${tr('신용')} ${w.credit || '—'}</span><button class="btn ghost sm" data-co="close">✕</button></div>`;
    h += `<div class="co-mini">${[['잔고', money(w.coins)], ['예금', n(w.deposit)], ['대출', w.loan ? `<span class="neg">${n(w.loan)}</span>` : '0'], ['누적 이자', n(w.interestTotal)], ['월급', n(p.monthly)], ['누적 성과금', n(w.bonusTotal)]].map(([l, v]) => `<div><small>${tr(l)}</small><b>${v}</b></div>`).join('')}</div>`;
    h += `<section><h4>💵 ${tr('지급 · 차감')}</h4><div class="mm-row"><select class="mg-in" data-cof="kind"><option value="bonus">🎁 ${tr('성과금 (일시불)')}</option><option value="salary">💵 ${tr('월급 지급 (비우면 한 달치)')}</option><option value="fine">🔻 ${tr('벌금 · 감봉')}</option><option value="adjust">± ${tr('조정 (마이너스 가능)')}</option></select><input class="mg-in" type="number" data-cof="amount" placeholder="${tr('금액')}"><input class="mg-in wide" data-cof="memo" placeholder="${tr('사유 (예: 분기 성과)')}"><button class="btn sm" data-co="pay">${tr('실행')}</button></div></section>`;
    h += `<section><h4>✏️ ${tr('개별 월급')}</h4><div class="mm-row"><input class="mg-in" type="number" min="0" data-cof="salary" value="${w.salaryOverride != null ? w.salaryOverride : ''}" placeholder="${tr('기본: 레벨 · 근속대로')} (${n(p.monthly)})"><button class="btn ghost sm" data-co="salary">${tr('저장')}</button>${w.salaryOverride != null ? `<button class="btn ghost sm" data-co="salaryReset">${tr('기본으로')}</button>` : ''}</div><div class="muted">${tr('근무 상태(휴직 50% · 정직 0%)는 그대로 반영돼요')}</div></section>`;
    h += `<section><h4>🏦 ${tr('은행')}</h4><div class="mm-row"><input class="mg-in" type="number" min="1" data-cof="bank" placeholder="${tr('금액')}"><button class="btn ghost sm" data-co="bank" data-v="deposit">🐷 ${tr('예금')}</button><button class="btn ghost sm" data-co="bank" data-v="withdraw">${tr('출금')}</button><button class="btn ghost sm" data-co="bank" data-v="borrow">💸 ${tr('대출')}</button><button class="btn ghost sm" data-co="bank" data-v="repay">✅ ${tr('상환')}</button></div>`;
    h += `<div class="muted">${tr('대출 일 {0}% 복리 · 한도 넘으면 +{1}%/일 · 월급의 {2}% 자동 상환', P.data.bank.bankLoanRate, P.data.bank.bankLateAdd, P.data.bank.bankAutoRepay)}</div></section>`;
    h += `<section><h4>📜 ${tr('거래 내역')}</h4><div class="co-led">${(w.ledger || []).map((l) => `<div><span>${new Date(l.at).toLocaleString()}</span><b>${esc(tr(l.kind))}</b><span class="num ${l.amount < 0 ? 'neg' : 'pos'}">${l.amount > 0 ? '+' : ''}${n(l.amount)}</span><small>${esc(l.memo || '')}</small></div>`).join('') || `<span class="muted">${tr('기록이 없어요')}</span>`}</div></section></div>`;
    return h;
  }

  function settingsCard() {
    const b = P.data.bank, pay = P.data.pay || {};
    const num = (k, v, l, step = '0.1') => `<label class="co-set"><span>${tr(l)}</span><input class="mg-in" type="number" step="${step}" data-coset="${k}" value="${v}"></label>`;
    const chk = (k, v, l) => `<label class="mg-chk"><input type="checkbox" data-coset="${k}" ${v ? 'checked' : ''}> ${tr(l)}</label>`;
    return `<details class="co-card" ${P.showSet ? 'open' : ''}><summary>⚙️ ${tr('은행 · 급여 규칙')}</summary><div class="co-sets">
      ${num('bankLoanRate', b.bankLoanRate, '대출 이자 (%/일, 복리)')}${num('bankLateAdd', b.bankLateAdd, '신용불량 가산 (%/일)')}${num('bankDepositRate', b.bankDepositRate, '예금 이자 (%/일)', '0.01')}
      ${num('bankLimitMonths', b.bankLimitMonths, '대출 한도 (월급의 몇 배)', '1')}${num('bankAutoRepay', b.bankAutoRepay, '월급날 자동 상환 (%)', '1')}
      ${num('payBase', pay.payBase, 'Lv.1 기본 월급', '100')}${num('payStep', pay.payStep, '레벨당 +%', '1')}${num('payRaise', pay.payRaise, '근속 1년당 인상 %', '1')}${num('payYearDays', pay.payYearDays, '근속 1년 = 실제 며칠', '1')}
      </div>${chk('companyPays', b.companyPays !== false, '월급 · 성과금은 회사 자금에서 나감')}${chk('bankCredit', b.bankCredit !== false, '돈이 없으면 외상(마이너스)으로 밥 사 먹기')}${chk('bankJail', b.bankJail, '신용불량이 되면 자동으로 감옥행')}${chk('payOn', pay.payOn !== false, '매일 일급 지급')}</details>`;
  }

  function render() {
    const h = P.host; if (!h) return;
    if (P.err) { h.innerHTML = `<div class="mg-err">⚠️ ${esc(tr(P.err))} <button class="btn ghost sm" data-co="reload">${tr('다시 불러오기')}</button></div>`; return; }
    if (!P.data) { h.innerHTML = `<div class="muted">${tr('불러오는 중…')}</div>`; return; }
    const L = list();
    h.innerHTML = `<div class="co">${kpis()}
      <div class="mm-row co-tools"><input class="mg-search" data-coq placeholder="🔎 ${tr('이름 · 직급 검색')}" value="${esc(P.q)}">${[['all', '전체'], ['debt', '💸 빚 있음'], ['bad', '🚨 신용불량'], ['custom', '🧑 직접 만든']].map(([k, l]) => `<button class="mm-seg ${P.filter === k ? 'on' : ''}" data-co="filter" data-v="${k}">${tr(l)}</button>`).join('')}
        <select class="mg-in" data-cosort>${[['pay', '월급순'], ['coins', '잔고순'], ['loan', '대출순'], ['name', '이름순']].map(([k, l]) => `<option value="${k}" ${P.sort === k ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select>
        <span class="mm-sp"></span><button class="btn ghost sm" data-co="bulkPay">💵 ${tr('전원 월급')}</button><button class="btn ghost sm" data-co="bulkBonus">🎁 ${tr('전원 성과금')}</button><button class="btn ghost sm" data-co="fund">🏢 ${tr('회사 자금 ±')}</button></div>
      <div class="co-split"><div class="co-tbl mg-scroll"><table class="mg-table"><thead><tr><th>${tr('직원')}</th><th>${tr('직급')}</th><th>${tr('근무')}</th><th>${tr('월급')}</th><th>${tr('잔고')}</th><th>${tr('예금')}</th><th>${tr('대출')}</th><th>${tr('신용')}</th><th></th></tr></thead><tbody>${L.map(row).join('') || `<tr><td colspan="9" class="muted">${tr('직원이 없어요')}</td></tr>`}</tbody></table></div>
        <div class="co-right">${detail()}${settingsCard()}<details class="co-card"><summary>🏢 ${tr('회사 자금 내역')}</summary><div class="co-led">${(P.data.ledger || []).map((l) => `<div><span>${new Date(l.at).toLocaleString()}</span><b>${esc(tr(l.kind))}</b><span class="num ${l.amount < 0 ? 'neg' : 'pos'}">${l.amount > 0 ? '+' : ''}${n(l.amount)}</span><small>${esc(l.memo || '')}</small></div>`).join('') || `<span class="muted">${tr('기록이 없어요')}</span>`}</div></details></div></div></div>`;
  }

  const val = (sel) => { const el = P.host.querySelector(sel); return el ? el.value : ''; };
  async function act(b) {
    const k = b.dataset.co, v = b.dataset.v;
    try {
      if (k === 'reload') return load();
      if (k === 'filter') { P.filter = v; return render(); }
      if (k === 'close') { P.sel = null; return render(); }
      if (k === 'pay1') { const e = P.data.employees.find((x) => x.id === v); if (!confirm(tr('{0} 에게 월급 한 달치({1})를 지급할까요?', e.name, n(e.wallet && e.wallet.pay && e.wallet.pay.monthly)))) return; await call('/api/company/pay', { id: v, kind: 'salary', memo: '수동 지급' }); toast(tr('💵 지급했어요')); return load(); }
      if (k === 'bonus1' || k === 'fine1') { const e = P.data.employees.find((x) => x.id === v); const a = prompt(tr(k === 'bonus1' ? '{0} 성과금 (일시불)' : '{0} 벌금 · 감봉 금액', e.name), k === 'bonus1' ? '1000' : '500'); if (!a) return; const memo = prompt(tr('사유 (선택)'), '') || ''; await call('/api/company/pay', { id: v, kind: k === 'bonus1' ? 'bonus' : 'fine', amount: +a, memo }); toast(k === 'bonus1' ? tr('🎁 성과금을 줬어요') : tr('🔻 차감했어요')); return load(); }
      if (k === 'pay') { const kind = val('[data-cof=kind]'), amt = val('[data-cof=amount]'); if (kind !== 'salary' && !amt) return toast(tr('금액을 넣어 주세요')); await call('/api/company/pay', { id: P.sel, kind, amount: amt === '' ? null : +amt, memo: val('[data-cof=memo]') }); toast(tr('처리했어요')); return load(); }
      if (k === 'salary' || k === 'salaryReset') { await call('/api/company/salary', { id: P.sel, monthly: k === 'salaryReset' ? null : val('[data-cof=salary]') }); toast(tr('월급을 바꿨어요')); return load(); }
      if (k === 'bank') { const a = +val('[data-cof=bank]'); if (!(a > 0)) return toast(tr('금액을 넣어 주세요')); await call('/api/bank', { id: P.sel, op: v, amount: a }); toast({ deposit: tr('🐷 예금했어요'), withdraw: tr('출금했어요'), borrow: tr('💸 대출했어요'), repay: tr('✅ 상환했어요') }[v]); return load(); }
      if (k === 'bulkPay') { if (!confirm(tr('직원 전원에게 월급 한 달치를 지급할까요? (회사 자금에서 나가요)'))) return; const r = await call('/api/company/bulk', { kind: 'salary', memo: '전원 월급' }); toast(tr('💵 {0}명에게 지급했어요', r.count)); return load(); }
      if (k === 'bulkBonus') { const a = prompt(tr('직원 전원 성과금 (1인당)'), '500'); if (!a) return; const memo = prompt(tr('사유 (선택)'), '') || ''; const r = await call('/api/company/bulk', { kind: 'bonus', amount: +a, memo }); toast(tr('🎁 {0}명에게 줬어요', r.count)); return load(); }
      if (k === 'fund') { const a = prompt(tr('회사 자금에 넣을 금액 (빼려면 마이너스)'), '100000'); if (!a) return; await call('/api/company/fund', { amount: +a, memo: prompt(tr('사유 (선택)'), '') || '' }); toast(tr('🏢 회사 자금을 바꿨어요')); return load(); }
    } catch (e) { toast('⚠️ ' + tr(e.message)); }
  }

  function mount(host) {
    if (P.host !== host) {
      P.host = host;
      host.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-co]'); if (b) { ev.stopPropagation(); return act(b); }
        const r = ev.target.closest('[data-co-row]'); if (r) { P.sel = r.dataset.coRow; render(); }
      });
      host.addEventListener('input', (ev) => { if (ev.target.matches('[data-coq]')) { P.q = ev.target.value; const pos = ev.target.selectionStart; render(); const q = host.querySelector('[data-coq]'); q.focus(); q.setSelectionRange(pos, pos); } });
      host.addEventListener('change', async (ev) => {
        const t = ev.target;
        if (t.matches('[data-cosort]')) { P.sort = t.value; return render(); }
        if (t.matches('[data-coset]')) {
          P.showSet = true;
          try { await call('/api/settings', { [t.dataset.coset]: t.type === 'checkbox' ? t.checked : +t.value }); toast(tr('규칙을 저장했어요')); load(); } catch (e) { toast('⚠️ ' + e.message); }
        }
      });
    }
    render(); load();
  }
  AIO.company = { mount, reload: load };
})();
