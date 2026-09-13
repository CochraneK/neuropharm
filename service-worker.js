/*
 * 药枢 NeuroPharm · Service Worker
 * 策略：
 *   - 静态资源：cache-first（预缓存 + 运行时补齐）
 *   - 导航请求：network-first，离线回退缓存首页
 *   - 后端 API（Cloudflare Worker 同步）：不缓存，直接走网络
 * file:// 环境（Android assets）下注册会失败，已在注册处 try/catch 静默处理。
 */
const CACHE = 'neuropharm-v1';
const ASSETS = [
  './psychopharm.html',
  './data/drugs-data.js',
  './js/auth.js',
  './js/sync.js',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/download-qr.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {
        // 个别资源缺失不阻断安装
        return Promise.all(ASSETS.map(u => c.add(u).catch(() => null)));
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 后端同步接口：不缓存
const isApi = url => /neuropharm-sync|workers\.dev|\/api\//.test(url);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isApi(url.href)) return; // 交给默认网络流程

  // 导航请求：network-first
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./psychopharm.html', copy));
          return r;
        })
        .catch(() => caches.match('./psychopharm.html').then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：cache-first
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        if (r && r.status === 200 && r.type === 'basic') {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return r;
      }).catch(() => hit);
    })
  );
});
