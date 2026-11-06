export const BLOCK=4096;
export function pack(frames){
 const size=2+frames.reduce((n,f)=>n+4+f.byteLength,0);
 if(frames.length>128||size>1048576)throw Error('batch too large');
 const out=new Uint8Array(Math.ceil(size/BLOCK)*BLOCK);
 const view=new DataView(out.buffer);view.setUint16(0,frames.length);
 let offset=2;
 for(const frame of frames){view.setUint32(offset,frame.byteLength);offset+=4;out.set(frame,offset);offset+=frame.byteLength;}
 crypto.getRandomValues(out.subarray(offset));return out;
}
export function unpack(bytes){
 if(bytes.byteLength%BLOCK||bytes.byteLength>1048576)throw Error('invalid batch');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const count=view.getUint16(0);if(count>128)throw Error('invalid count');
 const frames=[];let offset=2;
 for(let i=0;i<count;i++){if(offset+4>bytes.length)throw Error('invalid frame');const size=view.getUint32(offset);offset+=4;if(offset+size>bytes.length)throw Error('invalid frame');frames.push(bytes.slice(offset,offset+size));offset+=size;}
 return frames;
}
function nonce(direction,sequence){const iv=new Uint8Array(12);const v=new DataView(iv.buffer);v.setUint32(0,direction);v.setBigUint64(4,BigInt(sequence));return iv;}
export async function seal(key,direction,sequence,frames){return crypto.subtle.encrypt({name:'AES-GCM',iv:nonce(direction,sequence)},key,pack(frames));}
export async function open(key,direction,sequence,bytes){return unpack(new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce(direction,sequence)},key,bytes)));}
export function batcher(deliver,fail){
 let frames=[],size=0,timer=null,chain=Promise.resolve(),queued=0,closed=false;
 function flush(){clearTimeout(timer);timer=null;if(closed||!frames.length)return;const batch=frames;frames=[];size=0;chain=chain.then(()=>closed?undefined:deliver(batch)).catch(fail).finally(()=>{queued-=batch.reduce((n,f)=>n+f.byteLength,0);});}
 return {push(bytes){if(closed)return;bytes=new Uint8Array(bytes).slice();queued+=bytes.byteLength;if(queued>33554432){fail(Error('connection overloaded'));return;}if(size+bytes.byteLength+4>65536||frames.length===128)flush();frames.push(bytes);size+=bytes.byteLength+4;if(!timer)timer=setTimeout(flush,8);},close(){closed=true;clearTimeout(timer);frames=[];},get buffered(){return queued;}};
}
