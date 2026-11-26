// 게임 데이터 · 밸런스 수치
export const VERSION = '0.6.1';
export const MAX_LEVEL = 300;

// 현재 단계(L)에서 강화를 시도할 때의 확률 (%)
// 성공: 95%에서 시작해 점점 내려가다 +130 근처부터 4%로 고정
// 파괴: +5부터 생기고 +70 근처에서 25%로 고정
// 성공 안에 대성공(+2단계)이 10% 포함됨
const successRate = (lv) => Math.max(4, 95 * Math.exp(-lv / 40));
const destroyRate = (lv) => (lv < 5 ? 0 : Math.min(25, 1 + (lv - 5) * 0.37));
const GREAT_RATIO = 0.1;

// 무기 10종. 판매하거나 파괴되면 새 무기가 확률(weight)에 따라 나옴
// price: 판매가 배율, atk: 공격력(사냥) 배율, succ: 성공 확률 +%p, destroy: 파괴 확률 배율, great: 대성공 배율, frag: 파괴 시 조각 배율
export const WEAPONS = [
  { id: 'branch', name: '나뭇가지', grade: '흔함', weight: 22, price: 0.6, atk: 0.5, succ: 8, destroy: 1, great: 1, frag: 1, perk: '성공 확률 +8%p · 판매가 ×0.6' },
  { id: 'wood', name: '목검', grade: '흔함', weight: 18, price: 0.8, atk: 0.6, succ: 0, destroy: 0.8, great: 1, frag: 1, perk: '파괴 확률 -20% · 판매가 ×0.8' },
  { id: 'dagger', name: '단검', grade: '보통', weight: 15, price: 0.9, atk: 0.9, succ: 0, destroy: 1, great: 2, frag: 1, perk: '대성공 확률 2배 · 판매가 ×0.9' },
  { id: 'sword', name: '장검', grade: '보통', weight: 14, price: 1, atk: 1, succ: 0, destroy: 1, great: 1, frag: 1, perk: '특별한 점 없는 기본 무기' },
  { id: 'axe', name: '도끼', grade: '보통', weight: 10, price: 1.1, atk: 1.3, succ: 0, destroy: 1, great: 1, frag: 2, perk: '파괴 시 조각 2배 · 판매가 ×1.1' },
  { id: 'spear', name: '창', grade: '희귀', weight: 8, price: 1.3, atk: 1.4, succ: 2, destroy: 1, great: 1, frag: 1, perk: '성공 확률 +2%p · 판매가 ×1.3' },
  { id: 'great', name: '대검', grade: '희귀', weight: 6, price: 1.5, atk: 1.7, succ: 0, destroy: 0.7, great: 1, frag: 1, perk: '파괴 확률 -30% · 판매가 ×1.5' },
  { id: 'katana', name: '카타나', grade: '영웅', weight: 4, price: 1.8, atk: 2, succ: 0, destroy: 1, great: 2, frag: 1, perk: '대성공 확률 2배 · 판매가 ×1.8' },
  { id: 'scythe', name: '사신의 낫', grade: '전설', weight: 2, price: 3, atk: 2.6, succ: 0, destroy: 1.25, great: 1, frag: 1, perk: '파괴 확률 +25% · 판매가 ×3' },
  { id: 'gold', name: '황금 검', grade: '신화', weight: 1, price: 5, atk: 1.2, succ: 0, destroy: 1, great: 1, frag: 3, perk: '판매가 ×5 · 파괴 시 조각 3배' },
];
export const GRADE_COLOR = { 흔함: '#a8a29e', 보통: '#e5e7eb', 희귀: '#60a5fa', 영웅: '#c084fc', 전설: '#fb923c', 신화: '#facc15' };
export const weaponOf = (id) => WEAPONS.find((w) => w.id === id) || WEAPONS[3];
const TOTAL_WEIGHT = WEAPONS.reduce((a, w) => a + w.weight, 0);
export const weaponChance = (w) => Math.round((w.weight / TOTAL_WEIGHT) * 1000) / 10;
export function rollWeapon(rand = Math.random) {
  let r = rand() * TOTAL_WEIGHT;
  for (const w of WEAPONS) { r -= w.weight; if (r < 0) return w.id; }
  return WEAPONS[0].id;
}

// 무기 등급(외형 · 이름 앞에 붙는 말): 시작 단계(from)부터 다음 등급 전까지
export const TIERS = [
  { from: 0, name: '녹슨' },
  { from: 3, name: '무쇠' },
  { from: 6, name: '강철' },
  { from: 9, name: '기사의' },
  { from: 12, name: '미스릴' },
  { from: 15, name: '룬' },
  { from: 20, name: '용살' },
  { from: 25, name: '성스러운' },
  { from: 30, name: '마력의' },
  { from: 40, name: '천공의' },
  { from: 50, name: '영웅의' },
  { from: 60, name: '왕의' },
  { from: 80, name: '폭풍의' },
  { from: 100, name: '별의' },
  { from: 120, name: '태양의' },
  { from: 150, name: '월광의' },
  { from: 180, name: '혼돈의' },
  { from: 210, name: '심연의' },
  { from: 240, name: '신살' },
  { from: 270, name: '창세의' },
  { from: 300, name: '절대신의' },
];
const COLORS = ['#9a8478', '#b8c0cc', '#dfe6f0', '#7dd3fc', '#5eead4', '#a78bfa', '#f87171', '#fde68a', '#e879f9', '#38bdf8',
  '#fb923c', '#facc15', '#22d3ee', '#c4b5fd', '#fbbf24', '#93c5fd', '#f472b6', '#818cf8', '#ef4444', '#a3e635', '#ffd166'];
TIERS.forEach((t, i) => { t.color = COLORS[i]; t.glow = i < 2 ? 0 : Math.min(1, i / (TIERS.length - 1) + 0.1); t.index = i; });

export function tierOf(lv) {
  let t = TIERS[0];
  for (const x of TIERS) if (lv >= x.from) t = x;
  return t;
}
export const weaponName = (lv, wid) => `${tierOf(lv).name} ${weaponOf(wid).name}`;
export const swordName = (lv, wid = 'sword') => `+${lv} ${weaponName(lv, wid)}`;

// 강화 확률. items: { lucky, bless, guard } 적용 여부, wid: 무기 종류
// m: 대장간 · 환생 · 이벤트 보정 { succ: +%p, destroy: 배율, great: 배율 }
export const NO_MODS = { succ: 0, destroy: 1, great: 1 };
export function chances(lv, items = {}, wid = 'sword', m = NO_MODS) {
  if (lv >= MAX_LEVEL) return { great: 0, success: 0, keep: 100, destroy: 0 };
  const w = weaponOf(wid);
  let destroy = Math.min(60, destroyRate(lv) * w.destroy * m.destroy);
  let succ = Math.min(100 - destroy, successRate(lv) + w.succ + m.succ);
  if (items.lucky) succ = Math.min(100 - destroy, succ + luckyBonus(succ)); // 행운의 부적 (유지에서 차감)
  let great = lv + 2 <= MAX_LEVEL ? succ * GREAT_RATIO * w.great * m.great : 0;
  if (items.bless) great *= 3; // 축복 주문서: 대성공 3배
  great = Math.min(succ, great);
  if (items.guard) destroy = 0; // 파괴 방지권: 파괴 → 유지
  const keep = 100 - succ - destroy;
  return { great: round1(great), success: round1(succ - great), keep: round1(keep), destroy: round1(destroy) };
}
const round1 = (n) => Math.round(n * 10) / 10;
// 행운의 부적: 성공 확률 +10%p, 단 원래 확률의 2배까지
const luckyBonus = (succ) => Math.min(10, succ);

export const enhanceCost = (lv) => Math.floor(100 * Math.pow(1.08, lv));
export const fragmentsOnDestroy = (lv, wid = 'sword') => Math.max(1, Math.floor((lv - 4) / 2) + 1) * weaponOf(wid).frag;

// 판매가 = (+0에서 그 단계까지 올리는 데 드는 평균 비용) × 이익률 × 무기 배율
// 평균 비용은 +20부터 파괴 방지권, 성공률 30% 미만에서 행운의 부적을 쓴다고 보고 계산
// 이익률은 +1에서 1.4배, +300에서 4.4배로 높은 단계일수록 이득
const PRICES = (() => {
  const out = [30];
  let climb = 0;
  for (let lv = 0; lv < MAX_LEVEL; lv++) {
    const succ = successRate(lv);
    const lucky = succ < 30;
    const p = (lucky ? succ + luckyBonus(succ) : succ) / 100;
    const c = enhanceCost(lv) * (1 + (lv >= 20 ? 3 : 0) + (lucky ? 2 : 0));
    climb += c / p;
    out.push(Math.floor(climb * (1.4 + (lv + 1) / 100)));
  }
  return out;
})();
export const basePrice = (lv) => PRICES[lv];

// 보조 아이템. 골드 가격 = 기본가 × 1.07^(최고 기록)
export const ITEMS = {
  guard: { name: '파괴 방지권', icon: '🛡️', desc: '파괴 결과가 나오면 유지로 바뀝니다', gold: 500, frag: 12 },
  lucky: { name: '행운의 부적', icon: '🍀', desc: '성공 확률 +10%p (최대 2배)', gold: 300, frag: 4 },
  bless: { name: '축복 주문서', icon: '✨', desc: '대성공 확률 3배', gold: 400, frag: 6 },
};
export const itemGoldPrice = (id, best) => Math.floor(ITEMS[id].gold * Math.pow(1.07, best));

// 도감 보너스: 등록된 단계 하나당 판매가 +1%, 발견한 무기 하나당 +2%
export const DEX_BONUS = 0.01;
export const WEAPON_DEX_BONUS = 0.02;

// ---------- 대장간 업그레이드 (골드로 사는 영구 능력, 환생하면 초기화) ----------
// cost: 첫 레벨 가격, grow: 레벨마다 가격 배율, per: 레벨당 효과
export const UPGRADES = [
  { id: 'warehouse', icon: '📦', name: '무기 창고 확장', unit: '보관함', per: 5, fmt: (v) => `+${v}칸`, max: 10, cost: 20000, grow: 4 },
  { id: 'barracks', icon: '⛺', name: '사냥꾼 숙소', unit: '사냥 슬롯', per: 1, fmt: (v) => `+${v}칸`, max: 5, cost: 100000, grow: 12 },
  { id: 'hammer', icon: '🔨', name: '정밀한 망치', unit: '성공 확률', per: 0.5, fmt: (v) => `+${v}%p`, max: 10, cost: 50000, grow: 6 },
  { id: 'anvil', icon: '🧱', name: '단단한 모루', unit: '파괴 확률', per: 3, fmt: (v) => `-${v}%`, max: 10, cost: 80000, grow: 6 },
  { id: 'fortune', icon: '🌟', name: '행운의 부적함', unit: '대성공 확률', per: 10, fmt: (v) => `+${v}%`, max: 10, cost: 30000, grow: 5 },
  { id: 'merchant', icon: '🤝', name: '상인 길드 인맥', unit: '판매가', per: 5, fmt: (v) => `+${v}%`, max: 20, cost: 20000, grow: 3.2 },
  { id: 'furnace', icon: '🔥', name: '효율적인 화로', unit: '강화 비용', per: 2, fmt: (v) => `-${v}%`, max: 15, cost: 40000, grow: 4 },
  { id: 'salvage', icon: '🧲', name: '고철 회수기', unit: '파괴 시 조각', per: 20, fmt: (v) => `+${v}%`, max: 10, cost: 10000, grow: 4 },
  { id: 'apprentice', icon: '🧑‍🔧', name: '견습생 고용', unit: '오프라인 보상', per: 1, fmt: (v) => `+${v}시간`, max: 10, cost: 30000, grow: 5 },
];
export const upgradeCost = (u, lv) => Math.floor(u.cost * Math.pow(u.grow, lv));
export const upgradeOf = (id) => UPGRADES.find((u) => u.id === id);

// ---------- 보관함 · 사냥 ----------
// 보관한 무기를 사냥에 내보내면 공격력만큼 초당 골드를 벌어 옴 (화면 없이 골드 수급용)
// 공격력은 판매가와 비례: 사냥 1칸이 약 30분 동안 그 무기 판매가만큼 벌어 옴 (무기 공격력 배율 적용)
export const STORAGE_BASE = 10;
export const HUNT_BASE = 3;
export const attackOf = (lv, wid) => Math.max(1, Math.floor(basePrice(lv) * weaponOf(wid).atk / 180));
export const GOLD_PER_ATK = 0.1; // 공격력 1당 초당 골드

// ---------- 환생 ----------
// 최고 기록 +100부터 환생 가능. 환생석 = (최고 기록 - 90) / 10 (내림), +300이면 21개
// 환생석 1개당: 판매가 +10%, 강화 비용 -1% (최대 -50%), 시작 골드 +1만
export const REBIRTH_MIN = 100;
export const rebirthStones = (best) => (best < REBIRTH_MIN ? 0 : Math.floor((best - 90) / 10));

// ---------- 오프라인 보상 ----------
// 앱을 끈 동안 시간당 (최고 기록 60% 단계의 판매가 × 2) 골드, 기본 최대 2시간
export const OFFLINE_BASE_HOURS = 2;
export const offlinePerHour = (best) => Math.floor(basePrice(Math.max(1, Math.floor(best * 0.6))) * 2);

// ---------- 무작위 이벤트 ----------
// 플레이 중 3~6분마다 하나씩 발생. min: 지속 시간(분), 0이면 즉시 보상
export const EVENTS = [
  { id: 'luck', icon: '🌟', name: '행운의 시간', desc: '성공 확률 +5%p', min: 3 },
  { id: 'great', icon: '💥', name: '대성공 축제', desc: '대성공 확률 2배', min: 3 },
  { id: 'guard', icon: '🛡️', name: '수호의 시간', desc: '파괴 확률 절반', min: 3 },
  { id: 'noble', icon: '👑', name: '귀족 손님 방문', desc: '판매가 1.5배', min: 3 },
  { id: 'peddler', icon: '🧳', name: '떠돌이 상인', desc: '상점 아이템 50% 할인', min: 3 },
  { id: 'sale', icon: '🔥', name: '화로 대청소', desc: '강화 비용 절반', min: 2 },
  { id: 'chest', icon: '🎁', name: '보물 상자', desc: '눌러서 아이템 획득 (30초)', min: 0.5 },
];
export const eventOf = (id) => EVENTS.find((e) => e.id === id);

// 업적. check(s) 가 true 이면 달성, reward 를 받음. cat: 화면에서 묶어 보여줄 분류
const A = (cat, id, name, desc, check, reward) => ({ cat, id, name, desc, check, reward });
const st = (s) => s.stats;
const wb = (s, id) => s.weaponBest[id] || 0;
export const ACHIEVEMENTS = [
  // 강화 시도
  A('강화', 'first', '첫 망치질', '강화를 1번 시도', (s) => st(s).tries >= 1, { gold: 500 }),
  A('강화', 'try100', '대장장이 견습', '강화를 100번 시도', (s) => st(s).tries >= 100, { gold: 20000 }),
  A('강화', 'try1000', '숙련 대장장이', '강화를 1,000번 시도', (s) => st(s).tries >= 1000, { guard: 3 }),
  A('강화', 'try10k', '대장간의 주인', '강화를 10,000번 시도', (s) => st(s).tries >= 10000, { guard: 20, lucky: 20 }),
  A('강화', 'try100k', '망치의 신', '강화를 100,000번 시도', (s) => st(s).tries >= 100000, { guard: 200 }),
  // 최고 기록
  A('기록', 'lv5', '빛나기 시작', '+5 달성', (s) => s.best >= 5, { gold: 3000 }),
  A('기록', 'lv10', '명검의 자격', '+10 달성', (s) => s.best >= 10, { gold: 30000, lucky: 3 }),
  A('기록', 'lv20', '장인의 경지', '+20 달성', (s) => s.best >= 20, { gold: 500000, guard: 2 }),
  A('기록', 'lv30', '마력이 깃들다', '+30 달성', (s) => s.best >= 30, { gold: 5000000, guard: 3 }),
  A('기록', 'lv50', '영웅의 무기', '+50 달성', (s) => s.best >= 50, { guard: 10, bless: 5 }),
  A('기록', 'lv75', '왕좌의 대장장이', '+75 달성', (s) => s.best >= 75, { guard: 20, lucky: 10 }),
  A('기록', 'lv100', '별에 닿다', '+100 달성', (s) => s.best >= 100, { guard: 30, lucky: 20 }),
  A('기록', 'lv150', '달빛 대장장이', '+150 달성', (s) => s.best >= 150, { guard: 60, bless: 20 }),
  A('기록', 'lv200', '혼돈을 넘어', '+200 달성', (s) => s.best >= 200, { guard: 100, lucky: 50 }),
  A('기록', 'lv250', '신을 베는 자', '+250 달성', (s) => s.best >= 250, { guard: 200, bless: 50 }),
  A('기록', 'lv300', '절대신의 무기', '+300 달성', (s) => s.best >= 300, { guard: 500 }),
  // 결과
  A('결과', 'great1', '대박!', '대성공 1번', (s) => st(s).greats >= 1, { bless: 2 }),
  A('결과', 'great20', '행운아', '대성공 20번', (s) => st(s).greats >= 20, { bless: 10 }),
  A('결과', 'great200', '대성공 제조기', '대성공 200번', (s) => st(s).greats >= 200, { bless: 30, guard: 10 }),
  A('결과', 'greatHigh', '하늘이 내린 한 방', '+100 이상에서 대성공', (s) => st(s).highGreat >= 100, { guard: 20 }),
  A('결과', 'streak5', '거침없이', '5번 연속 성공', (s) => st(s).bestStreak >= 5, { lucky: 3 }),
  A('결과', 'streak10', '신들린 망치', '10번 연속 성공', (s) => st(s).bestStreak >= 10, { guard: 5 }),
  A('결과', 'streak20', '운명을 거스르다', '20번 연속 성공', (s) => st(s).bestStreak >= 20, { guard: 30 }),
  A('결과', 'fail20', '인내심', '20번 연속 실패 (유지·파괴)', (s) => st(s).bestFail >= 20, { lucky: 10 }),
  A('결과', 'fail50', '돌부처', '50번 연속 실패 (유지·파괴)', (s) => st(s).bestFail >= 50, { guard: 10, lucky: 10 }),
  // 파괴
  A('파괴', 'boom1', '산산조각', '무기 파괴 1번', (s) => st(s).destroys >= 1, { guard: 1 }),
  A('파괴', 'boom50', '파괴의 달인', '무기 파괴 50번', (s) => st(s).destroys >= 50, { guard: 5 }),
  A('파괴', 'boom500', '고철 수집가', '무기 파괴 500번', (s) => st(s).destroys >= 500, { guard: 30 }),
  A('파괴', 'boomHigh', '눈물의 망치', '+50 이상 무기 파괴', (s) => st(s).worstBoom >= 50, { guard: 10 }),
  A('파괴', 'guard1', '살았다!', '파괴 방지권으로 파괴 막기', (s) => st(s).saved >= 1, { gold: 5000 }),
  A('파괴', 'guard100', '철벽 방어', '파괴 방지권으로 100번 막기', (s) => st(s).saved >= 100, { guard: 20 }),
  A('파괴', 'frag100', '조각 모으기', '검 조각 누적 100개', (s) => st(s).fragsGot >= 100, { lucky: 5 }),
  A('파괴', 'frag1000', '조각 산더미', '검 조각 누적 1,000개', (s) => st(s).fragsGot >= 1000, { guard: 20 }),
  // 판매 · 골드
  A('판매', 'sell10', '행상인', '무기 10개 판매', (s) => st(s).sells >= 10, { gold: 10000 }),
  A('판매', 'sell100', '무기 상인', '무기 100개 판매', (s) => st(s).sells >= 100, { lucky: 10 }),
  A('판매', 'sell1000', '무역왕', '무기 1,000개 판매', (s) => st(s).sells >= 1000, { guard: 30 }),
  A('판매', 'sold50', '명품 거래', '+50 이상 무기 판매', (s) => st(s).bestSoldLv >= 50, { guard: 10 }),
  A('판매', 'sold100', '국보급 거래', '+100 이상 무기 판매', (s) => st(s).bestSoldLv >= 100, { guard: 30 }),
  A('판매', 'sold200', '전설의 거래', '+200 이상 무기 판매', (s) => st(s).bestSoldLv >= 200, { guard: 100 }),
  A('판매', 'earn1m', '백만장자', '판매로 누적 100만 골드', (s) => st(s).earned >= 1e6, { guard: 2 }),
  A('판매', 'earn1b', '억만장자', '판매로 누적 10억 골드', (s) => st(s).earned >= 1e9, { guard: 10 }),
  A('판매', 'earn1t', '조만장자', '판매로 누적 1조 골드', (s) => st(s).earned >= 1e12, { guard: 50 }),
  A('판매', 'earn1q', '경만장자', '판매로 누적 1경 골드', (s) => st(s).earned >= 1e16, { guard: 300 }),
  A('판매', 'rich', '금고가 꽉 차다', '골드 1억 보유', (s) => s.gold >= 1e8, { bless: 10 }),
  // 무기
  A('무기', 'wp5', '무기 수집가', '무기 5종 발견', (s) => s.weaponsFound.length >= 5, { lucky: 5 }),
  A('무기', 'wp10', '무기고', '무기 10종 모두 발견', (s) => s.weaponsFound.length >= 10, { guard: 20 }),
  A('무기', 'branch30', '나뭇가지의 기적', '나뭇가지 +30 달성', (s) => wb(s, 'branch') >= 30, { guard: 5 }),
  A('무기', 'branch100', '세계수의 가지', '나뭇가지 +100 달성', (s) => wb(s, 'branch') >= 100, { guard: 50 }),
  A('무기', 'wood50', '목검 장인', '목검 +50 달성', (s) => wb(s, 'wood') >= 50, { guard: 10 }),
  A('무기', 'axe50', '나무꾼의 꿈', '도끼 +50 달성', (s) => wb(s, 'axe') >= 50, { guard: 10 }),
  A('무기', 'katana50', '무사의 혼', '카타나 +50 달성', (s) => wb(s, 'katana') >= 50, { guard: 15 }),
  A('무기', 'scythe1', '사신과의 계약', '사신의 낫 발견', (s) => s.weaponsFound.includes('scythe'), { bless: 5 }),
  A('무기', 'gold1', '황금빛 행운', '황금 검 발견', (s) => s.weaponsFound.includes('gold'), { guard: 5 }),
  A('무기', 'gold50', '미다스의 손', '황금 검 +50 달성', (s) => wb(s, 'gold') >= 50, { guard: 50 }),
  A('무기', 'all30', '만능 대장장이', '무기 10종 모두 +30 달성', (s) => WEAPONS.every((w) => wb(s, w.id) >= 30), { guard: 100 }),
  // 도감 · 기타
  A('기타', 'dex10', '수집가', '도감 10칸 등록', (s) => s.dex.length >= 10, { gold: 100000 }),
  A('기타', 'dex50', '열성 수집가', '도감 50칸 등록', (s) => s.dex.length >= 50, { guard: 10 }),
  A('기타', 'dex100', '박물관장', '도감 100칸 등록', (s) => s.dex.length >= 100, { guard: 30 }),
  A('기타', 'dex300', '완벽한 도감', '도감 300칸 모두 등록', (s) => s.dex.length >= 300, { guard: 300 }),
  A('기타', 'item100', '아이템 애호가', '보조 아이템 100개 사용', (s) => st(s).itemsUsed >= 100, { lucky: 10, bless: 10 }),
  A('기타', 'item1000', '소모품 중독', '보조 아이템 1,000개 사용', (s) => st(s).itemsUsed >= 1000, { guard: 50 }),
  A('기타', 'auto1000', '자동화의 시작', '자동 강화 1,000번', (s) => st(s).autoTries >= 1000, { lucky: 10 }),
  A('기타', 'auto10k', '쉬지 않는 대장간', '자동 강화 10,000번', (s) => st(s).autoTries >= 10000, { guard: 30 }),
  // 대장간 · 환생 · 이벤트 · 랭킹
  A('대장간', 'up1', '대장간 확장', '대장간 업그레이드 1번', (s) => upTotal(s) >= 1, { gold: 20000 }),
  A('대장간', 'up20', '번듯한 대장간', '대장간 업그레이드 합계 20레벨', (s) => upTotal(s) >= 20, { guard: 10 }),
  A('대장간', 'upmax', '전설의 대장간', '대장간 업그레이드 모두 최대', (s) => UPGRADES.every((u) => (s.upgrades[u.id] || 0) >= u.max), { guard: 100 }),
  A('대장간', 'reb1', '다시 태어난 대장장이', '환생 1번', (s) => s.rebirth.count >= 1, { guard: 20, lucky: 20 }),
  A('대장간', 'reb5', '윤회의 망치', '환생 5번', (s) => s.rebirth.count >= 5, { guard: 100 }),
  A('대장간', 'stone50', '환생석 수집가', '환생석 누적 50개', (s) => s.rebirth.total >= 50, { guard: 200 }),
  A('대장간', 'offline1', '잘 쉬고 왔어요', '오프라인 보상 받기', (s) => st(s).offlineClaims >= 1, { lucky: 3 }),
  A('대장간', 'event10', '이벤트 사냥꾼', '무작위 이벤트 10번 만나기', (s) => st(s).events >= 10, { bless: 10 }),
  A('대장간', 'chest10', '보물 사냥꾼', '보물 상자 10개 열기', (s) => st(s).chests >= 10, { guard: 10 }),
  A('대장간', 'online', '세계에 이름을', '온라인 랭킹 등록', (s) => !!s.online.submitted, { guard: 5 }),
  // 보관함 · 사냥
  A('사냥', 'store1', '소중한 무기', '무기 1개 보관', (s) => st(s).stored >= 1, { gold: 5000 }),
  A('사냥', 'store100', '무기 수집광', '무기 100개 보관', (s) => st(s).stored >= 100, { guard: 10 }),
  A('사냥', 'hunt1', '첫 사냥', '무기를 사냥에 내보내기', (s) => s.storage.some((x) => x.hunting), { lucky: 3 }),
  A('사냥', 'huntFull', '사냥단 결성', '사냥 슬롯 3칸 모두 채우기', (s) => s.storage.filter((x) => x.hunting).length >= 3, { guard: 3 }),
  A('사냥', 'hunt1m', '사냥꾼', '사냥으로 누적 100만 골드', (s) => st(s).hunted >= 1e6, { guard: 5 }),
  A('사냥', 'hunt1b', '전설의 사냥꾼', '사냥으로 누적 10억 골드', (s) => st(s).hunted >= 1e9, { guard: 30 }),
  A('사냥', 'hunt1t', '마왕 토벌대', '사냥으로 누적 1조 골드', (s) => st(s).hunted >= 1e12, { guard: 100 }),
  A('사냥', 'atk1m', '일당백', '공격력 100만 이상 무기 보유', (s) => s.storage.some((x) => attackOf(x.level, x.weapon) >= 1e6), { guard: 20 }),
];
const upTotal = (s) => Object.values(s.upgrades).reduce((a, b) => a + b, 0);
