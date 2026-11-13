const CACHE='frostmeta-v15';
const SHELL=['./icons/kill-skull.png?v=15','./','./index.html','./theme.css?v=14','./core.js?v=15','./app.css?v=14','./app.mjs?v=14','./app-config.json','./manifest.json','./favicon.png?v=14','./icons/icon-192.png?v=14','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('frostmeta-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||/\/(api|auth)\//.test(url.pathname))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
  return response;
 }).catch(async()=>await caches.match(event.request)||(event.request.mode==='navigate'?await caches.match('./index.html'):Response.error())));
});

