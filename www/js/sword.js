// 검 그림 (SVG) - 단계가 오를수록 색과 빛이 바뀜
import { tierOf } from './data.js';

let uid = 0;
export function swordSVG(lv) {
  const k = `s${uid++}`;
  const t = tierOf(lv);
  const g = t.glow;
  const blade = t.color;
  const gem = lv >= 15 ? '#ff4d6d' : lv >= 6 ? '#60a5fa' : '#6b7280';
  const rune = lv >= 12;
  return `
<svg viewBox="0 0 120 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${k}b" x1="0" x2="1">
      <stop offset="0" stop-color="${blade}" stop-opacity=".75"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".95"/>
      <stop offset="1" stop-color="${blade}"/>
    </linearGradient>
    <filter id="${k}g" x="-80%" y="-20%" width="260%" height="140%">
      <feGaussianBlur stdDeviation="${4 + g * 8}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g ${g > 0 ? `filter="url(#${k}g)"` : ''}>
    <path d="M60 8 L74 40 L74 210 L46 210 L46 40 Z" fill="url(#${k}b)" stroke="${blade}" stroke-width="1.5"/>
    <line x1="60" y1="24" x2="60" y2="206" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    ${rune ? `<g fill="none" stroke="${blade}" stroke-width="2" opacity=".9">
      <path d="M56 80 l8 8 l-8 8"/><path d="M64 120 l-8 8 l8 8"/><path d="M56 160 l8 8 l-8 8"/></g>` : ''}
    ${lv === 0 ? '<g fill="#6b4f3f" opacity=".7"><circle cx="54" cy="90" r="4"/><circle cx="66" cy="140" r="5"/><circle cx="55" cy="180" r="3"/></g>' : ''}
  </g>
  <rect x="18" y="208" width="84" height="14" rx="7" fill="#c9a227" stroke="#7a5c12" stroke-width="2"/>
  <circle cx="60" cy="215" r="7" fill="${gem}" stroke="#7a5c12" stroke-width="2"/>
  <rect x="52" y="222" width="16" height="62" rx="4" fill="#5b3a29"/>
  <g stroke="#3b2418" stroke-width="2"><line x1="52" y1="234" x2="68" y2="242"/><line x1="52" y1="250" x2="68" y2="258"/><line x1="52" y1="266" x2="68" y2="274"/></g>
  <circle cx="60" cy="292" r="10" fill="#c9a227" stroke="#7a5c12" stroke-width="2"/>
</svg>`;
}
