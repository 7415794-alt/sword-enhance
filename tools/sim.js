// 밸런스 시뮬레이터: "+T 까지 강화 후 판매" 전략별 평균 수익과 진행 속도
// 사용법: node tools/sim.js
import { newState } from '../www/js/state.js';
import { enhance, sell, sellPrice } from '../www/js/game.js';
import { enhanceCost } from '../www/js/data.js';

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

console.log('목표 | 시도당 평균 순이익 | 판매 1회당 시도 | 판매가');
for (const target of [3, 5, 8, 10, 12, 15, 18, 20]) {
  const s = newState();
  s.gold = 1e13;
  const start = s.gold;
  let tries = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) {
    enhance(s);
    tries++;
    if (s.level >= target) sell(s);
  }
  const profit = (s.gold - start) / tries;
  console.log(`+${String(target).padStart(2)} | ${profit.toFixed(0).padStart(12)} | ${(tries / Math.max(1, s.stats.sells)).toFixed(1).padStart(8)} | ${sellPrice(newState(), target)}`);
}

// 처음 시작(골드 1000)부터 최고 기록 진행 속도: 안전하게 +5에서 팔다가 골드가 모이면 목표를 올림
const s = newState();
let t = 0;
const marks = {};
while (t < 300000 && s.best < 25) {
  const goal = Math.max(3, Math.min(30, Math.floor(Math.log(s.gold / 100 + 1) / Math.log(1.6))));
  if (s.gold < enhanceCost(s.level)) { if (s.level > 0) sell(s); else break; }
  enhance(s);
  t++;
  if (s.level >= goal) sell(s);
  for (const m of [5, 10, 15, 20, 25]) if (s.best >= m && !marks[m]) marks[m] = t;
}
console.log('\n최고 기록 도달 시점(강화 시도 횟수):', marks, '최종 골드', Math.floor(s.gold));
