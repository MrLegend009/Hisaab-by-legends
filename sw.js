/* Hisaab shell SW — fastest possible opens + offline + always fresh.
   Opening the app: fresh network copy is raced against a 1.2s timer —
   fast net = newest version instantly; slow net = cached copy after 1.2s
   (the fresh one still downloads in the background for the next open).
   All other GETs: cache-first. Sync POSTs: never touched. */
const CACHE = "hisaab-shell-v3";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add("./").catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ---- background flush: the browser delivers queued entries even when the app is
   closed (fires when connectivity allows; retries with backoff on failure) ---- */
const IDB = "hisaab-outbox";
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("q", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbAll() {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const t = db.transaction("q", "readonly").objectStore("q").getAll();
    t.onsuccess = () => res(t.result || []);
    t.onerror = () => rej(t.error);
  }));
}
function idbDel(ids) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const t = db.transaction("q", "readwrite");
    ids.forEach((id) => t.objectStore("q").delete(id));
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  }));
}
self.addEventListener("sync", (e) => {
  if (e.tag !== "hisaab-flush") return;
  e.waitUntil((async () => {
    const all = await idbAll();
    const meta = all.find((x) => x.id === "__settings__");
    const ents = all.filter((x) => x.id && x.id !== "__settings__");
    if (!meta || !ents.length || !meta.scriptUrl) return;
    const r = await fetch(meta.scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret: meta.secret,
        action: "save",
        entries: ents.map((x) => ({ id: x.id, ts: x.ts, type: x.type, amount: x.amount,
                                   account: x.account, category: x.category, note: x.note })),
      }),
    });
    const j = await r.json().catch(() => null);
    if (!j || !j.ok) throw new Error("retry-later");   // browser retries with backoff
    await idbDel(ents.map((x) => x.id));               // delivered → clear queue
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                  // sync POSTs: never touched
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;        // Google etc: always network

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const cached = await caches.match("./").catch(() => null);
      const net = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./", copy));
        }
        return res;
      }).catch(() => null);          // offline → null, never a rejection
      if (cached) {
        const fresh = await Promise.race([
          net,
          new Promise((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);
        return fresh || cached;      // fast net = newest; slow/offline = cache instantly
      }
      return net.then((r) => r || Response.error());
    })());
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
