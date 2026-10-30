// 서버 실행 설정 (포트 · 주소) — 기본 17777 · 127.0.0.1
//   우선순위: 환경변수(AI_OFFICE_PORT · AI_OFFICE_HOST) > data/server.json { port, host } > 기본값
//   AI-OFFICE.exe(서버 실행기)가 data/server.json 을 쓰고, 훅 브리지(bridges/claude-hook.mjs)도 같은 파일을 읽는다.
//   ※ 포트는 이 PC 의 동적 포트 범위(예: 1024~15000) 밖으로. 그 안은 재부팅 때 윈도우가 예약해 막을 수 있다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
const DATA = path.resolve(process.env.AI_OFFICE_DATA_DIR || path.join(ROOT, 'data'));
export const SERVER_FILE = path.join(DATA, 'server.json');
export const PID_FILE = path.join(DATA, 'server.pid');
export const LAUNCHER_KEY = path.join(DATA, 'launcher.key');

let file = {};
try { file = JSON.parse(fs.readFileSync(SERVER_FILE, 'utf8')) || {}; } catch {}
const okPort = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1024 && n <= 65535 ? n : null; };
const HOSTS = ['127.0.0.1', 'localhost', '0.0.0.0', '::1', '::'];
const okHost = (v) => (HOSTS.includes(String(v || '')) ? String(v) : null);

export const DEFAULT_PORT = 17777;
export const PORT = okPort(process.env.AI_OFFICE_PORT) || okPort(file.port) || DEFAULT_PORT;
/** 기본은 이 PC 만(127.0.0.1). 0.0.0.0 은 같은 네트워크에도 열림 — 실행기에서 경고와 함께만 고를 수 있다 */
export const HOST = okHost(process.env.AI_OFFICE_HOST) || okHost(file.host) || '127.0.0.1';
/** 자기 페이지로 인정하는 주소 (쿠키 · 수집 입구 · CSP) */
export const SELF_HOSTS = [`127.0.0.1:${PORT}`, `localhost:${PORT}`];
export const SELF_ORIGINS = SELF_HOSTS.map((h) => `http://${h}`);
export const URL_SELF = `http://127.0.0.1:${PORT}/`;
