// 숫자 표시: 1,234 / 12.3만 / 4.5억 / 6.7조 / 8.9경
const UNITS = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
export function fmt(n) {
  n = Math.floor(n);
  if (n < 1e5) return n.toLocaleString('ko-KR');
  for (const [v, u] of UNITS) {
    if (n >= v) {
      const x = n / v;
      return `${x >= 1000 ? Math.floor(x).toLocaleString('ko-KR') : x >= 100 ? Math.floor(x) : x.toFixed(1).replace(/\.0$/, '')}${u}`;
    }
  }
  return String(n);
}
export const pct = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
