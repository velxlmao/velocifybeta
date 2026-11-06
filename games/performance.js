"use strict";
(() => {
 const constrained = /CrOS/.test(navigator.userAgent || '') || navigator.deviceMemory <= 4 || navigator.hardwareConcurrency <= 4;
 const nativeRatio = window.devicePixelRatio || 1;
 const ratio = () => Math.min(nativeRatio, 1, Math.sqrt((constrained ? 960 * 540 : 1280 * 720) / Math.max(1, innerWidth * innerHeight)));
 window.gamePerformance = { constrained, ratio, unity(config) {
  return { ...config, devicePixelRatio: ratio(), webglContextAttributes: { ...config.webglContextAttributes, antialias: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' } };
 } };
 if (constrained) { try { Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: ratio }); } catch {} }
 const getContext = HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext = function(type, options) {
  if (/^(webgl2?|experimental-webgl)$/.test(type)) options = { ...options, antialias: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  return getContext.call(this, type, options);
 };
})();
