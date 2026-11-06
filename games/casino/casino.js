'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const api='https://velocify-rooms.realdashvr.workers.dev/';
 const params=new URLSearchParams(location.search);
 let game=params.get('game')==='roulette'?'roulette':'blackjack';
 let code='', token='', state=null, pending=false, timer=null, lastRound='', rotation=0;
 let clockOffset=0;
 const money=c=>'$'+(c/100).toFixed(2);
 const red=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
 const read=key=>{try{return localStorage.getItem(key)||'';}catch{return '';}};
 const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 function theme() { try { const root=parent.document.documentElement; document.documentElement.dataset.theme=root.dataset.theme||''; for(const key of ['--bg','--surface','--border','--text','--muted','--accent']) document.documentElement.style.setProperty(key,getComputedStyle(root).getPropertyValue(key)); } catch {} }
 theme();
 $('title').textContent=game;
 $('name').value=read('velocify-table-name');
 $('code').value=params.get('room')||'';
 for(let n=0;n<=36;n++) { const o=document.createElement('option'); o.value=String(n); o.textContent=String(n); $('choice').append(o); }
 function busy(value) { pending=value; for(const b of document.querySelectorAll('button')) b.disabled=value; if(state) render(); }
 async function request(data,roomCode=code) {
  const response=await fetch(api+roomCode,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data),signal:AbortSignal.timeout(60000)});
  const body=await response.json();
  if(!response.ok) throw Error(body.error||'connection failed');
  return body;
 }
 function apply(next) { if(state && next.serverTime < state.serverTime) return; state=next; token=next.token; clockOffset=next.serverTime-Date.now(); write('velocify-room-'+code,token); render(); }
 async function enter(create) {
  if(pending) return;
  const name=$('name').value.trim();
  if(!name) { $('error').textContent='enter your name'; $('name').focus(); return; }
  code=create?Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join(''):$('code').value.trim().toUpperCase();
  if(!/^[A-Z2-9]{6}$/.test(code)) { $('error').textContent='enter a 6-character room code'; return; }
  token=read('velocify-room-'+code); busy(true); $('error').textContent='connectingâ€¦';
  try {
   const next=await request({action:create?'create':'join',game,name});
   game=next.game; $('title').textContent=game; write('velocify-table-name',name);
   apply(next); $('lobby').hidden=true; $('room').hidden=false; $('error').textContent='';
   clearTimeout(timer); poll();
  } catch(e) { $('error').textContent=e.message; } finally { busy(false); }
 }
 async function poll() {
  timer=setTimeout(async()=>{
   if(!state) return;
   if(!pending) try { const session=token; const next=await request({action:'state'}); if(state&&session===token) { apply(next); $('error').textContent=''; } } catch { $('error').textContent='connection lost. reconnectingâ€¦'; }
   if(state) poll();
  },1500);
 }
 async function act(action,extra={}) {
  if(pending) return;
  busy(true); $('error').textContent='';
  try { apply(await request({action,...extra})); } catch(e) { $('error').textContent=e.message; } finally { busy(false); }
 }
 const shownCards=new Map();
 const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
 const suits=['♠','♥','♦','♣'];
 function svgNode(tag,attrs={},text) {
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value));
  if(text!==undefined) node.textContent=text;
  return node;
 }
 function cardFace(c) {
  const svg=svgNode('svg',{viewBox:'0 0 100 144','aria-hidden':'true'});
  const rank=c%13+1, suit=suits[Math.floor(c/13)];
  for(const rotate of [false,true]) {
   const corner=svgNode('g',rotate?{transform:'rotate(180 50 72)'}:{});
   corner.append(svgNode('text',{x:13,y:23,'font-size':19},ranks[rank-1]),svgNode('text',{x:13,y:42,'font-size':17},suit));
   svg.append(corner);
  }
  if(rank>10) {
   const frame=svgNode('rect',{x:28,y:22,width:44,height:100,rx:3,fill:'none',stroke:'currentColor'}); svg.append(frame);
   for(const rotate of [false,true]) {
    const face=svgNode('g',rotate?{transform:'rotate(180 50 72)'}:{});
    face.append(svgNode('path',{d:'M36 36 L34 25 L43 30 L50 21 L57 30 L66 25 L64 36 Z',fill:'currentColor'}));
    face.append(svgNode('path',{d:'M40 40 Q50 33 60 40 L58 54 Q50 63 42 54 Z',fill:'none',stroke:'currentColor','stroke-width':2}));
    face.append(svgNode('path',{d:'M35 70 Q36 58 45 58 L50 66 L55 58 Q64 58 65 70',fill:'none',stroke:'currentColor','stroke-width':2}));
    face.append(svgNode('text',{x:50,y:49,'font-size':10},rank===12?'Q':rank===13?'K':'J'));
    svg.append(face);
   }
  } else {
   const positions={1:[[50,74]],2:[[50,38],[50,106]],3:[[50,38],[50,72],[50,106]],4:[[34,38],[66,38],[34,106],[66,106]],5:[[34,38],[66,38],[50,72],[34,106],[66,106]],6:[[34,38],[66,38],[34,72],[66,72],[34,106],[66,106]],7:[[34,38],[66,38],[50,55],[34,72],[66,72],[34,106],[66,106]],8:[[34,38],[66,38],[50,55],[34,72],[66,72],[50,89],[34,106],[66,106]],9:[[34,34],[66,34],[34,60],[66,60],[50,72],[34,86],[66,86],[34,112],[66,112]],10:[[34,34],[66,34],[50,47],[34,60],[66,60],[34,86],[66,86],[50,99],[34,112],[66,112]]};
   for(const [x,y] of positions[rank]) svg.append(svgNode('text',{x,y:y+7,'font-size':rank===1?42:22,transform:y>72?'rotate(180 '+x+' '+y+')':''},suit));
  }
  return svg;
 }
 function cards(hand,id) {
  const row=document.createElement('div'); row.className='cards';
  hand.forEach((c,i)=>{
   const key=state.round+':'+id+':'+i;
   const card=document.createElement('div'); card.className='card';
   const label=c===null?'face-down card':ranks[c%13]+' of '+['spades','hearts','diamonds','clubs'][Math.floor(c/13)];
   card.setAttribute('role','img'); card.setAttribute('aria-label',label);
   if(!shownCards.has(key)) { card.classList.add('dealt'); card.style.animationDelay=(i*140)+'ms'; }
   else if(shownCards.get(key)===null&&c!==null) card.classList.add('revealed');
   shownCards.set(key,c);
   if(c===null) { card.classList.add('card-back'); card.textContent='v'; }
   else { if([1,2].includes(Math.floor(c/13))) card.classList.add('card-red'); card.append(cardFace(c)); }
   row.append(card);
  });
  return row;
 }
 function total(hand) {
  if(hand.includes(null)) return '?';
  let value=hand.reduce((sum,c)=>sum+Math.min(c%13+1,10),0);
  for(const c of hand) if(c%13===0&&value+10<=21) value+=10;
  return value>21?'bust ('+value+')':value===21?'21':String(value);
 }
 function line(parent,text,tag='p') { const el=document.createElement(tag); el.textContent=text; parent.append(el); return el; }
 function render() {
  if(!state) return;
  const me=state.players.find(p=>p.you);
  const dealer=state.players.find(p=>p.dealer);
  const turn=state.players.find(p=>p.id===state.turnId);
  const betting=state.phase==='betting', idle=['waiting','result'].includes(state.phase);
  $('room-code').textContent='room '+code;
  $('balance').textContent='your balance '+money(me.balance);
  $('choice-label').hidden=game!=='roulette'; $('wheel').hidden=game!=='roulette'; $('dealer').hidden=game!=='blackjack'; $('shoe').hidden=game!=='blackjack';
  $('deck-count').textContent=state.remaining+' cards';
  $('play').hidden=!me.host||!idle; $('play').textContent=state.phase==='result'?'play next round':'play';
  $('play').disabled=pending||state.players.filter(p=>p.online).length<2;
  $('deal').hidden=!me.host||!betting; $('deal').textContent=game==='roulette'?'spin wheel':'deal cards'; $('deal').disabled=pending||!state.players.some(p=>p.bet);
  $('bet-form').hidden=!betting||me.dealer;
  $('bet').disabled=pending||!betting||me.bet>0||me.maxBet<100;
  $('amount').disabled=pending||!betting||me.bet>0; $('amount').max=(me.maxBet/100).toFixed(2);
  $('choice').disabled=pending||!betting||me.bet>0;
  $('cancel-bet').hidden=!betting||!me.bet;
  const playing=game==='blackjack'&&state.turnId===me.id&&['playing','dealer'].includes(state.phase);
  for(const id of ['hit','stand']) $(id).hidden=!playing;
  const value=me.hand.length?Number(total(me.hand)):0;
  $('hit').disabled=pending||(me.dealer&&value>=17); $('stand').disabled=pending||(me.dealer&&value<17);
  $('hit').textContent='hit · draw a card'; $('stand').textContent='stand · keep hand';
  $('refill').hidden=me.balance>=100||!idle; $('refill').disabled=pending;
  $('bet-help').textContent=betting?(me.dealer?'you cover the other players’ bets this round':me.bet?'your bet: '+money(me.bet):'maximum bet: '+money(me.maxBet)):'';
  const host=state.players.find(p=>p.host);
  let help='';
  if(idle) help=me.host?(state.players.filter(p=>p.online).length<2?'copy invite and bring a friend. then click play.':'click play to choose a random dealer and open betting.'):'waiting for '+(host?.name||'the host')+' to click play.';
  if(betting) help=game==='blackjack'?(me.dealer?'you are the dealer. players bet against your '+money(me.balance)+' balance.':'dealer: '+dealer.name+'. place your bet, then '+(me.host?'click deal cards.':'wait for the host to deal.')):'place your bet, then '+(me.host?'click spin wheel.':'wait for the host to spin.');
  if(state.phase==='playing') help=playing?'your turn. hit to draw, or stand to keep your total.':turn.name+' is playing. '+(me.dealer?'you play after everyone else.':'wait for your turn.');
  if(state.phase==='dealer') help=playing?'your turn as dealer. draw below 17, stand at 17 or higher.':dealer.name+' is playing the dealer hand.';
  if(state.phase==='result') help=(me.result?me.result+'. ':'')+(me.host?'click play next round when everyone is ready.':'waiting for the host to start the next round.');
  $('instruction').textContent=help;
  $('table-note').textContent=game==='blackjack'?'blackjack pays 3:2 · dealer draws to 17 · pushes return your bet':'single zero · colors / odd / even pay 1:1 · numbers pay 35:1';
  $('dealer').replaceChildren();
  if(game==='blackjack') {
   line($('dealer'),dealer?dealer.name+(dealer.you?' (you)':'')+' · dealer':'dealer chosen when host clicks play','strong');
   if(dealer?.hand.length) { $('dealer').append(cards(dealer.hand,dealer.id)); line($('dealer'),'total '+total(dealer.hand)); }
   else line($('dealer'),betting?'waiting for bets':'invite a friend to the table','p').className='muted';
  }
  if(game==='roulette'&&state.phase==='result'&&lastRound!==String(state.round)) { lastRound=String(state.round); rotation+=1080+(state.number/37)*360; $('wheel-ring').style.transform='rotate('+rotation+'deg)'; $('number').textContent=state.number; $('number').classList.toggle('red',red.includes(state.number)); }
  $('players').replaceChildren();
  for(const p of state.players) {
   const el=document.createElement('article'); el.className='player'+(p.you?' you':'')+(p.id===state.turnId?' turn':'');
   line(el,p.name+(p.you?' (you)':'')+(p.host?' · host':'')+(p.dealer?' · dealer':''),'strong'); line(el,money(p.balance));
   if(p.hand.length&&game==='blackjack'&&!p.dealer) { el.append(cards(p.hand,p.id)); line(el,'total '+total(p.hand)); }
   line(el,p.dealer?'covering the table':p.bet?'bet '+money(p.bet)+(game==='roulette'?' on '+p.choice:''):betting?'has not bet':'');
   const status=state.phase==='result'?p.result:p.id===state.turnId?'playing now':p.done?'standing':!p.online?'away':'';
   line(el,status);
   $('players').append(el);
  }
  countdown();
 }
 function countdown() {
  if(!state)return;
  let text='round '+state.round+' · '+({waiting:'waiting for host',betting:'bets open',playing:'players’ turns',dealer:'dealer’s turn',result:'round complete'}[state.phase]);
  if(state.deadline) text+=' · '+Math.max(0,Math.ceil((state.deadline-Date.now()-clockOffset)/1000))+'s';
  $('phase').textContent=text;
 }
 setInterval(countdown,250);
 $('create').onclick=()=>enter(true);
 $('join').onsubmit=e=>{e.preventDefault();enter(false);};
 $('bet-form').onsubmit=e=>{e.preventDefault();act('bet',{amount:Math.round(Number($('amount').value)*100),choice:$('choice').value});};
 $('play').onclick=()=>act('play'); $('deal').onclick=()=>act('deal'); $('cancel-bet').onclick=()=>act('cancel-bet');
 $('hit').onclick=()=>act('hit'); $('stand').onclick=()=>act('stand'); $('refill').onclick=()=>act('refill');
 $('leave').onclick=async()=>{ if(pending)return; busy(true); try { await request({action:'leave'}); clearTimeout(timer); state=null; token=''; shownCards.clear(); $('room').hidden=true; $('lobby').hidden=false; $('error').textContent=''; } catch(e) { $('error').textContent=e.message; } finally { busy(false); } };
 $('copy').onclick=async()=>{
  const url=new URL(parent.location.href); url.searchParams.delete('u'); url.searchParams.set('table',game); url.searchParams.set('room',code);
  try { await navigator.clipboard.writeText(url.href); $('copy').textContent='copied'; setTimeout(()=>$('copy').textContent='copy invite',1500); } catch { $('error').textContent='share room code '+code; }
 };
 parent.postMessage({velocify:'game-ready'},location.origin);
})();
