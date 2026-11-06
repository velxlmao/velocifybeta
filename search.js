"use strict";
function search(input, template) {
 input = input.trim();
 try {
  if (!/^[^/\s]+:\d+(?:[/?#]|$)/.test(input)) return new URL(input).toString();
 } catch {}
 try {
  const url = new URL(input.startsWith('//') ? 'https:' + input : 'https://' + input);
  if (url.hostname.includes('.') || url.hostname === 'localhost' || url.hostname.startsWith('[')) return url.toString();
 } catch {}
 if (template.startsWith('e:')) template = atob(template.slice(2).split('').reverse().join(''));
 return template.replace('%s', encodeURIComponent(input));
}
