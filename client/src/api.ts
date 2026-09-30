let token='';export const setToken=(t:string)=>{token=t}; // kept in memory only: signing out or reloading ends the session
export async function api(method:string,path:string,body?:unknown):Promise<{status:number,data:any}>{
 const r=await fetch('/api'+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});let data:any=null;try{data=await r.json()}catch{}return{status:r.status,data}}
export const fileToB64=async(f:File)=>{const b=new Uint8Array(await f.arrayBuffer());let s='';b.forEach(x=>s+=String.fromCharCode(x));return btoa(s)};
