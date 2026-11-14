/* 삼성 AI 구독 계산기 - 오프라인 대비 (항상 인터넷 먼저, 끊기면 마지막으로 받은 화면·단가 사용) */
var CACHE = 'calc-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // 서버 API · 외부 파일은 손대지 않음
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(url.pathname, copy); }); }
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) { return c.match(url.pathname).then(function (r) { return r || c.match(self.registration.scope); }); });
    })
  );
});
