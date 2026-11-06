"use strict";
(() => {
 let ready = false, sawLoader = false;
 const files = new Map();
 let lastReport = 0;
 window.scratchyDownload = async function(url) {
  const key = url.split('/scratchy/').at(-1);
  const file = { loaded: 0, total: 0 }; files.set(key,file);
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw Error('HTTP ' + response.status);
  file.total = Number(response.headers.get('content-length')) || 0;
  const chunks = [], reader = response.body.getReader();
  function report(force = false) {
   if (!force && Date.now() - lastReport < 100) return;
   lastReport = Date.now();
   let loaded = 0, total = 0;
   for (const item of files.values()) { loaded += item.loaded; total += Math.max(item.loaded,item.total); }
   parent.postMessage({ velocify:'game-download',loaded,total },location.origin);
  }
  for (;;) { const { done,value } = await reader.read(); if (done) break; chunks.push(value); file.loaded += value.byteLength; report(); }
  report(true);
  return URL.createObjectURL(new Blob(chunks,{type:'text/javascript'}));
 };
 const started = Date.now();
 const observer = new MutationObserver(() => {
  const loader = document.getElementById('loader');
  if (loader) sawLoader = true;
  const status = document.getElementById('status')?.textContent || '';
  if (/failed|error/i.test(status)) parent.postMessage({ velocify: 'game-error' }, location.origin);
  if (!ready && (sawLoader && !loader || loader && (loader.hidden || loader.style.display === 'none'))) {
   ready = true; observer.disconnect(); parent.postMessage({ velocify: 'game-ready' }, location.origin);
  }
 });
 observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','hidden'] });
 window.addEventListener('error', () => { if (!ready && Date.now() - started > 1000) parent.postMessage({ velocify: 'game-error' }, location.origin); });
})();
