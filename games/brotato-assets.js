"use strict";
(() => {
 const base = 'https://raw.githubusercontent.com/velxlmao/velocify-static/b1f4418bfad9db12c74aac595ce0592c52e7c87a/games/brotato/';
 const fetchAsset = window.fetch.bind(window);
 window.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, document.baseURI);
  if (url.origin === location.origin && /\/games\/brotato\/index\.(?:wasm|pck\.part-\d{4})$/.test(url.pathname)) {
   const remote = base + url.pathname.split('/').pop();
   return fetchAsset(typeof input === 'object' && !(input instanceof URL) ? new Request(remote, input) : remote, options);
  }
  return fetchAsset(input, options);
 };
})();
