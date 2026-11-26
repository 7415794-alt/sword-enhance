// 저장 · 불러오기 (localStorage)
const KEY = 'sword-enhance-save';

export function newState() {
  return {
    gold: 1000,
    level: 0,
    best: 0,
    fragments: 0,
    items: { guard: 0, lucky: 0, bless: 0 },
    use: { guard: false, lucky: false, bless: false }, // 다음 강화에 사용할 아이템
    dex: [], // 도달한 강화 단계 목록
    achieved: [], // 달성한 업적 (보상 수령 전 포함)
    claimed: [], // 보상 받은 업적
    stats: { tries: 0, greats: 0, successes: 0, keeps: 0, destroys: 0, saved: 0, sells: 0, earned: 0, bestSale: 0 },
    ranking: [], // 판매 기록 상위 10 { level, price, at }
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
    return {
      ...base,
      ...saved,
      items: { ...base.items, ...saved.items },
      use: { ...base.use, ...saved.use },
      stats: { ...base.stats, ...saved.stats },
      settings: { ...base.settings, ...saved.settings },
    };
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
