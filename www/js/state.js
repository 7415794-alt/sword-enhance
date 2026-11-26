// 저장 · 불러오기 (localStorage)
import { rollWeapon } from './data.js';

const KEY = 'sword-enhance-save';

export function newState() {
  const weapon = rollWeapon();
  return {
    gold: 1000,
    level: 0,
    best: 0,
    weapon, // 현재 무기 종류
    weaponsFound: [weapon], // 발견한 무기
    weaponBest: {}, // 무기별 최고 단계
    fragments: 0,
    items: { guard: 0, lucky: 0, bless: 0 },
    use: { guard: false, lucky: false, bless: false }, // 다음 강화에 사용할 아이템
    dex: [], // 도달한 강화 단계 목록
    achieved: [], // 달성한 업적 (보상 수령 전 포함)
    claimed: [], // 보상 받은 업적
    stats: {
      tries: 0, greats: 0, successes: 0, keeps: 0, destroys: 0, saved: 0, sells: 0, earned: 0, bestSale: 0,
      streak: 0, bestStreak: 0, fail: 0, bestFail: 0, highGreat: 0, worstBoom: 0, fragsGot: 0,
      bestSoldLv: 0, itemsUsed: 0, autoTries: 0,
    },
    ranking: [], // 판매 기록 상위 10 { level, price, at, weapon }
    // 자동 강화 설정
    auto: {
      target: 10, // 목표 단계
      onTarget: 'sell', // 목표 도달 시: sell(판매 후 반복) | stop
      onDestroy: 'continue', // 파괴되면: continue | stop
      items: { guard: true, lucky: false, bless: false }, // 사용할 아이템 (떨어지면 자동 구매)
      guardOnlyRisk: true, // 파괴 확률이 있을 때만 방지권 사용
      fast: false, // 빠르게
    },
    settings: { sound: true },
    createdAt: Date.now(),
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newState();
    const saved = JSON.parse(raw);
    const base = newState();
    const s = {
      ...base,
      ...saved,
      items: { ...base.items, ...saved.items },
      use: { ...base.use, ...saved.use },
      stats: { ...base.stats, ...saved.stats },
      auto: { ...base.auto, ...saved.auto, items: { ...base.auto.items, ...(saved.auto || {}).items } },
      settings: { ...base.settings, ...saved.settings },
    };
    // 무기가 없던 예전 저장 데이터: 장검으로 시작
    if (!saved.weapon) {
      s.weapon = 'sword';
      s.weaponsFound = ['sword'];
      s.weaponBest = { sword: s.best };
    }
    return s;
  } catch {
    return newState();
  }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 저장 불가 환경 */ }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
}
