"use strict";
(() => {
 const fetchPart = window.fetch.bind(window), activeUrls = new Set(), controller = new AbortController();
 let queue = Promise.resolve();
 const progress = (part, loaded) => window.gameDownloadCache?.(new URL(part.url).pathname.split('/').pop(), loaded, part.size);
 function result(blob, type) {
  const typed = blob.slice(0, blob.size, type || 'application/octet-stream');
  const url = URL.createObjectURL(typed); activeUrls.add(url);
  return { url, blob: typed, release() { URL.revokeObjectURL(url); activeUrls.delete(url); } };
 }
 async function merge({ parts, type, onProgress }) {
  if (!Array.isArray(parts) || !parts.length || parts.some(part => !Number.isSafeInteger(part.size) || part.size <= 0)) throw Error('Invalid game file manifest.');
  const total = parts.reduce((sum,part) => sum + part.size,0);
  let handle, writable, name, folder;
  try {
   if (navigator.storage?.getDirectory) {
    const signature = parts.map(part => part.url + ':' + part.size).join('\n');
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature));
    name = Array.from(new Uint8Array(digest),byte => byte.toString(16).padStart(2,'0')).join('') + '.bin';
    folder = await (await navigator.storage.getDirectory()).getDirectoryHandle('velocify-game-cache',{create:true});
    handle = await folder.getFileHandle(name,{create:true});
    const cached = await handle.getFile();
    if (cached.size === total) { for (const part of parts) progress(part,part.size); onProgress?.(total,total); return result(cached,type); }
    const estimate = await navigator.storage.estimate?.();
    if (estimate?.quota && estimate.quota - estimate.usage < total + 32 * 1024 * 1024) throw Error('Not enough browser storage for this game. Free some space and retry.');
    writable = await handle.createWritable();
   }
  } catch (error) {
   if (total > 128 * 1024 * 1024) throw Error(error.message || 'This game needs browser storage to load safely.');
   handle = null;
  }
  if (!writable && total > 128 * 1024 * 1024) throw Error('This large game needs browser storage to load without exhausting memory.');
  const blobs = [];
  let offset = 0;
  try {
   for (const part of parts) {
    let completed = false, lastError;
    for (const url of [part.url, part.backup, part.url].filter(Boolean)) {
     const pieces = [];
     let received = 0;
     try {
      if (writable) { await writable.truncate(offset); await writable.seek(offset); }
      const response = await fetchPart(url,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(90000)])});
      if (!response.ok || !response.body) throw Error('Game download failed: HTTP ' + response.status);
      const reader = response.body.getReader();
      try {
       for (;;) {
        const {done,value} = await reader.read(); if (done) break;
        received += value.byteLength;
        if (received > part.size) throw Error('Game file is larger than expected.');
        if (writable) await writable.write(value); else pieces.push(new Blob([value]));
        progress(part,received);
        onProgress?.(offset + received,total);
       }
      } finally { await reader.cancel().catch(() => {}); }
      if (received !== part.size) throw Error('Incomplete game download.');
      if (!writable) blobs.push(new Blob(pieces));
      completed = true; break;
     } catch (error) { if (controller.signal.aborted) throw error; lastError = error; }
    }
    if (!completed) throw lastError;
    offset += part.size; progress(part,part.size);
   }
   if (writable) { await writable.close(); writable = null; return result(await handle.getFile(),type); }
   return result(new Blob(blobs),type);
  } catch (error) {
   if (writable) await writable.abort().catch(() => {});
   if (folder && name) await folder.removeEntry(name).catch(() => {});
   throw error;
  }
 }
 window.gameAssets = { merge(options) {
  const task = queue.then(() => merge(options)); queue = task.catch(() => {}); return task;
 }, fromPaths(paths, options = {}) {
  const parts = paths.map(path => {
   const url = new URL(path,document.baseURI).href, name = new URL(url).pathname.split('/').pop();
   const match = /^https:\/\/cdn\.jsdelivr\.net\/gh\/([^@]+)@([^/]+)\/(.+)$/.exec(url);
   return {url,size:window.gameDownloadSizes?.[name],backup:match ? 'https://raw.githubusercontent.com/'+match[1]+'/'+match[2]+'/'+match[3] : undefined};
  });
  return this.merge({parts,type:/\.wasm(?:\.part\d+)?(?:[?#]|$)/.test(paths[0]) ? 'application/wasm' : 'application/octet-stream',...options});
 }, release() { for (const url of activeUrls) URL.revokeObjectURL(url); activeUrls.clear(); } };
 window.addEventListener('pagehide', () => { controller.abort(); window.gameAssets.release(); });
})();
