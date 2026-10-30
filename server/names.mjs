// 캐릭터 이름 표기: 원어 이름(한자 · 가나 · 라틴 문자) → 지금 화면 언어(한국어 / 영어)로.
//   한국어: 중국 · 대만 이름은 원지음(왕웨이 · 황이쥔), 일본 이름은 일본어 발음(사토 유이), 서양 이름은 외래어 표기(에밀리 카터)
//   영어: 한국 · 중국 · 일본 이름은 로마자(Kim Minjun · Wang Wei · Yui Sato), 라틴 문자 이름은 그대로
//   표에 없는 이름(관리자가 직접 쓴 이름)은 원래대로 보인다.
const T = (s) => Object.fromEntries(s.split('|').map((x) => x.split(':')).map(([k, ko, en]) => [k, [ko, en || k]]));
export const TABLE = {
  KR: { fam: T('김:김:Kim|이:이:Lee|박:박:Park|최:최:Choi|정:정:Jung|강:강:Kang|조:조:Cho|윤:윤:Yoon|장:장:Jang|임:임:Lim|한:한:Han|오:오:Oh|서:서:Seo|신:신:Shin|권:권:Kwon|황:황:Hwang|안:안:Ahn|송:송:Song|류:류:Ryu|홍:홍:Hong'),
    giv: T('민준:민준:Minjun|서연:서연:Seoyeon|지후:지후:Jihu|하윤:하윤:Hayun|도윤:도윤:Doyun|서아:서아:Seoa|예준:예준:Yejun|지유:지유:Jiyu|시우:시우:Siu|하은:하은:Haeun|주원:주원:Juwon|수아:수아:Sua|지호:지호:Jiho|윤서:윤서:Yunseo|건우:건우:Geonu|채원:채원:Chaewon|현우:현우:Hyeonu|지민:지민:Jimin|우진:우진:Ujin|다은:다은:Daeun|은우:은우:Eunu|소율:소율:Soyul|태윤:태윤:Taeyun|나연:나연:Nayeon') },
  JP: { fam: T('佐藤:사토:Sato|鈴木:스즈키:Suzuki|高橋:다카하시:Takahashi|田中:다나카:Tanaka|伊藤:이토:Ito|渡辺:와타나베:Watanabe|山本:야마모토:Yamamoto|中村:나카무라:Nakamura|小林:고바야시:Kobayashi|加藤:가토:Kato|吉田:요시다:Yoshida|山田:야마다:Yamada'),
    giv: T('結衣:유이:Yui|陽翔:하루토:Haruto|葵:아오이:Aoi|蓮:렌:Ren|凛:린:Rin|湊:미나토:Minato|陽菜:히나:Hina|大翔:히로토:Hiroto|芽依:메이:Mei|悠真:유마:Yuma|美咲:미사키:Misaki|颯太:소타:Sota') },
  CN: { fam: T('王:왕:Wang|李:리:Li|张:장:Zhang|刘:류:Liu|陈:천:Chen|杨:양:Yang|黄:황:Huang|赵:자오:Zhao|周:저우:Zhou|吴:우:Wu'),
    giv: T('伟:웨이:Wei|芳:팡:Fang|娜:나:Na|敏:민:Min|静:징:Jing|磊:레이:Lei|洋:양:Yang|婷:팅:Ting|浩然:하오란:Haoran|子涵:쯔한:Zihan|欣怡:신이:Xinyi|宇轩:위쉬안:Yuxuan') },
  TW: { fam: T('陳:천:Chen|林:린:Lin|黃:황:Huang|張:장:Chang|李:리:Li|王:왕:Wang|吳:우:Wu|劉:류:Liu'),
    giv: T('怡君:이쥔:Yi-chun|家豪:자하오:Chia-hao|雅婷:야팅:Ya-ting|志明:즈밍:Chih-ming|淑芬:수펀:Shu-fen|冠宇:관위:Kuan-yu|宜蓁:이전:Yi-chen|承恩:청언:Cheng-en') },
  VN: { fam: T('Nguyễn:응우옌|Trần:쩐|Lê:레|Phạm:팜|Hoàng:호앙|Võ:보|Đặng:당'), giv: T('Anh:아인|Linh:린|Minh:민|Huy:후이|Trang:짱|Khoa:코아|Thảo:타오|Bảo:바오') },
  IN: { fam: T('Sharma:샤르마|Patel:파텔|Iyer:아이어|Reddy:레디|Gupta:굽타|Nair:나이르|Singh:싱|Mehta:메타'), giv: T('Aarav:아라브|Priya:프리야|Vihaan:비한|Ananya:아나냐|Rohan:로한|Diya:디야|Arjun:아르준|Kavya:카비야') },
  US: { fam: T('Smith:스미스|Johnson:존슨|Carter:카터|Miller:밀러|Davis:데이비스|Garcia:가르시아|Wilson:윌슨|Taylor:테일러|Brooks:브룩스|Parker:파커'),
    giv: T('Emily:에밀리|James:제임스|Olivia:올리비아|Liam:리엄|Ava:에이바|Noah:노아|Sophia:소피아|Ethan:이선|Mia:미아|Lucas:루카스|Harper:하퍼|Mason:메이슨') },
  CA: { fam: T('Tremblay:트랑블레|Roy:루아|MacDonald:맥도널드|Wong:웡|Martin:마틴|Gagnon:가뇽'), giv: T('Chloé:클로에|Liam:리엄|Maya:마야|Owen:오언|Zoé:조에|Nathan:네이선') },
  GB: { fam: T('Smith:스미스|Jones:존스|Williams:윌리엄스|Evans:에번스|Hughes:휴스|Wright:라이트|Clarke:클라크|Hall:홀'), giv: T('Oliver:올리버|Amelia:아멜리아|George:조지|Isla:아일라|Harry:해리|Poppy:포피|Jack:잭|Freya:프레야') },
  FR: { fam: T('Martin:마르탱|Bernard:베르나르|Dubois:뒤부아|Laurent:로랑|Moreau:모로|Lefèvre:르페브르|Girard:지라르'), giv: T('Léa:레아|Hugo:위고|Camille:카미유|Louis:루이|Manon:마농|Gabriel:가브리엘|Inès:이네스|Arthur:아르튀르') },
  DE: { fam: T('Müller:뮐러|Schmidt:슈미트|Schneider:슈나이더|Fischer:피셔|Weber:베버|Wagner:바그너|Becker:베커'), giv: T('Lukas:루카스|Emma:에마|Leon:레온|Mia:미아|Finn:핀|Hannah:한나|Jonas:요나스|Lea:레아') },
  IT: { fam: T('Rossi:로시|Russo:루소|Ferrari:페라리|Esposito:에스포지토|Bianchi:비앙키|Romano:로마노|Colombo:콜롬보'), giv: T('Giulia:줄리아|Lorenzo:로렌초|Sofia:소피아|Leonardo:레오나르도|Aurora:아우로라|Matteo:마테오') },
  ES: { fam: T('García:가르시아|Fernández:페르난데스|López:로페스|Martínez:마르티네스|Sánchez:산체스|Romero:로메로'), giv: T('Lucía:루시아|Hugo:우고|Martina:마르티나|Mateo:마테오|Paula:파울라|Daniel:다니엘') },
  BR: { fam: T('Silva:실바|Santos:산투스|Oliveira:올리베이라|Souza:소자|Costa:코스타|Pereira:페레이라'), giv: T('Ana:아나|João:주앙|Beatriz:베아트리스|Pedro:페드루|Larissa:라리사|Gabriel:가브리에우') },
  MX: { fam: T('Hernández:에르난데스|González:곤살레스|Ramírez:라미레스|Torres:토레스|Flores:플로레스|Cruz:크루스'), giv: T('Valentina:발렌티나|Santiago:산티아고|Ximena:히메나|Diego:디에고|Regina:레히나|Emiliano:에밀리아노') },
  AU: { fam: T('Smith:스미스|Nguyen:응우옌|Brown:브라운|Kelly:켈리|Murphy:머피|Walker:워커'), giv: T('Charlotte:샬럿|Jack:잭|Matilda:마틸다|William:윌리엄|Isla:아일라|Cooper:쿠퍼') },
  SE: { fam: T('Andersson:안데르손|Johansson:요한손|Karlsson:칼손|Nilsson:닐손|Lindqvist:린드크비스트'), giv: T('Elsa:엘사|Oscar:오스카르|Alice:알리세|William:빌리암|Saga:사가|Hugo:후고') },
  NL: { fam: T('de Jong:더용|Jansen:얀선|de Vries:더프리스|van Dijk:판데이크|Bakker:바커르|Visser:피서르'), giv: T('Sanne:사너|Daan:단|Fleur:플뢰르|Sem:셈|Lotte:로터|Bram:브람') },
  TR: { fam: T('Yılmaz:이을마즈|Kaya:카야|Demir:데미르|Şahin:샤힌|Çelik:첼리크|Aydın:아이든'), giv: T('Zeynep:제이네프|Emir:에미르|Elif:엘리프|Yusuf:유수프|Defne:데프네|Kerem:케렘') },
  NG: { fam: T('Okafor:오카포르|Adeyemi:아데예미|Okonkwo:오콩코|Bello:벨로|Eze:에제'), giv: T('Chiamaka:치아마카|Tunde:툰데|Amara:아마라|Emeka:에메카|Zainab:자이나브|Femi:페미') },
};
// 표기 순서: 한국어 [성 이름 붙여 쓰기?] · 영어 순서
const KO_ORDER = { KR: 'fg0', JP: 'fg', CN: 'fg0', TW: 'fg0', VN: 'fg' };          // 그 밖은 '이름 성' (서양식)
const EN_ORDER = { KR: 'fg', CN: 'fg', TW: 'fg', VN: 'fg' };                        // 그 밖은 '이름 성' (일본 포함)

/** 원어 전체 이름에서 성 · 이름 찾기 (표에 있는 것만) */
function parse(nat, full) {
  const t = TABLE[nat]; if (!t || !full) return null;
  const s = String(full).trim();
  for (const fam of Object.keys(t.fam)) {
    for (const [a, b] of [[fam + ' ', ''], [fam, '']]) {               // "성 이름" · "성이름"
      if (s.startsWith(a)) { const g = s.slice(a.length).trim(); if (t.giv[g]) return { fam, giv: g }; }
    }
    if (s.endsWith(' ' + fam)) { const g = s.slice(0, -fam.length - 1).trim(); if (t.giv[g]) return { fam, giv: g }; }   // "이름 성"
  }
  return null;
}
/** { ko, en } — 표에 없으면 둘 다 원래 이름 */
export function localNames(nat, full) {
  const p = parse(nat, full), t = TABLE[nat];
  if (!p) return { ko: full, en: full };
  const [fk, fe] = t.fam[p.fam], [gk, ge] = t.giv[p.giv];
  const ko = KO_ORDER[nat] === 'fg0' ? fk + gk : KO_ORDER[nat] === 'fg' ? `${fk} ${gk}` : `${gk} ${fk}`;
  const en = EN_ORDER[nat] === 'fg' ? `${fe} ${ge}` : `${ge} ${fe}`;
  return { ko, en };
}
