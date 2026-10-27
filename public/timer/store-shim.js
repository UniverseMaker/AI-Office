/* ========================================================================
   store-shim.js — 업무타이머 기록 · 설정 저장소 (화면은 js/timer-ui.js).
   기록 형식은 FlowBoard dbv61 store.js 와 같다 (예전에 저장한 기록 · 설정이 그대로 읽힌다).
   저장 위치만 바꿨다: 이 브라우저(localStorage) + 로그인한 계정(서버 /api/timer).
   카드(issue) 연결은 AI OFFICE 의 칸반 연동(AIO.kanban)으로 이어진다 — 집중 시간이 카드 작업 시간·댓글로 남는다.
   ==================================================================== */
(function (global) {
  'use strict';
  var U = global.U;
  var LS = 'aio.timer.db';
  function Store() {
    var db = null;
    try { db = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
    this.db = db || { settings: {}, pomodoroSessions: [] };
    this.db.settings = this.db.settings || {};
    this.db.pomodoroSessions = this.db.pomodoroSessions || [];
    this._subs = [];
    // 다른 창(새 창 타이머 · 다른 탭)에서 저장하면 이 창의 사본도 새로 읽는다 (덮어쓰기 방지)
    var self = this;
    try {
      global.addEventListener('storage', function (e) {
        if (e.key !== LS) return;
        try { var d = JSON.parse(e.newValue || 'null'); if (d) { d.settings = d.settings || {}; d.pomodoroSessions = d.pomodoroSessions || []; self.db = d; } } catch (er) {}
        if (global.Pomodoro && Pomodoro.refresh) Pomodoro.refresh();
      });
    } catch (e) {}
  }
  // ---- AI OFFICE 쪽 연결 (원본의 권한·감사·보드 개념을 단순화) ----
  Store.prototype.canUseTimer = function () { return true; };
  Store.prototype.canWriteAnyProject = function () { return true; };
  Store.prototype.canWriteProject = function () { return true; };
  Store.prototype.activeProjectId = function () { return (global.AIO && AIO.kanban && AIO.kanban.project()) || 'aio'; };
  Store.prototype.currentUserId = function () { return (global.AIO && AIO.auth && AIO.auth.state.user) || 'me'; };
  Store.prototype.audit = function () {};
  Store.prototype._stampSetting = function () {};
  Store.prototype._auditSetting = function () {};
  Store.prototype._changed = function () {
    try { localStorage.setItem(LS, JSON.stringify(this.db)); } catch (e) {}
    var self = this; clearTimeout(this._syncT);
    this._syncT = setTimeout(function () { self.push(); }, 800);
  };
  /** 서버(로그인 계정)에 저장 · 불러오기 */
  Store.prototype.push = function () {
    if (!global.AIO || !AIO.auth || !AIO.auth.state.authed || AIO.data.isDemo()) return;
    AIO.auth.api('/api/timer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: this.db.settings, pomodoroSessions: this.db.pomodoroSessions.slice(-2000) }) }).catch(function () {});
  };
  Store.prototype.pull = function () {
    var self = this;
    if (!global.AIO || !AIO.auth || !AIO.auth.state.authed || AIO.data.isDemo()) return Promise.resolve();
    return AIO.auth.api('/api/timer').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.data) return;
      // 서버 기록과 이 브라우저 기록을 합친다 (id 기준, 나중 수정이 이김)
      var map = {}; (self.db.pomodoroSessions || []).concat(j.data.pomodoroSessions || []).forEach(function (s) { var o = map[s.id]; if (!o || (s.updatedAt || '') > (o.updatedAt || '')) map[s.id] = s; });
      self.db.pomodoroSessions = Object.keys(map).map(function (k) { return map[k]; });
      if (j.data.settings && j.data.settings.pomodoro) self.db.settings.pomodoro = j.data.settings.pomodoro;
      try { localStorage.setItem(LS, JSON.stringify(self.db)); } catch (e) {}
      if (global.Pomodoro && Pomodoro.refresh) Pomodoro.refresh();
    }).catch(function () {});
  };
  // 카드 = 칸반(FlowBoard) 카드. id 는 카드 key(예: ARC-29)
  Store.prototype.issue = function (id) { return (global.AIO && AIO.kanban && AIO.kanban.card(id)) || (id != null ? { id: id, key: String(id), title: String(id) } : null); };
  Store.prototype.displayId = function (issue) { return issue ? (issue.key || '#' + issue.id) : ''; };
  Store.prototype.logWork = function (issueId, hours, note) { if (global.AIO && AIO.kanban) AIO.kanban.logWork(issueId, hours, note); return this.issue(issueId); };

  // ---- 아래는 FlowBoard dbv61 store.js 원문 ----
  function defaultPomodoroSettings() {
    return {
      workMin: 25, shortMin: 5, longMin: 15, cyclesPerLong: 4,
      autoStartBreak: false, autoStartWork: false,
      sound: true, notify: true, dailyGoal: 8,
      // dbv5 ④: alarm sound id played on phase completion. 'beep' keeps the
      // legacy oscillator (back-compat); other ids play sounds/<id>.wav. The
      // Object.assign backfill in _migrate/accessors preserves existing values,
      // so only new DBs adopt 'beep' explicitly (older ones already default here).
      alarmSound: 'beep',
      volume: 70,                  // AI OFFICE v6: 알림음 크기 (0–100)
      // v19 additions (idempotent — Object.assign in accessors/_migrate backfills these):
      presets: [15, 25, 45, 60],   // #4 quick-duration chips (minutes); user-editable
      tabTitle: true,              // #3/P0-3 browser tab title countdown
      askReflection: true,         // #6/P0-4 post-work reflection prompt (v21: UI retired, field kept for back-compat)
      tags: [],                    // P1 recent session tags (MRU list)
      // v20 addition (idempotent backfill): timer clock display theme
      // v21: default flipped disc → ledmatrix. NOTE (R3): Object.assign backfill in
      // _migrate/accessors PRESERVES an existing account's clockTheme, so only new
      // DBs and seed adopt 'ledmatrix'; migrated accounts keep their prior choice.
      clockTheme: 'ledmatrix',     // 'disc' | 'bignum' | 'ledmatrix'
      // v21: custom phases — CUSTOM PHASES ONLY. Built-in BUSY/REST/REST are NOT
      // stored here; they are derived from workMin/shortMin/longMin and synthesized
      // by store.allPhases(). Each custom phase: { key, label, minutes, kind }.
      phases: [],
      // v21: badge definitions (user CRUD via store.*PomodoroBadge). Each: { id, label, color }.
      badges: [
        { id: 'b_deep',    label: 'Deep Work', color: '#8b3fd6' },
        { id: 'b_meeting', label: 'Meeting',   color: '#4f6df5' },
        { id: 'b_review',  label: 'Review',    color: '#2fb27f' }
      ],
      // v24 (#1): stage sequence. stagesEnabled=false → legacy auto-cycle
      // (cyclesPerLong) drives progression + no stage bar. true → the engine walks
      // `stages` in order (last → wraps to 0). Object.assign backfill in
      // _migrate/accessors PRESERVES an existing account's values (R3): only new
      // DBs and seed adopt this default (stagesEnabled false, sequence pre-filled
      // so one toggle activates it). Each stage: { id, label, kind:'work'|'break', minutes }.
      stagesEnabled: false,
      stages: [
        { id: 'st_w1', label: 'WORK',      kind: 'work',  minutes: 25 },
        { id: 'st_b1', label: 'REST',      kind: 'break', minutes: 5  },
        { id: 'st_w2', label: 'WORK',      kind: 'work',  minutes: 25 },
        { id: 'st_b2', label: 'REST',      kind: 'break', minutes: 5  },
        { id: 'st_w3', label: 'WORK',      kind: 'work',  minutes: 25 },
        { id: 'st_b3', label: 'REST',      kind: 'break', minutes: 5  },
        { id: 'st_w4', label: 'WORK',      kind: 'work',  minutes: 25 },
        { id: 'st_bl', label: 'LONG REST', kind: 'break', minutes: 15 }
      ]
    };
  }
  var BUILTIN_PHASE_KEYS = ['work', 'short', 'long'];
  Store.prototype.pomodoroSessions = function (filter) {
    this.db.pomodoroSessions = this.db.pomodoroSessions || [];
    var rows = this.db.pomodoroSessions.slice();
    if (filter) {
      if (filter.date)              rows = rows.filter(function (s) { return s.date === filter.date; });
      if (filter.projectId)         rows = rows.filter(function (s) { return s.projectId === filter.projectId; });
      if (filter.issueId != null)   rows = rows.filter(function (s) { return s.issueId === filter.issueId; });
      if (filter.userId)            rows = rows.filter(function (s) { return s.userId === filter.userId; });
    }
    return rows.sort(function (a, b) { return (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0); });
  };
  Store.prototype.addPomodoroSession = function (data) {
    if (!this.canUseTimer()) return null;   // dbv48: close dbv45's timer exception — viewer/observer cannot record sessions
    this.db.pomodoroSessions = this.db.pomodoroSessions || [];
    var now = new Date().toISOString();
    var startedAt = (data && data.startedAt) ? data.startedAt : now;
    var s = Object.assign({
      id: U.uid('pomo'),
      userId: this.currentUserId(),
      projectId: this.activeProjectId(),
      issueId: null,
      type: 'work',
      startedAt: now,
      endedAt: now,
      plannedMin: 25,
      actualSec: 0,
      completed: false,
      note: '',
      tags: [],
      interruptions: 0,   // v19 P1: distraction counter (flushed from live state)
      tag: '',            // v19 P1: single session tag (scalar; tags[] stays unused/legacy)
      worklogged: false,  // v19 exactly-once guard: has this session's time been accrued via logWork?
      kind: 'break',      // v21 SCHEMA 8: 'focus'|'break' — canonical worklog-accrual criterion
      badges: [],         // v21: selected badge ids for this session
      typeLabel: '',      // v21: display-label snapshot (survives later custom-phase deletion)
      date: String(startedAt).slice(0, 10),
      createdAt: now,
      updatedAt: now
    }, data || {});
    // guarantee a coherent date key even if caller passed only startedAt via data
    if (!s.date) s.date = String(s.startedAt || now).slice(0, 10);
    this.db.pomodoroSessions.push(s);
    this.audit('worklog', 'pomodoro_added', { projectId: s.projectId, targetType: 'pomodoroSession', targetId: s.id, summary: '포모도로 세션 기록 (' + (s.kind || s.type) + ', ' + (s.plannedMin || 0) + '분)' });
    this._changed();
    return s;
  };
  Store.prototype.updatePomodoroSession = function (id, patch) {
    if (!this.canUseTimer()) return null;   // dbv48: viewer/observer cannot mutate sessions
    this.db.pomodoroSessions = this.db.pomodoroSessions || [];
    var s = this.db.pomodoroSessions.find(function (x) { return x.id === id; });
    if (s) {
      // dbv47: audit only user-meaningful edits (note/tag/completed) — suppress internal
      // flag churn (e.g. logWorkForSession flipping `worklogged`) to avoid flooding.
      var keys = patch ? Object.keys(patch) : [];
      var meaningful = keys.some(function (k) { return k === 'note' || k === 'tag' || k === 'tags' || k === 'completed'; });
      Object.assign(s, patch || {}); s.updatedAt = new Date().toISOString();
      if (meaningful) this.audit('worklog', 'pomodoro_updated', { projectId: s.projectId, targetType: 'pomodoroSession', targetId: s.id, summary: '포모도로 세션 수정', detail: keys });
      this._changed();
    }
    return s;
  };
  Store.prototype.deletePomodoroSession = function (id) {
    if (!this.canUseTimer()) return;   // dbv48: viewer/observer cannot delete sessions
    var _s = (this.db.pomodoroSessions || []).find(function (x) { return x.id === id; });
    this.db.pomodoroSessions = (this.db.pomodoroSessions || []).filter(function (x) { return x.id !== id; });
    if (_s) this.audit('worklog', 'pomodoro_deleted', { projectId: _s.projectId, targetType: 'pomodoroSession', targetId: _s.id, summary: '포모도로 세션 삭제' });
    this._changed();
  };
  Store.prototype.pomodoroSettings = function () {
    this.db.settings.pomodoro = Object.assign(defaultPomodoroSettings(), this.db.settings.pomodoro || {});
    return this.db.settings.pomodoro;
  };
  Store.prototype.savePomodoroSettings = function (patch) {
    this.db.settings.pomodoro = Object.assign(defaultPomodoroSettings(), this.db.settings.pomodoro || {}, patch || {});
    this._stampSetting('pomodoro');   // dbv49
    // dbv47: phase/badge CRUD funnels through here but emits its own specific audit row
    // (pushed before this flush); suppress the generic row when in that context to avoid double-logging.
    if (!this._pomoAuditCtx) this._auditSetting('pomodoro_settings', '포모도로 설정 변경', Object.keys(patch || {}));
    this._changed();
    return this.db.settings.pomodoro;
  };
  Store.prototype.allPhases = function () {
    var s = this.pomodoroSettings();
    var builtin = [
      { key: 'work',  label: 'WORK',       minutes: +s.workMin  || 25, kind: 'focus', builtin: true },
      { key: 'short', label: 'SHORT REST', minutes: +s.shortMin || 5,  kind: 'break', builtin: true },
      { key: 'long',  label: 'LONG REST',  minutes: +s.longMin  || 15, kind: 'break', builtin: true }
    ];
    var custom = (s.phases || []).map(function (p) {
      return {
        key: p.key,
        label: p.label,
        minutes: +p.minutes || 25,
        kind: p.kind === 'break' ? 'break' : 'focus',
        builtin: false
      };
    });
    return builtin.concat(custom);
  };
  Store.prototype.getPhase = function (key) {
    var all = this.allPhases();
    var found = all.find(function (p) { return p.key === key; });
    return found || all[0];
  };
  Store.prototype.isBuiltinPhase = function (key) {
    return BUILTIN_PHASE_KEYS.indexOf(key) !== -1;
  };
  Store.prototype.addPomodoroPhase = function (data) {
    data = data || {};
    var s = this.pomodoroSettings();
    var phases = (s.phases || []).slice();
    var phase = {
      key: U.uid('ph'),
      label: String(data.label != null ? data.label : '').trim() || 'PHASE',
      minutes: Math.max(1, Math.round(+data.minutes || 25)),
      kind: data.kind === 'break' ? 'break' : 'focus'
    };
    phases.push(phase);
    this._pomoAuditCtx = true;
    this.audit('settings', 'phase_added', { targetType: 'pomodoroPhase', targetId: phase.key, summary: '포모도로 단계 추가: ' + phase.label });
    this.savePomodoroSettings({ phases: phases });
    this._pomoAuditCtx = false;
    return phase;
  };
  Store.prototype.updatePomodoroPhase = function (key, patch) {
    if (this.isBuiltinPhase(key)) return null;   // built-in minutes edited via *Min
    var s = this.pomodoroSettings();
    var phases = (s.phases || []).slice();
    var idx = phases.findIndex(function (p) { return p.key === key; });
    if (idx < 0) return null;
    var cur = Object.assign({}, phases[idx]);
    if (patch) {
      if (patch.label != null)   cur.label = String(patch.label).trim() || cur.label;
      if (patch.minutes != null) cur.minutes = Math.max(1, Math.round(+patch.minutes || cur.minutes));
      if (patch.kind != null)    cur.kind = patch.kind === 'break' ? 'break' : 'focus';
    }
    phases[idx] = cur;
    this._pomoAuditCtx = true;
    this.audit('settings', 'phase_updated', { targetType: 'pomodoroPhase', targetId: key, summary: '포모도로 단계 수정: ' + cur.label });
    this.savePomodoroSettings({ phases: phases });
    this._pomoAuditCtx = false;
    return cur;
  };
  Store.prototype.deletePomodoroPhase = function (key) {
    if (this.isBuiltinPhase(key)) return false;
    var s = this.pomodoroSettings();
    var _p = (s.phases || []).find(function (p) { return p.key === key; });
    var phases = (s.phases || []).filter(function (p) { return p.key !== key; });
    this._pomoAuditCtx = true;
    this.audit('settings', 'phase_deleted', { targetType: 'pomodoroPhase', targetId: key, summary: '포모도로 단계 삭제: ' + ((_p && _p.label) || key) });
    this.savePomodoroSettings({ phases: phases });
    this._pomoAuditCtx = false;
    return true;
  };
  Store.prototype.addPomodoroBadge = function (data) {
    data = data || {};
    var s = this.pomodoroSettings();
    var badges = (s.badges || []).slice();
    var badge = {
      id: U.uid('b'),
      label: String(data.label != null ? data.label : '').trim() || 'Badge',
      color: (typeof data.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(data.color)) ? data.color : '#4f6df5'
    };
    badges.push(badge);
    this._pomoAuditCtx = true;
    this.audit('settings', 'badge_added', { targetType: 'pomodoroBadge', targetId: badge.id, summary: '포모도로 배지 추가: ' + badge.label });
    this.savePomodoroSettings({ badges: badges });
    this._pomoAuditCtx = false;
    return badge;
  };
  Store.prototype.updatePomodoroBadge = function (id, patch) {
    var s = this.pomodoroSettings();
    var badges = (s.badges || []).slice();
    var idx = badges.findIndex(function (b) { return b.id === id; });
    if (idx < 0) return null;
    var cur = Object.assign({}, badges[idx]);
    if (patch) {
      if (patch.label != null) cur.label = String(patch.label).trim() || cur.label;
      if (patch.color != null && typeof patch.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(patch.color)) cur.color = patch.color;
    }
    badges[idx] = cur;
    this._pomoAuditCtx = true;
    this.audit('settings', 'badge_updated', { targetType: 'pomodoroBadge', targetId: id, summary: '포모도로 배지 수정: ' + cur.label });
    this.savePomodoroSettings({ badges: badges });
    this._pomoAuditCtx = false;
    return cur;
  };
  Store.prototype.deletePomodoroBadge = function (id) {
    var s = this.pomodoroSettings();
    var _b = (s.badges || []).find(function (b) { return b.id === id; });
    var badges = (s.badges || []).filter(function (b) { return b.id !== id; });
    this._pomoAuditCtx = true;
    this.audit('settings', 'badge_deleted', { targetType: 'pomodoroBadge', targetId: id, summary: '포모도로 배지 삭제: ' + ((_b && _b.label) || id) });
    this.savePomodoroSettings({ badges: badges });
    this._pomoAuditCtx = false;
    return true;
  };
  Store.prototype.stagesEnabled = function () {
    return !!this.pomodoroSettings().stagesEnabled;
  };
  Store.prototype.setStagesEnabled = function (on) {
    this.savePomodoroSettings({ stagesEnabled: !!on });
    return !!on;
  };
  Store.prototype.stages = function () {
    var s = this.pomodoroSettings();
    return (s.stages || []).map(function (st) {
      return {
        id: st.id,
        label: st.label,
        kind: st.kind === 'break' ? 'break' : 'work',
        minutes: +st.minutes || 25
      };
    });
  };
  Store.prototype.addStage = function (data) {
    data = data || {};
    var s = this.pomodoroSettings();
    var stages = (s.stages || []).slice();
    var kind = data.kind === 'break' ? 'break' : 'work';
    var stage = {
      id: U.uid('st'),
      label: String(data.label != null ? data.label : '').trim() || (kind === 'break' ? 'REST' : 'WORK'),
      kind: kind,
      minutes: Math.max(1, Math.round(+data.minutes || 25))
    };
    stages.push(stage);
    this.savePomodoroSettings({ stages: stages });
    return stage;
  };
  Store.prototype.updateStage = function (id, patch) {
    var s = this.pomodoroSettings();
    var stages = (s.stages || []).slice();
    var idx = stages.findIndex(function (st) { return st.id === id; });
    if (idx < 0) return null;
    var cur = Object.assign({}, stages[idx]);
    if (patch) {
      if (patch.label != null)   cur.label = String(patch.label).trim() || cur.label;
      if (patch.kind != null)    cur.kind = patch.kind === 'break' ? 'break' : 'work';
      if (patch.minutes != null) cur.minutes = Math.max(1, Math.round(+patch.minutes || cur.minutes));
    }
    stages[idx] = cur;
    this.savePomodoroSettings({ stages: stages });
    return cur;
  };
  Store.prototype.moveStage = function (id, dir) {
    var s = this.pomodoroSettings();
    var stages = (s.stages || []).slice();
    var idx = stages.findIndex(function (st) { return st.id === id; });
    if (idx < 0) return false;
    var j = idx + (dir < 0 ? -1 : 1);
    if (j < 0 || j >= stages.length) return false;
    var tmp = stages[idx]; stages[idx] = stages[j]; stages[j] = tmp;
    this.savePomodoroSettings({ stages: stages });
    return true;
  };
  Store.prototype.deleteStage = function (id) {
    var s = this.pomodoroSettings();
    var stages = (s.stages || []).filter(function (st) { return st.id !== id; });
    this.savePomodoroSettings({ stages: stages });
    return true;
  };
  Store.prototype.logWorkForSession = function (sessionId, note) {
    if (!this.canUseTimer()) return null;   // dbv48: viewer/observer — no session accrual (logWork stays gated by canWriteProject)
    var s = (this.db.pomodoroSessions || []).find(function (x) { return x.id === sessionId; });
    if (!s) return null;
    if (s.worklogged === true) {
      // already accrued → never double-count; just keep the note current
      if (note != null && note !== s.note) this.updatePomodoroSession(sessionId, { note: note });
      return s;
    }
    var hours = (+s.actualSec || 0) / 3600;
    // v21: accrual criterion generalized `type==='work'` → `kind==='focus'` so any
    // custom focus phase also logs work. break/custom-break never accrue (unchanged).
    // The worklogged guard above still makes this EXACTLY-ONCE per session.
    if (s.kind === 'focus' && s.completed && s.issueId != null && hours > 0) {
      this.logWork(s.issueId, hours, note || '', s.date);
    }
    var patch = { worklogged: true };
    if (note != null) patch.note = note;
    this.updatePomodoroSession(sessionId, patch);   // persists + bumps updatedAt (LWW-safe)
    return s;
  };

  global.store = new Store();
  global.Detail = { open: function (id) { if (global.AIO && AIO.kanban) AIO.kanban.openCard(id); } };
})(window);
