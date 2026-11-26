// 화면 연결 · 렌더링
import {
  VERSION, MAX_LEVEL, ITEMS, ACHIEVEMENTS, WEAPONS, GRADE_COLOR, DEX_BONUS, WEAPON_DEX_BONUS,
  enhanceCost, swordName, weaponName, tierOf, weaponOf, weaponChance,
} from './data.js';
import { load, save, reset, newState } from './state.js';
import {
  currentChances, sellPrice, canEnhance, enhance, sell, buy, goldPrice, claim, claimAll, autoStep, priceBonus,
} from './game.js';
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
  save(s);
}

// ---------- 강화 화면 ----------
let shownKey = '';
function renderHud() {
  $('gold').textContent = fmt(s.gold);
  $('frag').textContent = fmt(s.fragments);
  $('best').textContent = `+${s.best}`;
  const ready = s.achieved.length - s.claimed.length;
  $('achDot').classList.toggle('show', ready > 0);
}

function renderForge() {
  renderHud();
  const t = tierOf(s.level);
  const w = weaponOf(s.weapon);
  $('swordName').innerHTML = `<b style="color:${t.color}">+${s.level}</b> ${weaponName(s.level, s.weapon)}`;
  $('weaponInfo').innerHTML = `${gradeTag(w)} ${w.perk}`;
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
    return `<button class="chip ${on ? 'on' : ''}" data-use="${id}" ${n > 0 && !auto ? '' : 'disabled'}>
      <span>${it.icon}</span><em>${it.name}</em><b>${fmt(n)}</b></button>`;
  }).join('');

  $('cost').textContent = max ? '-' : `💰 ${fmt(enhanceCost(s.level))}`;
  $('enhanceBtn').disabled = auto || !canEnhance(s);
  $('sellPrice').textContent = s.level > 0 ? `💰 ${fmt(sellPrice(s))}` : '+0은 팔 수 없음';
  $('sellBtn').disabled = auto || s.level === 0;
  $('autoBtn').classList.toggle('running', !!auto);
  $('autoBtn').innerHTML = auto ? '<span>■ 중지</span><small>자동 강화 중</small>' : `<span>자동</span><small>목표 +${s.auto.target}</small>`;
}

const RESULT = { great: ['대성공!!', 'great'], success: ['성공!', 'success'], keep: ['유지', 'keep'], destroy: ['파괴...', 'destroy'] };

function showResult(r, quiet) {
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
  if (!quiet || r.result === 'great' || r.result === 'destroy') sfx(r.result, s.settings.sound);
  if (navigator.vibrate && r.result === 'destroy' && !quiet) navigator.vibrate(120);
  if (r.next) announceWeapon(r.next);
}

function announceWeapon(next) {
  const w = weaponOf(next.weapon);
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

function showSold(r) {
  sfx('sell', s.settings.sound);
  const el = $('result');
  el.className = 'result sold';
  el.innerHTML = `<b>판매 완료</b><span>+${r.level} ${weaponOf(r.weapon).name} → 💰 ${fmt(r.price)}</span>`;
  void el.offsetWidth;
  el.classList.add('pop');
  announceWeapon(r.next);
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
    + `<label class="check"><input type="checkbox" id="guardOnlyRisk" ${a.guardOnlyRisk ? 'checked' : ''}>
      <span>파괴 확률이 있을 때만 방지권 사용</span></label>`;
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

function tick() {
  if (!auto) return;
  const before = s.achieved.length;
  const step = autoStep(s);
  auto.n++;
  if (step.action === 'stop') return stopAuto(`⏹ ${step.reason}`);
  if (step.action === 'sell') showSold(step.result);
  else showResult(step.result, s.auto.fast);
  if (s.achieved.length > before) {
    const a = ACHIEVEMENTS.find((x) => x.id === s.achieved[s.achieved.length - 1]);
    toast(`🏅 업적 달성: ${a.name}`);
  }
  persist();
  renderForge();
  if (step.stop) return stopAuto(`⏹ ${step.stop}`);
  auto.timer = setTimeout(tick, s.auto.fast ? 120 : 380);
}

// ---------- 상점 ----------
function renderShop() {
  renderHud();
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
  ];
  $('stats').innerHTML = items.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  $('soundBtn').textContent = s.settings.sound ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐';
  $('ver').textContent = `검 강화하기 v${VERSION}`;
}

const RENDER = { forge: renderForge, shop: renderShop, dex: renderDex, ach: renderAch, rank: renderRank };
const renderTab = (t) => RENDER[t]();

// ---------- 이벤트 ----------
$('enhanceBtn').addEventListener('click', doEnhance);
$('sellBtn').addEventListener('click', doSell);
$('autoBtn').addEventListener('click', openAutoSheet);
$('autoStart').addEventListener('click', startAuto);
$('autoClose').addEventListener('click', closeAutoSheet);
$('autoSheet').addEventListener('click', (e) => { if (e.target.id === 'autoSheet') closeAutoSheet(); });

document.querySelector('.sheet').addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (step) {
    const d = Number(step.dataset.step);
    s.auto.target = d === 0 ? Math.min(MAX_LEVEL, s.best + 1) : Math.max(1, Math.min(MAX_LEVEL, s.auto.target + d));
  }
  const opt = e.target.closest('[data-opt]');
  if (opt) {
    const [k, v] = opt.dataset.opt.split(':');
    s.auto[k] = v === 'true' ? true : v === 'false' ? false : v;
  }
  if (step || opt) { persist(true); renderAutoSheet(); renderForge(); }
});
document.querySelector('.sheet').addEventListener('change', (e) => {
  if (e.target.dataset.aitem) s.auto.items[e.target.dataset.aitem] = e.target.checked;
  if (e.target.id === 'guardOnlyRisk') s.auto.guardOnlyRisk = e.target.checked;
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

document.addEventListener('visibilitychange', () => { if (document.hidden) persist(true); });

renderForge();

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Capacitor) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
