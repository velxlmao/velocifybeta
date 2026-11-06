"use strict";
(() => {
 let dataPromise;
 async function parts(prefix,count,key) {
  const paths = Array.from({length:count},(_,index) => window.__CDN_BASE+prefix+'.part'+(index+1));
  return window.gameAssets.fromPaths(paths,{type:key === 'wasm' ? 'application/wasm' : 'application/octet-stream',onProgress(loaded,total) { window.setAssetBar?.(key,loaded,total); }});
 }
 window.__loadMergedData = () => dataPromise ||= parts('gd_web.data',16,'data').then(result => { window.forceDataDone?.(); return result.blob; });
 window.__loadMergedWasm = () => parts('gd_web.wasm',4,'wasm').then(result => result.blob);
})();
