"use strict";
(async () => {
 const overlay = document.getElementById('port-loading');
 const status = document.getElementById('port-status');
 const retry = document.getElementById('port-retry');
 const nativeFetch = window.fetch.bind(window);
 retry.addEventListener('click', () => location.reload());
 function ready() {
  overlay.hidden = true;
  window.gameAssets.release();
  parent.postMessage({ velocify: 'game-ready' }, location.origin);
 }
 function persist(module) {
  if (module?.FS?.syncfs) window.persistGameSaves(() => new Promise((resolve, reject) => module.FS.syncfs(false, error => error ? reject(error) : resolve())));
 }
 function script(src) {
  return new Promise((resolve, reject) => {
   const node = document.createElement('script');
   node.src = src;
   node.onload = resolve;
   node.onerror = () => reject(Error('Could not load game runtime. Retry.'));
   document.body.appendChild(node);
  });
 }
 try {
  const response = await nativeFetch('manifest.json');
  if (!response.ok) throw Error('Could not load game manifest.');
  const port = await response.json();
  const base = port.base || `https://raw.githubusercontent.com/${port.repo}/${port.revision}/${port.path}`;
  const backup = port.base || `https://cdn.jsdelivr.net/gh/${port.repo}@${port.revision}/${port.path}`;
  const allParts = Object.values(port.assets).flat();
  window.gameDownloadSizes = Object.fromEntries(allParts.map(part => [part.name.split('/').pop(), part.size]));
  const total = allParts.reduce((sum, part) => sum + part.size, 0);
  const files = new Map();
  let completed = 0;
  for (const [name, parts] of Object.entries(port.assets)) {
   const result = await window.gameAssets.merge({
    type: name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.webm') ? 'video/webm' : 'application/octet-stream',
    parts: parts.map(part => ({ url: base + part.name, backup: backup + part.name, size: part.size })),
    onProgress(loaded) {
     status.textContent = 'downloading content ' + ((completed + loaded) / 1048576).toFixed(1) + '/' + (total / 1048576).toFixed(1) + 'mb';
    }
   });
   files.set(name, result.url);
   completed += parts.reduce((sum, part) => sum + part.size, 0);
  }
  status.textContent = 'starting game…';
  function matches(value, name) {
   const url = new URL(value instanceof Request ? value.url : String(value), location.href);
   return decodeURIComponent(url.origin + url.pathname).endsWith('/' + name);
  }
  function mapped(value) {
   for (const [name, url] of files) if (matches(value, name)) return url;
   for (const [name, url] of Object.entries(port.remote || {})) if (matches(value, name)) return url;
   return value;
  }
  window.fetch = (input, options) => {
   const text = port.textAssets?.find(name => matches(input, name));
   if (text) return Promise.resolve(new Response(files.get(text), { headers: { 'Content-Type': 'text/plain' } }));
   const url = mapped(input);
   return nativeFetch(input instanceof Request && url !== input ? new Request(url, input) : url, options);
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
   return nativeOpen.call(this, method, mapped(url), ...rest);
  };
  if (typeof HTMLMediaElement !== 'undefined' && Object.keys(port.remote || {}).length) {
   const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
   Object.defineProperty(HTMLMediaElement.prototype, 'src', { ...descriptor, set(value) {
    this.crossOrigin = 'anonymous';
    descriptor.set.call(this, mapped(value));
   } });
  }
  const canvas = document.getElementById('canvas');
  if (port.kind === 'legacy') {
   const data = [...files].find(([name]) => name.endsWith('.data.unityweb'));
   const asm = [...files].find(([name]) => name.endsWith('.asm.code.unityweb'));
   if (data) window.dataUrll = data[1];
   if (asm) window.asmUrll = asm[1];
   UnityLoader.instantiate('unityContainer', port.configUrl, { onProgress(instance, progress) {
    if (progress >= 1) { if (!port.nativeSaves) persist(instance.Module); ready(); }
   } });
  } else if (port.kind === 'unity') {
   const prefix = 'Build/' + port.executable;
   const instance = await createUnityInstance(canvas, window.gamePerformance.unity({
    dataUrl: files.get(prefix + '.data') || files.get(prefix + '.data.gz'),
    codeUrl: files.get(prefix + '.wasm') || files.get(prefix + '.wasm.gz'),
    frameworkUrl: (port.runtimeBase || '') + prefix + '.framework.js', streamingAssetsUrl: base + 'StreamingAssets',
    companyName: port.title, productName: port.title, productVersion: '1'
   }));
   persist(instance.Module);
   ready();
  } else if (port.kind === 'godot') {
   const sizes = Object.fromEntries(Object.entries(port.assets).map(([name, parts]) => [name, parts.reduce((sum, part) => sum + part.size, 0)]));
   const engine = new Engine({ executable: port.executable, canvas, canvasResizePolicy: 2, fileSizes: sizes, focusCanvas: true, args: [], persistentPaths: ['/userfs'], ensureCrossOriginIsolationHeaders: false });
   await engine.startGame();
   document.getElementById('loading-text')?.remove();
   ready();
  } else if (port.kind === 'gamemaker') {
   await script('index.js');
   const print = Module.print;
   Module.print = function(...args) {
    print.apply(this, args);
    if (args[0] === 'Entering main loop.') { persist(Module); ready(); }
   };
   Module.locateFile = name => files.get(name) || name;
   await script('runner.js');
  } else throw Error('Unsupported game runtime.');
 } catch (error) {
  overlay.hidden = false;
  status.textContent = error.message || String(error);
  retry.hidden = false;
  parent.postMessage({ velocify: 'game-error' }, location.origin);
 }
})();
