import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR=path.join(here,"cache","assets");
const pending=new Map();

export function cachePath(id){return path.join(CACHE_DIR,`${id}.glb`)}
export async function isCached(id){try{const s=await fs.stat(cachePath(id));return s.size>128}catch{return false}}

export async function ensureCached(id,asset){
  if(await isCached(id)) return cachePath(id);
  if(pending.has(id)) return pending.get(id);
  const job=(async()=>{
    await fs.mkdir(CACHE_DIR,{recursive:true});
    const response=await fetch(asset.source,{headers:{"User-Agent":"EscapeForge/1.0"}});
    if(!response.ok) throw new Error(`remote ${response.status} ${response.statusText}`);
    const type=response.headers.get("content-type")||"";
    if(!type.includes("model/gltf-binary")&&!type.includes("application/octet-stream")){
      console.warn(`Unexpected content type for ${id}: ${type}`);
    }
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length<128) throw new Error("asset response was too small");
    const tmp=cachePath(id)+".tmp";
    await fs.writeFile(tmp,bytes);
    await fs.rename(tmp,cachePath(id));
    return cachePath(id);
  })().finally(()=>pending.delete(id));
  pending.set(id,job);return job;
}
