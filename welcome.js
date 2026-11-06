"use strict";
(() => {
 const dialog = document.getElementById('welcome');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 async function open() {
  if (await window.startupReady === false) return;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  setTimeout(() => { if (!document.body.classList.contains('site-banned')) dialog.showModal(); }, reduced.matches ? 0 : 450);
 }
 dialog.addEventListener('pointermove', event => {
  if (reduced.matches || event.pointerType === 'touch') return;
  const rect = dialog.getBoundingClientRect();
  dialog.style.setProperty('--tilt-x', ((.5 - (event.clientY - rect.top) / rect.height) * 5) + 'deg');
  dialog.style.setProperty('--tilt-y', (((event.clientX - rect.left) / rect.width - .5) * 5) + 'deg');
 });
 function reset() { dialog.style.setProperty('--tilt-x', '0deg'); dialog.style.setProperty('--tilt-y', '0deg'); }
 dialog.addEventListener('pointerleave', reset);
 dialog.addEventListener('close', reset);
 open();
})();
