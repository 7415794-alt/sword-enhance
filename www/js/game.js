// 게임 규칙: 강화 · 판매 · 상점 · 업적
import { MAX_LEVEL, chances, enhanceCost, basePrice, fragmentsOnDestroy, ITEMS, itemGoldPrice, DEX_BONUS, ACHIEVEMENTS } from './data.js';

export const activeItems = (s) => ({
  guard: s.use.guard && s.items.guard > 0,
  lucky: s.use.lucky && s.items.lucky > 0,
  bless: s.use.bless && s.items.bless > 0,
});

export const currentChances = (s) => chances(s.level, activeItems(s));
export const sellPrice = (s, lv = s.level) => Math.floor(basePrice(lv) * (1 + s.dex.length * DEX_BONUS));
export const canEnhance = (s) => s.level < MAX_LEVEL && s.gold >= enhanceCost(s.level);

function register(s, lv) {
  if (lv > 0 && !s.dex.includes(lv)) s.dex.push(lv);
  if (lv > s.best) s.best = lv;
}

// 강화 시도. 결과: { result: 'great'|'success'|'keep'|'destroy', from, to, saved, fragments }
export function enhance(s, rand = Math.random) {
  if (!canEnhance(s)) return null;
  const from = s.level;
  const used = activeItems(s);
  const ch = chances(from, used);
  const raw = chances(from, { ...used, guard: false }); // 방지권이 막았는지 판단용

  s.gold -= enhanceCost(from);
  for (const id of Object.keys(used)) if (used[id]) s.items[id]--;
  // 다 쓴 아이템은 자동으로 사용 해제
  for (const id of Object.keys(s.use)) if (s.items[id] <= 0) s.use[id] = false;
  s.stats.tries++;

  const r = rand() * 100;
  let result;
  let saved = false;
  if (r < ch.great) result = 'great';
  else if (r < ch.great + ch.success) result = 'success';
  else if (r < 100 - raw.destroy) result = 'keep';
  else if (used.guard) { result = 'keep'; saved = true; }
  else result = 'destroy';

  let fragments = 0;
  if (result === 'great') { s.level = Math.min(MAX_LEVEL, from + 2); s.stats.greats++; }
  else if (result === 'success') { s.level = from + 1; s.stats.successes++; }
  else if (result === 'keep') { s.stats.keeps++; if (saved) s.stats.saved++; }
  else {
    fragments = fragmentsOnDestroy(from);
    s.fragments += fragments;
    s.level = 0;
    s.stats.destroys++;
  }
  register(s, s.level);
  checkAchievements(s);
  return { result, from, to: s.level, saved, fragments };
}

// 판매: 현재 검을 팔고 새 +0 검을 받음
export function sell(s) {
  if (s.level === 0) return null;
  const level = s.level;
  const price = sellPrice(s);
  s.gold += price;
  s.level = 0;
  s.stats.sells++;
  s.stats.earned += price;
  if (price > s.stats.bestSale) s.stats.bestSale = price;
  s.ranking.push({ level, price, at: Date.now() });
  s.ranking.sort((a, b) => b.price - a.price);
  s.ranking = s.ranking.slice(0, 10);
  checkAchievements(s);
  return { level, price };
}

export const goldPrice = (s, id) => itemGoldPrice(id, s.best);

export function buy(s, id, currency) {
  if (currency === 'gold') {
    const p = goldPrice(s, id);
    if (s.gold < p) return false;
    s.gold -= p;
  } else {
    const p = ITEMS[id].frag;
    if (s.fragments < p) return false;
    s.fragments -= p;
  }
  s.items[id]++;
  return true;
}

export function checkAchievements(s) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achieved.includes(a.id) && a.check(s)) { s.achieved.push(a.id); fresh.push(a); }
  }
  return fresh;
}

export function claim(s, id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || !s.achieved.includes(id) || s.claimed.includes(id)) return false;
  s.claimed.push(id);
  for (const [k, v] of Object.entries(a.reward)) {
    if (k === 'gold') s.gold += v; else s.items[k] += v;
  }
  return true;
}
