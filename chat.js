"use strict";
(() => {
 const $ = id => document.getElementById(id);
 const list = $('chat-messages'), input = $('chat-input'), name = $('chat-name');
 let suspended = false, started = false, registered = false, banned = false;
 let browserToken;
 try { browserToken = localStorage.getItem('velocify-browser-token'); } catch {}
 if (!browserToken || !/^[a-zA-Z0-9-]{64,128}$/.test(browserToken)) { browserToken = crypto.randomUUID() + crypto.randomUUID(); try { localStorage.setItem('velocify-browser-token', browserToken); } catch {} }
 let socket, reconnect, retry = 0, ownId = '', visible = false, ready = false, pending = '', sentAt = 0;
 let owner = false, ttlSeconds = 0, clockOffset = 0, moderating = false, moderationTimer;
 const messages = new Map();
 try { name.value = localStorage.getItem('velocify-chat-name') || ''; } catch {}
 function send(data) { socket.send(JSON.stringify({ ...data, token: browserToken })); }
 function passwordPrompt() {
  const owner = name.value.trim().toLowerCase() === 'velx';
  $('chat-password-wrap').hidden = !owner;
  $('chat-password').required = owner;
  if (!owner) $('chat-password').value = '';
 }
 passwordPrompt();
 name.addEventListener('input', passwordPrompt);
 function error(text = '') { $('chat-error').textContent = text; $('chat-error').hidden = !text; }
 function controls() {
  $('chat-send').disabled = banned || !ready || !!pending || !input.value.trim();
  input.disabled = banned || !ready;
  $('chat-owner-tools').hidden = !ready || !owner;
  window.dispatchEvent(new CustomEvent('velx-owner-state', { detail: ready && owner }));
  $('chat-clear').disabled = moderating || !messages.size;
  $('chat-expiry').disabled = moderating || !ready;
  $('chat-clear').textContent = moderating ? 'updating…' : 'clear chat';
  for (const button of list.querySelectorAll('.chat-delete')) button.disabled = moderating || !ready;
  $('chat-status').textContent = ready ? 'connected' : socket?.readyState === WebSocket.OPEN ? 'set your name to chat' : socket?.readyState === WebSocket.CONNECTING ? 'connecting…' : 'disconnected';
 }
 function render() {
  const follow = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
  list.replaceChildren();
  if (!messages.size) { const empty = document.createElement('p'); empty.className = 'chat-empty'; empty.textContent = 'no messages yet'; list.append(empty); }
  for (const message of messages.values()) {
   const row = document.createElement('article'); row.className = 'chat-message';
   if (message.authorId === ownId) row.classList.add('own');
   const heading = document.createElement('header'), author = document.createElement('strong'), time = document.createElement('time'), text = document.createElement('p');
   author.textContent = message.name; time.dateTime = new Date(message.time).toISOString(); time.textContent = new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
   text.textContent = message.text; heading.append(author);
   if (message.owner === true) { const badge = document.createElement('span'); badge.className = 'chat-owner'; badge.textContent = 'owner'; heading.append(badge); }
   heading.append(time);
   if (owner && ready) {
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'chat-delete'; remove.textContent = 'delete';
    remove.setAttribute('aria-label', 'delete message from ' + message.name);
    remove.disabled = moderating;
    remove.addEventListener('click', () => moderate({ type: 'delete-message', id: message.id }));
    heading.append(remove);
   }
   row.append(heading, text); list.append(row);
  }
  if (follow) list.scrollTop = list.scrollHeight;
 }
 function expireMessages() {
  if (!ttlSeconds) return;
  let changed = false;
  for (const [id, message] of messages) if (message.time + ttlSeconds * 1000 <= Date.now() + clockOffset) { messages.delete(id); changed = true; }
  if (changed) { render(); controls(); }
 }
 function retention() {
  const [seconds, unit] = [[86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']].find(([seconds]) => ttlSeconds % seconds === 0);
  const count = ttlSeconds / seconds, label = count + ' ' + unit + (count === 1 ? '' : 's');
  $('chat-retention').textContent = ttlSeconds ? 'messages auto-delete ' + label + ' after sending' : 'auto-delete is off';
  const select = $('chat-expiry');
  if (![...select.options].some(option => Number(option.value) === ttlSeconds)) {
   const option = document.createElement('option'); option.value = String(ttlSeconds); option.textContent = label; select.append(option);
  }
  select.value = String(ttlSeconds);
 }
 function finishedModeration() { clearTimeout(moderationTimer); moderating = false; controls(); }
 function moderate(data) {
  if (!ready || !owner || moderating || socket?.readyState !== WebSocket.OPEN) return;
  moderating = true; error(); controls();
  try {
   send(data);
   moderationTimer = setTimeout(() => { finishedModeration(); error('Chat update was not confirmed. Reconnect and check before retrying.'); }, 10000);
  } catch { finishedModeration(); error('Could not update chat. Reconnect and try again.'); }
 }
 function connect() {
  if (!started || suspended || socket && socket.readyState < WebSocket.CLOSING) return;
  clearTimeout(reconnect);
  socket = new WebSocket('wss://velocify-public-chat.realdashvr.workers.dev/connect');
  const connection = socket;
  controls();
  socket.onopen = () => { retry = 0; registered = false; try { const saved = localStorage.getItem('velocify-browser-token'); if (saved && /^[a-zA-Z0-9-]{64,128}$/.test(saved)) browserToken = saved; } catch {} send({ type: 'hello' }); controls(); };
  socket.onmessage = event => {
   try {
    const data = JSON.parse(event.data);
    if (data.type === 'registration-required') { registered = false; send({ type: 'hello' }); return; }
    if (data.type === 'ban-state') {
     const first = !registered; registered = true; banned = data.chatBanned || data.siteBanned;
     window.dispatchEvent(new CustomEvent('velx-ban-state', { detail: data }));
     if (banned) { pending = ''; messages.clear(); render(); }
     if (first && !banned && name.value.trim() && (name.value.trim().toLowerCase() !== 'velx' || $('chat-password').value)) setName();
     controls();
    }
    if (data.type === 'visitors' || data.type === 'ban-updated') window.dispatchEvent(new CustomEvent('velx-ban-response', { detail: data }));
    if (data.type === 'history') {
     window.dispatchEvent(new CustomEvent('velx-announcements', { detail: data.announcements || [] }));
     messages.clear(); for (const message of data.messages) messages.set(message.id, message);
     ttlSeconds = data.ttlSeconds || 0;
     if (Number.isFinite(data.serverTime)) clockOffset = data.serverTime - Date.now();
     finishedModeration(); retention(); expireMessages(); render(); controls();
    }
    if (data.type === 'named') { ownId = data.id; ready = true; owner = data.owner === true; name.value = data.name; error(); render(); controls(); }
    if (data.type === 'announcement') window.dispatchEvent(new CustomEvent('velx-announcements', { detail: data.announcement ? [data.announcement] : [] }));
    if (data.type === 'announcement-sent' || data.type === 'announcement-cleared') window.dispatchEvent(new CustomEvent('velx-announcement-sent', { detail: data.type }));
    if (data.type === 'message') {
     if (!messages.has(data.message.id) && data.message.authorId !== ownId) window.dispatchEvent(new CustomEvent('velx-chat-notification', { detail: data.message }));
     messages.set(data.message.id, data.message);
     while (messages.size > 100) messages.delete(messages.keys().next().value);
     if (data.message.authorId === ownId && pending) { pending = ''; input.value = ''; error(); }
     render(); controls();
    }
    if (data.type === 'error') {
     window.dispatchEvent(new CustomEvent('velx-ban-error', { detail: data.error }));
     window.dispatchEvent(new CustomEvent('velx-announcement-error', { detail: data.error })); pending = ''; finishedModeration(); retention(); error(data.error); controls(); }
   } catch { error('Could not read a chat update.'); }
  };
  socket.onclose = () => {
   if (socket !== connection) return;
   registered = false; ready = false; owner = false; finishedModeration(); render();
   if (pending) { pending = ''; error('Connection lost. Your message is still in the box.'); }
   controls();
   if (!suspended) { reconnect = setTimeout(connect, Math.min(30000, 1000 * 2 ** retry++)); }
  };
  socket.onerror = () => error('Could not connect. Retrying…');
 }
 function setName() {
  const value = name.value.trim();
  if (!value || value.length > 24) { error('Choose a name between 1 and 24 characters.'); return; }
  try { localStorage.setItem('velocify-chat-name', value); } catch {}
  if (registered && !banned && socket?.readyState === WebSocket.OPEN) { ready = false; owner = false; render(); send({ type: 'name', name: value, password: value.toLowerCase() === 'velx' ? $('chat-password').value : undefined }); controls(); }
  else connect();
 }
 $('chat-name-form').addEventListener('submit', event => { event.preventDefault(); setName(); });
 $('chat-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!ready || pending || !input.value.trim()) return;
  if (Date.now() - sentAt < 1500) { error('Wait a moment before sending again.'); return; }
  pending = input.value.trim(); sentAt = Date.now();
  try { send({ type: 'message', text: pending }); controls(); }
  catch { pending = ''; error('Message not sent. Reconnect and try again.'); controls(); }
 });
 input.addEventListener('input', controls);
 $('chat-clear').addEventListener('click', () => { if (owner && ready && confirm('delete all messages in public chat? this cannot be undone.')) moderate({ type: 'clear-chat' }); });
 $('chat-expiry').addEventListener('change', () => moderate({ type: 'set-expiry', seconds: Number($('chat-expiry').value) }));
 setInterval(() => { if (visible) expireMessages(); }, 1000);
 input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } });
 window.addEventListener('velx-chat-open', () => { visible = true; expireMessages(); connect(); });
 window.addEventListener('velx-chat-close', () => { visible = false; });
 window.addEventListener('online', connect);
 window.addEventListener('pageshow', () => { suspended = false; connect(); });
 window.addEventListener('velx-send-announcement', event => {
  if (!ready || !owner || socket?.readyState !== WebSocket.OPEN) { window.dispatchEvent(new CustomEvent('velx-announcement-error', { detail: 'Sign in as owner to send announcements.' })); return; }
  try { send({ type: 'announcement', title: event.detail.title, body: event.detail.body }); }
  catch { window.dispatchEvent(new CustomEvent('velx-announcement-error', { detail: 'Connection lost. Reconnect before sending.' })); }
 });
 window.addEventListener('velx-clear-announcement', () => {
  if (!ready || !owner || !registered || socket?.readyState !== WebSocket.OPEN) { window.dispatchEvent(new CustomEvent('velx-announcement-error', { detail: 'Sign in as owner first.' })); return; }
  try { send({ type: 'clear-announcement' }); }
  catch { window.dispatchEvent(new CustomEvent('velx-announcement-error', { detail: 'Connection lost. Reconnect before clearing.' })); }
 });
 window.addEventListener('velx-ban-command', event => {
  if (!ready || !owner || !registered || socket?.readyState !== WebSocket.OPEN) { window.dispatchEvent(new CustomEvent('velx-ban-error', { detail: 'Sign in as owner first.' })); return; }
  try { send(event.detail); }
  catch { window.dispatchEvent(new CustomEvent('velx-ban-error', { detail: 'Connection lost. Reconnect and refresh.' })); }
 });
 window.addEventListener('pagehide', () => { suspended = true; visible = false; clearTimeout(reconnect); socket?.close(1000); });
 render(); controls();
 Promise.resolve(window.startupReady).then(ok => { if (ok !== false) { started = true; connect(); } });
})();
