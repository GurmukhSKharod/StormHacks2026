import express from "express";
import path from "node:path";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {ASSETS} from "./assetCatalog.js";
import {ensureCached,isCached} from "./assetCache.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const app=express();
const PORT=Number(process.env.PORT||3001);

app.get("/api/health",(req,res)=>res.json({ok:true,renderer:"browser-threejs",backend:"express"}));
app.get("/api/assets/catalog",(req,res)=>res.json(Object.fromEntries(Object.entries(ASSETS).map(([id,a])=>[id,{id,name:a.name,url:`/api/assets/${id}`}]))));
app.get("/api/assets/status",async(req,res)=>{
  const entries=await Promise.all(Object.keys(ASSETS).map(async id=>[id,await isCached(id)]));
  const cached=entries.filter(([,v])=>v).length;
  res.json({total:entries.length,cached,items:Object.fromEntries(entries)});
});
app.get("/api/assets/:id",async(req,res)=>{
  const asset=ASSETS[req.params.id];
  if(!asset)return res.status(404).json({error:"unknown asset"});
  try{
    const file=await ensureCached(req.params.id,asset);
    res.setHeader("Content-Type","model/gltf-binary");
    res.setHeader("Cache-Control","public, max-age=31536000, immutable");
    res.sendFile(file);
  }catch(err){
    console.error("asset fetch failed",req.params.id,err.message);
    res.status(502).json({error:"asset fetch failed",id:req.params.id,message:err.message});
  }
});

const dist=path.join(root,"dist");
if(fs.existsSync(dist)){
  app.use(express.static(dist,{maxAge:"1h"}));
  app.use((req,res,next)=>{
    if(req.method!=="GET") return next();
    res.sendFile(path.join(dist,"index.html"));
  });
}else{
  app.get("/",(req,res)=>res.status(503).send("Frontend not built. Run npm run build, or npm run dev."));
}

app.listen(PORT,"127.0.0.1",()=>console.log(`EscapeForge server: http://127.0.0.1:${PORT}`));
