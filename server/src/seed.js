// Synthetic data only. No real personal data.
const {mkPdf}=require('./crypto'),A=require('./audit');
const USERS=[['u1','Insp. A. Rao','Investigating Officer','Police'],['u2','DSP M. Iyer','Supervising Officer','Police'],['u3','Dr. S. Nair','Forensic Analyst','Forensics'],['u4','Adv. K. Menon','Prosecutor','Prosecution'],['u5','R. Das','Court Clerk','Court'],['u6','P. Sen','Auditor','Audit Cell'],['u7','Sys Admin','System Admin','IT'],['u8','Insp. B. Khan','Investigating Officer','Police'],['u9','Insp. C. Reddy','Investigating Officer','Police']];
const CASES=[['C-1024','Synthetic cyber-fraud matter','FIR 0412/2026','CNR-SIM-000123','u1'],['C-2047','Synthetic vehicle-theft matter','FIR 0177/2026','CNR-SIM-000456','u8'],['C-3312','Synthetic land-fraud matter','FIR 0921/2026','CNR-SIM-000789','u9']];
const ASG={'C-1024':['u1','u2','u3','u4','u5'],'C-2047':['u8','u2','u3','u5'],'C-3312':['u9','u2','u4','u5']},S=['Under Review','Approved','Signed'];
const DOCS=[['D-001','C-1024','First Information Report','Restricted','fir',['FIR No. 0412/2026 (synthetic). Complainant reports unauthorised transfer of funds on 3 March.\fThe transfer was initiated from an unknown IP address at night.'],S,'u1'],
['D-002','C-1024','Witness Statement W-1','Confidential','statement',['Witness saw the accused near the office at 9 PM on the night of the transfer.','Witness saw the accused near the office at 11 PM on the night of the transfer and noticed a parked van.'],S.slice(0,1),'u1'],
['D-003','C-1024','Forensic Report FR-7','Confidential','forensic',['Forensic imaging of the seized laptop found login traces matching the unknown IP address.'],S.slice(0,2),'u1'],
['D-004','C-1024','Charge Sheet (draft)','Confidential','chargesheet',['Draft charge sheet: accused faces charges of unauthorised access and fraud.'],[],'u1'],
['D-005','C-1024','Court Filing CF-2','Restricted','court',['Application for remand extension filed before the magistrate.'],S.slice(0,1),'u1'],
['D-006','C-1024','Victim Statement V-1','Victim-Sensitive','statement',['Ms. Asha Verma states her phone 9876543210 was cloned. Her ID 1234 5678 9012 was misused. She lives at 12 Sample Road, Sim-Nagar.'],S.slice(0,2),'u1'],
['D-007','C-2047','First Information Report','Restricted','fir',['FIR No. 0177/2026 (synthetic). Complainant reports theft of a two-wheeler from a public parking area.'],S,'u8'],
['D-008','C-2047','Witness Statement W-1','Confidential','statement',['Witness saw two persons pushing a red scooter near the parking gate at dawn.'],S.slice(0,1),'u8'],
['D-009','C-2047','Forensic Report FR-2','Confidential','forensic',['Tool marks on the recovered ignition assembly are consistent with forced entry.'],[],'u8'],
['D-010','C-3312','First Information Report','Restricted','fir',['FIR No. 0921/2026 (synthetic). Complainant alleges a forged sale deed was used to transfer a plot.'],S.slice(0,2),'u9'],
['D-011','C-3312','Charge Sheet (draft)','Confidential','chargesheet',['Draft charge sheet: accused faces charges of forgery and cheating.'],[],'u9'],
['D-012','C-3312','Victim Statement V-1','Victim-Sensitive','statement',['Mr. Ravi Kumar states his phone 9123456780 was used for a fake OTP. His ID 4321 8765 2109 was misused. He lives at 45 Sample Road, Sim-Nagar.'],S.slice(0,2),'u9']];
module.exports=async function seed(db,svc){if((await db.query('select count(*) as c from users')).rows[0].c*1>0)return;const us={};
 for(const u of USERS){await db.query('insert into users values($1,$2,$3,$4)',u);us[u[0]]={id:u[0],name:u[1],role:u[2],org:u[3]}}
 for(const c of CASES)await db.query('insert into cases values($1,$2,$3,$4,$5)',c);for(const c in ASG)for(const u of ASG[c])await db.query('insert into case_assignments values($1,$2)',[c,u]);
 for(const[id,cid,title,cls,kind,texts,states,by]of DOCS){await db.query('insert into documents values($1,$2,$3,$4,$5)',[id,cid,title,cls,kind]);const w=us[by];let v;
  for(let i=0;i<texts.length;i++){v=await svc.addVersion(id,mkPdf(texts[i]),w.name,i?'Witness corrected the time of sighting after re-interview':'');await A.log(db,`${w.name} (${w.role})`,i?'new_version':'upload',`${id} v${i+1}`,'ALLOW','sha256 '+v.sha256.slice(0,12),cid)}
  for(const s of states){const row=(await db.query('select * from document_versions where id=$1',[v.id])).rows[0];await svc.setState(row,{id,case_id:cid},s,s=='Approved'?us.u2:w)}}
 const d=id=>({id,case_id:DOCS.find(x=>x[0]==id)[1],classification:DOCS.find(x=>x[0]==id)[3],kind:DOCS.find(x=>x[0]==id)[4]});
 for(const[u,id]of[['u7','D-001'],['u4','D-004'],['u3','D-006'],['u1','D-001'],['u3','D-003'],['u5','D-006'],['u8','D-001']])await svc.decide(us[u],d(id),'view')};
module.exports.USERS=USERS;
