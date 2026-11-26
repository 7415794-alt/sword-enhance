// 무기 그림 (SVG). 강화 단계가 오를수록 색과 빛이 바뀜
import { tierOf } from './data.js';

let uid = 0;
const WOOD = '#8b5a33';
const WOOD_D = '#5b3a29';
const GOLD = '#c9a227';
const GOLD_D = '#7a5c12';

// 손잡이 + 가드 (검 종류 공통)
const hilt = (gem, y = 208, w = 84) => `
  <rect x="${60 - w / 2}" y="${y}" width="${w}" height="14" rx="7" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>
  <circle cx="60" cy="${y + 7}" r="7" fill="${gem}" stroke="${GOLD_D}" stroke-width="2"/>
  <rect x="52" y="${y + 14}" width="16" height="62" rx="4" fill="${WOOD_D}"/>
  <g stroke="#3b2418" stroke-width="2"><line x1="52" y1="${y + 26}" x2="68" y2="${y + 34}"/><line x1="52" y1="${y + 42}" x2="68" y2="${y + 50}"/><line x1="52" y1="${y + 58}" x2="68" y2="${y + 66}"/></g>
  <circle cx="60" cy="${y + 84}" r="10" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>`;

const runes = (c, ys) => `<g fill="none" stroke="${c}" stroke-width="2" opacity=".9">${ys.map((y, i) => `<path d="M${i % 2 ? 64 : 56} ${y} l${i % 2 ? -8 : 8} 8 l${i % 2 ? 8 : -8} 8"/>`).join('')}</g>`;

const SHAPES = {
  // 나뭇가지: 잎은 단계 색으로 물듦
  branch: (k, c, lv) => `
    <path d="M62 305 C58 250 66 200 58 150 C52 110 64 70 56 22" fill="none" stroke="${WOOD}" stroke-width="11" stroke-linecap="round"/>
    <path d="M62 305 C58 250 66 200 58 150 C52 110 64 70 56 22" fill="none" stroke="${lv >= 6 ? `url(#${k}b)` : '#a0703f'}" stroke-width="5" stroke-linecap="round" opacity="${lv >= 6 ? 0.9 : 0.6}"/>
    <path d="M60 170 C72 150 86 146 96 132" fill="none" stroke="${WOOD}" stroke-width="6" stroke-linecap="round"/>
    <path d="M58 100 C46 86 36 82 26 70" fill="none" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/>
    <g fill="${lv >= 3 ? c : '#65a30d'}" stroke="#14532d" stroke-width="1.5">
      <path d="M96 132 q18 -14 12 -32 q-18 6 -12 32z"/><path d="M26 70 q-20 -6 -22 -26 q20 2 22 26z"/><path d="M56 22 q-6 -18 6 -30 q8 16 -6 30z"/>
    </g>`,
  // 목검
  wood: (k, c, lv, gem) => `
    <path d="M60 14 L72 40 L72 210 L48 210 L48 40 Z" fill="#c08a55" stroke="${WOOD_D}" stroke-width="2"/>
    <path d="M60 14 L72 40 L72 210 L60 210 Z" fill="${lv >= 6 ? `url(#${k}b)` : '#a8743f'}" opacity="${lv >= 6 ? 0.55 : 1}"/>
    <g stroke="${WOOD_D}" stroke-width="1" opacity=".5"><line x1="54" y1="60" x2="54" y2="200"/><line x1="66" y1="80" x2="66" y2="190"/></g>
    <rect x="30" y="208" width="60" height="12" rx="4" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2"/>
    <rect x="52" y="220" width="16" height="66" rx="4" fill="#e7e5e4"/>
    <g stroke="#a8a29e" stroke-width="2"><line x1="52" y1="232" x2="68" y2="240"/><line x1="52" y1="250" x2="68" y2="258"/><line x1="52" y1="268" x2="68" y2="276"/></g>
    <circle cx="60" cy="292" r="8" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2"/>`,
  // 단검
  dagger: (k, c, lv, gem) => `
    <path d="M60 96 L72 124 L70 214 L50 214 L48 124 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="1.5"/>
    <line x1="60" y1="110" x2="60" y2="210" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <path d="M28 212 Q60 200 92 212 L92 222 Q60 212 28 222 Z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>
    <circle cx="60" cy="214" r="6" fill="${gem}" stroke="${GOLD_D}" stroke-width="2"/>
    <rect x="53" y="222" width="14" height="46" rx="4" fill="${WOOD_D}"/>
    <circle cx="60" cy="274" r="9" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>`,
  // 장검
  sword: (k, c, lv, gem) => `
    <path d="M60 8 L74 40 L74 210 L46 210 L46 40 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="1.5"/>
    <line x1="60" y1="24" x2="60" y2="206" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    ${lv >= 12 ? runes(c, [80, 120, 160]) : ''}
    ${hilt(gem)}`,
  // 도끼
  axe: (k, c, lv, gem) => `
    <rect x="54" y="30" width="12" height="276" rx="5" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2"/>
    <path d="M62 50 C80 40 104 30 112 20 C122 60 122 110 112 148 C104 138 80 128 62 122 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="2"/>
    <path d="M58 60 C46 58 36 52 30 46 C24 70 24 98 30 118 C36 110 46 106 58 104 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="2" opacity=".85"/>
    <rect x="50" y="44" width="20" height="84" rx="4" fill="#4b5563" stroke="#1f2937" stroke-width="2"/>
    <circle cx="60" cy="86" r="6" fill="${gem}"/>
    <g stroke="${WOOD_D}" stroke-width="2"><line x1="54" y1="250" x2="66" y2="256"/><line x1="54" y1="266" x2="66" y2="272"/><line x1="54" y1="282" x2="66" y2="288"/></g>`,
  // 창
  spear: (k, c, lv, gem) => `
    <rect x="55" y="74" width="10" height="236" rx="4" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2"/>
    <path d="M60 6 C74 30 78 56 68 80 L52 80 C42 56 46 30 60 6 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="2"/>
    <line x1="60" y1="16" x2="60" y2="76" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <rect x="50" y="78" width="20" height="12" rx="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>
    <g stroke="#dc2626" stroke-width="3" stroke-linecap="round"><path d="M56 92 q-6 20 -10 34"/><path d="M60 92 q0 22 -2 38"/><path d="M64 92 q6 20 8 34"/></g>
    <circle cx="60" cy="96" r="4" fill="${gem}"/>`,
  // 대검
  great: (k, c, lv, gem) => `
    <path d="M60 4 L86 34 L84 206 L36 206 L34 34 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="2"/>
    <path d="M60 18 L60 200" stroke="rgba(0,0,0,.3)" stroke-width="4"/>
    ${lv >= 12 ? runes(c, [70, 110, 150]) : ''}
    ${hilt(gem, 204, 104)}`,
  // 카타나
  katana: (k, c, lv, gem) => `
    <path d="M70 8 Q56 40 54 120 Q53 180 56 214 L68 214 Q66 170 66 120 Q68 50 76 10 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="1.5"/>
    <path d="M60 200 Q59 140 62 80" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-dasharray="4 3"/>
    <ellipse cx="62" cy="218" rx="20" ry="7" fill="#1f2937" stroke="${GOLD}" stroke-width="2"/>
    <rect x="55" y="224" width="14" height="70" rx="5" fill="#111827"/>
    <g fill="${gem === '#6b7280' ? '#e5e7eb' : gem}"><path d="M62 232 l5 7 l-5 7 l-5 -7z"/><path d="M62 252 l5 7 l-5 7 l-5 -7z"/><path d="M62 272 l5 7 l-5 7 l-5 -7z"/></g>`,
  // 사신의 낫
  scythe: (k, c, lv, gem) => `
    <path d="M66 24 C64 120 70 200 62 312" fill="none" stroke="#3f2a1e" stroke-width="10" stroke-linecap="round"/>
    <path d="M66 34 C40 16 12 30 4 70 C22 54 44 50 66 58 Z" fill="url(#${k}b)" stroke="${c}" stroke-width="2"/>
    <path d="M66 26 C40 10 10 22 2 64" fill="none" stroke="#111" stroke-width="1" opacity=".5"/>
    <rect x="58" y="28" width="16" height="34" rx="3" fill="#374151" stroke="#111827" stroke-width="2"/>
    <circle cx="66" cy="45" r="5" fill="${gem}"/>
    <g fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="64" cy="150" r="4"/><circle cx="65" cy="160" r="4"/></g>`,
  // 황금 검: 칼날이 항상 금색
  gold: (k, c, lv, gem) => `
    <path d="M60 6 L76 40 L76 210 L44 210 L44 40 Z" fill="url(#${k}gold)" stroke="#b45309" stroke-width="2"/>
    <line x1="60" y1="22" x2="60" y2="206" stroke="rgba(120,53,15,.35)" stroke-width="2"/>
    <g fill="#fff7d6" opacity=".9"><path d="M60 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z"/><path d="M60 140 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z"/></g>
    <path d="M14 206 Q60 190 106 206 L106 222 Q60 210 14 222 Z" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
    <circle cx="60" cy="212" r="8" fill="${gem === '#6b7280' ? '#ef4444' : gem}" stroke="#92400e" stroke-width="2"/>
    <rect x="52" y="220" width="16" height="62" rx="4" fill="#7c2d12"/>
    <g stroke="#fbbf24" stroke-width="2"><line x1="52" y1="232" x2="68" y2="240"/><line x1="52" y1="248" x2="68" y2="256"/><line x1="52" y1="264" x2="68" y2="272"/></g>
    <circle cx="60" cy="290" r="11" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>`,
};

export function weaponSVG(lv, wid = 'sword') {
  const k = `w${uid++}`;
  const t = tierOf(lv);
  const g = t.glow;
  const c = t.color;
  const gem = lv >= 15 ? '#ff4d6d' : lv >= 6 ? '#60a5fa' : '#6b7280';
  const shape = (SHAPES[wid] || SHAPES.sword)(k, c, lv, gem);
  const rust = lv === 0 && !['branch', 'wood', 'gold'].includes(wid)
    ? '<g fill="#6b4f3f" opacity=".55"><circle cx="56" cy="90" r="4"/><circle cx="64" cy="150" r="5"/><circle cx="57" cy="185" r="3"/></g>' : '';
  return `
<svg viewBox="0 0 120 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${k}b" x1="0" x2="1">
      <stop offset="0" stop-color="${c}" stop-opacity=".75"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".95"/>
      <stop offset="1" stop-color="${c}"/>
    </linearGradient>
    <linearGradient id="${k}gold" x1="0" x2="1">
      <stop offset="0" stop-color="#f59e0b"/><stop offset=".5" stop-color="#fff3c4"/><stop offset="1" stop-color="#d97706"/>
    </linearGradient>
    <filter id="${k}g" x="-80%" y="-20%" width="260%" height="140%">
      <feGaussianBlur stdDeviation="${4 + g * 8}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g ${g > 0 ? `filter="url(#${k}g)"` : ''}>${shape}${rust}</g>
</svg>`;
}
