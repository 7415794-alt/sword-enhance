// 화면 연결 · 렌더링
import { VERSION, MAX_LEVEL, ITEMS, ACHIEVEMENTS, DEX_BONUS, enhanceCost, swordName, tierOf } from './data.js';
import { load, save, reset, newState } from './state.js';
import { currentChances, sellPrice, canEnhance, enhance, sell, buy, goldPrice, claim } from './game.js';
import { fmt, pct } from './format.js';
import { swordSVG } from './sword.js';
import { sfx } from './sound.js';

let s = load();
const $ = (id) => document.getElementById(id);

// ---------- 공통 ----------
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function rewardText(r) {
  return Object.entries(r).map(([k, v]) => (k === 'gold' ? `💰 ${fmt(v)}` : `${ITEMS[k].icon} ${v}개`)).join(' · ');
}

function persist() { save(s); }

// ---------- 강화 화면 ----------
let shownLevel = -1;
function renderForge() {
  $('gold').textContent = fmt(s.gold);
  $('frag').textContent = fmt(s.fragments);
  $('best').textContent = `+${s.best}`;

  const t = tierOf(s.level);
  $('swordName').innerHTML = `<b style="color:${t.color}">+${s.level}</b> ${t.name}`;
  if (shownLevel !== s.level) { $('sword').innerHTML = swordSVG(s.level); shownLevel = s.level; }

  const ch = currentChances(s);
  const max = s.level >= MAX_LEVEL;
  const seg = (cls, label, v) => (v > 0 ? `<div class="seg ${cls}" style="flex:${v}"></div>` : '');
  const row = (cls, label, v) => `<div class="odd ${cls}"><i></i>${label}<b>${pct(v)}</b></div>`;
  $('odds').innerHTML = max
    ? '<div class="maxed">최대 강화 달성! 판매해서 전설을 남기세요.</div>'
    : `<div class="bar">${seg('great', '', ch.great)}${seg('success', '', ch.success)}${seg('keep', '', ch.keep)}${seg('destroy', '', ch.destroy)}</div>
       <div class="odd-grid">${row('great', '대성공 +2', ch.great)}${row('success', '성공 +1', ch.success)}${row('keep', '유지', ch.keep)}${row('destroy', '파괴', ch.destroy)}</div>`;

  $('useItems').innerHTML = Object.entries(ITEMS).map(([id, it]) => {
    const n = s.items[id];
    const on = s.use[id] && n > 0;
    return `<button class="chip ${on ? 'on' : ''}" data-use="${id}" ${n > 0 ? '' : 'disabled'}>
      <span>${it.icon}</span><em>${it.name}</em><b>${n}</b></button>`;
  }).join('');

  $('cost').textContent = max ? '-' : `💰 ${fmt(enhanceCost(s.level))}`;
  $('enhanceBtn').disabled = !canEnhance(s);
  $('sellPrice').textContent = s.level > 0 ? `💰 ${fmt(sellPrice(s))}` : '+0은 팔 수 없음';
  $('sellBtn').disabled = s.level === 0;
}

const RESULT = {
  great: ['대성공!!', 'great'],
  success: ['성공!', 'success'],
  keep: ['유지', 'keep'],
  destroy: ['파괴...', 'destroy'],
};

function showResult(r) {
  const el = $('result');
  const [text, cls] = RESULT[r.result];
  let sub = '';
  if (r.result === 'great' || r.result === 'success') sub = `+${r.from} → +${r.to}`;
  else if (r.saved) sub = '🛡️ 파괴 방지권이 검을 지켰습니다';
  else if (r.result === 'destroy') sub = `+${r.from} 검이 부서졌습니다 · 🔩 조각 ${r.fragments}개 획득`;
  else sub = `+${r.from} 그대로`;
  el.className = `result ${cls}`;
  el.innerHTML = `<b>${text}</b><span>${sub}</span>`;
  void el.offsetWidth;
  el.classList.add('pop');

  const wrap = $('swordWrap');
  wrap.className = 'sword-wrap';
  void wrap.offsetWidth;
  wrap.classList.add(`fx-${cls}`);
  sfx(r.result, s.settings.sound);
  if (navigator.vibrate && r.result === 'destroy') navigator.vibrate(120);
}

let busy = false;
function doEnhance() {
  if (busy || !canEnhance(s)) return;
  busy = true;
  const before = s.achieved.length;
  const wrap = $('swordWrap');
  wrap.className = 'sword-wrap hammer';
  sfx('hit', s.settings.sound);
  setTimeout(() => {
    const r = enhance(s);
    busy = false;
    if (!r) return renderForge();
    if (r.result === 'destroy') shownLevel = -1;
    showResult(r);
    afterChange(before);
  }, 280);
}

function doSell() {
  if (s.level === 0) return;
  if (s.level >= 10 && !confirm(`${swordName(s.level)}을(를) ${fmt(sellPrice(s))} 골드에 판매할까요?`)) return;
  const before = s.achieved.length;
  const r = sell(s);
  if (!r) return;
  sfx('sell', s.settings.sound);
  const el = $('result');
  el.className = 'result sold';
  el.innerHTML = `<b>판매 완료</b><span>+${r.level} 검 → 💰 ${fmt(r.price)}</span>`;
  void el.offsetWidth;
  el.classList.add('pop');
  shownLevel = -1;
  afterChange(before);
}

function afterChange(beforeAch) {
  const fresh = s.achieved.slice(beforeAch);
  if (fresh.length) {
    const a = ACHIEVEMENTS.find((x) => x.id === fresh[fresh.length - 1]);
    toast(`🏅 업적 달성: ${a.name}`);
  }
  persist();
  renderAll();
}

// ---------- 상점 ----------
function renderShop() {
  $('shopList').innerHTML = Object.entries(ITEMS).map(([id, it]) => {
    const gp = goldPrice(s, id);
    return `<div class="card">
      <div class="ic">${it.icon}</div>
      <div class="info"><b>${it.name} <small>보유 ${s.items[id]}</small></b><span>${it.desc}</span></div>
      <div class="buy">
        <button class="btn small" data-buy="${id}" data-cur="gold" ${s.gold >= gp ? '' : 'disabled'}>💰 ${fmt(gp)}</button>
        <button class="btn small alt" data-buy="${id}" data-cur="frag" ${s.fragments >= it.frag ? '' : 'disabled'}>🔩 ${it.frag}</button>
      </div></div>`;
  }).join('');
}

// ---------- 도감 ----------
function renderDex() {
  $('dexCount').textContent = `${s.dex.length} / ${MAX_LEVEL} · 판매가 +${Math.round(s.dex.length * DEX_BONUS * 100)}%`;
  let html = '';
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const got = s.dex.includes(lv);
    const t = tierOf(lv);
    html += `<div class="dex-cell ${got ? 'got' : ''}" style="--c:${t.color}">
      <i class="blade"></i>
      <b>+${lv}</b><span>${got ? t.name : '???'}</span></div>`;
  }
  $('dexGrid').innerHTML = html;
}

// ---------- 업적 ----------
function renderAch() {
  const ready = s.achieved.filter((id) => !s.claimed.includes(id)).length;
  $('achDot').classList.toggle('show', ready > 0);
  $('achCount').textContent = `${s.achieved.length} / ${ACHIEVEMENTS.length}`;
  const order = (a) => (s.achieved.includes(a.id) && !s.claimed.includes(a.id) ? 0 : s.claimed.includes(a.id) ? 2 : 1);
  $('achList').innerHTML = [...ACHIEVEMENTS].sort((a, b) => order(a) - order(b)).map((a) => {
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
  $('rankList').innerHTML = s.ranking.length
    ? s.ranking.map((r, i) => `<li><span class="no">${i + 1}</span><b style="color:${tierOf(r.level).color}">${swordName(r.level)}</b>
        <em>💰 ${fmt(r.price)}</em><small>${new Date(r.at).toLocaleDateString('ko-KR')}</small></li>`).join('')
    : '<li class="empty">아직 판매한 검이 없습니다</li>';
  const st = s.stats;
  const rate = (n) => (st.tries ? `${((n / st.tries) * 100).toFixed(1)}%` : '-');
  const items = [
    ['강화 시도', fmt(st.tries)],
    ['대성공', `${fmt(st.greats)} (${rate(st.greats)})`],
    ['성공', `${fmt(st.successes)} (${rate(st.successes)})`],
    ['유지', `${fmt(st.keeps)} (${rate(st.keeps)})`],
    ['파괴', `${fmt(st.destroys)} (${rate(st.destroys)})`],
    ['방지권으로 막음', fmt(st.saved)],
    ['판매한 검', fmt(st.sells)],
    ['누적 판매 수익', fmt(st.earned)],
    ['최고 판매가', fmt(st.bestSale)],
    ['최고 강화', `+${s.best}`],
  ];
  $('stats').innerHTML = items.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  $('soundBtn').textContent = s.settings.sound ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐';
  $('ver').textContent = `검 강화하기 v${VERSION}`;
}

function renderAll() {
  renderForge();
  renderShop();
  renderDex();
  renderAch();
  renderRank();
}

// ---------- 이벤트 ----------
$('enhanceBtn').addEventListener('click', doEnhance);
$('sellBtn').addEventListener('click', doSell);

$('useItems').addEventListener('click', (e) => {
  const b = e.target.closest('[data-use]');
  if (!b) return;
  const id = b.dataset.use;
  if (s.items[id] <= 0) return;
  s.use[id] = !s.use[id];
  persist();
  renderForge();
});

$('shopList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]');
  if (!b) return;
  if (buy(s, b.dataset.buy, b.dataset.cur)) {
    sfx('buy', s.settings.sound);
    toast(`${ITEMS[b.dataset.buy].icon} ${ITEMS[b.dataset.buy].name} 구매`);
    persist();
    renderAll();
  }
});

$('achList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-claim]');
  if (!b) return;
  const a = ACHIEVEMENTS.find((x) => x.id === b.dataset.claim);
  if (claim(s, a.id)) {
    sfx('buy', s.settings.sound);
    toast(`보상 획득: ${rewardText(a.reward)}`);
    persist();
    renderAll();
  }
});

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === b.dataset.tab));
});

$('soundBtn').addEventListener('click', () => {
  s.settings.sound = !s.settings.sound;
  persist();
  renderRank();
});

$('resetBtn').addEventListener('click', () => {
  if (!confirm('모든 진행 상황이 지워집니다. 처음부터 다시 할까요?')) return;
  reset();
  s = newState();
  shownLevel = -1;
  $('result').className = 'result';
  $('result').innerHTML = '';
  persist();
  renderAll();
});

document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

renderAll();

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Capacitor) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
