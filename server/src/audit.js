// Hash-chained audit log + Merkle batch anchoring on a SIMULATED 4-org permissioned ledger. Never stores document content.
const {sha}=require('./crypto'),ORGS=['Police','Prosecution','Court','Forensics'],BATCH=8;
const eh=e=>sha([e.prev,e.time,e.actor,e.action,e.target,e.decision,e.details].join('|'));
const root=h=>{let l=h;while(l.length>1){const n=[];for(let i=0;i<l.length;i+=2)n.push(sha(l[i]+(l[i+1]||l[i])));l=n}return l[0]};
const proof=(h,i)=>{const p=[];let l=h;while(l.length>1){p.push({h:(i^1)<l.length?l[i^1]:l[i],left:i%2==1});const n=[];for(let j=0;j<l.length;j+=2)n.push(sha(l[j]+(l[j+1]||l[j])));l=n;i>>=1}return p};
const walk=(x,p)=>{for(const s of p)x=sha(s.left?s.h+x:x+s.h);return x};
let lock=Promise.resolve(); // serialises appends in-process; use SELECT ... FOR UPDATE / advisory lock when running several instances
const ledgerOn=async db=>((await db.query("select value from settings where key='ledger'")).rows[0]||{value:'1'}).value!='0';
function log(db,actor,action,target,decision,details,caseId){const w=async()=>{const last=(await db.query('select hash from audit_events order by id desc limit 1')).rows[0],e={time:new Date().toISOString(),actor,action,target,decision,details:details||'',prev:last?last.hash:'GENESIS'};e.hash=eh(e);
 e.id=(await db.query('insert into audit_events(time,actor,action,target,decision,details,case_id,prev_hash,hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id',[e.time,actor,action,target,decision,e.details,caseId||'',e.prev,e.hash])).rows[0].id;
 if(e.id%BATCH==0&&await ledgerOn(db))await anchor(db,e.id);return e};const p=lock.catch(()=>{}).then(w);lock=p;return p}
async function anchor(db,last){const rows=(await db.query('select hash from audit_events where id>$1 and id<=$2 order by id',[last-BATCH,last])).rows.map(r=>r.hash),r=root(rows),prev=(await db.query('select block_hash from ledger_blocks order by block_no desc limit 1')).rows[0],no=(await db.query('select count(*) as c from ledger_blocks')).rows[0].c*1+1,pv=prev?prev.block_hash:'GENESIS',now=new Date().toISOString();
 await db.query('insert into merkle_batches(root,first_event,last_event,block_no) values($1,$2,$3,$4)',[r,last-BATCH+1,last,no]);
 await db.query('insert into ledger_blocks values($1,$2,$3,$4,$5,$6)',[no,r,pv,JSON.stringify(ORGS.map(o=>({org:o,endorsement:sha(o+r).slice(0,16),simulated:true}))),now,sha(pv+r+no)])}
async function verifyChain(db){const rows=(await db.query('select * from audit_events order by id')).rows;let prev='GENESIS';for(const r of rows){const e={prev:r.prev_hash,time:r.time,actor:r.actor,action:r.action,target:r.target,decision:r.decision,details:r.details};if(r.prev_hash!=prev||eh(e)!=r.hash)return{ok:false,broken_row:r.id,events:rows.length};prev=r.hash}return{ok:true,broken_row:null,events:rows.length}}
async function inclusion(db,id){const b=(await db.query('select * from merkle_batches where first_event<=$1 and last_event>=$1',[id])).rows[0];if(!b)return null;const rows=(await db.query('select * from audit_events where id>=$1 and id<=$2 order by id',[b.first_event,b.last_event])).rows,r=rows[id-b.first_event],
 leaf=eh({prev:r.prev_hash,time:r.time,actor:r.actor,action:r.action,target:r.target,decision:r.decision,details:r.details}),path=proof(rows.map(x=>x.hash),id-b.first_event);return{event_id:id,block_no:b.block_no,root:b.root,leaf,path,valid:walk(leaf,path)==b.root,simulated_ledger:true}}
module.exports={log,verifyChain,inclusion,eh,ORGS,ledgerOn};
