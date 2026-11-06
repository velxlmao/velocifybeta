"use strict";
(() => {
 const lines = [
  "velocify on top",
  "check out public chat!",
  "check out xyfer aswell",
  "velocify tops aether",
  "velx says hi",
  "evil velx 4000",
  "😭😭🥀🥀✌️",
  "monkey monkey monkey",
  "@velocitylx",
  "linewize sucks",
  "goguardian more like noguardian 😭🙏"
];
 const captions = document.querySelectorAll('.rotating-caption');
 function render(caption, line) {
  const split = line.search(/\p{Extended_Pictographic}/u);
  const copy = document.createElement('span'), emoji = document.createElement('span');
  copy.className = 'caption-copy'; emoji.className = 'caption-emoji';
  copy.textContent = split < 0 ? line : line.slice(0, split);
  emoji.textContent = split < 0 ? '' : line.slice(split);
  caption.replaceChildren(copy, emoji);
 }
 let index = 0;
 setInterval(() => {
  if (document.hidden) return;
  for (const caption of captions) caption.classList.add('caption-changing');
  setTimeout(() => {
   index = (index + 1) % lines.length;
   for (const caption of captions) {
    render(caption, lines[index]);
    caption.classList.remove('caption-changing');
   }
  }, 300);
 }, 2000);
})();
