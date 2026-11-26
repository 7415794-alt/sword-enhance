// 온라인 랭킹 (Firebase Firestore REST API, 별도 라이브러리 없음)
import { FIREBASE } from './config.js';

export const onlineEnabled = () => !!(FIREBASE.projectId && FIREBASE.apiKey);
const BASE = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;

// 랭킹 점수: 누적 환생석 × 1000 + 현재 최고 기록 (환생해도 점수가 줄지 않음)
export const scoreOf = (s) => s.rebirth.total * 1000 + s.best;

export function ensureId(s) {
  if (!s.online.id) s.online.id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, '');
  return s.online.id;
}

export const cleanName = (name) => String(name || '').replace(/[<>&"'`]/g, '').trim().slice(0, 12);

export async function submitScore(s) {
  if (!onlineEnabled() || !s.online.name) return false;
  const id = ensureId(s);
  const body = {
    fields: {
      name: { stringValue: cleanName(s.online.name) },
      best: { integerValue: String(s.best) },
      rebirths: { integerValue: String(s.rebirth.count) },
      score: { integerValue: String(scoreOf(s)) },
      bestSale: { doubleValue: s.stats.bestSale },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
  const res = await fetch(`${BASE()}/scores/${id}?key=${FIREBASE.apiKey}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`랭킹 등록 실패 (${res.status})`);
  s.online.submitted = scoreOf(s);
  return true;
}

export async function fetchTop(limit = 50) {
  if (!onlineEnabled()) return [];
  const res = await fetch(`${BASE()}:runQuery?key=${FIREBASE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'scores' }],
        orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
        limit,
      },
    }),
  });
  if (!res.ok) throw new Error(`랭킹 불러오기 실패 (${res.status})`);
  const rows = await res.json();
  return rows.filter((r) => r.document).map((r) => {
    const f = r.document.fields;
    return {
      id: r.document.name.split('/').pop(),
      name: cleanName(f.name?.stringValue) || '이름 없음',
      best: Number(f.best?.integerValue || 0),
      rebirths: Number(f.rebirths?.integerValue || 0),
      score: Number(f.score?.integerValue || 0),
    };
  });
}
