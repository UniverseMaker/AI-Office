// 세션 캐릭터 인적사항: 이름 · 국적(국기) · 나이 · MBTI · 출신 도시 · 취미 — 진짜 사람처럼.
//   관리자가 직접 정하거나(이름 · 국적) 무작위로 뽑는다. 정하지 않은 세션은 (설정이 켜져 있으면) 세션 id 로 늘 같은 사람을 만든다.
//   지어낸 인물이라 비로그인 화면에도 보여도 된다(세션 제목 · 내용은 여전히 숨김).
const N = (code, flag, ko, order, family, given, cities) => ({ code, flag, ko, order, family, given, cities });
export const NATIONS = [
  N('KR', '🇰🇷', '대한민국', 'fg', ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'],
    ['민준', '서연', '지후', '하윤', '도윤', '서아', '예준', '지유', '시우', '하은', '주원', '수아', '지호', '윤서', '건우', '채원', '현우', '지민', '우진', '다은', '은우', '소율', '태윤', '나연'], ['서울', '부산', '대전', '대구', '광주', '인천', '수원', '제주']),
  N('JP', '🇯🇵', '일본', 'fg', ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田'],
    ['結衣', '陽翔', '葵', '蓮', '凛', '湊', '陽菜', '大翔', '芽依', '悠真', '美咲', '颯太'], ['도쿄', '오사카', '교토', '삿포로', '후쿠오카', '나고야']),
  N('CN', '🇨🇳', '중국', 'fgt', ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴'],
    ['伟', '芳', '娜', '敏', '静', '磊', '洋', '婷', '浩然', '子涵', '欣怡', '宇轩'], ['베이징', '상하이', '선전', '청두', '항저우', '시안']),
  N('TW', '🇹🇼', '대만', 'fgt', ['陳', '林', '黃', '張', '李', '王', '吳', '劉'], ['怡君', '家豪', '雅婷', '志明', '淑芬', '冠宇', '宜蓁', '承恩'], ['타이베이', '타이중', '가오슝', '타이난']),
  N('VN', '🇻🇳', '베트남', 'fgs', ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng'], ['Anh', 'Linh', 'Minh', 'Huy', 'Trang', 'Khoa', 'Thảo', 'Bảo'], ['하노이', '호찌민', '다낭', '하이퐁']),
  N('IN', '🇮🇳', '인도', 'gf', ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Gupta', 'Nair', 'Singh', 'Mehta'], ['Aarav', 'Priya', 'Vihaan', 'Ananya', 'Rohan', 'Diya', 'Arjun', 'Kavya'], ['벵갈루루', '뭄바이', '델리', '첸나이', '하이데라바드']),
  N('US', '🇺🇸', '미국', 'gf', ['Smith', 'Johnson', 'Carter', 'Miller', 'Davis', 'Garcia', 'Wilson', 'Taylor', 'Brooks', 'Parker'], ['Emily', 'James', 'Olivia', 'Liam', 'Ava', 'Noah', 'Sophia', 'Ethan', 'Mia', 'Lucas', 'Harper', 'Mason'], ['뉴욕', '샌프란시스코', '시애틀', '보스턴', '오스틴', '시카고']),
  N('CA', '🇨🇦', '캐나다', 'gf', ['Tremblay', 'Roy', 'MacDonald', 'Wong', 'Martin', 'Gagnon'], ['Chloé', 'Liam', 'Maya', 'Owen', 'Zoé', 'Nathan'], ['토론토', '밴쿠버', '몬트리올', '캘거리']),
  N('GB', '🇬🇧', '영국', 'gf', ['Smith', 'Jones', 'Williams', 'Evans', 'Hughes', 'Wright', 'Clarke', 'Hall'], ['Oliver', 'Amelia', 'George', 'Isla', 'Harry', 'Poppy', 'Jack', 'Freya'], ['런던', '맨체스터', '에든버러', '옥스퍼드', '케임브리지']),
  N('FR', '🇫🇷', '프랑스', 'gf', ['Martin', 'Bernard', 'Dubois', 'Laurent', 'Moreau', 'Lefèvre', 'Girard'], ['Léa', 'Hugo', 'Camille', 'Louis', 'Manon', 'Gabriel', 'Inès', 'Arthur'], ['파리', '리옹', '마르세유', '툴루즈', '보르도']),
  N('DE', '🇩🇪', '독일', 'gf', ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker'], ['Lukas', 'Emma', 'Leon', 'Mia', 'Finn', 'Hannah', 'Jonas', 'Lea'], ['베를린', '뮌헨', '함부르크', '프랑크푸르트', '쾰른']),
  N('IT', '🇮🇹', '이탈리아', 'gf', ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo'], ['Giulia', 'Lorenzo', 'Sofia', 'Leonardo', 'Aurora', 'Matteo'], ['로마', '밀라노', '피렌체', '토리노', '볼로냐']),
  N('ES', '🇪🇸', '스페인', 'gf', ['García', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero'], ['Lucía', 'Hugo', 'Martina', 'Mateo', 'Paula', 'Daniel'], ['마드리드', '바르셀로나', '발렌시아', '세비야']),
  N('BR', '🇧🇷', '브라질', 'gf', ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira'], ['Ana', 'João', 'Beatriz', 'Pedro', 'Larissa', 'Gabriel'], ['상파울루', '리우데자네이루', '브라질리아', '쿠리치바']),
  N('MX', '🇲🇽', '멕시코', 'gf', ['Hernández', 'González', 'Ramírez', 'Torres', 'Flores', 'Cruz'], ['Valentina', 'Santiago', 'Ximena', 'Diego', 'Regina', 'Emiliano'], ['멕시코시티', '과달라하라', '몬테레이']),
  N('AU', '🇦🇺', '호주', 'gf', ['Smith', 'Nguyen', 'Brown', 'Kelly', 'Murphy', 'Walker'], ['Charlotte', 'Jack', 'Matilda', 'William', 'Isla', 'Cooper'], ['시드니', '멜버른', '브리즈번', '퍼스']),
  N('SE', '🇸🇪', '스웨덴', 'gf', ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Lindqvist'], ['Elsa', 'Oscar', 'Alice', 'William', 'Saga', 'Hugo'], ['스톡홀름', '예테보리', '말뫼', '웁살라']),
  N('NL', '🇳🇱', '네덜란드', 'gf', ['de Jong', 'Jansen', 'de Vries', 'van Dijk', 'Bakker', 'Visser'], ['Sanne', 'Daan', 'Fleur', 'Sem', 'Lotte', 'Bram'], ['암스테르담', '로테르담', '위트레흐트', '에인트호번']),
  N('TR', '🇹🇷', '튀르키예', 'gf', ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın'], ['Zeynep', 'Emir', 'Elif', 'Yusuf', 'Defne', 'Kerem'], ['이스탄불', '앙카라', '이즈미르']),
  N('NG', '🇳🇬', '나이지리아', 'gf', ['Okafor', 'Adeyemi', 'Okonkwo', 'Bello', 'Eze'], ['Chiamaka', 'Tunde', 'Amara', 'Emeka', 'Zainab', 'Femi'], ['라고스', '아부자', '이바단']),
];
import { localNames } from './names.mjs';
const BY = new Map(NATIONS.map((n) => [n.code, n]));
/** 여성 이름 (나머지는 남성) — 이름 목록은 그대로 두고 성별만 표시 (이미 붙은 자동 이름이 바뀌지 않게) */
const FEMALE = {
  KR: '서연 하윤 서아 지유 하은 수아 윤서 채원 지민 다은 소율 나연', JP: '結衣 葵 凛 陽菜 芽依 美咲', CN: '芳 娜 敏 静 婷 子涵 欣怡', TW: '怡君 雅婷 淑芬 宜蓁',
  VN: 'Anh Linh Trang Thảo', IN: 'Priya Ananya Diya Kavya', US: 'Emily Olivia Ava Sophia Mia Harper', CA: 'Chloé Maya Zoé', GB: 'Amelia Isla Poppy Freya',
  FR: 'Léa Camille Manon Inès', DE: 'Emma Mia Hannah Lea', IT: 'Giulia Sofia Aurora', ES: 'Lucía Martina Paula', BR: 'Ana Beatriz Larissa',
  MX: 'Valentina Ximena Regina', AU: 'Charlotte Matilda Isla', SE: 'Elsa Alice Saga', NL: 'Sanne Fleur Lotte', TR: 'Zeynep Elif Defne', NG: 'Chiamaka Amara Zainab',
};
const FSET = new Map(Object.entries(FEMALE).map(([k, v]) => [k, new Set(v.split(' '))]));
const genderOfGiven = (nat, g) => (FSET.get(nat) && FSET.get(nat).has(g) ? 'F' : 'M');
export const GENDERS = { M: '남성', F: '여성', X: '기타 · 밝히지 않음' };
/** 성별에 맞는 이름 뽑기 */
function givenFor(r, n, gender) { const pool = gender === 'F' || gender === 'M' ? n.given.filter((g) => genderOfGiven(n.code, g) === gender) : n.given; return pick(r, pool.length ? pool : n.given); }
const MBTI = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
const HOBBY = ['등산', '러닝', '사진', '요리', '보드게임', '독서', '기타 연주', '클라이밍', '수영', '커피 로스팅', '캠핑', '고양이 집사', '레트로 게임', '뜨개질', '자전거', '피아노', '와인', '서핑', '드로잉', '체스'];

function rng(seed) { let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
/** 국적 분포: 절반은 한국, 나머지는 고루 */
function pickNation(r) { return r() < 0.5 ? BY.get('KR') : pick(r, NATIONS.slice(1)); }
function joinName(n, fam, giv) { return n.order === 'gf' ? `${giv} ${fam}` : (n.order === 'fg' && n.code === 'JP') || n.order === 'fgs' ? `${fam} ${giv}` : `${fam}${giv}`.replace(/\s+/g, ' ').trim(); }
export function randomName(nat, seed = Math.random(), gender = null) { const r = rng(seed), n = BY.get(nat) || BY.get('KR'); return joinName(n, pick(r, n.family), givenFor(r, n, gender)); }
export function randomNation(seed = Math.random()) { return pickNation(rng('nat' + seed)).code; }

/** 세션 id 로 늘 같은 기본 인물 */
export function basePersona(id) {
  const r = rng(id), n = pickNation(r);
  const fam = pick(r, n.family), giv = pick(r, n.given);
  return { name: joinName(n, fam, giv), gender: genderOfGiven(n.code, giv), nat: n.code, age: 24 + Math.floor(r() * 32), mbti: pick(r, MBTI), city: pick(r, n.cities), hobby: pick(r, HOBBY) };
}
/** 저장된 값(일부만 있어도) + 기본 인물 → 화면용 */
export function personaOf(id, saved, auto = true) {
  if (!saved && !auto) return null;
  const b = basePersona(id), s = saved || {};
  const nat = BY.has(s.nat) ? s.nat : b.nat, n = BY.get(nat);
  const city = s.nat && s.nat !== b.nat ? n.cities[Math.floor(rng(id + nat)() * n.cities.length)] : b.city;
  const gender = GENDERS[s.gender] ? s.gender : b.gender;
  const name = s.name || (s.nat && s.nat !== b.nat ? randomName(nat, id, gender) : gender !== b.gender ? randomName(nat, id + gender, gender) : b.name);
  const ln = localNames(nat, name);
  return { name, nameKo: ln.ko, nameEn: ln.en, gender, genderKo: GENDERS[gender], nat, flag: n.flag, country: n.ko, age: s.age || b.age, mbti: s.mbti || b.mbti, city: s.city || city, hobby: s.hobby || b.hobby, custom: !!saved };
}
/** 관리자 입력 정리 */
export function cleanPersona(p) {
  if (!p || typeof p !== 'object') return null;
  const o = {};
  const name = String(p.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
  if (name) o.name = name;
  if (BY.has(p.nat)) o.nat = p.nat;
  if (GENDERS[p.gender]) o.gender = p.gender;
  const age = Number(p.age); if (age >= 18 && age <= 99) o.age = Math.round(age);
  if (MBTI.includes(String(p.mbti || '').toUpperCase())) o.mbti = String(p.mbti).toUpperCase();
  for (const k of ['city', 'hobby']) { const v = String(p[k] || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20); if (v) o[k] = v; }
  return Object.keys(o).length ? o : null;
}
export const nationList = () => NATIONS.map((n) => ({ code: n.code, flag: n.flag, ko: n.ko }));
export { MBTI, HOBBY };
