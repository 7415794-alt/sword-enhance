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
      bestSoldLv: 0, itemsUsed: 0, autoTries: 0, offlineClaims: 0, events: 0, chests: 0, stored: 0, hunted: 0, swaps: 0,
    },
    ranking: [], // 판매 기록 상위 10 { level, price, at, weapon }
    // 자동 강화 설정
    auto: {
      target: 10, // 목표 단계
      onTarget: 'sell', // 목표 도달 시: sell(판매 후 반복) | store(보관 후 반복, 가득 차면 판매) | stop
      onDestroy: 'continue', // 파괴되면: continue | stop
      items: { guard: true, lucky: false, bless: false }, // 사용할 아이템 (떨어지면 자동 구매)
      smart: true, // 이득이면 무조건 사용: 아이템 칸에서 꺼 둔 아이템도 이득일 때 자동 사용 (직접 · 자동 강화 공용)
      swap: true, // 강화 중 무기가 보관함의 가장 약한 무기보다 강해지면 바로 맞바꿈 (직접 강화에도 적용)
      speed: 1, // 배속 (1 · 2 · 4 · 8 · 16 · 32 · 64 · 128)
    },
    upgrades: {}, // 대장간 업그레이드 { id: 레벨 }
    storage: [], // 보관한 무기 (모두 사냥 중) [{ uid, weapon, level }]
    nextUid: 1,
    rebirth: { count: 0, stones: 0, total: 0 }, // 환생 횟수, 보유 환생석, 누적 환생석
    event: null, // 진행 중인 이벤트 { id, until }
    nextEventAt: 0,
    online: { name: '', id: '', submitted: 0 }, // 온라인 랭킹 닉네임 · 기기 ID · 마지막 등록 점수
    lastSeen: Date.now(), // 오프라인 보상 계산용
    autoUseV: 1,
    settings: { sound: true },
    createdAt: Date.now(),
  };
}

// 이전 버전 앱에서 넘어온 저장 데이터 (#import=...) 받기
// 이 기기에 저장된 게 없거나, 넘어온 데이터가 더 많이 진행된 경우에만 덮어씀
function importFromHash() {
  try {
    const m = location.hash.match(/#import=([^&]+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    const incoming = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
    const current = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (localStorage.getItem(`${KEY}-imported`)) return; // 한 번만 옮김 (처음부터 다시 해도 되살아나지 않게)
    localStorage.setItem(`${KEY}-imported`, '1');
    const progress = (x) => (x && x.stats ? x.stats.tries || 0 : -1);
    if (progress(incoming) > progress(current)) localStorage.setItem(KEY, JSON.stringify(incoming));
  } catch { /* 잘못된 데이터는 무시 */ }
}

export function load() {
  importFromHash();
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
      upgrades: { ...saved.upgrades },
      rebirth: { ...base.rebirth, ...saved.rebirth },
      online: { ...base.online, ...saved.online },
    };
    // v0.7.3: '이득이면 무조건 사용'으로 바뀜 → 예전 자동 강화가 켜 둔 아이템 표시는 초기화
    if (!saved.autoUseV) { s.use = { guard: false, lucky: false, bless: false }; s.auto.smart = true; s.autoUseV = 1; }
    if (!saved.auto || saved.auto.swap === undefined) s.auto.swap = true;
    if (!saved.auto || saved.auto.smart === undefined) s.auto.smart = true; // 예전 설정 → 이득일 때만 사용
    if (!saved.auto || saved.auto.speed === undefined) s.auto.speed = saved.auto && saved.auto.fast ? 4 : 1; // 예전 '빠르게' → 4배속
    delete s.auto.fast;
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
