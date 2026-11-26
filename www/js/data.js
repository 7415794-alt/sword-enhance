// 게임 데이터 · 밸런스 수치
export const VERSION = '0.2.0';
export const MAX_LEVEL = 300;

// 현재 단계(L)에서 강화를 시도할 때의 확률 (%)
// 성공: 95%에서 시작해 점점 내려가다 +130 근처부터 4%로 고정
// 파괴: +5부터 생기고 +70 근처에서 25%로 고정
// 성공 안에 대성공(+2단계)이 10% 포함됨
const successRate = (lv) => Math.max(4, 95 * Math.exp(-lv / 40));
const destroyRate = (lv) => (lv < 5 ? 0 : Math.min(25, 1 + (lv - 5) * 0.37));
const GREAT_RATIO = 0.1;

// 검 외형: 시작 단계(from)부터 다음 외형 전까지
export const TIERS = [
  { from: 0, name: '녹슨 검' },
  { from: 3, name: '철검' },
  { from: 6, name: '강철검' },
  { from: 9, name: '기사의 검' },
  { from: 12, name: '미스릴 검' },
  { from: 15, name: '룬 검' },
  { from: 20, name: '용살검' },
  { from: 25, name: '성검' },
  { from: 30, name: '마검' },
  { from: 40, name: '천공의 검' },
  { from: 50, name: '영웅의 검' },
  { from: 60, name: '왕의 검' },
  { from: 80, name: '폭풍의 검' },
  { from: 100, name: '별의 검' },
  { from: 120, name: '태양검' },
  { from: 150, name: '월광검' },
  { from: 180, name: '혼돈의 검' },
  { from: 210, name: '심연의 검' },
  { from: 240, name: '신살검' },
  { from: 270, name: '창세의 검' },
  { from: 300, name: '절대신검' },
];
const COLORS = ['#9a8478', '#b8c0cc', '#dfe6f0', '#7dd3fc', '#5eead4', '#a78bfa', '#f87171', '#fde68a', '#e879f9', '#38bdf8',
  '#fb923c', '#facc15', '#22d3ee', '#c4b5fd', '#fbbf24', '#e0f2fe', '#f472b6', '#818cf8', '#ef4444', '#a3e635', '#ffd166'];
TIERS.forEach((t, i) => { t.color = COLORS[i]; t.glow = i < 2 ? 0 : Math.min(1, i / (TIERS.length - 1) + 0.1); t.index = i; });

export function tierOf(lv) {
  let t = TIERS[0];
  for (const x of TIERS) if (lv >= x.from) t = x;
  return t;
}
export const swordName = (lv) => `+${lv} ${tierOf(lv).name}`;

// 강화 확률. items: { lucky, bless, guard } 적용 여부
export function chances(lv, items = {}) {
  if (lv >= MAX_LEVEL) return { great: 0, success: 0, keep: 100, destroy: 0 };
  let succ = successRate(lv);
  let destroy = destroyRate(lv);
  if (items.lucky) succ = Math.min(100 - destroy, succ + 10); // 행운의 부적: 성공 +10%p (유지에서 차감)
  let great = lv + 2 <= MAX_LEVEL ? succ * GREAT_RATIO : 0;
  if (items.bless) great = Math.min(succ, great * 3); // 축복 주문서: 대성공 3배
  if (items.guard) destroy = 0; // 파괴 방지권: 파괴 → 유지
  const keep = 100 - succ - destroy;
  return { great: round1(great), success: round1(succ - great), keep: round1(keep), destroy: round1(destroy) };
}
const round1 = (n) => Math.round(n * 10) / 10;

export const enhanceCost = (lv) => Math.floor(100 * Math.pow(1.08, lv));
export const fragmentsOnDestroy = (lv) => Math.max(1, Math.floor((lv - 4) / 2) + 1);

// 판매가 = (+0에서 그 단계까지 올리는 데 드는 평균 비용) × 이익률
// 평균 비용은 +20부터 파괴 방지권, 성공률 30% 미만에서 행운의 부적을 쓴다고 보고 계산
// 이익률은 +1에서 1.4배, +300에서 4.4배로 높은 단계일수록 이득
const PRICES = (() => {
  const out = [30];
  let climb = 0;
  for (let lv = 0; lv < 300; lv++) {
    const succ = successRate(lv);
    const lucky = succ < 30;
    const p = (lucky ? succ + 10 : succ) / 100;
    const c = enhanceCost(lv) * (1 + (lv >= 20 ? 3 : 0) + (lucky ? 2 : 0));
    climb += c / p;
    out.push(Math.floor(climb * (1.4 + (lv + 1) / 100)));
  }
  return out;
})();
export const basePrice = (lv) => PRICES[lv];

// 보조 아이템. 골드 가격 = 기본가 × 1.06^(최고 기록)
export const ITEMS = {
  guard: { name: '파괴 방지권', icon: '🛡️', desc: '파괴 결과가 나오면 유지로 바뀝니다', gold: 500, frag: 12 },
  lucky: { name: '행운의 부적', icon: '🍀', desc: '성공 확률 +10%p', gold: 300, frag: 4 },
  bless: { name: '축복 주문서', icon: '✨', desc: '대성공 확률 3배', gold: 400, frag: 6 },
};
export const itemGoldPrice = (id, best) => Math.floor(ITEMS[id].gold * Math.pow(1.06, best));

// 도감 보너스: 등록된 검 하나당 판매가 +1%
export const DEX_BONUS = 0.01;

// 업적. check(s) 가 true 이면 달성, reward 를 받음
export const ACHIEVEMENTS = [
  { id: 'first', name: '첫 망치질', desc: '강화를 1번 시도', check: (s) => s.stats.tries >= 1, reward: { gold: 500 } },
  { id: 'try100', name: '대장장이 견습', desc: '강화를 100번 시도', check: (s) => s.stats.tries >= 100, reward: { gold: 20000 } },
  { id: 'try1000', name: '숙련 대장장이', desc: '강화를 1,000번 시도', check: (s) => s.stats.tries >= 1000, reward: { guard: 3 } },
  { id: 'lv5', name: '빛나기 시작', desc: '+5 달성', check: (s) => s.best >= 5, reward: { gold: 3000 } },
  { id: 'lv10', name: '명검의 자격', desc: '+10 달성', check: (s) => s.best >= 10, reward: { gold: 30000, lucky: 3 } },
  { id: 'lv20', name: '장인의 경지', desc: '+20 달성', check: (s) => s.best >= 20, reward: { gold: 500000, guard: 2 } },
  { id: 'lv30', name: '마검의 주인', desc: '+30 달성', check: (s) => s.best >= 30, reward: { gold: 5000000, guard: 3 } },
  { id: 'lv50', name: '영웅의 검', desc: '+50 달성', check: (s) => s.best >= 50, reward: { guard: 10, bless: 5 } },
  { id: 'lv100', name: '별에 닿다', desc: '+100 달성', check: (s) => s.best >= 100, reward: { guard: 30, lucky: 20 } },
  { id: 'lv150', name: '달빛 대장장이', desc: '+150 달성', check: (s) => s.best >= 150, reward: { guard: 60, bless: 20 } },
  { id: 'lv200', name: '혼돈을 넘어', desc: '+200 달성', check: (s) => s.best >= 200, reward: { guard: 100, lucky: 50 } },
  { id: 'lv250', name: '신을 베는 자', desc: '+250 달성', check: (s) => s.best >= 250, reward: { guard: 200, bless: 50 } },
  { id: 'lv300', name: '절대신검', desc: '+300 달성', check: (s) => s.best >= 300, reward: { guard: 500 } },
  { id: 'great1', name: '대박!', desc: '대성공 1번', check: (s) => s.stats.greats >= 1, reward: { bless: 2 } },
  { id: 'great20', name: '행운아', desc: '대성공 20번', check: (s) => s.stats.greats >= 20, reward: { bless: 10 } },
  { id: 'boom1', name: '산산조각', desc: '검 파괴 1번', check: (s) => s.stats.destroys >= 1, reward: { guard: 1 } },
  { id: 'boom50', name: '파괴의 달인', desc: '검 파괴 50번', check: (s) => s.stats.destroys >= 50, reward: { guard: 5 } },
  { id: 'guard1', name: '살았다!', desc: '파괴 방지권으로 파괴 막기', check: (s) => s.stats.saved >= 1, reward: { gold: 5000 } },
  { id: 'sell10', name: '행상인', desc: '검 10자루 판매', check: (s) => s.stats.sells >= 10, reward: { gold: 10000 } },
  { id: 'sell100', name: '무기 상인', desc: '검 100자루 판매', check: (s) => s.stats.sells >= 100, reward: { lucky: 10 } },
  { id: 'earn1m', name: '백만장자', desc: '판매로 누적 100만 골드', check: (s) => s.stats.earned >= 1e6, reward: { guard: 2 } },
  { id: 'earn1b', name: '억만장자', desc: '판매로 누적 10억 골드', check: (s) => s.stats.earned >= 1e9, reward: { guard: 10 } },
  { id: 'earn1t', name: '조만장자', desc: '판매로 누적 1조 골드', check: (s) => s.stats.earned >= 1e12, reward: { guard: 50 } },
  { id: 'dex10', name: '수집가', desc: '도감 10칸 등록', check: (s) => s.dex.length >= 10, reward: { gold: 100000 } },
  { id: 'dex50', name: '열성 수집가', desc: '도감 50칸 등록', check: (s) => s.dex.length >= 50, reward: { guard: 10 } },
  { id: 'dex100', name: '박물관장', desc: '도감 100칸 등록', check: (s) => s.dex.length >= 100, reward: { guard: 30 } },
  { id: 'dex300', name: '완벽한 도감', desc: '도감 300칸 모두 등록', check: (s) => s.dex.length >= 300, reward: { guard: 300 } },
];
