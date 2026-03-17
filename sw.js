// キャッシュを使わず常に最新ファイルを取得する
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // 既存のキャッシュをすべて削除
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(name => caches.delete(name)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // キャッシュを一切使わず、常にネットワークから取得
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => {
      // オフライン時のみキャッシュにフォールバック（なければエラー）
      return caches.match(event.request);
    })
  );
});
