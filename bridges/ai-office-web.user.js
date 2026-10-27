// ==UserScript==
// @name         AI OFFICE bridge (ChatGPT · Gemini · Claude.ai · Perplexity · Grok)
// @namespace    ai-office
// @version      1.0.0
// @description  웹 AI 채팅이 답변을 생성 중인지/끝났는지만 로컬 AI OFFICE(127.0.0.1:17777)에 알려줍니다. 대화 내용은 보내지 않아요.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://gemini.google.com/*
// @match        https://claude.ai/*
// @match        https://www.perplexity.ai/*
// @match        https://grok.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';
  const ENDPOINT = 'http://127.0.0.1:17777/api/events';
  const PROVIDER = {
    'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt', 'gemini.google.com': 'gemini',
    'claude.ai': 'claude', 'www.perplexity.ai': 'perplexity', 'grok.com': 'grok',
  }[location.host] || 'generic';
  const APP = { chatgpt: 'ChatGPT 웹', gemini: 'Gemini 웹', claude: 'Claude.ai 웹', perplexity: 'Perplexity 웹', grok: 'Grok 웹' }[PROVIDER] || location.host;

  // "Stop generating" buttons across sites (aria labels in EN/KO); extend if a site changes its markup.
  const STOP_SELECTORS = [
    '[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]',
    'button[aria-label*="중지"]',
    'button[aria-label*="중단"]',
    'button.stop',
    'mat-icon[fonticon="stop"]',
  ];
  const generating = () => STOP_SELECTORS.some((s) => { const el = document.querySelector(s); return el && el.offsetParent !== null; });
  const sessionId = () => (location.pathname.replace(/\/+$/, '') || '/home').slice(0, 120);
  const title = () => (document.title || APP).replace(/\s*[-|·]\s*(ChatGPT|Gemini|Claude|Perplexity|Grok).*$/i, '').slice(0, 60) || APP;

  function send(ev) {
    try {
      GM_xmlhttpRequest({ method: 'POST', url: ENDPOINT, headers: { 'Content-Type': 'application/json' }, data: JSON.stringify({ provider: PROVIDER, app: APP, sessionId: sessionId(), title: title(), ttl: 1800, ...ev }), timeout: 1500 });
    } catch (e) { /* office not running */ }
  }

  let was = null;
  let lastBeat = 0;
  setInterval(() => {
    const now = generating();
    const t = Date.now();
    if (now !== was) {
      send(now ? { status: 'working', activity: { type: 'talk', label: '답변 생성 중' } } : { status: was === null ? 'idle' : 'done' });
      was = now;
      lastBeat = t;
    } else if (t - lastBeat > 60e3) {
      send({}); // keep-alive so the desk stays occupied while the tab is open
      lastBeat = t;
    }
  }, 1000);
  window.addEventListener('beforeunload', () => send({ end: true }));
})();
