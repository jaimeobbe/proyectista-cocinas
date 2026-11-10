/* Funcionamiento sin conexión: guarda la app en el dispositivo y la actualiza en segundo plano. */
const VERSION='proyectista-1.0.1';
const FILES=['./','index.html','manifest.webmanifest','platform.js','data.js','textures.js','model.js','draw2d.js','scene3d.js','app.js','assist.js',
 'vendor/three.min.js','vendor/OrbitControls.js','vendor/RoomEnvironment.js',
 'icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png',
 'fonts/barlow-latin-400-normal.woff2','fonts/barlow-latin-500-normal.woff2','fonts/barlow-latin-600-normal.woff2','fonts/barlow-latin-700-normal.woff2',
 'fonts/barlow-condensed-latin-600-normal.woff2','fonts/barlow-condensed-latin-700-normal.woff2','fonts/jetbrains-mono-latin-400-normal.woff2','fonts/jetbrains-mono-latin-600-normal.woff2'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return; const url=new URL(req.url); if(url.origin!==location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c=>{
    const hit=await c.match(req, {ignoreSearch:true});
    const net=fetch(req).then(r=>{ if(r && r.ok) c.put(req, r.clone()); return r; }).catch(()=>null);
    if(hit){ e.waitUntil(net); return hit; }
    const r=await net; return r || (req.mode==='navigate'? c.match('index.html') : Response.error());
  }));
});
