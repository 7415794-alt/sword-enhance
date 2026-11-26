// 간단한 효과음 (WebAudio, 파일 없음)
let ctx;
function tone(freq, dur, type = 'square', vol = 0.08, delay = 0, slide = 0) {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

export function sfx(kind, on) {
  if (!on) return;
  try {
    switch (kind) {
      case 'hit': tone(900, 0.06, 'square', 0.05); tone(300, 0.08, 'triangle', 0.08, 0.01); break;
      case 'great': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, i * 0.07)); break;
      case 'success': [523, 784, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.08, i * 0.07)); break;
      case 'keep': tone(330, 0.15, 'sine', 0.07); break;
      case 'destroy': tone(220, 0.5, 'sawtooth', 0.1, 0, -180); tone(110, 0.4, 'square', 0.06, 0.05, -60); break;
      case 'sell': [880, 1320].forEach((f, i) => tone(f, 0.1, 'sine', 0.08, i * 0.06)); break;
      case 'buy': tone(660, 0.08, 'sine', 0.07); break;
    }
  } catch { /* 오디오 미지원 */ }
}
