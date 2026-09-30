const {Pool}=require('pg'),fs=require('fs'),path=require('path'),createApp=require('./app'),seed=require('./seed'),serveClient=require('./static');
(async()=>{const db=new Pool({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@localhost:5432/nyayavault'});
 for(const s of fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8').split(';\n').filter(x=>x.trim()))await db.query(s);
 const app=createApp(db);await seed(db,app.svc);serveClient(app);app.listen(process.env.PORT||4000,()=>console.log('NyayaVault API on :'+(process.env.PORT||4000)+' (prototype, simulated components)'))})();
