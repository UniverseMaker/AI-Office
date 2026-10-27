#!/usr/bin/env node
// Sets the fixed AI OFFICE admin account. Credentials are never written to code:
// only the user name and an scrypt hash go to data/auth.json, and every existing login is signed out.
//   node server/set-admin.mjs            (asks for id and password)
//   printf "id\npassword\n" | node server/set-admin.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { makeHash, AUTH_PATH, DATA_DIR } from './auth.mjs';

async function readCredentials() {
  if (!process.stdin.isTTY) {
    let buf = '';
    for await (const c of process.stdin) buf += c;
    const [user = '', pw = ''] = buf.replace(/\r/g, '').split('\n');
    return { user, pw };
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const user = await new Promise((res) => rl.question('관리자 아이디: ', res));
  process.stdout.write('관리자 비밀번호: ');
  const out = rl._writeToOutput;
  rl._writeToOutput = () => {}; // hide the password while typing
  const pw = await new Promise((res) => rl.question('', res));
  rl._writeToOutput = out;
  process.stdout.write('\n');
  rl.close();
  return { user, pw };
}

const { user: rawUser, pw } = await readCredentials();
const user = String(rawUser).trim();
if (!user || String(pw).length < 12) { console.error('아이디와 12자 이상 비밀번호가 필요해요 (외부 주소로도 열려 있어서 짧은 비밀번호는 위험해요).'); process.exit(1); }
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(AUTH_PATH, JSON.stringify(await makeHash(user, pw), null, 1));
fs.writeFileSync(path.join(DATA_DIR, 'tokens.json'), '{}');
console.log(`관리자 계정을 저장했어요 (${user}). 기존 로그인은 모두 해제됐어요.`);
