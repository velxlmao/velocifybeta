import {seal,open,batcher} from './channel-codec.mjs';
const decode=value=>atob(value.split('').reverse().join(''));
const HOME=decode('==gdlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d');
const PUBLIC=JSON.parse(decode('9JiQBFVQiojIlJCLiYUOxZGSzRWS5ETNBh2SvJXeDlVQtkHR5hHejJnSlpFbqRDNaFVQkFTSQJDNjRHexA3bRVjQk1iWtUDSmZEM2ZXZywWQjdnVtp1M5AHd3gTeHlTcLhje2RHZp1ic3BnRIl1RC1Ebjd1a5gGWqVWULJWc5Y3VwIFUih2SSJXbLZ1XjpVW1V1Mxd3Y391NuZES5o0YzUVL09GTBJVbYFVbGJnb2kWTFR2RjNmVrV2dtNDcSx2ZkNDeDNHT6lUe4V1Z0dTVCFmeRNGVCFTa10COClXSZlWNzd1bsNFUaxGNMdza3JTLTx0XzI3ROlXR5pGdYhTVqlzdrZDOTJnMmd2dlFkTuVjMJ9WNtIVZfVWTj5mWOR3VuVzZxIDRh9lZPNGTnFTRpRXQ0cTawk2TMhmSDVHdNFUaxhGN4YEdRlGVtQ2c6lGUTJ2RZFFexUXWNdURnZXLB1Ga24mR3BVVu1SeY1GbtBTZMpkZol3czclRRpkVXVnZSBzQzEndfZXbyE3UXhTaYVEV41mMhZzaihGczpXLaljW1p1SvNGOadjbsJXWsVWcFtUTIlUQGVnZZVGeBx2c3NWbZVEaaxGV542YrpkZKdkcIZmb3ZVZwAnaydUQTFGODVjax8UTq1WQMFnTKFWODNVYvF0RS5GZjVXUfNXUIBjehFDRPlmNUF1Q49kaiojIuJCLiE0USJiOikHdrJye'));
const NativeSocket=globalThis.WebSocket;
const imported=crypto.subtle.importKey('jwk',PUBLIC,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
let activeSocket;
class SessionSocket extends EventTarget{
 static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
 CONNECTING=0;OPEN=1;CLOSING=2;CLOSED=3;
 binaryType='blob';extensions='';protocol='';onopen=null;onmessage=null;onerror=null;onclose=null;
 constructor(url,protocols){
  super();this.url=String(url);this._state=0;this.sent=0;this.received=0;this.input=Promise.resolve();
  if(!this.url.startsWith(HOME+'/channel/'))throw new DOMException('connection unavailable','SecurityError');
  activeSocket?.close();activeSocket=this;
  this.socket=protocols===undefined?new NativeSocket(this.url):new NativeSocket(this.url,protocols);
  this.socket.binaryType='arraybuffer';
  this.queue=batcher(async frames=>this.socket.send(await seal(this.key,1,this.sent++,frames)),()=>this.fail());
  this.socket.onopen=async()=>{try{const bytes=crypto.getRandomValues(new Uint8Array(32));this.key=await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);const wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP'},await imported,bytes);if(this._state===0)this.socket.send(wrapped);}catch{this.fail();}};
  this.socket.onmessage=event=>{
   this.input=this.input.then(async()=>{
    if(this._state===0){if(!this.key||event.data.byteLength!==1||new Uint8Array(event.data)[0]!==0)throw Error('invalid handshake');this._state=1;this.protocol=this.socket.protocol;this.dispatchEvent(new Event('open'));return;}
    if(this._state!==1)return;
    for(const bytes of await open(this.key,2,this.received++,event.data))this.dispatchEvent(new MessageEvent('message',{data:this.binaryType==='arraybuffer'?bytes.buffer:new Blob([bytes]),origin:new URL(this.url).origin}));
   }).catch(()=>this.fail());
  };
  this.socket.onerror=()=>this.fail();
  this.socket.onclose=event=>{this.queue.close();this._state=3;this.dispatchEvent(new CloseEvent('close',{code:event.code,reason:event.reason,wasClean:event.wasClean}));};
 }
 dispatchEvent(event){const result=super.dispatchEvent(event);this['on'+event.type]?.call(this,event);return result;}
 get readyState(){return this._state;}
 get bufferedAmount(){return this.queue.buffered+this.socket.bufferedAmount;}
 send(data){if(this._state!==1)throw new DOMException('connection not open','InvalidStateError');if(data instanceof ArrayBuffer)this.queue.push(new Uint8Array(data));else if(ArrayBuffer.isView(data))this.queue.push(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));else throw new TypeError('binary messages required');}
 close(code=1000,reason=''){if(this._state>=2)return;this._state=2;this.queue.close();this.socket.close(code,reason);}
 fail(){if(this._state>=2)return;this.dispatchEvent(new Event('error'));this.close();}
}
if(NativeSocket&&!globalThis.__notesSocket){globalThis.WebSocket=SessionSocket;globalThis.__notesSocket=true;}
