// 직접 만든 캐릭터 — 관리 센터 › 🧑 캐릭터.
//   AI 세션 없이 출근하는 직원을 만들거나, 실제 AI 세션에 인적사항 · 외모 · 말풍선을 입힌다.
//   이름 · 국적 · 나이 · MBTI · 도시 · 취미 · 모자 · 색 · 레벨 · 직급 · 직책 · 코인 · 월급 · 행동(패턴) · 말풍선 · 자리.
(function () {
  const esc = AIO.esc, tr = (...a) => AIO.tr(...a);
  const C = { host: null, data: null, edit: null, err: null, busy: false };
  const HAT_KO = { beanie: '털모자', beret: '베레모', bucket: '버킷햇', headphones: '헤드폰', cap: '야구모자', bow: '리본', shades: '선글라스', ears: '동물 귀', none: '없음' };
  const PLACE = { jail: '🚔 감옥', dungeon: '🐉 던전', vault: '🏦 금고' };
  const COLORS = ['#e2667f', '#4e7cf6', '#2fb27f', '#f0a03c', '#a67be0', '#00a3bf', '#e5534b', '#7a5a3a', '#3b332b', '#f6c445'];
  const toast = (m) => { const t = document.createElement('div'); t.className = 'mg-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  async function call(path, method = 'GET', body) {
    const o = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) o.body = JSON.stringify(body);
    const r = await AIO.auth.api(path, o);
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  }
  async function load() { try { C.data = await call('/api/chars'); C.err = null; } catch (e) { C.err = e.message; } render(); }
  const flag = (nat) => ((C.data && C.data.nations) || []).find((n) => n.code === nat) || { flag: '', ko: nat };

  function card(c) {
    const f = flag(c.nat), beh = (C.data.behaviors || {})[c.behavior] || c.behavior;
    const step = c.step && c.behavior === 'pattern' ? ` → ${esc(((C.data.behaviors || {})[c.step.act] || c.step.act))}${c.step.left ? ` (${c.step.left}${tr('분')})` : ''}` : '';
    const sess = c.sessionId ? (C.data.sessions || []).find((s) => s.id === c.sessionId) : null;
    return `<div class="ch-card ${C.edit && C.edit.id === c.id ? 'on' : ''} ${c.hidden ? 'off' : ''}">
      <div class="ch-av" style="--c:${/^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#e2667f'}"><span>${esc((c.name || '?').slice(0, 1))}</span></div>
      <div class="ch-tx"><b>${f.flag} ${esc(AIO.pname(c))}</b>${AIO.pname(c) !== c.name ? ` <small>${esc(c.name)}</small>` : ''}${c.gender === 'F' ? ' <span class="ch-g f">♀</span>' : c.gender === 'M' ? ' <span class="ch-g m">♂</span>' : ''} <span class="ch-see" title="${tr('공개 범위')}">${c.see === 'admin' ? '🔒 ' + tr('나만') : typeof c.see === 'number' ? '👥 ' + esc(tr((C.data.tiers || [])[c.see] || '')) + '+' : '🌐 ' + tr('모두')}</span> <small>${esc(tr(f.ko || ''))} · ${tr('{0}세', c.age)} · Lv.${c.level || 1}${c.rank ? ' · ' + esc(c.rank) : ''}</small>
        <div class="ch-sub">${c.sessionId ? `🔗 ${tr('세션에 입힘')}: ${esc(sess ? sess.title : c.sessionId)}${sess ? '' : ` <em>(${tr('지금 없음')})</em>`}` : `${esc(tr(beh))}${step}`}${c.hidden ? ` · <em>${tr('숨김')}</em>` : ''}</div>
        <div class="ch-sub">💰 ${c.wallet ? Number(c.wallet.coins || 0).toLocaleString() : '—'}${c.wallet && c.wallet.pay ? ` · ${tr('월급 {0}', Number(c.wallet.pay.monthly).toLocaleString())}` : ''}${c.ctl && c.ctl.assign ? ` · 📍 ${tr('자리 고정')}` : ''}${c.bubble ? ` · 💬 ${esc(c.bubble)}` : ''}</div></div>
      <div class="ch-btns">${PLACE[c.place] ? `<span class="ch-jail">${PLACE[c.place]}</span><button class="btn ghost sm" data-ch="free" data-v="${esc(c.id)}" title="${tr('꺼내기')}">🔓</button>` : `<button class="btn ghost sm" data-ch="jail" data-v="${esc(c.id)}" title="${tr('감옥 보내기')}">🚔</button><button class="btn ghost sm" data-ch="dungeon" data-v="${esc(c.id)}" title="${tr('던전 보내기')}">🐉</button>`}<button class="btn ghost sm" data-ch="edit" data-v="${esc(c.id)}">✏️</button><button class="btn ghost sm" data-ch="see" data-v="${esc(c.id)}" title="${tr('사무실에서 보기')}">👁</button></div></div>`;
  }

  function sel(k, opts, v) { return `<select class="mg-in" data-chf="${k}">${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; }
  const inp = (k, v, ph, type = 'text', extra = '') => `<input class="mg-in" type="${type}" data-chf="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph || '')}" ${extra}>`;
  const row = (l, h) => `<label class="ch-row"><span>${tr(l)}</span><div>${h}</div></label>`;

  function editor() {
    const e = C.edit, D = C.data, isNew = !e.id;
    const beh = Object.entries(D.behaviors || {}), works = Object.entries(D.works || {});
    let h = `<div class="ch-ed"><div class="ch-edh"><h3>${isNew ? '➕ ' + tr('새 캐릭터') : '✏️ ' + esc(e.name)}</h3><button class="btn ghost sm" data-ch="close">✕</button></div>`;
    h += `<section><h4>🪪 ${tr('인적사항')}</h4>${row('이름', inp('name', e.name, '홍길동') + `<button class="btn ghost sm" data-ch="rand">🎲 ${tr('무작위')}</button>`)}`;
    h += row('성별', sel('gender', Object.entries(D.genders || { M: '남성', F: '여성', X: '기타 · 밝히지 않음' }).map(([k, l]) => [k, (k === 'M' ? '♂ ' : k === 'F' ? '♀ ' : '') + tr(l)]), e.gender || 'X'));
    h += row('국적', sel('nat', (D.nations || []).map((n) => [n.code, `${n.flag} ${tr(n.ko)}`]), e.nat) + `<button class="btn ghost sm" data-ch="randnat">🎲 ${tr('나라 · 이름')}</button>`);
    h += row('나이', inp('age', e.age, '30', 'number', 'min="18" max="99"')) + row('MBTI', sel('mbti', [['', '—'], ...(D.mbti || []).map((m) => [m, m])], e.mbti || ''));
    h += row('출신 도시', inp('city', e.city, '서울')) + row('취미', inp('hobby', e.hobby, '등산')) + `</section>`;
    h += `<section><h4>🎨 ${tr('외모')}</h4>${row('모자', sel('hat', (D.hats || []).map((x) => [x, tr(HAT_KO[x] || x)]), e.hat || 'beanie'))}`;
    h += row('색', `<input type="color" data-chf="color" value="${esc(e.color || '#e2667f')}"><span class="ch-sws">${COLORS.map((c) => `<button class="ch-sw" data-ch="color" data-v="${c}" style="--c:${c}"></button>`).join('')}</span>`) + `</section>`;
    h += `<section><h4>🎖️ ${tr('직급 · 소속')}</h4>${row('레벨', inp('level', e.level || 1, '1', 'number', 'min="1" max="99"'))}${row('직급', inp('rank', e.rank, tr('비우면 레벨대로')))}${row('직책', inp('role', e.role, tr('예: 디자인 팀장')))}${row('소속 프로젝트', inp('project', e.project, 'ai-office'))}</section>`;
    h += `<section><h4>💰 ${tr('돈')}</h4>${row('코인 (지금 지갑)', inp('coins', e.coins ?? (e.wallet ? e.wallet.coins : 0), '0', 'number', 'min="0"'))}`;
    h += `<label class="mg-chk"><input type="checkbox" data-chf="payroll" ${e.payroll !== false ? 'checked' : ''}> ${tr('월급 받기 (레벨 · 근속 연수대로 매일 일급)')}</label>${e.wallet && e.wallet.pay ? `<div class="muted">${tr('지금 월급 {0} · 주급 {1} · 일급 {2}', Number(e.wallet.pay.monthly).toLocaleString(), Number(e.wallet.pay.weekly).toLocaleString(), Number(e.wallet.pay.daily).toLocaleString())}</div>` : ''}</section>`;
    h += `<section><h4>🔗 ${tr('어디에 쓸까')}</h4><label class="mg-chk"><input type="radio" name="chmode" data-chmode="free" ${!e.sessionId ? 'checked' : ''}> ${tr('독립 직원 — AI 세션 없이 출근해 정한 대로 움직여요')}</label>`;
    h += `<label class="mg-chk"><input type="radio" name="chmode" data-chmode="session" ${e.sessionId ? 'checked' : ''}> ${tr('AI 세션에 입히기 — 그 세션의 이름 · 외모 · 말풍선이 이 캐릭터로')}</label>`;
    h += `<div class="ch-sess" ${e.sessionId ? '' : 'hidden'}>${sel('sessionId', [['', tr('세션 고르기')], ...(D.sessions || []).map((s) => [s.id, `${s.title}`.slice(0, 60)])], e.sessionId || '')}</div></section>`;
    h += `<section class="ch-beh" ${e.sessionId ? 'hidden' : ''}><h4>🎬 ${tr('행동')}</h4>${row('행동', sel('behavior', beh.map(([k, l]) => [k, tr(l)]), e.behavior || 'work'))}`;
    h += `<div data-show="work" ${e.behavior === 'work' || !e.behavior ? '' : 'hidden'}>${row('작업 종류', sel('work', works.map(([k, l]) => [k, tr(l)]), e.work || 'edit'))}</div>`;
    h += row('활동 문구', inp('label', e.label, tr('예: 기획서 쓰는 중')));
    h += `<div data-show="pattern" ${e.behavior === 'pattern' ? '' : 'hidden'}><div class="ch-pat">${(e.pattern || []).map((p, i) => `<div class="ch-step" data-i="${i}">${sel('p.act', beh.filter(([k]) => k !== 'pattern').map(([k, l]) => [k, tr(l)]), p.act)}<input class="mg-in" type="number" min="1" max="600" data-chp="min" value="${p.min}"><span>${tr('분')}</span><input class="mg-in" data-chp="label" value="${esc(p.label || '')}" placeholder="${tr('문구 (선택)')}"><button class="btn ghost sm" data-ch="pdel" data-v="${i}">✕</button></div>`).join('')}</div><button class="btn ghost sm" data-ch="padd">＋ ${tr('단계 추가')}</button><div class="muted">${tr('위에서부터 정한 분만큼씩 돌아가며 반복해요 (예: 일하기 50분 → 휴식 10분)')}</div></div>`;
    h += `</section><section><h4>💬 ${tr('말풍선 · 위치')}</h4>${row('말풍선', inp('bubble', e.bubble, tr('예: 오늘도 화이팅!')))}`;
    h += e.id && !e.sessionId ? `<div class="mm-row"><button class="btn ghost sm" data-ch="place">📍 ${tr('자리 지정 (빌딩 관리)')}</button><button class="btn ghost sm" data-ch="autoplace">🤖 ${tr('자동 배치로')}</button>${e.ctl && e.ctl.assign ? `<span class="muted">${tr('지금: 자리 고정')}</span>` : `<span class="muted">${tr('지금: 행동에 맞춰 자동')}</span>`}</div>` : `<div class="muted">${tr('저장한 뒤에 자리를 지정할 수 있어요')}</div>`;
    const see = e.see == null ? 'public' : e.see;
    h += `</section><section><h4>👁 ${tr('공개 범위 — 누가 이 캐릭터를 볼 수 있나')}</h4>`
      + `<label class="mg-chk"><input type="radio" name="chsee" data-chsee="public" ${see === 'public' ? 'checked' : ''}> 🌐 ${tr('모두 (로그인 안 한 방문자도)')}</label>`
      + `<label class="mg-chk"><input type="radio" name="chsee" data-chsee="tier" ${typeof see === 'number' ? 'checked' : ''}> 👥 ${tr('로그인한 계정 중')} <select class="mg-in" data-chf="seeTier">${(D.tiers || []).map((t, i) => `<option value="${i}" ${see === i ? 'selected' : ''}>${esc(tr(t))}</option>`).join('')}</select> ${tr('등급 이상')}</label>`
      + `<label class="mg-chk"><input type="radio" name="chsee" data-chsee="admin" ${see === 'admin' ? 'checked' : ''}> 🔒 ${tr('나만 (관리자)')}</label>`
      + `<div class="muted">${tr('못 보는 사람에게는 서버가 이 캐릭터를 아예 보내지 않아요. 세션에 입힌 경우엔 그 사람에게 원래 인물로 보여요.')}</div>`;
    if (e.id) h += `<div class="mm-row ch-sendto"><span class="muted">${tr('보내기')}:</span>${PLACE[e.place] ? `<b>${PLACE[e.place]}${tr('에 있어요')}</b><button class="btn ghost sm" data-ch="free" data-v="${esc(e.id)}">🔓 ${tr('꺼내기')}</button>` : `<button class="btn ghost sm" data-ch="jail" data-v="${esc(e.id)}">🚔 ${tr('감옥')}</button><button class="btn ghost sm" data-ch="dungeon" data-v="${esc(e.id)}">🐉 ${tr('비밀던전')}</button><button class="btn ghost sm" data-ch="vault" data-v="${esc(e.id)}">🏦 ${tr('금고')}</button>`}<span class="muted">${tr('감옥 · 던전에 있는 동안은 정직(월급 0%)')}</span></div>`;
    h += `<label class="mg-chk"><input type="checkbox" data-chf="hidden" ${e.hidden ? 'checked' : ''}> ${tr('잠시 출근시키지 않기 (숨김)')}</label></section>`;
    h += `<div class="ch-foot">${e.id ? `<button class="btn ghost sm danger" data-ch="del">🗑 ${tr('삭제')}</button>` : ''}<span class="mm-sp"></span><button class="btn" data-ch="save">${isNew ? tr('만들기') : tr('저장')}</button></div></div>`;
    return h;
  }

  function render() {
    const h = C.host; if (!h) return;
    if (C.err) { h.innerHTML = `<div class="mg-err">⚠️ ${esc(tr(C.err))} <button class="btn ghost sm" data-ch="reload">${tr('다시 불러오기')}</button></div>`; return; }
    if (!C.data) { h.innerHTML = `<div class="muted">${tr('불러오는 중…')}</div>`; return; }
    const L = C.data.list || [];
    h.innerHTML = `<div class="ch"><div class="ch-left"><div class="mm-row"><b>${tr('직접 만든 캐릭터')} <span class="mm-n">${L.length}</span></b><span class="mm-sp"></span><button class="btn sm" data-ch="new">＋ ${tr('새 캐릭터')}</button></div>
      <div class="ch-list">${L.length ? L.map(card).join('') : `<div class="mm-empty"><div class="mm-big">🧑</div><b>${tr('아직 만든 캐릭터가 없어요')}</b><p>${tr('AI 세션 없이 사무실에 출근하는 직원을 만들거나, AI 세션에 이름 · 외모 · 말풍선을 입힐 수 있어요.')}</p></div>`}</div></div>
      <div class="ch-right">${C.edit ? editor() : `<div class="muted ch-pad">${tr('캐릭터를 고르거나 새로 만드세요')}</div>`}</div></div>`;
  }

  function collect() {
    const e = C.edit, v = (k) => { const el = C.host.querySelector(`[data-chf="${k}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
    for (const k of ['name', 'gender', 'nat', 'age', 'mbti', 'city', 'hobby', 'hat', 'color', 'level', 'rank', 'role', 'project', 'coins', 'payroll', 'behavior', 'work', 'label', 'bubble', 'hidden']) { const x = v(k); if (x !== undefined) e[k] = x; }
    const sv = C.host.querySelector('[data-chsee]:checked');
    if (sv) e.see = sv.dataset.chsee === 'tier' ? +(v('seeTier') || 0) : sv.dataset.chsee;
    const mode = C.host.querySelector('[data-chmode]:checked');
    e.sessionId = mode && mode.dataset.chmode === 'session' ? v('sessionId') || '' : '';
    e.pattern = [...C.host.querySelectorAll('.ch-step')].map((r) => ({ act: r.querySelector('[data-chf="p.act"]').value, min: +r.querySelector('[data-chp=min]').value || 30, label: r.querySelector('[data-chp=label]').value }));
  }

  async function act(b) {
    const k = b.dataset.ch, v = b.dataset.v;
    try {
      if (k === 'reload') return load();
      if (k === 'new') { const r = await call('/api/chars/random'); C.edit = { ...r, see: 'public', hat: 'beanie', color: COLORS[Math.floor(Math.random() * COLORS.length)], level: 1, behavior: 'work', work: 'edit', payroll: true, pattern: [], coins: 0 }; return render(); }
      if (k === 'edit') { const c = (C.data.list || []).find((x) => x.id === v); C.edit = JSON.parse(JSON.stringify(c)); return render(); }
      if (k === 'close') { C.edit = null; return render(); }
      if (k === 'jail' || k === 'dungeon' || k === 'vault' || k === 'free') {
        const c = (C.data.list || []).find((x) => x.id === v); if (!c) return;
        const sid = c.sessionId || 'custom:' + c.id;
        if (k !== 'free' && !confirm(tr('「{0}」을(를) {1}(으)로 보낼까요?', c.name, tr({ jail: '감옥', dungeon: '비밀던전', vault: '금고' }[k])))) return;
        await call('/api/place', 'POST', { id: sid, place: k === 'free' ? null : k });
        toast(k === 'free' ? tr('🔓 꺼냈어요') : tr('{0}(으)로 보냈어요', PLACE[k]));
        await load(); if (C.edit && C.edit.id === c.id) { C.edit.place = k === 'free' ? null : k; render(); } return;
      }
      if (k === 'see') { const c = (C.data.list || []).find((x) => x.id === v); const sid = c.sessionId || 'custom:' + c.id; AIO.manage.close && AIO.manage.close(); AIO.ui.open('S:' + sid); return; }
      if (!C.edit) return;
      collect();
      if (k === 'rand' || k === 'randnat') { const g = C.edit.gender === 'M' || C.edit.gender === 'F' ? C.edit.gender : ''; const r = await call('/api/chars/random?' + (k === 'rand' ? 'nat=' + encodeURIComponent(C.edit.nat || 'KR') + '&' : '') + (g ? 'gender=' + g : '')); Object.assign(C.edit, k === 'rand' ? { name: r.name } : r); return render(); }
      if (k === 'color') { C.edit.color = v; return render(); }
      if (k === 'padd') { (C.edit.pattern = C.edit.pattern || []).push({ act: C.edit.pattern.length % 2 ? 'rest' : 'work', min: C.edit.pattern.length % 2 ? 10 : 50, label: '' }); return render(); }
      if (k === 'pdel') { C.edit.pattern.splice(+v, 1); return render(); }
      if (k === 'place') { AIO.manage.open('building', { sid: 'custom:' + C.edit.id }); return; }
      if (k === 'autoplace') { await AIO.manage.setMeta('custom:' + C.edit.id, { assign: null, lock: false, action: null }); toast(tr('🤖 자동 배치로 돌렸어요')); return load(); }
      if (k === 'del') { if (!confirm(tr('「{0}」 캐릭터를 지울까요? (지갑 기록은 남아요)', C.edit.name))) return; await call('/api/chars/' + C.edit.id, 'DELETE'); C.edit = null; toast(tr('지웠어요')); return load(); }
      if (k === 'save') {
        const e = C.edit;
        if (e.behavior === 'pattern' && !(e.pattern || []).length) return toast(tr('패턴 단계를 하나 이상 넣어 주세요'));
        if (!e.sessionId && C.host.querySelector('[data-chmode="session"]:checked')) return toast(tr('입힐 세션을 골라 주세요'));
        const body = { ...e }; delete body.id; delete body.step; delete body.live; delete body.wallet; delete body.place; delete body.ctl; delete body.createdAt; delete body.updatedAt; delete body.seeTier;
        body.coins = Number(e.coins) || 0;
        const r = e.id ? await call('/api/chars/' + e.id, 'POST', body) : await call('/api/chars', 'POST', body);
        C.edit = { ...r.char, coins: body.coins }; toast(tr('🧑 저장했어요 — 사무실에 바로 반영돼요')); return load();
      }
    } catch (err) { toast('⚠️ ' + tr(err.message)); }
  }

  function mount(host) {
    if (C.host !== host) {
      C.host = host;
      host.addEventListener('click', (ev) => { const b = ev.target.closest('[data-ch]'); if (b) { ev.preventDefault(); act(b); } });
      host.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t.matches('[data-chf=behavior]')) { const w = t.value; host.querySelectorAll('[data-show]').forEach((d) => { d.hidden = d.dataset.show !== w; }); }
        if (t.matches('[data-chmode]')) { const s = t.dataset.chmode === 'session'; host.querySelector('.ch-sess').hidden = !s; host.querySelector('.ch-beh').hidden = s; }
      });
    }
    render(); load();
  }
  AIO.chars = { mount, reload: load };
})();
