/* ADAP Recovery Tracker — offline cache */
var CACHE = 'adap-tracker-v1';
var ASSETS = [
  './', './index.html', './manifest.webmanifest', './config.js', './db.js',
  './assets/icon-192.png', './assets/icon-512.png',
  './assets/icon-maskable-512.png', './assets/favicon.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* App shell: cache first, fall back to network, then to the cached shell. */
var FONTS = /fonts\.(googleapis|gstatic)\.com/;

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;

  /* Google Fonts: serve from cache when present, otherwise fetch and keep a copy
     so the app still looks right with no connection. */
  if(FONTS.test(e.request.url)){
    e.respondWith(
      caches.match(e.request).then(function(hit){
        return hit || fetch(e.request).then(function(res){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
          return res;
        }).catch(function(){ return hit; });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        if(res && res.status===200 && res.type==='basic'){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){
        if(e.request.mode==='navigate') return caches.match('./index.html');
      });
    })
  );
});
