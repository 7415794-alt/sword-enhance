// 화면 연결 · 렌더링
import {
  VERSION, MAX_LEVEL, ITEMS, ACHIEVEMENTS, WEAPONS, GRADE_COLOR, DEX_BONUS, WEAPON_DEX_BONUS,
  swordName, weaponName, tierOf, weaponOf, weaponChance, UPGRADES, upgradeCost, rebirthStones, REBIRTH_MIN, eventOf, attackOf,
} from './data.js';
import { load, save, reset, newState } from './state.js';
import {
  currentChances, sellPrice, canEnhance, enhance, sell, buy, goldPrice, claim, claimAll, autoStep, priceBonus,
  costNow, upLv, checkAchievements, buyUpgrade, canRebirth, rebirth, offlineReward, offlineHours, maybeStartEvent, currentEvent, openChest,
  storeCurrent, sellStored, takeOut, toggleHunt, autoAssignHunt, storageCap, huntSlots, hunters, huntRate, huntTick, itemWorth, itemRate,
} from './game.js';
import { onlineEnabled, submitScore, fetchTop, scoreOf, cleanName, ensureId } from './online.js';
import { fmt, pct } from './format.js';
import { weaponSVG } from './weapon.js';
import { sfx } from './sound.js';

let s = load();
const $ = (id) => document.getElementById(id);
let tab = 'forge';

// ---------- 공통 ----------
let toastTimer;
function toast(msg, ms = 1800) {
  const t = $('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
const rewardText = (r) => Object.entries(r).map(([k, v]) => (k === 'gold' ? `💰 ${fmt(v)}` : `${ITEMS[k].icon} ${v}개`)).join(' · ');
const gradeTag = (w) => `<em class="grade" style="--g:${GRADE_COLOR[w.grade]}">${w.grade}</em>`;

let lastSave = 0;
function persist(force = false) {
  const now = Date.now();
  if (!force && now - lastSave < 1500) return;
  lastSave = now;
  s.lastSeen = now;
  save(s);
  maybeSubmit();
}

// ---------- 공용 창 (모달) ----------
function modal(title, body, buttons = [{ label: '확인' }]) {
  $('modalTitle').innerHTML = title;
  $('modalBody').innerHTML = body;
  $('modalBtns').innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.className = `btn ${b.cls || 'enhance'}`;
    el.innerHTML = `<span>${b.label}</span>`;
    el.onclick = () => { $('modal').classList.remove('show'); b.onClick?.(); };
    $('modalBtns').appendChild(el);
  }
  $('modal').classList.add('show');
}

// ---------- 강화 화면 ----------
let shownKey = '';
function renderHud() {
  $('gold').textContent = fmt(s.gold);
  $('frag').textContent = fmt(s.fragments);
  $('best').textContent = `+${s.best}`;
  const rate = huntRate(s);
  $('goldRate').textContent = rate > 0 ? `+${fmt(rate)}/초` : '';
  const ready = s.achieved.length - s.claimed.length;
  $('achDot').classList.toggle('show', ready > 0);
}

function renderForge() {
  renderHud();
  const t = tierOf(s.level);
  const w = weaponOf(s.weapon);
  $('lvBig').innerHTML = `<b style="color:${t.color}">+${s.level}</b><small>강</small>${s.level >= MAX_LEVEL ? '<em>MAX</em>' : ''}`;
  $('swordName').textContent = weaponName(s.level, s.weapon);
  $('weaponInfo').innerHTML = `${gradeTag(w)} ${w.perk}${s.level > 0 ? ` · ⚔️ ${fmt(attackOf(s.level, s.weapon))}` : ''}`;
  const key = `${s.level}:${s.weapon}`;
  if (shownKey !== key) { $('sword').innerHTML = weaponSVG(s.level, s.weapon); shownKey = key; }

  const ch = currentChances(s);
  const max = s.level >= MAX_LEVEL;
  const seg = (cls, v) => (v > 0 ? `<div class="seg ${cls}" style="flex:${v}"></div>` : '');
  const row = (cls, label, v) => `<div class="odd ${cls}"><i></i>${label}<b>${pct(v)}</b></div>`;
  $('odds').innerHTML = max
    ? '<div class="maxed">최대 강화 달성! 판매해서 전설을 남기세요.</div>'
    : `<div class="bar">${seg('great', ch.great)}${seg('success', ch.success)}${seg('keep', ch.keep)}${seg('destroy', ch.destroy)}</div>
       <div class="odd-grid">${row('great', '대성공 +2', ch.great)}${row('success', '성공 +1', ch.success)}${row('keep', '유지', ch.keep)}${row('destroy', '파괴', ch.destroy)}</div>`;

  $('useItems').innerHTML = Object.entries(ITEMS).map(([id, it]) => {
    const n = s.items[id];
    const on = s.use[id] && n > 0;
    const worth = itemWorth(s, id);
    const tag = s.level >= MAX_LEVEL ? '' : worth ? '<i class="tag good">이득</i>' : '<i class="tag bad">손해</i>';
    return `<button class="chip ${on ? 'on' : ''}" data-use="${id}" ${n > 0 && !auto ? '' : 'disabled'}>
      <span>${it.icon}</span><em>${it.name}</em><b>${fmt(n)} ${tag}</b></button>`;
  }).join('');

  $('cost').textContent = max ? '-' : costNow(s) === 0 ? '무료 (골드 부족)' : `💰 ${fmt(costNow(s))}`;
  renderEvent();
  $('enhanceBtn').disabled = auto || !canEnhance(s);
  $('sellPrice').textContent = s.level > 0 ? `💰 ${fmt(sellPrice(s))}` : '+0은 팔 수 없음';
  $('sellBtn').disabled = auto || s.level === 0;
  const cap = storageCap(s);
  $('storeInfo').textContent = `${s.storage.length}/${cap}칸`;
  $('storeBtn').disabled = auto || s.level === 0 || s.storage.length >= cap;
  $('autoBtn').classList.toggle('running', !!auto);
  $('autoBtn').innerHTML = auto ? '<span>■ 중지</span><small>자동 강화 중</small>' : `<span>자동</span><small>목표 +${s.auto.target}</small>`;
}

const RESULT = { great: ['대성공!!', 'great'], success: ['성공!', 'success'], keep: ['유지', 'keep'], destroy: ['파괴...', 'destroy'] };

// speed: 자동 강화 배속. 4배부터 효과음을 줄이고, 16배부터는 효과음 · 알림을 끔 (새 무기 발견만 알림)
function showResult(r, speed = 1) {
  const quiet = speed >= 4;
  const mute = speed >= 16;
  const el = $('result');
  const [text, cls] = RESULT[r.result];
  let sub = '';
  if (r.result === 'great' || r.result === 'success') sub = `+${r.from} → +${r.to}`;
  else if (r.saved) sub = '🛡️ 파괴 방지권이 무기를 지켰습니다';
  else if (r.result === 'destroy') sub = `+${r.from} ${weaponOf(r.weapon).name}이(가) 부서졌습니다 · 🔩 조각 ${r.fragments}개`;
  else sub = `+${r.from} 그대로`;
  el.className = `result ${cls}`;
  el.innerHTML = `<b>${text}</b><span>${sub}</span>`;
  void el.offsetWidth;
  el.classList.add('pop');

  const wrap = $('swordWrap');
  wrap.className = 'sword-wrap';
  void wrap.offsetWidth;
  wrap.classList.add(`fx-${cls}`);
  if (!quiet || (!mute && (r.result === 'great' || r.result === 'destroy'))) sfx(r.result, s.settings.sound);
  if (navigator.vibrate && r.result === 'destroy' && !quiet) navigator.vibrate(120);
  if (r.next) announceWeapon(r.next, mute);
}

function announceWeapon(next, mute = false) {
  const w = weaponOf(next.weapon);
  if (mute && !next.fresh) return;
  const rare = ['희귀', '영웅', '전설', '신화'].includes(w.grade);
  if (next.fresh) toast(`🆕 새 무기 발견! ${gradeTag(w)} <b>${w.name}</b>`, 2500);
  else if (rare) toast(`${gradeTag(w)} <b>${w.name}</b> 획득!`);
  if (rare && (w.grade === '전설' || w.grade === '신화')) sfx('great', s.settings.sound);
}

let busy = false;
function doEnhance() {
  if (busy || auto || !canEnhance(s)) return;
  busy = true;
  const before = s.achieved.length;
  $('swordWrap').className = 'sword-wrap hammer';
  sfx('hit', s.settings.sound);
  setTimeout(() => {
    const r = enhance(s);
    busy = false;
    if (!r) return renderForge();
    showResult(r);
    afterChange(before);
  }, 280);
}

function showSold(r, speed = 1) {
  if (speed < 16) sfx('sell', s.settings.sound);
  const el = $('result');
  el.className = 'result sold';
  el.innerHTML = `<b>판매 완료</b><span>+${r.level} ${weaponOf(r.weapon).name} → 💰 ${fmt(r.price)}</span>`;
  void el.offsetWidth;
  el.classList.add('pop');
  announceWeapon(r.next, speed >= 16);
}

function doSell() {
  if (s.level === 0 || auto) return;
  if (s.level >= 10 && !confirm(`${swordName(s.level, s.weapon)}을(를) ${fmt(sellPrice(s))} 골드에 판매할까요?`)) return;
  const before = s.achieved.length;
  const r = sell(s);
  if (!r) return;
  showSold(r);
  afterChange(before);
}

function afterChange(beforeAch, force = true) {
  const fresh = s.achieved.slice(beforeAch);
  if (fresh.length) {
    const a = ACHIEVEMENTS.find((x) => x.id === fresh[fresh.length - 1]);
    toast(`🏅 업적 달성: ${a.name}${fresh.length > 1 ? ` 외 ${fresh.length - 1}개` : ''}`);
  }
  persist(force);
  renderForge();
  if (tab !== 'forge') renderTab(tab);
}

// ---------- 자동 강화 ----------
let auto = null; // 실행 중이면 { timer }
function openAutoSheet() {
  if (auto) return stopAuto('자동 강화를 멈췄습니다');
  renderAutoSheet();
  $('autoSheet').classList.add('show');
}
function closeAutoSheet() { $('autoSheet').classList.remove('show'); }

function renderAutoSheet() {
  const a = s.auto;
  $('autoTarget').textContent = `+${a.target}`;
  document.querySelectorAll('[data-opt]').forEach((b) => {
    const [k, v] = b.dataset.opt.split(':');
    b.classList.toggle('on', String(a[k]) === v);
  });
  $('autoItems').innerHTML = Object.entries(ITEMS).map(([id, it]) => `
    <label class="check"><input type="checkbox" data-aitem="${id}" ${a.items[id] ? 'checked' : ''}>
      <span>${it.icon} ${it.name}</span><small>보유 ${fmt(s.items[id])}</small></label>`).join('')
    + `<label class="check"><input type="checkbox" id="smartItems" ${a.smart ? 'checked' : ''}>
      <span>이득일 때만 사용 (추천)<br><small class="note">파밍 중에는 무기 가치보다 비싼 아이템은 안 써요. 기록 도전 중(목표 > 최고 기록)에는 방지권을 아끼지 않아요.</small></span></label>`;
}

function startAuto() {
  closeAutoSheet();
  if (s.level >= s.auto.target && s.auto.onTarget === 'stop') return toast(`이미 +${s.auto.target} 이상입니다`);
  auto = { n: 0 };
  renderForge();
  tick();
}

function stopAuto(msg) {
  if (!auto) return;
  clearTimeout(auto.timer);
  auto = null;
  persist(true);
  renderForge();
  if (tab !== 'forge') renderTab(tab);
  if (msg) toast(msg, 2200);
}

// 배속: 1배는 380ms마다 1번. 빠른 배속은 화면을 40ms마다 한 번만 그리고 그사이 여러 번 강화
const BASE_MS = 380;
function tick() {
  if (!auto) return;
  const speed = s.auto.speed || 1;
  const interval = Math.max(40, BASE_MS / speed);
  auto.acc = (auto.acc || 0) + (interval * speed) / BASE_MS;
  const steps = Math.max(1, Math.floor(auto.acc));
  auto.acc -= steps;
  const before = s.achieved.length;
  let last = null;
  let stopMsg = null;
  for (let i = 0; i < steps; i++) {
    const step = autoStep(s);
    auto.n++;
    if (step.action === 'stop') { stopMsg = step.reason; break; }
    last = step;
    if (step.stop) { stopMsg = step.stop; break; }
    // 빠른 배속에서도 새 무기 발견은 놓치지 않게 알림
    const next = step.result?.next;
    if (next?.fresh && speed >= 16) announceWeapon(next);
  }
  if (last) {
    if (last.action === 'sell') showSold(last.result, speed);
    else if (last.action === 'store') showStored(last.result, speed);
    else showResult(last.result, speed);
  }
  if (s.achieved.length > before) {
    const n = s.achieved.length - before;
    const a = ACHIEVEMENTS.find((x) => x.id === s.achieved[s.achieved.length - 1]);
    toast(`🏅 업적 달성: ${a.name}${n > 1 ? ` 외 ${n - 1}개` : ''}`);
  }
  persist();
  renderForge();
  if (stopMsg) return stopAuto(`⏹ ${stopMsg}`);
  auto.timer = setTimeout(tick, interval);
}

// ---------- 보관 · 사냥 ----------
function showStored(r, speed = 1) {
  if (speed < 16) sfx('buy', s.settings.sound);
  const el = $('result');
  el.className = 'result sold';
  el.innerHTML = `<b>📦 보관 완료</b><span>+${r.item.level} ${weaponOf(r.item.weapon).name} · ⚔️ ${fmt(attackOf(r.item.level, r.item.weapon))}</span>`;
  void el.offsetWidth;
  el.classList.add('pop');
  announceWeapon(r.next, speed >= 16);
}

function doStore() {
  if (auto || s.level === 0) return;
  if (s.storage.length >= storageCap(s)) return toast('보관함이 가득 찼어요 (대장간 → 무기 창고 확장)');
  const before = s.achieved.length;
  const r = storeCurrent(s);
  if (!r) return;
  // 사냥 슬롯이 비어 있으면 바로 사냥에 내보냄
  if (hunters(s).length < huntSlots(s)) toggleHunt(s, r.item.uid);
  showStored(r);
  afterChange(before);
}

function renderStore() {
  renderHud();
  const hs = hunters(s);
  const slots = huntSlots(s);
  const rate = huntRate(s);
  let slotHtml = '';
  for (let i = 0; i < slots; i++) {
    const x = hs[i];
    slotHtml += x
      ? `<div class="slot on"><div class="wpic">${weaponSVG(x.level, x.weapon)}</div><b>+${x.level} ${weaponOf(x.weapon).name}</b><em>+${fmt(itemRate(s, x))}/초</em></div>`
      : '<div class="slot">빈 슬롯</div>';
  }
  $('huntBox').innerHTML = `
    <div class="hunt-head"><h2>⚔️ 사냥</h2><span class="rate">초당 💰${fmt(rate)}</span></div>
    <p class="hunt-sub">사냥 슬롯 ${hs.length}/${slots} · 지금까지 💰<b id="huntTotal">${fmt(s.stats.hunted)}</b> · 앱을 꺼도 오프라인 보상으로 쌓여요</p>
    <div class="slots">${slotHtml}</div>`;
  const cap = storageCap(s);
  $('storeCount').textContent = `${s.storage.length} / ${cap}칸`;
  const list = [...s.storage].sort((a, b) => (b.hunting - a.hunting) || attackOf(b.level, b.weapon) - attackOf(a.level, a.weapon));
  $('storeList').innerHTML = list.length ? list.map((x) => {
    const w = weaponOf(x.weapon);
    return `<div class="sitem ${x.hunting ? 'hunting' : ''}">
      <div class="wpic">${weaponSVG(x.level, x.weapon)}</div>
      <div class="info"><b style="color:${tierOf(x.level).color}">+${x.level} <span style="color:var(--text)">${weaponName(x.level, x.weapon)}</span></b>
        <span>${gradeTag(w)} ⚔️ 공격력 ${fmt(attackOf(x.level, x.weapon))} · 초당 💰${fmt(itemRate(s, x))}</span>
        <span>판매가 💰${fmt(sellPrice(s, x.level, x.weapon))}</span></div>
      <div class="acts">
        <button class="btn small ${x.hunting ? 'on' : ''}" data-hunt="${x.uid}">${x.hunting ? '사냥 중' : '사냥'}</button>
        <button class="btn small alt" data-take="${x.uid}" ${auto ? 'disabled' : ''}>꺼내기</button>
        <button class="btn small sell" data-sellst="${x.uid}" style="grid-column: span 2">판매</button>
      </div></div>`;
  }).join('') : '<div class="empty-note">보관한 무기가 없어요.<br>강화 화면에서 <b>보관</b>을 눌러 무기를 넣어 보세요.</div>';
}

$('storeBtn').addEventListener('click', doStore);
$('autoHuntBtn').addEventListener('click', () => {
  const n = autoAssignHunt(s);
  toast(n ? `⚔️ 사냥 배치 완료 · 초당 💰${fmt(huntRate(s))}` : '이미 가장 강한 무기들이 사냥 중이에요');
  persist(true);
  renderStore();
});
$('storeList').addEventListener('click', (e) => {
  const h = e.target.closest('[data-hunt]');
  const t = e.target.closest('[data-take]');
  const sl = e.target.closest('[data-sellst]');
  if (h) {
    if (!toggleHunt(s, Number(h.dataset.hunt))) toast(`사냥 슬롯이 가득 찼어요 (${huntSlots(s)}칸)`);
    persist(true);
    renderStore();
  } else if (t) {
    if (auto) return;
    const x = s.storage.find((y) => y.uid === Number(t.dataset.take));
    const msg = s.level > 0 ? `지금 무기(+${s.level} ${weaponOf(s.weapon).name})는 보관함에 들어가요.` : '지금 +0 무기는 버려져요.';
    modal('무기를 꺼낼까요?', `<p><b>+${x.level} ${weaponName(x.level, x.weapon)}</b>을(를) 꺼내 강화합니다.</p><p class="muted">${msg}</p>`, [
      { label: '취소', cls: 'small alt' },
      { label: '꺼내기', onClick: () => { takeOut(s, x.uid); shownKey = ''; persist(true); renderStore(); renderForge(); toast('🔨 꺼낸 무기를 강화 화면에 올렸어요'); } },
    ]);
  } else if (sl) {
    const x = s.storage.find((y) => y.uid === Number(sl.dataset.sellst));
    const go = () => {
      const before = s.achieved.length;
      const r = sellStored(s, x.uid);
      if (!r) return;
      sfx('sell', s.settings.sound);
      toast(`💰 +${r.level} ${weaponOf(r.weapon).name} 판매 · ${fmt(r.price)}`);
      afterChange(before);
      renderStore();
    };
    if (x.level >= 10) modal('판매할까요?', `<p><b>+${x.level} ${weaponName(x.level, x.weapon)}</b>을(를) 💰${fmt(sellPrice(s, x.level, x.weapon))}에 판매합니다.</p>`, [{ label: '취소', cls: 'small alt' }, { label: '판매', onClick: go }]);
    else go();
  }
});

// ---------- 상점 ----------
function renderShop() {
  renderHud();
  $('shopSale').innerHTML = currentEvent(s)?.id === 'peddler' ? '🧳 떠돌이 상인 방문 중! 골드 가격 <b>50% 할인</b>' : '';
  $('shopList').innerHTML = Object.entries(ITEMS).map(([id, it]) => {
    const gp = goldPrice(s, id);
    return `<div class="card">
      <div class="ic">${it.icon}</div>
      <div class="info"><b>${it.name} <small>보유 ${fmt(s.items[id])}</small></b><span>${it.desc}</span></div>
      <div class="buy">
        <button class="btn small" data-buy="${id}" data-cur="gold" data-n="1" ${s.gold >= gp ? '' : 'disabled'}>💰 ${fmt(gp)}</button>
        <button class="btn small alt" data-buy="${id}" data-cur="frag" data-n="1" ${s.fragments >= it.frag ? '' : 'disabled'}>🔩 ${it.frag}</button>
        <button class="btn small ghost" data-buy="${id}" data-cur="gold" data-n="10" ${s.gold >= gp * 10 ? '' : 'disabled'}>10개</button>
      </div></div>`;
  }).join('');
}

// ---------- 도감 ----------
function renderDex() {
  renderHud();
  $('wdexCount').textContent = `${s.weaponsFound.length} / ${WEAPONS.length} · 판매가 +${Math.round(s.weaponsFound.length * WEAPON_DEX_BONUS * 100)}%`;
  $('weaponDex').innerHTML = WEAPONS.map((w) => {
    const got = s.weaponsFound.includes(w.id);
    const best = s.weaponBest[w.id] || 0;
    return `<div class="wcard ${got ? 'got' : ''}" style="--g:${GRADE_COLOR[w.grade]}">
      <div class="wpic">${got ? weaponSVG(best, w.id) : '<b>?</b>'}</div>
      <div class="winfo"><b>${got ? w.name : '???'} ${gradeTag(w)}</b>
        <span>${got ? w.perk : '아직 발견하지 못한 무기'}</span>
        <span class="muted">등장 확률 ${weaponChance(w)}%${got ? ` · 최고 +${best}` : ''}</span></div></div>`;
  }).join('');

  $('dexCount').textContent = `${s.dex.length} / ${MAX_LEVEL} · 판매가 +${Math.round(s.dex.length * DEX_BONUS * 100)}%`;
  let html = '';
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const got = s.dex.includes(lv);
    const t = tierOf(lv);
    html += `<div class="dex-cell ${got ? 'got' : ''}" style="--c:${t.color}"><i class="blade"></i><b>+${lv}</b><span>${got ? t.name : '???'}</span></div>`;
  }
  $('dexGrid').innerHTML = html;
}

// ---------- 업적 ----------
let achCat = '전체';
function renderAch() {
  renderHud();
  const ready = s.achieved.length - s.claimed.length;
  $('achCount').textContent = `${s.achieved.length} / ${ACHIEVEMENTS.length}`;
  $('claimAll').disabled = ready === 0;
  $('claimAll').textContent = ready ? `모두 받기 (${ready})` : '모두 받기';
  const cats = ['전체', ...new Set(ACHIEVEMENTS.map((a) => a.cat))];
  $('achCats').innerHTML = cats.map((c) => `<button class="cat ${c === achCat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('');
  const order = (a) => (s.achieved.includes(a.id) && !s.claimed.includes(a.id) ? 0 : s.claimed.includes(a.id) ? 2 : 1);
  $('achList').innerHTML = ACHIEVEMENTS.filter((a) => achCat === '전체' || a.cat === achCat)
    .sort((a, b) => order(a) - order(b)).map((a) => {
      const done = s.achieved.includes(a.id);
      const got = s.claimed.includes(a.id);
      return `<div class="card ach ${got ? 'claimed' : done ? 'done' : ''}">
        <div class="ic">${got ? '✅' : done ? '🏅' : '🔒'}</div>
        <div class="info"><b>${a.name}</b><span>${a.desc}</span><span class="rw">보상: ${rewardText(a.reward)}</span></div>
        <button class="btn small" data-claim="${a.id}" ${done && !got ? '' : 'disabled'}>${got ? '완료' : '받기'}</button></div>`;
    }).join('');
}

// ---------- 기록 ----------
function renderRank() {
  renderHud();
  $('rankList').innerHTML = s.ranking.length
    ? s.ranking.map((r, i) => `<li><span class="no">${i + 1}</span><b style="color:${tierOf(r.level).color}">${swordName(r.level, r.weapon || 'sword')}</b>
        <em>💰 ${fmt(r.price)}</em><small>${new Date(r.at).toLocaleDateString('ko-KR')}</small></li>`).join('')
    : '<li class="empty">아직 판매한 무기가 없습니다</li>';
  const st = s.stats;
  const rate = (n) => (st.tries ? `${((n / st.tries) * 100).toFixed(1)}%` : '-');
  const items = [
    ['강화 시도', fmt(st.tries)],
    ['자동 강화', fmt(st.autoTries)],
    ['대성공', `${fmt(st.greats)} (${rate(st.greats)})`],
    ['성공', `${fmt(st.successes)} (${rate(st.successes)})`],
    ['유지', `${fmt(st.keeps)} (${rate(st.keeps)})`],
    ['파괴', `${fmt(st.destroys)} (${rate(st.destroys)})`],
    ['최고 연속 성공', fmt(st.bestStreak)],
    ['최고 연속 실패', fmt(st.bestFail)],
    ['방지권으로 막음', fmt(st.saved)],
    ['사용한 아이템', fmt(st.itemsUsed)],
    ['판매한 무기', fmt(st.sells)],
    ['누적 판매 수익', fmt(st.earned)],
    ['최고 판매가', fmt(st.bestSale)],
    ['최고 판매 단계', `+${st.bestSoldLv}`],
    ['최고 강화', `+${s.best}`],
    ['판매가 보너스', `+${Math.round((priceBonus(s) - 1) * 100)}%`],
    ['환생', `${s.rebirth.count}회 · 💎 ${s.rebirth.total}`],
    ['만난 이벤트', fmt(st.events)],
    ['연 보물 상자', fmt(st.chests)],
    ['보관한 무기', fmt(st.stored)],
    ['사냥 수익', fmt(st.hunted)],
  ];
  $('stats').innerHTML = items.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  $('soundBtn').textContent = s.settings.sound ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐';
  $('ver').textContent = `검 강화하기 v${VERSION}`;
}

// ---------- 무작위 이벤트 ----------
function renderEvent() {
  const e = currentEvent(s);
  const bar = $('eventBar');
  if (!e) { bar.className = 'event-bar'; bar.innerHTML = ''; return; }
  const left = Math.max(0, Math.ceil((s.event.until - Date.now()) / 1000));
  const t = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  bar.className = `event-bar show ${e.id === 'chest' ? 'chest' : ''}`;
  bar.innerHTML = e.id === 'chest'
    ? `<span class="ei">🎁</span><b>보물 상자 발견!</b><em>눌러서 열기 · ${t}</em>`
    : `<span class="ei">${e.icon}</span><b>${e.name}</b><em>${e.desc} · ${t}</em>`;
}

function eventTick() {
  if (document.hidden) return;
  if (huntTick(s, 1) > 0) {
    renderHud();
    if (tab === 'store') $('huntTotal').textContent = fmt(s.stats.hunted);
  }
  const had = s.event?.id;
  const e = maybeStartEvent(s);
  if (e) {
    sfx('great', s.settings.sound);
    toast(`${e.icon} 이벤트: <b>${e.name}</b> · ${e.desc}`, 3000);
    persist(true);
    renderForge();
    if (tab === 'smith') renderShop();
  } else if (had && !currentEvent(s)) {
    s.event = null;
    renderForge();
    if (tab === 'smith') renderShop();
  } else if (tab === 'forge') renderEvent();
}

$('eventBar').addEventListener('click', () => {
  const got = openChest(s);
  if (!got) return;
  sfx('great', s.settings.sound);
  toast(`🎁 보물 상자: ${Object.entries(got).map(([k, v]) => `${ITEMS[k].icon} ${v}개`).join(' · ')}`, 2600);
  persist(true);
  renderForge();
});

// ---------- 오프라인 보상 ----------
function checkOffline() {
  const r = offlineReward(s);
  s.lastSeen = Date.now();
  if (!r) return;
  const h = Math.floor(r.mins / 60);
  const m = r.mins % 60;
  modal('🧑‍🔧 대장간이 쉬지 않고 일했어요', `
    <p>자리를 비운 <b>${h ? `${h}시간 ` : ''}${m}분</b> 동안<br>견습생과 사냥꾼들이 골드를 벌어 왔어요.</p>
    <p class="big">💰 ${fmt(r.gold)}</p>
    ${r.hunt > 0 ? `<p class="muted">그중 ⚔️ 사냥 수익 ${fmt(r.hunt)}</p>` : ''}
    <p class="muted">최대 ${offlineHours(s)}시간까지 쌓입니다. (대장간 → 견습생 고용으로 늘리기)</p>`,
  [{ label: '받기', onClick: () => {
    const before = s.achieved.length;
    s.gold += r.gold;
    s.stats.offlineClaims++;
    checkAchievements(s);
    afterChange(before);
    sfx('sell', s.settings.sound);
  } }]);
}

// ---------- 대장간 (업그레이드 · 환생) ----------
function renderSmith() {
  renderShop();
  $('upList').innerHTML = UPGRADES.map((u) => {
    const lv = upLv(s, u.id);
    const maxed = lv >= u.max;
    const c = upgradeCost(u, lv);
    return `<div class="card">
      <div class="ic">${u.icon}</div>
      <div class="info"><b>${u.name} <small>Lv.${lv}/${u.max}</small></b>
        <span>${u.unit} ${u.fmt(+(lv * u.per).toFixed(1))}${maxed ? '' : ` → <b class="up">${u.fmt(+((lv + 1) * u.per).toFixed(1))}</b>`}</span>
        <div class="lvbar"><i style="width:${(lv / u.max) * 100}%"></i></div></div>
      <button class="btn small" data-up="${u.id}" ${!maxed && s.gold >= c ? '' : 'disabled'}>${maxed ? '최대' : `💰 ${fmt(c)}`}</button></div>`;
  }).join('');

  const gain = rebirthStones(s.best);
  const st = s.rebirth.stones;
  $('rebirthBox').innerHTML = `
    <div class="reb-now">
      <div><span>환생 횟수</span><b>${s.rebirth.count}회</b></div>
      <div><span>보유 환생석</span><b>💎 ${st}</b></div>
      <div><span>판매가</span><b>+${st * 10}%</b></div>
      <div><span>강화 비용</span><b>-${Math.min(50, st)}%</b></div>
    </div>
    <p class="hint">최고 기록 <b>+${REBIRTH_MIN}</b>부터 환생할 수 있습니다. 골드 · 현재 무기 · 보관함 · 최고 기록 · 아이템 · 조각 · 대장간 업그레이드가 초기화되고,
      도감 · 업적 · 통계는 남습니다. 환생석 1개당 판매가 +10%, 강화 비용 -1% (최대 -50%), 시작 골드 +1만.</p>
    <button class="btn rebirth" id="rebirthBtn" ${canRebirth(s) ? '' : 'disabled'}>
      <span>🔄 환생하기</span><small>${canRebirth(s) ? `환생석 💎 ${gain}개 획득 (+300이면 21개)` : `+${REBIRTH_MIN} 달성 필요 (현재 +${s.best})`}</small></button>`;
}

$('upList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-up]');
  if (!b) return;
  if (buyUpgrade(s, b.dataset.up)) {
    sfx('buy', s.settings.sound);
    persist(true);
    renderSmith();
  }
});

$('rebirthBox').addEventListener('click', (e) => {
  if (!e.target.closest('#rebirthBtn') || !canRebirth(s)) return;
  const gain = rebirthStones(s.best);
  modal('🔄 환생할까요?', `<p>최고 기록 <b>+${s.best}</b>으로 환생하면 <b>💎 환생석 ${gain}개</b>를 얻습니다.</p>
    <p class="muted">골드 · 현재 무기 · 보관함 · 최고 기록 · 아이템 · 조각 · 대장간 업그레이드가 초기화됩니다.</p>`, [
    { label: '취소', cls: 'small alt' },
    { label: '환생', onClick: () => {
      stopAuto();
      const r = rebirth(s);
      if (!r) return;
      shownKey = '';
      sfx('great', s.settings.sound);
      toast(`🔄 환생 완료! 💎 환생석 ${r.gain}개 획득`, 3000);
      persist(true);
      renderSmith();
      renderForge();
    } },
  ]);
});

// ---------- 온라인 랭킹 ----------
let lastSubmit = 0;
let submitting = false;
function maybeSubmit(force = false) {
  if (!onlineEnabled() || !s.online.name || submitting) return;
  if (!force && (scoreOf(s) <= s.online.submitted || Date.now() - lastSubmit < 60000)) return;
  submitting = true;
  lastSubmit = Date.now();
  submitScore(s).then(() => { checkAchAfter(); }).catch(() => {}).finally(() => { submitting = false; });
}
function checkAchAfter() {
  const before = s.achieved.length;
  checkAchievements(s);
  if (s.achieved.length > before) afterChange(before); else save(s);
}

async function renderOnline() {
  const box = $('onlineBox');
  if (!onlineEnabled()) {
    box.innerHTML = '<p class="hint">🔌 랭킹 서버가 아직 연결되지 않았습니다. 연결되면 전 세계 대장장이들과 기록을 겨룰 수 있어요.</p>';
    return;
  }
  ensureId(s);
  box.innerHTML = `
    <div class="nick">
      <input id="nickInput" maxlength="12" placeholder="닉네임 (최대 12자)" value="${cleanName(s.online.name)}">
      <button class="btn small" id="nickSave">${s.online.name ? '저장 · 등록' : '등록'}</button>
    </div>
    <p class="hint">점수 = 누적 환생석 × 1000 + 현재 최고 기록. 내 점수 <b>${fmt(scoreOf(s))}</b></p>
    <ol class="rank" id="onlineList"><li class="empty">불러오는 중...</li></ol>`;
  try {
    const rows = await fetchTop(50);
    $('onlineList').innerHTML = rows.length
      ? rows.map((r, i) => `<li class="${r.id === s.online.id ? 'me' : ''}"><span class="no">${i + 1}</span><b>${r.name}</b>
          <em>+${r.best}</em><small>환생 ${r.rebirths}회 · 점수 ${fmt(r.score)}</small></li>`).join('')
      : '<li class="empty">아직 등록된 기록이 없습니다. 첫 번째가 되어 보세요!</li>';
  } catch (err) {
    $('onlineList').innerHTML = `<li class="empty">랭킹을 불러오지 못했습니다 (인터넷 연결 확인)</li>`;
  }
}

$('onlineBox').addEventListener('click', (e) => {
  if (!e.target.closest('#nickSave')) return;
  const name = cleanName($('nickInput').value);
  if (!name) return toast('닉네임을 입력해 주세요');
  s.online.name = name;
  save(s);
  submitScore(s).then(() => { toast('🌍 랭킹에 등록했습니다'); checkAchAfter(); renderOnline(); })
    .catch(() => toast('등록에 실패했습니다. 인터넷 연결을 확인해 주세요'));
});

const RENDER = { forge: renderForge, store: renderStore, smith: renderSmith, dex: renderDex, ach: renderAch, rank: () => { renderRank(); renderOnline(); } };
const renderTab = (t) => RENDER[t]();

// ---------- 이벤트 ----------
$('enhanceBtn').addEventListener('click', doEnhance);
$('sellBtn').addEventListener('click', doSell);
$('autoBtn').addEventListener('click', openAutoSheet);
$('autoStart').addEventListener('click', startAuto);
$('autoClose').addEventListener('click', closeAutoSheet);
$('autoSheet').addEventListener('click', (e) => { if (e.target.id === 'autoSheet') closeAutoSheet(); });

$('autoSheet').querySelector('.sheet').addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (step) {
    const d = Number(step.dataset.step);
    s.auto.target = d === 0 ? Math.min(MAX_LEVEL, s.best + 1) : Math.max(1, Math.min(MAX_LEVEL, s.auto.target + d));
  }
  const opt = e.target.closest('[data-opt]');
  if (opt) {
    const [k, v] = opt.dataset.opt.split(':');
    s.auto[k] = v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? Number(v) : v;
  }
  if (step || opt) { persist(true); renderAutoSheet(); renderForge(); }
});
$('autoSheet').querySelector('.sheet').addEventListener('change', (e) => {
  if (e.target.dataset.aitem) s.auto.items[e.target.dataset.aitem] = e.target.checked;
  if (e.target.id === 'smartItems') s.auto.smart = e.target.checked;
  persist(true);
});

$('useItems').addEventListener('click', (e) => {
  const b = e.target.closest('[data-use]');
  if (!b || auto) return;
  const id = b.dataset.use;
  if (s.items[id] <= 0) return;
  s.use[id] = !s.use[id];
  persist(true);
  renderForge();
});

$('shopList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]');
  if (!b) return;
  const id = b.dataset.buy;
  let n = 0;
  for (let i = 0; i < Number(b.dataset.n); i++) if (buy(s, id, b.dataset.cur)) n++;
  if (n) {
    sfx('buy', s.settings.sound);
    toast(`${ITEMS[id].icon} ${ITEMS[id].name} ${n}개 구매`);
    persist(true);
    renderShop();
  }
});

$('achCats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (b) { achCat = b.dataset.cat; renderAch(); }
});

$('achList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-claim]');
  if (!b) return;
  const a = ACHIEVEMENTS.find((x) => x.id === b.dataset.claim);
  if (claim(s, a.id)) {
    sfx('buy', s.settings.sound);
    toast(`보상 획득: ${rewardText(a.reward)}`);
    persist(true);
    renderAch();
  }
});

$('claimAll').addEventListener('click', () => {
  const n = claimAll(s);
  if (n) { sfx('great', s.settings.sound); toast(`🎁 업적 보상 ${n}개를 받았습니다`); persist(true); renderAch(); }
});

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === tab));
  renderTab(tab);
});

$('soundBtn').addEventListener('click', () => {
  s.settings.sound = !s.settings.sound;
  persist(true);
  renderRank();
});

$('resetBtn').addEventListener('click', () => {
  if (!confirm('모든 진행 상황이 지워집니다. 처음부터 다시 할까요?')) return;
  stopAuto();
  reset();
  s = newState();
  shownKey = '';
  $('result').className = 'result';
  $('result').innerHTML = '';
  persist(true);
  renderRank();
  renderForge();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) persist(true);
  else checkOffline();
});
setInterval(eventTick, 1000);
setInterval(() => { if (!document.hidden) { s.lastSeen = Date.now(); save(s); } }, 30000);

checkOffline();
renderForge();

// 웹사이트(앱 실행기로 연 경우 포함)에서 서비스 워커 등록 → 오프라인 실행 · 자동 업데이트
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && location.hostname !== 'localhost') {
  // 새 버전이 설치되면 저장 후 한 번 새로고침해서 바로 적용
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    save(s);
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      reg.update();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
    })
    .catch(() => {});
}
