import {ReactNode,useEffect,useState} from 'react';import {api} from './api';
export const Sim=()=><span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-900">Simulated</span>;
export const Card=({children,className=''}:{children:ReactNode,className?:string})=><div className={`mb-3 rounded-lg border border-slate-300 bg-white p-3 ${className}`}>{children}</div>;
export const Btn=({ghost,danger,...p}:any)=><button {...p} className={`rounded px-3 py-1 text-sm font-medium disabled:opacity-50 ${danger?'bg-red-700 text-white':ghost?'border border-blue-900 text-blue-900':'bg-blue-900 text-white'}`}/>;
export const Chip=({s}:{s:string})=><span className="rounded-full border border-slate-400 px-2 text-xs">{s}</span>;
export const Ok=({v}:{v:boolean|null})=>v===null?<span className="text-slate-500">not signed</span>:v?<b className="text-green-700">✅ valid</b>:<b className="text-red-700">❌ invalid</b>;
export const Deny=({d}:{d:any})=>d?<Card className="!border-2 !border-red-600"><h3 className="font-bold text-red-700">⛔ Access denied</h3><p>Matched policy <b>{d.matched_policy}</b>{d.policy_text?': '+d.policy_text:''}</p><p>Reason: {d.reason||d.error}</p><p className="text-xs text-slate-500">Why am I seeing this? The Policy Engine made this decision and it was written to the audit chain.</p></Card>:null;
export function useGet(path:string){const[s,set]=useState<{status:number,data:any}|null>(null);const load=()=>{api('GET',path).then(set)};useEffect(load,[path]);return[s,load] as const}
