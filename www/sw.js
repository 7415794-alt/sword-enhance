// 오프라인 실행용 서비스 워커 (게임 파일 수정 시 CACHE 버전을 올리세요)
const CACHE = 'sword-v0.7.1';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/main.js', './js/data.js', './js/state.js', './js/game.js', './js/format.js', './js/weapon.js', './js/config.js', './js/online.js', './js/sound.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 네트워크 우선, 실패 시 캐시
// cache: 'no-cache' → 브라우저 HTTP 캐시(GitHub Pages는 10분)를 건너뛰고 항상 서버에 최신인지 확인
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const fresh = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(fresh
    .then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })
    .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
});
