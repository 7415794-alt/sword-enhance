// 밸런스 시뮬레이터
// 사용법: node tools/sim.js
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
const { newState } = await import('../www/js/state.js');
const { enhance, sell, buy, goldPrice, sellPrice } = await import('../www/js/game.js');
const { enhanceCost, chances, MAX_LEVEL } = await import('../www/js/data.js');

// 전략: 성공률이 낮으면 부적, 파괴 위험이 크면 방지권을 (없으면 사서) 사용
function useItems(s, guardFrom, luckyBelow) {
  const ch = chances(s.level, {}, s.weapon);
  const wantGuard = s.level >= guardFrom && ch.destroy > 0;
  const wantLucky = ch.success + ch.great < luckyBelow;
  for (const [id, want] of [['guard', wantGuard], ['lucky', wantLucky]]) {
    if (want && s.items[id] === 0) {
      buy(s, id, 'frag');
    }
    s.use[id] = want;
  }
}

console.log('1) 목표 단계까지 올리고 판매 (방지권 +20부터 · 부적 성공률 30% 미만), 골드 무한, 최고기록=목표');
console.log('목표 | 판매 1회당 시도 | 판매 1회당 순이익 | 판매가 대비');
for (const target of [10, 20, 30, 50, 80, 100, 150, 200, 250, 299]) {
  const s = newState();
  s.gold = 1e15; s.best = target;
  let tries = 0, spent = 0, earned = 0;
  const N = 40;
  while (s.stats.sells < N && tries < 2e6) {
    if (s.gold < 1e14) { s.gold += 1e15; }
    useItems(s, 20, 30);
    const g0 = s.gold;
    enhance(s); tries++;
    spent += g0 - s.gold;
    if (s.level >= target) { const r = sell(s); earned += r.price; }
  }
  const sp = spent / N, ea = earned / N;
  console.log(`+${String(target).padStart(3)} | ${(tries / N).toFixed(0).padStart(8)} | 비용/판매가 ${(sp / ea).toFixed(2).padStart(6)} | 판매가 ${sellPrice(s, target).toExponential(2)}`);
}

// 2) 처음부터 플레이: 골드가 부족하면 +25에서 판매하며 모으고, 방지권 40개 살 돈이 생기면 기록 도전
console.log('\n2) 처음부터 플레이 (돈이 모이면 기록+2를 목표로 아이템 써서 도전, 아니면 +25 파밍)');
const { claim } = await import('../www/js/game.js');
const s = newState();
let t = 0;
const marks = {};
const goals = [10, 20, 30, 50, 80, 100, 150, 200, 250, 300];
let pushing = false;
while (t < 2e6 && s.best < MAX_LEVEL) {
  if (s.level === 0) pushing = s.gold >= goldPrice(s, 'guard', s.best) * 40;
  const target = pushing ? Math.min(MAX_LEVEL, s.best + 2) : Math.min(25, s.best + 2);
  if (pushing) useItems(s, 20, 30); else { s.use.guard = false; s.use.lucky = false; }
  if (s.gold < enhanceCost(s.level)) { if (s.level > 0) sell(s); else s.gold += 100; }
  enhance(s); t++;
  for (const id of s.achieved) if (!s.claimed.includes(id)) claim(s, id);
  if (s.level >= target) sell(s);
  for (const m of goals) if (s.best >= m && !marks[m]) marks[m] = t;
}
console.log('t', t, 'best', s.best, 'gold', s.gold.toExponential(2), 'stats', JSON.stringify(s.stats), 'items', JSON.stringify(s.items));
console.log('최고 기록 도달 시점(강화 시도 횟수):', JSON.stringify(marks));

// 3) 자동 강화(autoStep)만으로 처음부터 플레이: 목표 = 최고기록+2, 판매 후 반복, 방지권·부적 자동 구매
console.log('\n3) 자동 강화로만 플레이 (목표 = 최고기록+2, 방지권·부적 자동 구매)');
const { autoStep, buyUpgrade } = await import('../www/js/game.js');
const { UPGRADES, upgradeCost } = await import('../www/js/data.js');
const a = newState();
a.auto = { ...a.auto, onTarget: 'sell', onDestroy: 'continue', items: { guard: true, lucky: true, bless: false }, smart: true };
const m3 = {};
let n = 0, stops = 0;
while (n < 2e6 && a.best < MAX_LEVEL) {
  // 방지권 40개 살 돈이 있으면 기록 도전, 아니면 +25에서 판매하며 모으기
  if (a.level === 0) a.auto.target = a.gold >= goldPrice(a, 'guard', a.best) * 40 ? Math.min(MAX_LEVEL, a.best + 2) : Math.min(25, a.best + 2);
  if (process.env.UPG && a.level === 0) {
    // 여유 골드가 업그레이드 가격의 5배 이상이면 가장 싼 업그레이드 구매
    const ups = UPGRADES.filter((u) => (a.upgrades[u.id] || 0) < u.max).map((u) => [u, upgradeCost(u, a.upgrades[u.id] || 0)]).sort((x, y) => x[1] - y[1]);
    if (ups.length && a.gold >= ups[0][1] * 5) buyUpgrade(a, ups[0][0].id);
  }
  const r = autoStep(a);
  n++;
  if (r.action === 'stop') stops++;
  for (const id of a.achieved) if (!a.claimed.includes(id)) claim(a, id);
  for (const m of goals) if (a.best >= m && !m3[m]) m3[m] = a.stats.tries;
}
console.log('도달 시점(강화 횟수):', JSON.stringify(m3), '멈춤', stops, '발견 무기', a.weaponsFound.length, '업적', a.achieved.length);
