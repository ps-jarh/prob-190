// Serves the built React client (client/dist) from Express when it exists.
const express=require('express'),path=require('path'),fs=require('fs');
module.exports=app=>{const d=path.join(__dirname,'../../client/dist');if(!fs.existsSync(d))return;app.use(express.static(d));app.get(/^\/(?!api).*/,(q,r)=>r.sendFile(path.join(d,'index.html')))};
