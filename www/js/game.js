// 게임 규칙: 강화 · 판매 · 상점 · 업적 · 자동 강화
import {
  MAX_LEVEL, chances, enhanceCost, basePrice, fragmentsOnDestroy, ITEMS, itemGoldPrice,
  DEX_BONUS, WEAPON_DEX_BONUS, ACHIEVEMENTS, weaponOf, rollWeapon,
} from './data.js';

export const activeItems = (s) => ({
  guard: s.use.guard && s.items.guard > 0,
  lucky: s.use.lucky && s.items.lucky > 0,
  bless: s.use.bless && s.items.bless > 0,
});

export const currentChances = (s) => chances(s.level, activeItems(s), s.weapon);
export const priceBonus = (s) => 1 + s.dex.length * DEX_BONUS + s.weaponsFound.length * WEAPON_DEX_BONUS;
export const sellPrice = (s, lv = s.level, wid = s.weapon) => Math.floor(basePrice(lv) * weaponOf(wid).price * priceBonus(s));
export const canEnhance = (s) => s.level < MAX_LEVEL && s.gold >= enhanceCost(s.level);

function register(s, lv) {
  if (lv > 0 && !s.dex.includes(lv)) s.dex.push(lv);
  if (lv > s.best) s.best = lv;
  if (lv > (s.weaponBest[s.weapon] || 0)) s.weaponBest[s.weapon] = lv;
}

// 새 무기 받기 (판매 · 파괴 후)
function newWeapon(s) {
  s.level = 0;
  s.weapon = rollWeapon();
  const fresh = !s.weaponsFound.includes(s.weapon);
  if (fresh) s.weaponsFound.push(s.weapon);
  return { weapon: s.weapon, fresh };
}

// 강화 시도. 결과: { result: 'great'|'success'|'keep'|'destroy', from, to, saved, fragments, next }
export function enhance(s, rand = Math.random) {
  if (!canEnhance(s)) return null;
  const from = s.level;
  const wid = s.weapon;
  const used = activeItems(s);
  const ch = chances(from, used, wid);
  const raw = chances(from, { ...used, guard: false }, wid); // 방지권이 막았는지 판단용

  s.gold -= enhanceCost(from);
  for (const id of Object.keys(used)) if (used[id]) { s.items[id]--; s.stats.itemsUsed++; }
  for (const id of Object.keys(s.use)) if (s.items[id] <= 0) s.use[id] = false; // 다 쓴 아이템은 자동 해제
  const st = s.stats;
  st.tries++;

  const r = rand() * 100;
  let result;
  let saved = false;
  if (r < ch.great) result = 'great';
  else if (r < ch.great + ch.success) result = 'success';
  else if (r < 100 - raw.destroy) result = 'keep';
  else if (used.guard) { result = 'keep'; saved = true; }
  else result = 'destroy';

  let fragments = 0;
  let next = null;
  if (result === 'great' || result === 'success') {
    s.level = Math.min(MAX_LEVEL, from + (result === 'great' ? 2 : 1));
    if (result === 'great') { st.greats++; st.highGreat = Math.max(st.highGreat, from); } else st.successes++;
    st.streak++; st.fail = 0;
    st.bestStreak = Math.max(st.bestStreak, st.streak);
  } else {
    st.streak = 0; st.fail++;
    st.bestFail = Math.max(st.bestFail, st.fail);
    if (result === 'keep') { st.keeps++; if (saved) st.saved++; }
    else {
      fragments = fragmentsOnDestroy(from, wid);
      s.fragments += fragments;
      st.fragsGot += fragments;
      st.destroys++;
      st.worstBoom = Math.max(st.worstBoom, from);
      next = newWeapon(s);
    }
  }
  register(s, s.level);
  checkAchievements(s);
  return { result, from, to: s.level, weapon: wid, saved, fragments, next };
}

// 판매: 현재 무기를 팔고 새 +0 무기를 받음
export function sell(s) {
  if (s.level === 0) return null;
  const level = s.level;
  const weapon = s.weapon;
  const price = sellPrice(s);
  s.gold += price;
  const st = s.stats;
  st.sells++;
  st.earned += price;
  st.bestSale = Math.max(st.bestSale, price);
  st.bestSoldLv = Math.max(st.bestSoldLv, level);
  s.ranking.push({ level, price, weapon, at: Date.now() });
  s.ranking.sort((a, b) => b.price - a.price);
  s.ranking = s.ranking.slice(0, 10);
  const next = newWeapon(s);
  checkAchievements(s);
  return { level, price, weapon, next };
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
  checkAchievements(s);
  return true;
}

export function claimAll(s) {
  let n = 0;
  for (const id of [...s.achieved]) if (claim(s, id)) n++;
  return n;
}

// 자동 강화 한 번. 반환: { action: 'enhance'|'sell'|'stop', reason?, result? }
export function autoStep(s) {
  const a = s.auto;
  if (s.level >= Math.min(a.target, MAX_LEVEL)) {
    if (a.onTarget === 'sell' && s.level > 0) return { action: 'sell', result: sell(s) };
    return { action: 'stop', reason: `목표 +${a.target} 달성!` };
  }
  // 아이템 준비: 떨어지면 조각 → 골드 순서로 자동 구매 (강화 비용은 남겨 둠)
  const risk = chances(s.level, {}, s.weapon).destroy > 0;
  for (const id of Object.keys(ITEMS)) {
    let want = a.items[id];
    if (id === 'guard' && a.guardOnlyRisk && !risk) want = false;
    if (want && s.items[id] <= 0) {
      if (!buy(s, id, 'frag') && s.gold >= goldPrice(s, id) + enhanceCost(s.level)) buy(s, id, 'gold');
    }
    s.use[id] = want && s.items[id] > 0;
  }
  if (!canEnhance(s)) {
    if (s.level < MAX_LEVEL && a.onTarget === 'sell' && s.level > 0 && s.gold < enhanceCost(s.level)) {
      return { action: 'sell', result: sell(s), note: '골드가 부족해 판매' };
    }
    return { action: 'stop', reason: '골드가 부족합니다' };
  }
  const r = enhance(s);
  s.stats.autoTries++;
  if (r.result === 'destroy' && a.onDestroy === 'stop') return { action: 'enhance', result: r, stop: '무기가 파괴되어 멈췄습니다' };
  return { action: 'enhance', result: r };
}
