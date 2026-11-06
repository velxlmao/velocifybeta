"use strict";
(() => {
 const $ = id => document.getElementById(id);
 const panel = $('moderation-panel'), popup = $('announcement-window'), queue = [];
 let welcomed = !document.getElementById('welcome');
 document.getElementById('welcome')?.addEventListener('close', () => { welcomed = true; pump(); });
 let owner = false, sending = false, timeout, current, active, expiryTimer;
 let seen = new Set();
 try { seen = new Set(JSON.parse(localStorage.getItem('velx-announcements-seen') || '[]')); } catch {}
 function pump() {
  if (globalThis.navigator?.locks) navigator.locks.request('velx-announcement-display', showNext).catch(() => {});
  else showNext();
 }
 function showNext() {
  if (document.body.classList.contains('site-banned') || !welcomed || popup.open || !queue.length || document.hidden || !document.getElementById('startup').hidden || document.querySelector('dialog[open]')) return;
  try { for (const id of JSON.parse(localStorage.getItem('velx-announcements-seen') || '[]')) seen.add(id); } catch {}
  while (queue.length && (seen.has(queue[0].id) || queue[0].expiresAt <= Date.now())) queue.shift();
  if (!queue.length) return;
  current = queue.shift();
  $('announcement-heading').textContent = current.title;
  $('announcement-content').textContent = current.body;
  popup.showModal();
  seen.add(current.id);
  try { localStorage.setItem('velx-announcements-seen', JSON.stringify([...seen].slice(-200))); } catch {}
 }
 popup.addEventListener('close', () => {
  current = null;
  pump();
 });
 window.addEventListener('velx-announcements', event => {
  const item = event.detail.at(-1);
  active = item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string' && Number.isFinite(item.expiresAt) && item.expiresAt > Date.now() ? item : null;
  queue.splice(0);
  if (current && current.id !== active?.id) { current = null; if (popup.open) popup.close(); }
  if (active && !seen.has(active.id) && current?.id !== active.id) queue.push(active);
  clearTimeout(expiryTimer);
  if (active) expiryTimer = setTimeout(() => window.dispatchEvent(new CustomEvent('velx-announcements', { detail: [] })), Math.max(1, active.expiresAt - Date.now()));
  $('announcement-clear').disabled = !owner || sending || !active;
  pump();
 });
 document.addEventListener('visibilitychange', pump);
 panel.addEventListener('close', pump);
 Promise.resolve(window.startupReady).then(pump);
 window.addEventListener('storage', event => {
  if (event.key !== 'velx-announcements-seen') return;
  try { seen = new Set(JSON.parse(event.newValue || '[]')); } catch {}
  for (let i = queue.length - 1; i >= 0; i--) if (seen.has(queue[i].id)) queue.splice(i, 1);
 });
 window.addEventListener('velx-chat-notification', event => {
  if (document.body.classList.contains('site-banned') || document.getElementById('chat-page').classList.contains('chat-banned')) return;
  const message = event.detail, toast = document.createElement('article'), open = document.createElement('button'), close = document.createElement('button');
  const author = document.createElement('strong'), body = document.createElement('span');
  author.textContent = message.name; body.textContent = message.text;
  open.className = 'chat-toast-open'; open.append(author, body); open.setAttribute('aria-label', 'open global chat, message from ' + message.name);
  close.textContent = '×'; close.setAttribute('aria-label', 'dismiss notification');
  toast.className = 'chat-toast'; toast.append(open, close);
  let timer;
  const remove = () => { clearTimeout(timer); toast.remove(); };
  const expire = () => { clearTimeout(timer); timer = setTimeout(remove, 7000); };
  open.addEventListener('click', () => { if ($('chat-page').hidden) $('nav-chat').click(); remove(); });
  close.addEventListener('click', remove);
  toast.addEventListener('pointerenter', () => clearTimeout(timer)); toast.addEventListener('pointerleave', expire);
  toast.addEventListener('focusin', () => clearTimeout(timer)); toast.addEventListener('focusout', expire);
  const stack = $('chat-notifications'); stack.append(toast);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  expire();
 });
 function finish(error = '') {
  clearTimeout(timeout); sending = false;
  $('announcement-send').disabled = !owner;
  $('announcement-clear').disabled = !owner || !active;
  $('announcement-send').textContent = 'send announcement';
  $('announcement-error').textContent = error; $('announcement-error').hidden = !error;
 }
 window.addEventListener('velx-owner-state', event => {
  owner = event.detail === true;
  $('announcement-clear').disabled = !owner || sending || !active;
  $('moderation-tab').hidden = !owner;
  if (!owner) { if (panel.open) panel.close(); if (sending) finish('Owner connection lost.'); }
 });
 $('moderation-tab').addEventListener('click', () => { if (owner) panel.showModal(); });
 $('announcement-action').addEventListener('click', () => { $('announcement-form').hidden = false; $('announcement-title').focus(); });
 $('announcement-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!owner || sending) return;
  const title = $('announcement-title').value.trim(), body = $('announcement-body').value.trim();
  if (!title || !body) { finish('Enter a title and body.'); return; }
  sending = true; $('announcement-send').disabled = true; $('announcement-send').textContent = 'sending…';
  $('announcement-error').hidden = true; $('announcement-clear').disabled = true;
  timeout = setTimeout(() => finish('Send was not confirmed. Reconnect and check before retrying.'), 10000);
  window.dispatchEvent(new CustomEvent('velx-send-announcement', { detail: { title, body } }));
 });
 $('announcement-clear').addEventListener('click', () => {
  if (!owner || sending || !active) return;
  sending = true; $('announcement-send').disabled = true; $('announcement-clear').disabled = true;
  $('announcement-error').hidden = true;
  timeout = setTimeout(() => finish('Clear was not confirmed. Refresh before retrying.'), 10000);
  window.dispatchEvent(new Event('velx-clear-announcement'));
 });
 window.addEventListener('velx-announcement-error', event => { if (sending) finish(event.detail); });
 window.addEventListener('velx-announcement-sent', () => {
  if (!sending) return;
  finish(); $('announcement-form').reset(); panel.close(); pump();
 });
})();
