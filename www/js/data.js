// 게임 데이터 · 밸런스 수치
export const VERSION = '0.1.0';
export const MAX_LEVEL = 30;

// 현재 단계(L)에서 강화를 시도할 때의 확률 (%)
// 성공 확률 안에 대성공(+2단계)이 포함됨
const SUCCESS = [95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 42, 40, 37, 35, 32, 30, 27, 25, 22, 20, 18, 15, 13, 10, 8, 6, 5, 4, 3];
const DESTROY = [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
const GREAT_RATIO = 0.1; // 성공 중 대성공 비율

// 검 외형 (3단계마다 바뀜)
export const TIERS = [
  { name: '녹슨 검', color: '#9a8478', glow: 0 },
  { name: '철검', color: '#b8c0cc', glow: 0 },
  { name: '강철검', color: '#dfe6f0', glow: 0.15 },
  { name: '기사의 검', color: '#7dd3fc', glow: 0.25 },
  { name: '미스릴 검', color: '#5eead4', glow: 0.35 },
  { name: '룬 검', color: '#a78bfa', glow: 0.45 },
  { name: '용살검', color: '#f87171', glow: 0.55 },
  { name: '성검', color: '#fde68a', glow: 0.65 },
  { name: '마검', color: '#e879f9', glow: 0.75 },
  { name: '천공의 검', color: '#38bdf8', glow: 0.85 },
  { name: '전설의 검', color: '#ffd166', glow: 1 },
];

export const tierOf = (lv) => TIERS[Math.min(TIERS.length - 1, Math.floor(lv / 3))];
export const swordName = (lv) => `+${lv} ${tierOf(lv).name}`;

// 강화 확률. items: { lucky, bless, guard } 적용 여부
export function chances(lv, items = {}) {
  if (lv >= MAX_LEVEL) return { great: 0, success: 0, keep: 100, destroy: 0 };
  let succ = SUCCESS[lv];
  let destroy = DESTROY[lv];
  if (items.lucky) succ = Math.min(100 - destroy, succ + 10); // 행운의 부적: 성공 +10%p (유지에서 차감)
  let great = lv + 2 <= MAX_LEVEL ? succ * GREAT_RATIO : 0;
  if (items.bless) great = Math.min(succ, great * 3); // 축복 주문서: 대성공 3배
  if (items.guard) destroy = 0; // 파괴 방지권: 파괴 → 유지
  const keep = 100 - succ - destroy;
  return { great: round1(great), success: round1(succ - great), keep: round1(keep), destroy: round1(destroy) };
}
const round1 = (n) => Math.round(n * 10) / 10;

export const enhanceCost = (lv) => Math.floor(100 * Math.pow(1.35, lv));
export const basePrice = (lv) => (lv === 0 ? 30 : Math.floor(150 * Math.pow(1.55, lv)));
export const fragmentsOnDestroy = (lv) => Math.max(1, lv - 4);

// 보조 아이템 (골드 가격은 최고 강화 기록에 비례해 오름)
export const ITEMS = {
  guard: { name: '파괴 방지권', icon: '🛡️', desc: '파괴 결과가 나오면 유지로 바뀝니다', gold: 3000, frag: 12 },
  lucky: { name: '행운의 부적', icon: '🍀', desc: '성공 확률 +10%p', gold: 800, frag: 4 },
  bless: { name: '축복 주문서', icon: '✨', desc: '대성공 확률 3배', gold: 1500, frag: 6 },
};
export const itemGoldPrice = (id, best) => Math.floor(ITEMS[id].gold * Math.pow(1.28, best));

// 도감 보너스: 등록된 검 하나당 판매가 +3%
export const DEX_BONUS = 0.03;

// 업적. check(s) 가 true 이면 달성, reward 를 받음
export const ACHIEVEMENTS = [
  { id: 'first', name: '첫 망치질', desc: '강화를 1번 시도', check: (s) => s.stats.tries >= 1, reward: { gold: 500 } },
  { id: 'try100', name: '대장장이 견습', desc: '강화를 100번 시도', check: (s) => s.stats.tries >= 100, reward: { gold: 20000 } },
  { id: 'try1000', name: '숙련 대장장이', desc: '강화를 1,000번 시도', check: (s) => s.stats.tries >= 1000, reward: { guard: 3 } },
  { id: 'lv5', name: '빛나기 시작', desc: '+5 달성', check: (s) => s.best >= 5, reward: { gold: 3000 } },
  { id: 'lv10', name: '명검의 자격', desc: '+10 달성', check: (s) => s.best >= 10, reward: { gold: 50000, lucky: 3 } },
  { id: 'lv15', name: '장인의 경지', desc: '+15 달성', check: (s) => s.best >= 15, reward: { gold: 1000000, guard: 2 } },
  { id: 'lv20', name: '전설의 시작', desc: '+20 달성', check: (s) => s.best >= 20, reward: { gold: 30000000, guard: 3 } },
  { id: 'lv25', name: '신화 속으로', desc: '+25 달성', check: (s) => s.best >= 25, reward: { gold: 500000000, guard: 5 } },
  { id: 'lv30', name: '전설의 검', desc: '+30 달성', check: (s) => s.best >= 30, reward: { gold: 10000000000 } },
  { id: 'great1', name: '대박!', desc: '대성공 1번', check: (s) => s.stats.greats >= 1, reward: { bless: 2 } },
  { id: 'great20', name: '행운아', desc: '대성공 20번', check: (s) => s.stats.greats >= 20, reward: { bless: 10 } },
  { id: 'boom1', name: '산산조각', desc: '검 파괴 1번', check: (s) => s.stats.destroys >= 1, reward: { guard: 1 } },
  { id: 'boom50', name: '파괴의 달인', desc: '검 파괴 50번', check: (s) => s.stats.destroys >= 50, reward: { guard: 5 } },
  { id: 'guard1', name: '살았다!', desc: '파괴 방지권으로 파괴 막기', check: (s) => s.stats.saved >= 1, reward: { gold: 5000 } },
  { id: 'sell10', name: '행상인', desc: '검 10자루 판매', check: (s) => s.stats.sells >= 10, reward: { gold: 10000 } },
  { id: 'sell100', name: '무기 상인', desc: '검 100자루 판매', check: (s) => s.stats.sells >= 100, reward: { lucky: 10 } },
  { id: 'earn1m', name: '백만장자', desc: '판매로 누적 100만 골드', check: (s) => s.stats.earned >= 1e6, reward: { guard: 2 } },
  { id: 'earn1b', name: '억만장자', desc: '판매로 누적 10억 골드', check: (s) => s.stats.earned >= 1e9, reward: { guard: 10 } },
  { id: 'dex10', name: '수집가', desc: '도감 10칸 등록', check: (s) => s.dex.length >= 10, reward: { gold: 100000 } },
  { id: 'dex30', name: '완벽한 도감', desc: '도감 30칸 모두 등록', check: (s) => s.dex.length >= 30, reward: { gold: 1e11 } },
];
