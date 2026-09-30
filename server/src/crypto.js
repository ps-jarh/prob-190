// Hashing, AES-256-GCM storage encryption, simulated DSC (ECDSA P-256), PDF helpers.
const c=require('crypto'),zlib=require('zlib');
const sha=b=>c.createHash('sha256').update(b).digest('hex');
const KEY=c.createHash('sha256').update(process.env.FILE_KEY||'dev-only-key-change-me').digest();
const enc=b=>{const iv=c.randomBytes(12),k=c.createCipheriv('aes-256-gcm',KEY,iv),ct=Buffer.concat([k.update(b),k.final()]);return Buffer.concat([iv,k.getAuthTag(),ct])};
const dec=b=>{try{const d=c.createDecipheriv('aes-256-gcm',KEY,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()])}catch{return null}};
const P1363='ieee-p1363'; // WebCrypto-compatible signature encoding (for the offline verifier)
function sign(h){const{privateKey,publicKey}=c.generateKeyPairSync('ec',{namedCurve:'P-256'});return{signature:c.sign('sha256',Buffer.from(h),{key:privateKey,dsaEncoding:P1363}).toString('hex'),publicKey:publicKey.export({type:'spki',format:'pem'})}}
const verify=(h,sig,pem)=>{try{return c.verify('sha256',Buffer.from(h),{key:pem,dsaEncoding:P1363},Buffer.from(sig,'hex'))}catch{return false}};
function mkPdf(t){const pg=t.split('\f'),o=[];o[1]='<</Type/Catalog/Pages 2 0 R>>';o[2]='<</Type/Pages/Kids['+pg.map((_,i)=>(4+i*2)+' 0 R').join(' ')+']/Count '+pg.length+'>>';o[3]='<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>';
 pg.forEach((p,i)=>{const ls=p.match(/.{1,88}(\s|$)/g)||[''],s='BT/F1 11 Tf 14 TL 50 780 Td '+ls.map(l=>'('+l.trim().replace(/[^\x20-\x7e]/g,'?').replace(/([()\\])/g,'\\$1')+') Tj T*').join(' ')+' ET';o[4+i*2]='<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents '+(5+i*2)+' 0 R>>';o[5+i*2]='<</Length '+s.length+'>>\nstream\n'+s+'\nendstream'});
 let out='%PDF-1.4\n',off=[];for(let i=1;i<o.length;i++){off[i]=out.length;out+=i+' 0 obj\n'+o[i]+'\nendobj\n'}const x=out.length;
 out+='xref\n0 '+o.length+'\n0000000000 65535 f \n'+off.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<</Size '+o.length+'/Root 1 0 R>>\nstartxref\n'+x+'\n%%EOF';return Buffer.from(out,'latin1')}
function pdfText(b){const s=b.toString('latin1'),re=/stream\r?\n([\s\S]*?)\r?\nendstream/g,pages=[];let m;while(m=re.exec(s)){let t=m[1];if(!/BT/.test(t)){try{t=zlib.inflateSync(Buffer.from(m[1],'latin1')).toString('latin1')}catch{continue}}if(!/BT/.test(t))continue;const r=[];t.replace(/\(((?:\\.|[^\\)])*)\)\s*Tj/g,(_,x)=>r.push(x.replace(/\\(.)/g,'$1')));pages.push(r.join(' '))}return pages.join('\f')}
const isPdf=b=>b.length>8&&b.subarray(0,5).toString()=='%PDF-';
module.exports={sha,enc,dec,sign,verify,mkPdf,pdfText,isPdf};
