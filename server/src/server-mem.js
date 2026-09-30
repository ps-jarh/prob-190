// Runs the full API on an in-memory Postgres emulator (pg-mem): no database needed. For demos/tests only.
const {newDb}=require('pg-mem'),fs=require('fs'),path=require('path'),createApp=require('./app'),seed=require('./seed'),serveClient=require('./static');
(async()=>{const pool=new(newDb().adapters.createPg().Pool)();for(const s of fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8').split(';\n').filter(x=>x.trim()))await pool.query(s);
 const app=createApp(pool);await seed(pool,app.svc);serveClient(app);app.listen(process.env.PORT||4000,()=>console.log('NyayaVault API (in-memory DB) on :'+(process.env.PORT||4000)))})();
