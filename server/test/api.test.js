const {test,before,after}=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const {newDb}=require('pg-mem'),createApp=require('../src/app'),seed=require('../src/seed'),{mkPdf}=require('../src/crypto');
let srv,base,T={};const api=async(m,p,t,b)=>{const r=await fetch(base+p,{method:m,headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j}};
const login=async id=>{const a=(await api('POST','/api/auth/login',null,{user_id:id})).j,r=await api('POST','/api/auth/mfa',null,{challenge:a.challenge,code:a.simulated_mfa_code});return r.j.token};
before(async()=>{const db=newDb(),pool=new(db.adapters.createPg().Pool)();for(const s of fs.readFileSync(path.join(__dirname,'../src/schema.sql'),'utf8').split(';\n').filter(x=>x.trim()))await pool.query(s);
 const app=createApp(pool);await seed(pool,app.svc);srv=app.listen(0);base='http://localhost:'+srv.address().port;for(const u of['u1','u2','u3','u4','u5','u6','u7','u8'])T[u]=await login(u)});
after(()=>srv.close());
const pdf=t=>mkPdf(t).toString('base64');
test('MFA rejects a wrong code',async()=>{const a=(await api('POST','/api/auth/login',null,{user_id:'u1'})).j;assert.equal((await api('POST','/api/auth/mfa',null,{challenge:a.challenge,code:'000000'})).s,401)});
test('case isolation: each IO sees only their own case; cross-case access is denied and audited',async()=>{
 assert.deepEqual((await api('GET','/api/cases',T.u1)).j.map(c=>c.id),['C-1024']);assert.deepEqual((await api('GET','/api/cases',T.u8)).j.map(c=>c.id),['C-2047']);
 const a=await api('GET','/api/cases/C-1024/documents',T.u8);assert.equal(a.s,403);const b=await api('GET','/api/documents/D-001/versions/1/content',T.u8);assert.equal(b.s,403);assert.equal(b.j.matched_policy,'P-03');
 const au=(await api('GET','/api/audit',T.u6)).j;assert.ok(au.some(e=>e.decision=='DENY'&&e.actor.startsWith('Insp. B. Khan')&&e.target.startsWith('D-001')));assert.ok(au.filter(e=>e.decision=='DENY').length>=4)});
test('upload rejects non-PDF; accepts PDF and records the SHA-256',async()=>{
 assert.equal((await api('POST','/api/cases/C-1024/documents',T.u1,{title:'x',file_b64:Buffer.from('hello').toString('base64')})).s,400);
 const r=await api('POST','/api/cases/C-1024/documents',T.u1,{title:'New Exhibit',classification:'Restricted',file_b64:pdf('Exhibit list. Synthetic.')});assert.equal(r.s,201);T.doc=r.j;
 assert.equal((await api('POST','/api/cases/C-1024/documents',T.u8,{title:'x',file_b64:pdf('x')})).s,403)});
test('V2 needs a reason; previous version becomes superseded; lifecycle with maker-checker ends fully green',async()=>{
 assert.equal((await api('POST',`/api/documents/${T.doc.doc_id}/versions`,T.u1,{file_b64:pdf('v2')})).s,400);
 const v2=await api('POST',`/api/documents/${T.doc.doc_id}/versions`,T.u1,{reason:'Added page numbers',file_b64:pdf('Exhibit list v2. Synthetic.')});assert.equal(v2.s,201);
 assert.equal((await api('POST',`/api/versions/${T.doc.version_id}/advance`,T.u1)).s,409);const id=v2.j.id;
 assert.equal((await api('POST',`/api/versions/${id}/advance`,T.u1)).j.state,'Under Review');
 const bad=await api('POST',`/api/versions/${id}/advance`,T.u1);assert.equal(bad.s,403);assert.match(bad.j.reason,/Supervising Officer/);
 assert.equal((await api('POST',`/api/versions/${id}/advance`,T.u2)).j.state,'Approved');assert.equal((await api('POST',`/api/versions/${id}/advance`,T.u1)).j.state,'Signed');
 const c=(await api('GET',`/api/versions/${id}/trust-card`,T.u1)).j;assert.ok(c.integrity&&c.signature_valid&&c.timestamp.token_valid&&c.authoritative)});
test('Tamper Challenge: one altered byte fails integrity, then Restore fixes it',async()=>{
 const d=(await api('GET','/api/cases/C-1024/documents',T.u1)).j.find(x=>x.id=='D-001'),v1=(await api('GET','/api/versions/1/trust-card',T.u1)).j;assert.ok(v1.integrity);
 const t=await api('POST','/api/demo/tamper',T.u1,{kind:'file'});assert.equal(t.j.doc_id,'D-001');const bad=(await api('GET',`/api/versions/${t.j.version_id}/trust-card`,T.u1)).j;assert.equal(bad.integrity,false);assert.match(bad.integrity_detail,/altered/);
 assert.equal((await api('GET','/api/documents/D-001/versions/1/content',T.u1)).s,500);await api('POST','/api/demo/restore',T.u1);assert.ok((await api('GET',`/api/versions/${t.j.version_id}/trust-card`,T.u1)).j.integrity)});
test('audit chain: editing one row breaks the chain and reports that exact row',async()=>{
 assert.equal((await api('GET','/api/audit/verify',T.u6)).j.ok,true);const t=(await api('POST','/api/demo/tamper',T.u1,{kind:'audit'})).j;
 const v=(await api('GET','/api/audit/verify',T.u6)).j;assert.equal(v.ok,false);assert.equal(v.broken_row,t.row);await api('POST','/api/demo/restore',T.u1);assert.equal((await api('GET','/api/audit/verify',T.u6)).j.ok,true)});
test('AI search never cites documents the user cannot view, and reports hidden count',async()=>{
 const r=(await api('POST','/api/search',T.u4,{q:'Where was the accused seen near the office?'})).j;const cited=r.answers.map(a=>a.doc_id);
 assert.ok(!cited.includes('D-002'),'Draft/under-review witness statement must not be cited to a prosecutor');assert.ok(!cited.some(id=>['D-007','D-008'].includes(id)));assert.ok(r.hidden_count>=1&&r.notice);
 const io=(await api('POST','/api/search',T.u1,{q:'Where was the accused seen near the office?'})).j;assert.ok(io.answers.some(a=>a.doc_id=='D-002'))});
test('ledger: anchored blocks, valid Merkle inclusion proof, tamper invalidates it; ledger OFF keeps verification working',async()=>{
 const l=(await api('GET','/api/ledger',T.u1)).j;assert.ok(l.blocks.length>=4&&JSON.parse(l.blocks[0].endorsements).length==4);const p=(await api('GET','/api/ledger/proof/5',T.u1)).j;assert.equal(p.valid,true);
 const t=(await api('POST','/api/demo/tamper',T.u1,{kind:'audit'})).j;const pe=(await api('GET',`/api/ledger/proof/${t.row}`,T.u1)).j;if(pe.event_id)assert.equal(pe.valid,false);await api('POST','/api/demo/restore',T.u1);
 assert.equal((await api('PUT','/api/settings/ledger',T.u7,{enabled:false})).j.enabled,false);const c=(await api('GET','/api/versions/1/trust-card',T.u1)).j;assert.ok(c.integrity&&c.signature_valid&&(await api('GET','/api/audit/verify',T.u6)).j.ok)});
test('share capsule create/revoke and public verify',async()=>{
 const s=await api('POST','/api/shares',T.u1,{version_id:1,recipient:'High Court Registry (external)',permission:'view-only',expires_in_hours:24,watermark_text:'CONFIDENTIAL'});assert.equal(s.s,201);assert.match(s.j.watermark_id,/^WM-/);
 assert.equal((await api('POST','/api/shares',T.u8,{version_id:1,recipient:'x'})).s,403);assert.equal((await api('DELETE','/api/shares/'+s.j.id,T.u1)).j.revoked,true);
 const h=(await api('GET','/api/versions/1/trust-card',T.u1)).j.sha256;assert.equal((await api('GET','/api/public/verify/'+h)).j.status,'authentic');assert.equal((await api('GET','/api/public/verify/deadbeef')).j.status,'unknown')});
