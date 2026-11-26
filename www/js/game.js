// 게임 규칙: 강화 · 판매 · 상점 · 업적 · 자동 강화
import {
  MAX_LEVEL, chances, enhanceCost, basePrice, fragmentsOnDestroy, ITEMS, itemGoldPrice,
  DEX_BONUS, WEAPON_DEX_BONUS, ACHIEVEMENTS, weaponOf, rollWeapon,
  UPGRADES, upgradeOf, upgradeCost, rebirthStones, REBIRTH_MIN, OFFLINE_BASE_HOURS, offlinePerHour, EVENTS, eventOf,
  STORAGE_BASE, attackOf, GOLD_PER_ATK,
} from './data.js';
import { newState } from './state.js';

// ---------- 보정치 (대장간 · 환생 · 이벤트) ----------
export const upLv = (s, id) => s.upgrades[id] || 0;
export const eventActive = (s, id, now = Date.now()) => !!s.event && s.event.id === id && s.event.until > now;
export function mods(s) {
  const lv = (id) => upLv(s, id) * upgradeOf(id).per;
  return {
    succ: lv('hammer') + (eventActive(s, 'luck') ? 5 : 0),
    destroy: (1 - lv('anvil') / 100) * (eventActive(s, 'guard') ? 0.5 : 1),
    great: (1 + lv('fortune') / 100) * (eventActive(s, 'great') ? 2 : 1),
  };
}
export const costMul = (s) => (1 - upLv(s, 'furnace') * upgradeOf('furnace').per / 100)
  * Math.max(0.5, 1 - s.rebirth.stones * 0.01) * (eventActive(s, 'sale') ? 0.5 : 1);
// +0 무기는 골드가 모자라면 무료로 강화 (골드가 바닥나 막히는 일 방지)
export const freeHammer = (s) => s.level === 0 && s.gold < Math.floor(enhanceCost(0) * costMul(s));
export const costNow = (s, lv = s.level) => (lv === s.level && freeHammer(s) ? 0 : Math.max(1, Math.floor(enhanceCost(lv) * costMul(s))));

export const activeItems = (s) => ({
  guard: s.use.guard && s.items.guard > 0,
  lucky: s.use.lucky && s.items.lucky > 0,
  bless: s.use.bless && s.items.bless > 0,
});

export const currentChances = (s) => chances(s.level, activeItems(s), s.weapon, mods(s));
export const priceBonus = (s) => (1 + s.dex.length * DEX_BONUS + s.weaponsFound.length * WEAPON_DEX_BONUS
  + upLv(s, 'merchant') * upgradeOf('merchant').per / 100 + s.rebirth.stones * 0.1) * (eventActive(s, 'noble') ? 1.5 : 1);
export const sellPrice = (s, lv = s.level, wid = s.weapon) => Math.floor(basePrice(lv) * weaponOf(wid).price * priceBonus(s));
export const canEnhance = (s) => s.level < MAX_LEVEL && s.gold >= costNow(s);

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
  const m = mods(s);
  const ch = chances(from, used, wid, m);
  const raw = chances(from, { ...used, guard: false }, wid, m); // 방지권이 막았는지 판단용

  s.gold -= costNow(s);
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
      fragments = Math.floor(fragmentsOnDestroy(from, wid) * (1 + upLv(s, 'salvage') * upgradeOf('salvage').per / 100));
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
function recordSale(s, level, weapon) {
  const price = sellPrice(s, level, weapon);
  s.gold += price;
  const st = s.stats;
  st.sells++;
  st.earned += price;
  st.bestSale = Math.max(st.bestSale, price);
  st.bestSoldLv = Math.max(st.bestSoldLv, level);
  s.ranking.push({ level, price, weapon, at: Date.now() });
  s.ranking.sort((a, b) => b.price - a.price);
  s.ranking = s.ranking.slice(0, 10);
  return price;
}

export function sell(s) {
  if (s.level === 0) return null;
  const level = s.level;
  const weapon = s.weapon;
  const price = recordSale(s, level, weapon);
  const next = newWeapon(s);
  checkAchievements(s);
  return { level, price, weapon, next };
}

// ---------- 보관함 · 사냥 ----------
export const storageCap = (s) => STORAGE_BASE + upLv(s, 'warehouse') * upgradeOf('warehouse').per;
export const hunters = (s) => s.storage; // 보관한 무기는 모두 사냥 중
export const huntBonus = (s) => 1 + s.rebirth.stones * 0.1;
export const itemRate = (s, x) => attackOf(x.level, x.weapon) * GOLD_PER_ATK * huntBonus(s);
export const huntRate = (s) => hunters(s).reduce((a, x) => a + itemRate(s, x), 0);

// 사냥 수익: secs초 동안 번 골드를 더함
export function huntTick(s, secs) {
  const g = huntRate(s) * secs;
  if (g <= 0) return 0;
  s.gold += g;
  s.stats.hunted += g;
  return g;
}

// 보관함에서 공격력이 가장 낮은 무기
export const weakestStored = (s) => s.storage.reduce((w, x) => (!w || attackOf(x.level, x.weapon) < attackOf(w.level, w.weapon) ? x : w), null);

// 보관함이 가득 찼을 때 지금 무기가 가장 약한 보관 무기보다 강하면 교체 가능
export const canReplaceWeakest = (s) => {
  const w = weakestStored(s);
  return !!w && s.level > 0 && attackOf(s.level, s.weapon) > attackOf(w.level, w.weapon);
};

// 현재 무기를 보관하고 새 +0 무기를 받음
// 보관함이 가득 차 있으면, 지금 무기가 더 강할 때만 가장 약한 무기를 팔고 그 자리에 보관
export function storeCurrent(s) {
  if (s.level < 1) return null;
  let replaced = null;
  if (s.storage.length >= storageCap(s)) {
    if (!canReplaceWeakest(s)) return null;
    const w = weakestStored(s);
    s.storage.splice(s.storage.indexOf(w), 1);
    replaced = { level: w.level, weapon: w.weapon, price: recordSale(s, w.level, w.weapon) };
  }
  const item = { uid: s.nextUid++, weapon: s.weapon, level: s.level };
  s.storage.push(item);
  s.stats.stored++;
  const next = newWeapon(s);
  checkAchievements(s);
  return { item, next, replaced };
}

export function sellStored(s, uid) {
  const i = s.storage.findIndex((x) => x.uid === uid);
  if (i < 0) return null;
  const [x] = s.storage.splice(i, 1);
  const price = recordSale(s, x.level, x.weapon);
  checkAchievements(s);
  return { level: x.level, weapon: x.weapon, price };
}

// 보관한 무기를 꺼내 강화: 지금 무기는 그 자리에 보관 (+0 무기는 버림)
export function takeOut(s, uid) {
  const i = s.storage.findIndex((x) => x.uid === uid);
  if (i < 0) return null;
  const x = s.storage[i];
  if (s.level > 0) s.storage[i] = { uid: s.nextUid++, weapon: s.weapon, level: s.level };
  else s.storage.splice(i, 1);
  s.weapon = x.weapon;
  s.level = x.level;
  return x;
}

// ---------- 아이템이 이득인지 판단 ----------
// guard: 파괴 확률 × 지금 무기 가치 > 방지권 가격
// lucky: 부적으로 줄어드는 강화 비용 > 부적 가격
// bless: 대성공(한 단계 건너뜀)으로 아끼는 비용 > 주문서 가격
export function itemWorth(s, id) {
  if (s.level >= MAX_LEVEL) return false;
  const m = mods(s);
  const base = chances(s.level, {}, s.weapon, m);
  const price = goldPrice(s, id);
  const risk = (base.destroy / 100) * sellPrice(s); // 이번 시도에서 파괴로 잃을 평균 가치
  if (id === 'guard') return base.destroy > 0 && risk > price;
  const p = (base.great + base.success) / 100;
  if (p <= 0) return false;
  // 한 번 시도할 때 드는 실제 비용 = 강화 비용 + (방지권 값 또는 파괴 위험) → 부적·주문서로 시도가 줄면 이만큼 아낌
  const cost = Math.max(1, costNow(s)) + Math.min(risk, goldPrice(s, 'guard'));
  if (id === 'lucky') {
    const c = chances(s.level, { lucky: true }, s.weapon, m);
    return price < cost * ((c.great + c.success) / 100 / p - 1);
  }
  const c = chances(s.level, { bless: true }, s.weapon, m);
  return price < ((c.great - base.great) / 100) * (cost / p);
}

export const goldPrice = (s, id) => Math.floor(itemGoldPrice(id, s.best) * (eventActive(s, 'peddler') ? 0.5 : 1));

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
    if (a.onTarget === 'store' && s.level > 0) {
      const r = storeCurrent(s); // 가득 차 있으면 더 약한 무기와 교체
      if (r) return { action: 'store', result: r };
      return { action: 'sell', result: sell(s), note: '보관함의 무기들이 더 강해서 판매' };
    }
    if (a.onTarget === 'sell' && s.level > 0) return { action: 'sell', result: sell(s) };
    return { action: 'stop', reason: `목표 +${a.target} 달성!` };
  }
  // 아이템 준비: 떨어지면 조각 → 골드 순서로 자동 구매 (강화 비용은 남겨 둠)
  // 기록 도전 중(목표 > 최고 기록)에는 파괴 위험이 있으면 방지권을 아끼지 않음 (무기가 부서지면 처음부터 다시라서)
  // 그 밖에는 이득일 때만 사용. 파괴 확률 0%일 때 방지권은 절대 쓰지 않음
  const pushing = a.target > s.best;
  const risky = chances(s.level, {}, s.weapon, mods(s)).destroy > 0;
  for (const id of Object.keys(ITEMS)) {
    let want = a.items[id];
    if (want && id === 'guard' && !risky) want = false;
    else if (want && a.smart && !(pushing && id === 'guard') && !itemWorth(s, id)) want = false;
    if (want && s.items[id] <= 0) {
      if (!buy(s, id, 'frag') && s.gold >= goldPrice(s, id) + costNow(s)) buy(s, id, 'gold');
    }
    s.use[id] = want && s.items[id] > 0;
  }
  if (!canEnhance(s)) {
    if (s.level < MAX_LEVEL && a.onTarget !== 'stop' && s.level > 0 && s.gold < costNow(s)) {
      return { action: 'sell', result: sell(s), note: '골드가 부족해 판매' };
    }
    return { action: 'stop', reason: '골드가 부족합니다' };
  }
  const r = enhance(s);
  s.stats.autoTries++;
  if (r.result === 'destroy' && a.onDestroy === 'stop') return { action: 'enhance', result: r, stop: '무기가 파괴되어 멈췄습니다' };
  return { action: 'enhance', result: r };
}

// ---------- 대장간 업그레이드 ----------
export function buyUpgrade(s, id) {
  const u = upgradeOf(id);
  const lv = upLv(s, id);
  if (lv >= u.max) return false;
  const c = upgradeCost(u, lv);
  if (s.gold < c) return false;
  s.gold -= c;
  s.upgrades[id] = lv + 1;
  checkAchievements(s);
  return true;
}

// ---------- 환생 ----------
// 초기화: 골드 · 현재 무기 · 최고 기록 · 아이템 · 조각 · 대장간 업그레이드
// 유지: 도감 · 무기 도감 · 업적 · 통계 · 랭킹 · 환생석 · 설정
export const canRebirth = (s) => s.best >= REBIRTH_MIN;
export function rebirth(s) {
  if (!canRebirth(s)) return null;
  const gain = rebirthStones(s.best);
  const fresh = newState();
  s.rebirth.count++;
  s.rebirth.stones += gain;
  s.rebirth.total += gain;
  s.gold = fresh.gold + s.rebirth.stones * 10000;
  s.level = 0;
  s.best = 0;
  s.weapon = fresh.weapon;
  if (!s.weaponsFound.includes(s.weapon)) s.weaponsFound.push(s.weapon);
  s.items = fresh.items;
  s.use = fresh.use;
  s.fragments = 0;
  s.upgrades = {};
  s.storage = [];
  checkAchievements(s);
  return { gain };
}

// ---------- 오프라인 보상 ----------
export const offlineHours = (s) => OFFLINE_BASE_HOURS + upLv(s, 'apprentice') * upgradeOf('apprentice').per;
// 꺼 둔 시간(분)과 받을 골드. 5분 미만이면 null
export function offlineReward(s, now = Date.now()) {
  const mins = Math.min((now - (s.lastSeen || now)) / 60000, offlineHours(s) * 60);
  if (mins < 5 || (s.best < 1 && huntRate(s) <= 0)) return null;
  const base = s.best >= 1 ? offlinePerHour(s.best) * priceBonus(s) * mins / 60 : 0;
  const hunt = huntRate(s) * mins * 60;
  return { mins: Math.floor(mins), gold: Math.floor(base + hunt), hunt: Math.floor(hunt) };
}

// ---------- 무작위 이벤트 ----------
export function maybeStartEvent(s, now = Date.now(), rand = Math.random) {
  if (s.event && s.event.until > now) return null;
  if (s.event) s.event = null;
  if (!s.nextEventAt) s.nextEventAt = now + (60 + rand() * 120) * 1000; // 첫 이벤트는 1~3분 뒤
  if (now < s.nextEventAt) return null;
  const e = EVENTS[Math.floor(rand() * EVENTS.length)];
  s.event = { id: e.id, until: now + e.min * 60000 };
  s.nextEventAt = now + e.min * 60000 + (180 + rand() * 180) * 1000; // 끝나고 3~6분 뒤 다음 이벤트
  s.stats.events++;
  checkAchievements(s);
  return e;
}
export const currentEvent = (s, now = Date.now()) => (s.event && s.event.until > now ? eventOf(s.event.id) : null);

// 보물 상자: 방지권 · 부적 · 주문서 중 무작위 몇 개
export function openChest(s, rand = Math.random) {
  if (!eventActive(s, 'chest')) return null;
  s.event = null;
  const n = 1 + Math.floor(rand() * 3) + Math.floor(s.best / 50);
  const ids = Object.keys(ITEMS);
  const got = {};
  for (let i = 0; i < n; i++) { const id = ids[Math.floor(rand() * ids.length)]; got[id] = (got[id] || 0) + 1; s.items[id]++; }
  s.stats.chests++;
  checkAchievements(s);
  return got;
}
