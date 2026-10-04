import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let started=false;
export async function startGame(){
  if(started) return;
  started=true;
  const $ = s => document.querySelector(s);
  const stage=$("#stage"), loading=$("#loading"), start=$("#start"), prompt=$("#prompt"), doorModal=$("#doorModal");
  const storyEl=$("#story"), inventoryEl=$("#inventory"), events=$("#events"), toolStatus=$("#toolStatus");
  const flashMeter=$("#flashMeter"), flashLabel=$("#flashLabel"), uvMeter=$("#uvMeter"), uvLabel=$("#uvLabel");
  const questions=$("#questions"), modalMsg=$("#modalMsg"), win=$("#win");

  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  stage.insertBefore(renderer.domElement,stage.firstChild);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b11);
  scene.fog = new THREE.FogExp2(0x0a1018,.024);

  const camera = new THREE.PerspectiveCamera(68,1,.05,90);
  camera.rotation.order="YXZ";
  camera.position.set(0,1.66,4.3);

  function log(name){
    const e=document.createElement("div");
    e.textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})+" · "+name;
    events.prepend(e); while(events.children.length>15) events.lastChild.remove();
  }
  function rand(a){ return a[Math.floor(Math.random()*a.length)] }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
  function norm(s){ return String(s).trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,"").replace(/\s+/g," ") }

  const staticWorld=new THREE.Group(), dynamicWorld=new THREE.Group(), fx=new THREE.Group();
  scene.add(staticWorld,dynamicWorld,fx);

  const floorMat = new THREE.MeshStandardMaterial({color:0x5a4a3e,roughness:.95});
  const wallMat = new THREE.MeshStandardMaterial({color:0x727a86,roughness:.98});
  const ceilingMat = new THREE.MeshStandardMaterial({color:0x262a31,roughness:.99});
  const woodMat = c => new THREE.MeshStandardMaterial({color:c,roughness:.8});
  const addMesh = (geo,mat,pos,parent=staticWorld) => { const m=new THREE.Mesh(geo,mat); m.position.copy(pos); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m; };

  // room shell
  const roomFloor=addMesh(new THREE.BoxGeometry(16,.18,12),floorMat,new THREE.Vector3(0,-.09,0));
  const backWall=addMesh(new THREE.BoxGeometry(16,5.4,.16),wallMat,new THREE.Vector3(0,2.7,-6),staticWorld);
  const frontWall=addMesh(new THREE.BoxGeometry(16,5.4,.16),wallMat,new THREE.Vector3(0,2.7,6),staticWorld);
  const leftWall=addMesh(new THREE.BoxGeometry(.16,5.4,12),wallMat,new THREE.Vector3(-8,2.7,0),staticWorld);
  const rightWall=addMesh(new THREE.BoxGeometry(.16,5.4,12),wallMat,new THREE.Vector3(8,2.7,0),staticWorld);
  const ceiling=addMesh(new THREE.BoxGeometry(16,.12,12),ceilingMat,new THREE.Vector3(0,5.34,0),staticWorld);

  // base lights
  const hemi = new THREE.HemisphereLight(0x5b77a7,0x161311,.36); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x92aad4,.28); moon.position.set(-7,8,2); scene.add(moon);

  // lightning
  const lightning = new THREE.DirectionalLight(0xcfe2ff,0); lightning.position.set(-5,8,-9); lightning.castShadow=true; lightning.shadow.mapSize.set(512,512); scene.add(lightning);
  let lightningTimer=1.6+Math.random()*3.2, lightningFlash=0;

  // door + terminal
  const doorPivot=new THREE.Group(); doorPivot.position.set(2.4,0,-5.88); staticWorld.add(doorPivot);
  addMesh(new THREE.BoxGeometry(1.8,3.6,.18), woodMat(0x34251d), new THREE.Vector3(.9,1.8,0), doorPivot);
  addMesh(new THREE.SphereGeometry(.08,18,18), new THREE.MeshStandardMaterial({color:0xc2a15b,roughness:.3,metalness:.4}), new THREE.Vector3(1.5,1.6,.14), doorPivot);
  addMesh(new THREE.BoxGeometry(.48,.78,.08), new THREE.MeshStandardMaterial({color:0x202a39,roughness:.28,metalness:.2}), new THREE.Vector3(.58,1.62,.17), doorPivot);
  const terminalScreen=new THREE.Mesh(new THREE.PlaneGeometry(.34,.57), new THREE.MeshStandardMaterial({color:0x4cb9ff, emissive:0x159cff, emissiveIntensity:1.15}));
  terminalScreen.position.set(.58,1.62,.215); doorPivot.add(terminalScreen);


  // windows + 3D blinds
  const windowGlass=[];
  const blindSystems=[];
  function makeWindowSystem(centerX){
    const glassMat = new THREE.MeshStandardMaterial({color:0x101a2a, emissive:0x173761, emissiveIntensity:.18, transparent:true, opacity:.9, roughness:.1});
    const glass = addMesh(new THREE.PlaneGeometry(2.6,1.85), glassMat, new THREE.Vector3(centerX,2.6,-5.905), staticWorld);
    glass.castShadow=false; windowGlass.push(glassMat);
    const group = new THREE.Group(); group.position.set(centerX,2.6,-5.82); staticWorld.add(group);
    const slats=[];
    for(let i=0;i<10;i++){
      const s=addMesh(new THREE.BoxGeometry(2.52,.09,.045), woodMat(0x494239), new THREE.Vector3(0,.78-i*.17,0), group);
      s.castShadow=true; slats.push({mesh:s, baseX:s.position.x, phase:Math.random()*Math.PI*2});
    }
    blindSystems.push({group,slats});
  }
  [-5.0,0,5.0].forEach(makeWindowSystem);

  // ceiling fan + brighter light above it to cast moving shadows
  const fanRoot=new THREE.Group(); fanRoot.position.set(0,4.6,0); staticWorld.add(fanRoot);
  addMesh(new THREE.CylinderGeometry(.12,.12,.46,18), woodMat(0x313844), new THREE.Vector3(0,.03,0), fanRoot);
  for(let i=0;i<4;i++){
    const p=new THREE.Group(); p.rotation.y=i*Math.PI/2; fanRoot.add(p);
    const blade=addMesh(new THREE.BoxGeometry(1.5,.035,.2), woodMat(0x4f443b), new THREE.Vector3(.78,0,0), p);
    blade.castShadow=true;
  }
  const fanBulb = new THREE.PointLight(0xffe0b3,2.35,20,2);
  fanBulb.position.set(0,5.0,0); fanBulb.castShadow=true; fanBulb.shadow.mapSize.set(512,512); fanBulb.shadow.bias=-.0007; scene.add(fanBulb);
  let fanOn=true, fanSpeed=5.2;

  // extra lights: sconces, floor lamp, candles, night lights
  const lightObjects=[];
  function makeSconce(x,z,rotY){
    const g=new THREE.Group(); g.position.set(x,2.25,z); g.rotation.y=rotY; staticWorld.add(g);
    addMesh(new THREE.BoxGeometry(.18,.44,.12), woodMat(0x5d5c60), new THREE.Vector3(0,0,0), g);
    const bulb=addMesh(new THREE.SphereGeometry(.08,14,14), new THREE.MeshStandardMaterial({color:0xffd6a0, emissive:0xffb35c, emissiveIntensity:1.0, roughness:.2}), new THREE.Vector3(0,.05,.09), g);
    const light=new THREE.PointLight(0xffc98d,1.1,9,2); light.position.set(0,.05,.22); light.castShadow=false; g.add(light);
    lightObjects.push({type:"sconce",light,bulb,base:1.1});
    return g;
  }
  makeSconce(-7.55,-1.6,Math.PI/2);
  makeSconce(-7.55,2.2,Math.PI/2);
  makeSconce(7.55,-1.8,-Math.PI/2);
  makeSconce(7.55,2.1,-Math.PI/2);

  const floorLampGroup=new THREE.Group(); floorLampGroup.position.set(6.0,0,3.9); dynamicWorld.add(floorLampGroup);
  addMesh(new THREE.CylinderGeometry(.06,.08,2.0,14), woodMat(0x3e4348), new THREE.Vector3(0,1,0), floorLampGroup);
  addMesh(new THREE.CylinderGeometry(.32,.45,.42,18,1,true), woodMat(0x8c8273), new THREE.Vector3(0,2.12,0), floorLampGroup);
  const floorLampLight = new THREE.PointLight(0xffd4a0,1.0,7,2); floorLampLight.position.set(0,2.0,0); floorLampLight.castShadow=false; floorLampGroup.add(floorLampLight);
  lightObjects.push({type:"lamp",light:floorLampLight,base:1.0});

  function makeCandleCluster(x,z){
    const g=new THREE.Group(); g.position.set(x,0,z); dynamicWorld.add(g);
    for(let i=0;i<3;i++){
      const bx=(i-1)*.18, h=.22+Math.random()*.12;
      addMesh(new THREE.CylinderGeometry(.05,.055,h,12), woodMat(0xe7e0cf), new THREE.Vector3(bx,h/2,0), g);
      const flame=new THREE.Mesh(new THREE.SphereGeometry(.03,10,10), new THREE.MeshBasicMaterial({color:0xffd45a}));
      flame.position.set(bx,h+.05,0); g.add(flame);
      const light=new THREE.PointLight(0xffb96b,.55,2.8,2); light.position.copy(flame.position); g.add(light);
      lightObjects.push({type:"candle",light,flame,base:.55,phase:Math.random()*10});
    }
  }
  makeCandleCluster(-6.0,4.5);
  makeCandleCluster(1.8,-4.9);
  makeCandleCluster(5.6,4.6);

  function makeNightlight(x,z){
    const box=addMesh(new THREE.BoxGeometry(.1,.16,.06), new THREE.MeshStandardMaterial({color:0xe7ebf5, emissive:0x88aaff, emissiveIntensity:.5}), new THREE.Vector3(x,.95,z), staticWorld);
    const light=new THREE.PointLight(0x98aaff,.26,4,2); light.position.set(x,.95,z+.12); light.castShadow=false; scene.add(light);
    lightObjects.push({type:"night",light,box,base:.26});
  }
  makeNightlight(-7.7,5.2); makeNightlight(7.7,5.2);

  // rain / puddle ripples
  const rainCount=220;
  const rainPos=new Float32Array(rainCount*3);
  for(let i=0;i<rainCount;i++){ rainPos[i*3]=(Math.random()*15)-7.5; rainPos[i*3+1]=Math.random()*6+.3; rainPos[i*3+2]=-6.6-Math.random()*3.4; }
  const rainGeo=new THREE.BufferGeometry(); rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos,3));
  const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x89a7dd,size:.034,transparent:true,opacity:.48})); scene.add(rain);
  const ripples=[]; for(let i=0;i<8;i++){ const r=new THREE.Mesh(new THREE.RingGeometry(.08,.1,28),new THREE.MeshBasicMaterial({color:0x7394c8,transparent:true,opacity:0,side:THREE.DoubleSide})); r.rotation.x=-Math.PI/2; r.position.set(-6+Math.random()*12,.012,-5+Math.random()*10); r.userData.t=Math.random()*2; fx.add(r); ripples.push(r); }

  // hanging lamp physics
  const pendantPivot=new THREE.Group(); pendantPivot.position.set(-3.3,5.18,2.1); staticWorld.add(pendantPivot);
  addMesh(new THREE.CylinderGeometry(.018,.018,1.35,10), woodMat(0x2f3238), new THREE.Vector3(0,-.68,0), pendantPivot);
  addMesh(new THREE.ConeGeometry(.36,.3,22,1,true), woodMat(0x6d655b), new THREE.Vector3(0,-1.42,0), pendantPivot).rotation.x=Math.PI;
  const pendantLight=new THREE.PointLight(0xffd09a,.5,6,2); pendantLight.position.set(0,-1.28,0); pendantPivot.add(pendantLight);
  lightObjects.push({type:"pendant",light:pendantLight,base:.5});
  let pendX=0, pendZ=0, pendVX=0, pendVZ=0;

  // story pools
  const pools={
    title:["Blackout","Storm Watch","Signal Loss","Last Occupant","After the Surge"],
    blood:["MARA","IRIS","NOAH","LUCAS","EVE","JONAH","ELIA"],
    tv:["CHANNEL NINE","BLACKWATER","NORTH LINE","RED SIGNAL","SECTOR FOUR","MIDNIGHT"],
    uv:["RAVEN","EMBER","STATIC","TEMPEST","HOLLOW","ECHO"],
    underGlass:["DON'T LOOK UP","WAIT FOR THUNDER","OPEN THE LOCKBOX","TURN OFF THE FAN","TRUST THE WEB"],
    web:["SPIDER","WATCHER","CREEP","CEILING","ATTIC","THREAD"],
    lockbox:["BRASS","STATION","MIRROR","LOCKED","HARBOR","HUNTER"]
  };
  let story=null;

  // fast local texture enhancement — intentionally no TensorFlow / neural model at runtime.
  // This preserves V3's generated surface look without making the browser run inference.
  async function enhanceCanvas(canvas){
    const out=document.createElement("canvas");
    out.width=canvas.width*2; out.height=canvas.height*2;
    const ox=out.getContext("2d");
    ox.imageSmoothingEnabled=true; ox.imageSmoothingQuality="high";
    ox.filter="contrast(1.15) saturate(1.08) brightness(1.02)";
    ox.drawImage(canvas,0,0,out.width,out.height);
    return out;
  }

  function noiseTextureCanvas(w,h,base1,base2,mode){
    const c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d");
    const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,base1); g.addColorStop(1,base2); x.fillStyle=g; x.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){
      const a=Math.random()*0.08; x.fillStyle=`rgba(${80+Math.random()*80},${70+Math.random()*80},${60+Math.random()*80},${a})`;
      x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3);
    }
    if(mode==="walls"){
      for(let i=0;i<120;i++){
        const y=Math.random()*h; x.strokeStyle=`rgba(30,30,30,${.06+Math.random()*.08})`; x.lineWidth=1+Math.random()*2;
        x.beginPath(); x.moveTo(0,y); x.lineTo(w,y+Math.random()*20-10); x.stroke();
      }
      for(let i=0;i<30;i++){
        const sx=Math.random()*w, sy=Math.random()*h; x.strokeStyle="rgba(20,20,20,.15)"; x.lineWidth=2;
        x.beginPath(); x.moveTo(sx,sy); for(let k=0;k<5;k++) x.lineTo(sx+Math.random()*60-30, sy+Math.random()*60-30); x.stroke();
      }
    } else if(mode==="floor"){
      for(let i=0;i<50;i++){
        const y=i*(h/50); x.strokeStyle=`rgba(40,20,10,${.12+Math.random()*.06})`; x.lineWidth=2; x.beginPath(); x.moveTo(0,y+Math.random()*4); x.lineTo(w,y+Math.random()*4); x.stroke();
      }
      for(let i=0;i<100;i++){
        x.fillStyle=`rgba(20,20,20,${.05+Math.random()*.08})`; x.beginPath(); x.arc(Math.random()*w,Math.random()*h,2+Math.random()*20,0,Math.PI*2); x.fill();
      }
    }
    return c;
  }
  async function applyEnhancedSurfaceTextures(){
    const floorCanvas=await enhanceCanvas(noiseTextureCanvas(384,384,"#5e4b3b","#3d322a","floor"));
    const wallCanvas=await enhanceCanvas(noiseTextureCanvas(384,384,"#7b838d","#59616b","walls"));
    const ceilCanvas=await enhanceCanvas(noiseTextureCanvas(320,320,"#30343a","#1f2328","walls"));

    const floorTex=new THREE.CanvasTexture(floorCanvas); floorTex.colorSpace=THREE.SRGBColorSpace; floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping; floorTex.repeat.set(8,6); floorTex.anisotropy=renderer.capabilities.getMaxAnisotropy();
    const wallTex=new THREE.CanvasTexture(wallCanvas); wallTex.colorSpace=THREE.SRGBColorSpace; wallTex.wrapS=wallTex.wrapT=THREE.RepeatWrapping; wallTex.repeat.set(8,3);
    const ceilTex=new THREE.CanvasTexture(ceilCanvas); ceilTex.colorSpace=THREE.SRGBColorSpace; ceilTex.wrapS=ceilTex.wrapT=THREE.RepeatWrapping; ceilTex.repeat.set(6,4);

    floorMat.map=floorTex; floorMat.needsUpdate=true;
    wallMat.map=wallTex; wallMat.needsUpdate=true;
    ceilingMat.map=ceilTex; ceilingMat.needsUpdate=true;
  }

  // helper text generation
  async function makeTextCanvas(lines, style="paper"){
    const c=document.createElement("canvas"); c.width=900; c.height=560; const x=c.getContext("2d");
    x.clearRect(0,0,c.width,c.height);
    if(style==="paper"){ x.fillStyle="#f0dc9f"; x.fillRect(12,12,876,536); x.strokeStyle="#8e7a48"; x.lineWidth=12; x.strokeRect(12,12,876,536); x.fillStyle="#16130e"; }
    if(style==="blood"){ x.fillStyle="#7f0d16"; x.shadowColor="#320008"; x.shadowBlur=16; }
    if(style==="blue"){ x.fillStyle="#89d5ff"; x.shadowColor="#198eff"; x.shadowBlur=30; }
    if(style==="uv"){ x.fillStyle="#ffffff"; x.shadowColor="#b06cff"; x.shadowBlur=14; }
    if(style==="scratch"){ x.fillStyle="#dddddd"; x.shadowBlur=0; }
    if(style==="web"){ x.fillStyle="#dcdcdc"; x.shadowBlur=0; }
    x.textAlign="center"; x.textBaseline="middle";
    lines.forEach((t,i)=>{
      const yy=150+i*150; const size=t.length>11?56:74; x.font=`900 ${size}px system-ui,sans-serif`; x.fillText(t,450,yy);
      if(style==="blood"){ for(let k=0;k<5;k++){ const xx=350+Math.random()*200; x.strokeStyle="#7f0d16"; x.lineWidth=4+Math.random()*6; x.beginPath(); x.moveTo(xx,yy+22); x.lineTo(xx+Math.random()*5-2,yy+45+Math.random()*75); x.stroke(); } }
      if(style==="scratch"){ x.strokeStyle="rgba(255,255,255,.26)"; for(let k=0;k<18;k++){ const sx=250+Math.random()*400, sy=yy-35+Math.random()*70; x.lineWidth=1.2; x.beginPath(); x.moveTo(sx,sy); x.lineTo(sx+30+Math.random()*55,sy+Math.random()*8-4); x.stroke(); } }
    });
    if(style==="web"){
      x.strokeStyle="rgba(255,255,255,.35)";
      for(let i=0;i<10;i++){ x.beginPath(); x.moveTo(60,60); x.lineTo(840,100+i*40); x.stroke(); }
      for(let i=0;i<6;i++){ x.beginPath(); x.arc(100+i*120,150+i*18,50+i*18,Math.PI*.9,Math.PI*1.75); x.stroke(); }
      x.fillStyle="rgba(255,255,255,.8)"; x.font="900 66px system-ui,sans-serif"; x.fillText(lines[0],450,300);
    }
    return await enhanceCanvas(c);
  }
  async function makePlane(lines,style,width,height){
    const ec=await makeTextCanvas(lines,style);
    const tex=new THREE.CanvasTexture(ec); tex.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshStandardMaterial({
      map:tex, transparent:style!=="paper", opacity:style==="uv"?.02:1, side:THREE.DoubleSide,
      emissive:new THREE.Color(style==="blue"?0x1a88d8:style==="uv"?0x8d59eb:style==="blood"?0x240000:0x000000),
      emissiveIntensity:style==="blue"?1.4:style==="uv"?.05:style==="blood"?.15:0,
      roughness:.68
    });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat); plane.castShadow=false; return plane;
  }

  // imported furniture
  const loader=new GLTFLoader();
  const MODELS=[
    {name:"Desk",id:"kenney-desk",size:2.35},
    {name:"Bookcase",id:"kenney-bookcase",size:2.2},
    {name:"Bed",id:"kenney-bed",size:2.55},
    {name:"Coffee Table",id:"kenney-coffee",size:1.9},
    {name:"Sofa",id:"kenney-sofa",size:2.25},
    {name:"Chair",id:"kenney-chair",size:1.6},
    {name:"Side Table",id:"kenney-side-table",size:1.35},
    {name:"Floor Lamp",id:"kenney-floor-lamp",size:1.85},
    {name:"Plant",id:"kenney-plant",size:1.2},
    {name:"Radio",id:"kenney-radio",size:.82}
  ];
  const SLOTS=[
    [-5.5,-4.3,.08],[-2.8,-4.35,.08],[.45,-4.2,.08],[3.4,-4.05,.08],[6.0,-3.85,.08],
    [-5.7,-1.8,1.5],[-2.9,-1.4,.2],[.2,-1.25,.08],[3.35,-1.2,-.2],[6.05,-1.15,-1.4],
    [-5.6,2.0,1.5],[-2.8,2.5,.1],[.25,2.95,.08],[3.25,2.65,.08],[5.95,2.15,-1.3]
  ];
  const dynamicImported=[];
  const colliders=[];

  function disposeObj(o){
    o.traverse(n=>{ n.geometry?.dispose?.(); if(Array.isArray(n.material)) n.material.forEach(m=>m.dispose?.()); else n.material?.dispose?.(); });
  }
  function clearGenerated(){
    for(const o of dynamicImported){ dynamicWorld.remove(o); disposeObj(o); } dynamicImported.length=0;
    colliders.length=0;
  }

  function fallbackBox(slot,w=1.3,h=.9,d=.8,color=0x5f5348){
    const g=new THREE.Group(); g.position.set(slot[0],0,slot[1]); g.rotation.y=slot[2];
    dynamicWorld.add(g); dynamicImported.push(g);
    addMesh(new THREE.BoxGeometry(w,h,d), woodMat(color), new THREE.Vector3(0,h/2,0), g);
    const b=new THREE.Box3().setFromObject(g); colliders.push(b.clone()); return {group:g,box:b};
  }
  function loadModel(spec,slot){
    return new Promise(resolve=>{
      loader.load(`/api/assets/${spec.id}`,gltf=>{
        const group=new THREE.Group(); const root=gltf.scene; group.add(root); dynamicWorld.add(group); dynamicImported.push(group);
        root.updateMatrixWorld(true);
        let b=new THREE.Box3().setFromObject(root); const sz=new THREE.Vector3(); b.getSize(sz);
        root.scale.setScalar(spec.size/(Math.max(sz.x,sz.y,sz.z)||1)); root.updateMatrixWorld(true); b=new THREE.Box3().setFromObject(root);
        const center=new THREE.Vector3(); b.getCenter(center); root.position.x-=center.x; root.position.z-=center.z; root.position.y-=b.min.y;
        root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
        group.position.set(slot[0],0,slot[1]); group.rotation.y=slot[2]; group.updateMatrixWorld(true);
        b=new THREE.Box3().setFromObject(group); colliders.push(b.clone()); resolve({group,box:b});
      },undefined,()=>resolve(fallbackBox(slot)));
    });
  }


  // Small premium asset layer. These do NOT block the room from becoming playable.
  // Only two are loaded per run, and their expensive triangle meshes do not cast dynamic shadows.
  const PREMIUM_MODELS=[
    {name:"FurniMesh Olive Armchair",id:"furni-armchair",size:1.55},
    {name:"FurniMesh Sculptural Coffee Table",id:"furni-coffee-table",size:1.65}
  ];
  const PREMIUM_SLOTS=[[-6.2,-4.55,.05],[-3.8,-4.7,.12],[3.0,-4.55,-.08],[6.15,-4.45,-.1]];
  const premiumImported=[];
  function loadPremiumModel(spec,slot){
    return new Promise(resolve=>{
      let finished=false;
      const done=v=>{ if(finished) return; finished=true; clearTimeout(timer); resolve(v); };
      const timer=setTimeout(()=>done(null),5500);
      loader.load(`/api/assets/${spec.id}`,gltf=>{
        const group=new THREE.Group(), root=gltf.scene; group.add(root);
        root.updateMatrixWorld(true);
        let b=new THREE.Box3().setFromObject(root), sz=new THREE.Vector3(); b.getSize(sz);
        root.scale.setScalar(spec.size/(Math.max(sz.x,sz.y,sz.z)||1)); root.updateMatrixWorld(true);
        b=new THREE.Box3().setFromObject(root); const center=new THREE.Vector3(); b.getCenter(center);
        root.position.x-=center.x; root.position.z-=center.z; root.position.y-=b.min.y;
        root.traverse(o=>{ if(o.isMesh){ o.castShadow=false; o.receiveShadow=true; if(o.material?.map) o.material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy()); } });
        group.position.set(slot[0],0,slot[1]); group.rotation.y=slot[2]; dynamicWorld.add(group); premiumImported.push(group);
        group.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(group));
        log(`premium_asset_loaded: ${spec.name}`); done(group);
      },undefined,()=>{ log(`premium_asset_failed: ${spec.name}`); done(null); });
    });
  }
  async function streamPremiumClutter(){
    for(const o of premiumImported){ dynamicWorld.remove(o); disposeObj(o); }
    premiumImported.length=0;
    const picks=shuffle([...PREMIUM_MODELS]).slice(0,2), slots=shuffle([...PREMIUM_SLOTS]).slice(0,2);
    for(let i=0;i<picks.length;i++){
      await loadPremiumModel(picks[i],slots[i]);
      // Yield between GLB parses so entering the room stays responsive.
      await new Promise(r=>setTimeout(r,180));
    }
  }

  // fixed custom props
  const fixedGroup=new THREE.Group(); dynamicWorld.add(fixedGroup);
  const decorGroup=new THREE.Group(); fixedGroup.add(decorGroup);

  // dresser + drawers
  const dresser=new THREE.Group(); dresser.position.set(-5.9,0,1.4); fixedGroup.add(dresser);
  addMesh(new THREE.BoxGeometry(1.8,1.55,.88), woodMat(0x4e3c32), new THREE.Vector3(0,.775,0), dresser);
  const drawers=[];
  for(let i=0;i<3;i++){
    const d=addMesh(new THREE.BoxGeometry(1.55,.36,.72), woodMat(0x69503f), new THREE.Vector3(0,.42+i*.42,.06), dresser);
    const knob=addMesh(new THREE.SphereGeometry(.046,12,12), new THREE.MeshStandardMaterial({color:0xb29862,roughness:.35,metalness:.45}), new THREE.Vector3(0,.42+i*.42,.43), dresser);
    drawers.push({mesh:d,knob,targetZ:.06,vel:0,open:false,index:i});
  }

  // desk with lockbox and jars
  const deskBase=new THREE.Group(); deskBase.position.set(4.5,0,1.3); fixedGroup.add(deskBase);
  addMesh(new THREE.BoxGeometry(2.2,.12,1.1), woodMat(0x5a493d), new THREE.Vector3(0,1.0,0), deskBase);
  for(const x of [-.95,.95]) for(const z of [-.45,.45]) addMesh(new THREE.BoxGeometry(.1,1.0,.1), woodMat(0x4d3f35), new THREE.Vector3(x,.5,z), deskBase);
  const lockbox=new THREE.Group(); lockbox.position.set(4.5,1.09,1.1); fixedGroup.add(lockbox);
  addMesh(new THREE.BoxGeometry(.7,.32,.5), new THREE.MeshStandardMaterial({color:0x232831,roughness:.35,metalness:.45}), new THREE.Vector3(0,0,0), lockbox);
  const lockboxLid=addMesh(new THREE.BoxGeometry(.72,.08,.52), new THREE.MeshStandardMaterial({color:0x262c35,roughness:.3,metalness:.45}), new THREE.Vector3(0,.2,0), lockbox);
  let lockboxOpen=false, hasBrassKey=false, lockboxNoteVisible=false;
  const jarGroup=new THREE.Group(); jarGroup.position.set(3.7,1.09,1.55); fixedGroup.add(jarGroup);
  for(let j=0;j<2;j++){
    const jar=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.3,18,1,true), new THREE.MeshStandardMaterial({color:0xc4dceb,transparent:true,opacity:.35,roughness:.06}));
    jar.position.set(j*.32,0,0); jar.castShadow=true; jarGroup.add(jar);
    for(let k=0;k<6+j*3;k++){
      const marble=new THREE.Mesh(new THREE.SphereGeometry(.028,10,10), new THREE.MeshStandardMaterial({color:rand([0xd54545,0x4a7ddc,0xe1c34a,0x73c57c]),roughness:.3}));
      marble.position.set(j*.32 + (Math.random()-.5)*.12,-.08+Math.random()*.14,(Math.random()-.5)*.12); jarGroup.add(marble);
    }
  }

  // TV
  const tvGroup=new THREE.Group(); tvGroup.position.set(5.6,2.1,-5.73); fixedGroup.add(tvGroup);
  addMesh(new THREE.BoxGeometry(2.6,1.45,.18), new THREE.MeshStandardMaterial({color:0x15191f,roughness:.35,metalness:.25}), new THREE.Vector3(0,0,0), tvGroup);
  const tvScreenMat=new THREE.MeshStandardMaterial({color:0x06080c,emissive:0x000000,emissiveIntensity:0,roughness:.2});
  const tvScreen=new THREE.Mesh(new THREE.PlaneGeometry(2.28,1.18), tvScreenMat); tvScreen.position.set(0,0,.1); tvGroup.add(tvScreen);
  const tvLight=new THREE.PointLight(0x59c9ff,0,5.5,2); tvLight.position.set(0,0,.7); tvGroup.add(tvLight);
  let tvOn=false;

  // glass on table
  const glassTable=new THREE.Group(); glassTable.position.set(1.8,0,3.0); fixedGroup.add(glassTable);
  addMesh(new THREE.BoxGeometry(1.05,.08,.85), woodMat(0x57483c), new THREE.Vector3(0,.85,0), glassTable);
  for(const x of [-.42,.42]) for(const z of [-.32,.32]) addMesh(new THREE.BoxGeometry(.08,.85,.08), woodMat(0x4c4036), new THREE.Vector3(x,.425,z), glassTable);
  const glassMat=new THREE.MeshStandardMaterial({color:0xbcd7e8,transparent:true,opacity:.34,roughness:.06,metalness:.05});
  const glassCup=new THREE.Mesh(new THREE.CylinderGeometry(.14,.12,.42,20,1,true),glassMat); glassCup.position.set(0,.98,0); glassCup.castShadow=true; glassTable.add(glassCup);
  let glassBroken=false; const shards=[];

  // fuse box
  const fuseBox=new THREE.Group(); fuseBox.position.set(-7.55,1.5,-.2); staticWorld.add(fuseBox);
  addMesh(new THREE.BoxGeometry(.62,.88,.12), new THREE.MeshStandardMaterial({color:0x626970,roughness:.62}), new THREE.Vector3(0,0,0), fuseBox);
  const fuseSwitches=[];
  for(let i=0;i<3;i++){
    const s=addMesh(new THREE.BoxGeometry(.08,.2,.04), new THREE.MeshStandardMaterial({color:0xd1d7e0,roughness:.4}), new THREE.Vector3(-.12+i*.12,.18-i*.2,.09), fuseBox);
    fuseSwitches.push({mesh:s,on:i===0});
  }
  let wallLightsEnabled=true;

  // hollow book & brass key
  const bookShelf=new THREE.Group(); bookShelf.position.set(-2.0,.9,4.8); fixedGroup.add(bookShelf);
  addMesh(new THREE.BoxGeometry(1.2,1.6,.34), woodMat(0x4e4037), new THREE.Vector3(0,.8,0), bookShelf);
  const hollowBook=new THREE.Group(); hollowBook.position.set(-2.0,1.4,4.98); fixedGroup.add(hollowBook);
  const bookBody=addMesh(new THREE.BoxGeometry(.42,.08,.28), new THREE.MeshStandardMaterial({color:0x5b2e2e,roughness:.75}), new THREE.Vector3(0,0,0), hollowBook);
  let bookOpened=false;
  const brassKey=new THREE.Group(); brassKey.position.set(-2.0,1.45,4.98); fixedGroup.add(brassKey); brassKey.visible=false;
  addMesh(new THREE.TorusGeometry(.035,.012,8,16), new THREE.MeshStandardMaterial({color:0xc39d52,roughness:.35,metalness:.7}), new THREE.Vector3(-.05,0,0), brassKey);
  addMesh(new THREE.BoxGeometry(.12,.02,.02), new THREE.MeshStandardMaterial({color:0xc39d52,roughness:.35,metalness:.7}), new THREE.Vector3(.05,0,0), brassKey);

  // remote, flash, UV
  let remoteMesh, flashBody, uvBody;
  function buildHandProps(){
    const flashGroup=new THREE.Group(); flashGroup.position.set(-5.9,1.63,1.42); fixedGroup.add(flashGroup);
    flashBody=addMesh(new THREE.CylinderGeometry(.11,.11,.42,16), new THREE.MeshStandardMaterial({color:0xc4cfdd,roughness:.28,metalness:.18}), new THREE.Vector3(0,0,0), flashGroup); flashBody.rotation.z=Math.PI/2;
    addMesh(new THREE.CylinderGeometry(.08,.12,.14,16), new THREE.MeshStandardMaterial({color:0x232a34,roughness:.35,metalness:.2}), new THREE.Vector3(.22,0,0), flashGroup).rotation.z=Math.PI/2;
    flashBody.userData.pickupGroup=flashGroup;

    const uvGroup=new THREE.Group(); uvGroup.position.set(-5.9,.84,1.75); fixedGroup.add(uvGroup);
    uvBody=addMesh(new THREE.CylinderGeometry(.11,.11,.42,16), new THREE.MeshStandardMaterial({color:0x965dff,roughness:.28,metalness:.18}), new THREE.Vector3(0,0,0), uvGroup); uvBody.rotation.z=Math.PI/2;
    addMesh(new THREE.CylinderGeometry(.08,.12,.14,16), new THREE.MeshStandardMaterial({color:0x232a34,roughness:.35,metalness:.2}), new THREE.Vector3(.22,0,0), uvGroup).rotation.z=Math.PI/2;
    uvBody.userData.pickupGroup=uvGroup;

    const remoteGroup=new THREE.Group(); remoteGroup.position.set(-5.9,.42,1.75); fixedGroup.add(remoteGroup);
    remoteMesh=addMesh(new THREE.BoxGeometry(.16,.045,.42), new THREE.MeshStandardMaterial({color:0x232a33,roughness:.35,metalness:.2}), new THREE.Vector3(0,0,0), remoteGroup);
    for(let i=0;i<6;i++) addMesh(new THREE.CylinderGeometry(.018,.018,.012,10), new THREE.MeshStandardMaterial({color:i===0?0xc74848:0x7f8793,roughness:.5}), new THREE.Vector3((i%2)*.055-.027,.03,Math.floor(i/2)*.07-.12), remoteGroup);
    remoteMesh.userData.pickupGroup=remoteGroup;
  }
  buildHandProps();

  function refreshBaseColliders(){
    colliders.push(new THREE.Box3().setFromObject(dresser));
    colliders.push(new THREE.Box3().setFromObject(deskBase));
    colliders.push(new THREE.Box3().setFromObject(glassTable));
    colliders.push(new THREE.Box3().setFromObject(bookShelf));
  }

  // mirror and spider web
  const mirrorGroup=new THREE.Group(); mirrorGroup.position.set(7.4,2.2,.2); mirrorGroup.rotation.y=-Math.PI/2; staticWorld.add(mirrorGroup);
  addMesh(new THREE.BoxGeometry(1.1,1.45,.06), woodMat(0x4f4238), new THREE.Vector3(0,0,0), mirrorGroup);
  const mirrorSurface=addMesh(new THREE.PlaneGeometry(.92,1.25), new THREE.MeshStandardMaterial({color:0x7b90a8,metalness:.85,roughness:.08}), new THREE.Vector3(0,0,.035), mirrorGroup);
  let spiderWebPlane=null;

  // clue planes
  const clues=[];
  function removeClues(){ for(const p of clues){ p.parent?.remove(p); p.geometry?.dispose?.(); p.material?.dispose?.(); } clues.length=0; }
  let lockboxNotePlane=null;
  let tvClueTextureNeedsUpdate=true;

  // interactive systems
  const interactables=[];
  let activeInteractable=null;
  let hasFlash=false, flashOn=false, flashBattery=100;
  let hasUv=false, uvOn=false, uvSeconds=10;
  let hasRemote=false;

  // flashlight + UV beams
  const flashLight=new THREE.SpotLight(0xe8f0ff,0,18,Math.PI/7,.5,1.15);
  flashLight.castShadow=true; flashLight.shadow.mapSize.set(512,512); flashLight.shadow.bias=-.0006;
  const flashTarget=new THREE.Object3D(); scene.add(flashLight,flashTarget); flashLight.target=flashTarget;
  const uvLight=new THREE.SpotLight(0xb06cff,0,10,Math.PI/8,.5,1.3);
  const uvTarget=new THREE.Object3D(); scene.add(uvLight,uvTarget); uvLight.target=uvTarget;

  // interaction definitions
  for(const d of drawers) interactables.push({mesh:d.mesh, type:"drawer", label:`Drawer ${d.index+1} — press E`, enabled:()=>true, drawer:d});
  interactables.push({mesh:glassCup,type:"glass",label:"Glass — press E to knock it",enabled:()=>!glassBroken});
  interactables.push({mesh:tvScreen,type:"tv",label:"TV — press E",enabled:()=>true});
  interactables.push({mesh:terminalScreen,type:"door",label:"Exit terminal — press E",enabled:()=>true});
  interactables.push({mesh:bookBody,type:"book",label:"Hollow book — press E",enabled:()=>!bookOpened});
  interactables.push({mesh:brassKey.children[0]||brassKey,type:"key",label:"Brass key — press E",enabled:()=>brassKey.visible && !hasBrassKey});
  interactables.push({mesh:lockboxLid,type:"lockbox",label:"Lockbox — press E",enabled:()=>true});
  interactables.push({mesh:remoteMesh,type:"remote",label:"TV remote — press E",enabled:()=>drawers[0].open && remoteMesh.userData.pickupGroup.visible});
  interactables.push({mesh:flashBody,type:"pickup",kind:"flash",label:"Flashlight — press E",enabled:()=>flashBody.userData.pickupGroup.visible});
  interactables.push({mesh:uvBody,type:"pickup",kind:"uv",label:"UV flashlight — press E",enabled:()=>drawers[1].open && uvBody.userData.pickupGroup.visible});
  interactables.push({mesh:mirrorSurface,type:"mirror",label:"Mirror — press E to inspect",enabled:()=>true});
  interactables.push({mesh:fuseSwitches[0].mesh,type:"fuse0",label:"Fuse switches — press E",enabled:()=>true});
  interactables.push({mesh:paintingProxy(),type:"webhint",label:"Spider web corner — press E to inspect",enabled:()=>!!spiderWebPlane});

  function paintingProxy(){ const p=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2), new THREE.MeshBasicMaterial({visible:false})); p.position.set(-7.7,4.85,5.7); staticWorld.add(p); return p; }

  function shatterGlass(){
    if(glassBroken) return; glassBroken=true; glassCup.visible=false; log("glass_broken");
    for(let i=0;i<16;i++){
      const s=new THREE.Mesh(new THREE.TetrahedronGeometry(.045+Math.random()*.06), glassMat.clone());
      const wp=new THREE.Vector3(); glassCup.getWorldPosition(wp); s.position.copy(wp); scene.add(s);
      const v=new THREE.Vector3((Math.random()-.5)*2.4,.9+Math.random()*1.5,(Math.random()-.5)*2.4);
      shards.push({mesh:s,v,life:4+Math.random()*2,spin:new THREE.Vector3(Math.random()*4,Math.random()*4,Math.random()*4)});
    }
  }
  async function updateTVTexture(){
    const c=document.createElement("canvas"); c.width=1024; c.height=520; const x=c.getContext("2d");
    x.fillStyle="#08101b"; x.fillRect(0,0,1024,520);
    for(let i=0;i<2600;i++){ const v=Math.floor(Math.random()*90)+60; x.fillStyle=`rgb(${v},${v},${v})`; x.fillRect(Math.random()*1024,Math.random()*520,2+Math.random()*6,1+Math.random()*3) }
    if(tvOn){
      x.fillStyle="#9ee7ff"; x.shadowColor="#21b7ff"; x.shadowBlur=20; x.textAlign="center"; x.textBaseline="middle"; x.font="900 88px monospace"; x.fillText(story.tv,512,260);
    }
    const ec=await enhanceCanvas(c);
    const tex=new THREE.CanvasTexture(ec); tex.colorSpace=THREE.SRGBColorSpace;
    tvScreenMat.map?.dispose?.(); tvScreenMat.map = tex;
    tvScreenMat.emissive.set(tvOn?0x1a8ec9:0x000000); tvScreenMat.emissiveIntensity = tvOn?1.2:0; tvScreenMat.needsUpdate=true;
    tvLight.intensity = tvOn ? .85 : 0;
  }
  async function createClues(){
    removeClues();
    const blood=await makePlane(["BLOOD",story.blood],"blood",2.1,1.12); blood.position.set(-5.2,2.25,5.91); blood.rotation.y=Math.PI; staticWorld.add(blood); clues.push(blood); blood.userData.kind="blood";
    const uv=await makePlane(["UV",story.uv],"uv",1.95,.85); uv.position.set(-.2,1.62,5.92); uv.rotation.y=Math.PI; staticWorld.add(uv); clues.push(uv); uv.userData.kind="uv";
    const under=await makePlane([story.underGlass],"scratch",1.55,.7); under.position.set(1.8,.02,3.0); under.rotation.x=-Math.PI/2; fixedGroup.add(under); clues.push(under); under.userData.kind="underGlass";
    const web=await makePlane([story.web],"web",1.25,.82); web.position.set(-7.72,4.72,5.45); web.rotation.y=Math.PI/2; staticWorld.add(web); clues.push(web); web.userData.kind="web"; spiderWebPlane=web;
    const lockboxP=await makePlane([story.lockbox],"paper",1.05,.66); lockboxP.position.set(4.5,1.36,1.1); lockboxP.rotation.x=-Math.PI/2; lockboxP.visible=false; fixedGroup.add(lockboxP); clues.push(lockboxP); lockboxNotePlane=lockboxP;
    await updateTVTexture();
  }
  function renderInventory(){
    inventoryEl.innerHTML="";
    const arr=[]; if(hasFlash) arr.push("Flashlight"); if(hasUv) arr.push("UV Light"); if(hasRemote) arr.push("TV Remote"); if(hasBrassKey) arr.push("Brass Key");
    if(!arr.length){ inventoryEl.innerHTML='<span class="small">Empty.</span>'; return; }
    arr.forEach(t=>{ const c=document.createElement("span"); c.className="chip"; c.textContent=t; inventoryEl.appendChild(c); });
  }
  function renderTools(){
    flashBattery=Math.max(0,Math.min(100,flashBattery)); uvSeconds=Math.max(0,Math.min(10,uvSeconds));
    flashMeter.style.width=flashBattery+"%"; flashLabel.textContent=Math.round(flashBattery)+"%";
    uvMeter.style.width=(uvSeconds/10*100)+"%"; uvLabel.textContent=uvSeconds.toFixed(1)+"s";
    if(!hasFlash) toolStatus.textContent="Find the flashlight.";
    else if(!hasUv) toolStatus.textContent="Flashlight found. Search the drawers.";
    else if(!hasRemote) toolStatus.textContent="UV found. Another drawer may hide the TV remote.";
    else if(!hasBrassKey) toolStatus.textContent="Find the hollow book and extract its brass key.";
    else toolStatus.textContent="You have enough tools. Use the environment.";
  }

  // terminal
  function openDoorTerminal(){
    questions.innerHTML="";
    const items=[
      ["blood","What name was written in blood?"],
      ["tv","What phrase appeared on the TV?"],
      ["uv","What word appeared under UV?"],
      ["underGlass","What message was beneath the glass?"],
      ["web","What word was woven into the web?"],
      ["lockbox","What word was inside the lockbox?"]
    ];
    const inputs=[];
    items.forEach(([key,label])=>{
      const r=document.createElement("div"); r.className="qrow";
      const l=document.createElement("label"); l.textContent=label; r.appendChild(l);
      const inp=document.createElement("input"); inp.className="ans"; inp.autocomplete="off"; r.appendChild(inp);
      questions.appendChild(r); inputs.push({key,inp});
    });
    doorModal.userInputs=inputs;
    modalMsg.textContent="Every answer came from the room itself."; modalMsg.className="";
    doorModal.classList.add("open");
    if(document.pointerLockElement) document.exitPointerLock();
  }
  $("#closeDoor").addEventListener("click",()=>doorModal.classList.remove("open"));
  $("#doorForm").addEventListener("submit", e=>{
    e.preventDefault();
    const expected={blood:story.blood,tv:story.tv,uv:story.uv,underGlass:story.underGlass,web:story.web,lockbox:story.lockbox};
    let ok=true; (doorModal.userInputs||[]).forEach(x=>{ if(norm(x.inp.value)!==norm(expected[x.key])) ok=false; });
    if(ok){ modalMsg.textContent="Accepted. The lock disengages."; modalMsg.className="good"; doorPivot.rotation.y=-1.35; win.style.display="block"; log("room_completed"); }
    else{ modalMsg.textContent="One or more answers are wrong."; modalMsg.className="bad"; log("door_wrong_answer"); }
  });

  // pointer lock and movement
  let yaw=0,pitch=0,lastTime=performance.now();
  const keys={w:false,a:false,s:false,d:false,shift:false};
  function requestPlay(){ if(!doorModal.classList.contains("open")) renderer.domElement.requestPointerLock?.(); }
  $("#play").addEventListener("click",requestPlay);
  stage.addEventListener("click",e=>{ if(e.target===renderer.domElement && !document.pointerLockElement && !doorModal.classList.contains("open")) requestPlay(); });
  document.addEventListener("pointerlockchange",()=>{ start.style.display=document.pointerLockElement===renderer.domElement?"none":"grid"; });
  document.addEventListener("mousemove",e=>{
    if(document.pointerLockElement!==renderer.domElement) return;
    yaw-=e.movementX*.0021; pitch-=e.movementY*.0021; pitch=Math.max(-1.35,Math.min(1.35,pitch));
    camera.rotation.y=yaw; camera.rotation.x=pitch;
  });
  function setKey(k,v){ k=k.toLowerCase(); if(k in keys) keys[k]=v; if(k==="shift") keys.shift=v; }
  document.addEventListener("keydown",e=>{
    if(doorModal.classList.contains("open")){ if(e.key==="Escape") doorModal.classList.remove("open"); return; }
    const k=e.key.toLowerCase(); setKey(k,true);
    if(k==="e") interact(); if(k==="f") toggleFlash(); if(k==="u") toggleUv();
  });
  document.addEventListener("keyup",e=>setKey(e.key.toLowerCase(),false));
  document.querySelectorAll("[data-move]").forEach(b=>{ const k=b.dataset.move; b.addEventListener("pointerdown",e=>{e.preventDefault(); keys[k]=true}); b.addEventListener("pointerup",()=>keys[k]=false); b.addEventListener("pointercancel",()=>keys[k]=false); });
  $("#mUse").addEventListener("click",interact); $("#mFlash").addEventListener("click",toggleFlash);

  function blocked(pos){
    const r=.28;
    if(pos.x<-7.35||pos.x>7.35||pos.z<-5.55||pos.z>5.55) return true;
    for(const b of colliders){ if(pos.x>b.min.x-r&&pos.x<b.max.x+r&&pos.z>b.min.z-r&&pos.z<b.max.z+r) return true; }
    return false;
  }

  const ray=new THREE.Raycaster();
  function updateInteractable(){
    ray.setFromCamera(new THREE.Vector2(0,0),camera);
    const enabled=interactables.filter(i=>!i.enabled || i.enabled());
    const hit=ray.intersectObjects(enabled.map(i=>i.mesh),false)[0];
    activeInteractable=null;
    if(hit&&hit.distance<2.4) activeInteractable=enabled.find(i=>i.mesh===hit.object)||null;
    prompt.style.display=activeInteractable?"block":"none";
    if(activeInteractable) prompt.textContent="[E] "+activeInteractable.label;
  }
  function interact(){
    updateInteractable();
    const a=activeInteractable; if(!a) return;
    if(a.type==="drawer"){
      a.drawer.open=!a.drawer.open; a.drawer.targetZ=a.drawer.open?.60:.06; log(`drawer_${a.drawer.index}_${a.drawer.open?"opened":"closed"}`);
    } else if(a.type==="glass"){
      shatterGlass();
    } else if(a.type==="tv"){
      if(!hasRemote){ toolStatus.textContent="The TV needs its remote."; log("tv_requires_remote"); return; }
      tvOn=!tvOn; updateTVTexture(); log("tv_"+(tvOn?"on":"off"));
    } else if(a.type==="door"){
      openDoorTerminal();
    } else if(a.type==="book"){
      bookOpened=true; brassKey.visible=true; bookBody.position.y += .05; bookBody.rotation.x = -.9; log("hollow_book_opened");
    } else if(a.type==="key"){
      hasBrassKey=true; brassKey.visible=false; renderInventory(); renderTools(); log("brass_key_picked_up");
    } else if(a.type==="lockbox"){
      if(!hasBrassKey){ toolStatus.textContent="The lockbox is locked. You need a brass key."; log("lockbox_locked"); return; }
      lockboxOpen=!lockboxOpen; lockboxLid.rotation.x = lockboxOpen ? -.95 : 0; lockboxNoteVisible=lockboxOpen; if(lockboxNotePlane) lockboxNotePlane.visible=lockboxNoteVisible; log("lockbox_"+(lockboxOpen?"opened":"closed"));
    } else if(a.type==="remote"){
      hasRemote=true; remoteMesh.userData.pickupGroup.visible=false; renderInventory(); renderTools(); log("remote_picked_up");
    } else if(a.type==="pickup"){
      if(a.kind==="flash"){ hasFlash=true; flashOn=true; flashBody.userData.pickupGroup.visible=false; log("flashlight_picked_up"); }
      if(a.kind==="uv"){ hasUv=true; uvBody.userData.pickupGroup.visible=false; log("uv_picked_up"); }
      renderInventory(); renderTools();
    } else if(a.type==="mirror"){
      toolStatus.textContent='The mirror message reads backward: "TV FIRST"';
      log("mirror_inspected");
    } else if(a.type==="fuse0"){
      fuseSwitches.forEach(s=>s.on=!s.on);
      wallLightsEnabled = fuseSwitches.some(s=>s.on);
      log("fuse_switches_toggled");
    } else if(a.type==="webhint"){
      toolStatus.textContent="Look carefully at the upper-left webbing.";
      log("web_corner_inspected");
    }
  }

  function toggleFlash(){ if(!hasFlash||flashBattery<=0) return; flashOn=!flashOn; log("flashlight_"+(flashOn?"on":"off")); }
  function toggleUv(){ if(!hasUv||uvSeconds<=0) return; uvOn=!uvOn; log("uv_"+(uvOn?"on":"off")); }

  // physics/animation
  let gust=0, gustTimer=1.1+Math.random()*3.6;
  function updateStormPhysics(dt){
    gustTimer -= dt;
    if(gustTimer<=0){
      gust=(Math.random()-.5)*2.8;
      gustTimer=1.2+Math.random()*3.8;
      pendVX += gust*.18; pendVZ += (Math.random()-.5)*.4;
      log("gust");
    }
    gust*=Math.pow(.22,dt);

    // blinds sway in depth and shift a bit
    blindSystems.forEach(sys=>{
      sys.slats.forEach((s,idx)=>{
        const a=Math.sin(performance.now()/800 + s.phase + idx*.25)*.04 + gust*.035;
        s.mesh.rotation.x = a;
        s.mesh.position.x = s.baseX + gust*.02;
      });
    });

    // pendant lamp
    pendVX += (-pendX*4.2 + gust*.08)*dt; pendVZ += (-pendZ*3.8)*dt;
    pendVX *= Math.pow(.45,dt); pendVZ *= Math.pow(.45,dt);
    pendX += pendVX*dt; pendZ += pendVZ*dt;
    pendantPivot.rotation.z = pendX; pendantPivot.rotation.x = pendZ;
  }
  function updateLightFlicker(dt){
    const targetFan=fanOn?5.2:0; fanSpeed += (targetFan-fanSpeed)*Math.min(1,dt*2); fanRoot.rotation.y += fanSpeed*dt;
    const bladeCut = .92 + .12*Math.sin(fanRoot.rotation.y*4);
    fanBulb.intensity = (2.25 + Math.sin(performance.now()/900)*.08) * bladeCut;

    lightObjects.forEach((obj,i)=>{
      if(obj.type==="candle"){
        const t=performance.now()/1000 + obj.phase;
        const f=obj.base*(.76 + Math.sin(t*9)*.12 + Math.sin(t*17)*.09 + Math.random()*.08);
        obj.light.intensity=f;
        obj.flame.scale.setScalar(.85 + Math.sin(t*13)*.08 + Math.random()*.05);
      }else if(obj.type==="sconce"){
        const t=performance.now()/1000 + i;
        obj.light.intensity = wallLightsEnabled ? obj.base*(.9 + Math.sin(t*6)*.03 + Math.random()*.04) : 0;
        if(obj.bulb.material) obj.bulb.material.emissiveIntensity = wallLightsEnabled ? .9 : .15;
      }else if(obj.type==="lamp"){
        const t=performance.now()/1000;
        obj.light.intensity = obj.base*(.92 + Math.sin(t*4)*.05 + Math.random()*.03);
      }else if(obj.type==="night"){
        obj.light.intensity = obj.base*(.95 + Math.random()*.04);
      }else if(obj.type==="pendant"){
        obj.light.intensity = obj.base*(.95 + Math.sin(performance.now()/700)*.04);
      }
    });

    if(tvOn){ tvLight.intensity = .72 + Math.sin(performance.now()/120)*.08 + Math.random()*.08; }
  }
  function updateLightning(dt){
    lightningTimer -= dt;
    if(lightningTimer<=0){ lightningFlash=.18+Math.random()*.2; lightningTimer=2.1+Math.random()*4.6; gust+=(Math.random()-.5)*2.1; log("lightning"); }
    if(lightningFlash>0){
      lightningFlash-=dt;
      const b=Math.max(0,Math.sin(lightningFlash*30)*.55+.55);
      lightning.intensity=b*3.4;
      hemi.intensity=.36+b*.12;
      windowGlass.forEach(g=>g.emissiveIntensity=.18+b*.78);
      renderer.toneMappingExposure=.9+b*.12;
    } else {
      lightning.intensity=0; hemi.intensity=.36; windowGlass.forEach(g=>g.emissiveIntensity=.18); renderer.toneMappingExposure=.9;
    }
  }
  function updateRain(dt){
    const arr=rain.geometry.attributes.position.array;
    for(let i=0;i<arr.length;i+=3){
      arr[i+1]-=dt*(4.2+(i%5)*.12); arr[i]+=dt*.34;
      if(arr[i+1]<.15){ arr[i+1]=6.1; arr[i]=(Math.random()*15)-7.5; arr[i+2]=-6.6-Math.random()*3.4; }
    }
    rain.geometry.attributes.position.needsUpdate=true;
    ripples.forEach(r=>{ r.userData.t+=dt; if(r.userData.t>2){ r.userData.t=0; r.position.set(-6+Math.random()*12,.012,-5+Math.random()*10) } const t=r.userData.t/2; r.scale.setScalar(.5+t*3.4); r.material.opacity=(1-t)*.16; });
  }
  function updateDrawers(dt){
    drawers.forEach(d=>{
      const disp=d.targetZ-d.mesh.position.z;
      d.vel += disp*36*dt; d.vel *= Math.pow(.12,dt);
      const dz=d.vel*dt; d.mesh.position.z += dz; d.knob.position.z += dz;
    });
  }
  function updateShards(dt){
    for(let i=shards.length-1;i>=0;i--){
      const s=shards[i]; s.life-=dt; s.v.y-=6.5*dt; s.mesh.position.addScaledVector(s.v,dt); s.mesh.rotation.x+=s.spin.x*dt; s.mesh.rotation.y+=s.spin.y*dt; s.mesh.rotation.z+=s.spin.z*dt;
      if(s.mesh.position.y<.03){ s.mesh.position.y=.03; s.v.y=Math.abs(s.v.y)*.34; s.v.x*=.78; s.v.z*=.78; }
      if(s.life<=0){ scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); shards.splice(i,1); }
    }
  }
  function updateFlashlights(){
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    flashLight.position.copy(camera.position); flashTarget.position.copy(camera.position).add(dir.clone().multiplyScalar(6)); flashLight.intensity=flashOn?1.95:0;
    uvLight.position.copy(camera.position); uvTarget.position.copy(camera.position).add(dir.clone().multiplyScalar(4.8)); uvLight.intensity=uvOn?1.65:0;
    clues.forEach(c=>{
      const wp=c.getWorldPosition(new THREE.Vector3()), dist=wp.distanceTo(camera.position), facing=wp.clone().sub(camera.position).normalize().dot(dir);
      if(c.userData.kind==="uv"){
        c.material.opacity = uvOn&&dist<5.2&&facing>.91 ? Math.min(.96,.38+(5.2-dist)/6) : .02;
        c.material.emissiveIntensity = uvOn&&dist<5.2&&facing>.91 ? 1.65 : .04;
      }
      if(c.userData.kind==="web"){
        const lit = flashOn && dist<4.5 && facing>.9;
        c.material.opacity = lit || lightning.intensity>.8 ? .95 : .18;
        c.material.emissiveIntensity = lit ? .14 : 0;
      }
      if(c.userData.kind==="blood"){
        c.material.emissiveIntensity = .12 + Math.sin(performance.now()/400)*.03;
      }
    });
  }

  // animate
  function animate(now){
    requestAnimationFrame(animate);
    const dt=Math.min(.033,(now-lastTime)/1000); lastTime=now;

    if(document.pointerLockElement===renderer.domElement && !doorModal.classList.contains("open")){
      const speed=(keys.shift?4.2:2.55)*dt;
      const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)), right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)), move=new THREE.Vector3();
      if(keys.w) move.add(forward); if(keys.s) move.sub(forward); if(keys.d) move.add(right); if(keys.a) move.sub(right);
      if(move.lengthSq()){ move.normalize().multiplyScalar(speed); const px=camera.position.clone(); px.x+=move.x; if(!blocked(px)) camera.position.x=px.x; const pz=camera.position.clone(); pz.z+=move.z; if(!blocked(pz)) camera.position.z=pz.z; }
    }

    if(flashOn){ flashBattery-=dt*.85; if(flashBattery<=0){ flashBattery=0; flashOn=false; log("flashlight_dead"); } }
    else if(hasFlash) flashBattery+=dt*.10;
    if(uvOn){ uvSeconds-=dt; if(uvSeconds<=0){ uvSeconds=0; uvOn=false; log("uv_empty"); } }

    updateInteractable(); updateStormPhysics(dt); updateLightFlicker(dt); updateLightning(dt); updateRain(dt); updateDrawers(dt); updateShards(dt); updateFlashlights(); renderTools();
    renderer.render(scene,camera);
  }

  // generation
  async function generate(){
    loading.style.display="grid"; win.style.display="none"; doorModal.classList.remove("open"); events.innerHTML="";
    clearGenerated();
    while(decorGroup.children.length){ const c=decorGroup.children.pop(); disposeObj(c); }
    refreshBaseColliders();
    hasFlash=false; flashOn=false; flashBattery=100; hasUv=false; uvOn=false; uvSeconds=10; hasRemote=false; hasBrassKey=false;
    tvOn=false; glassBroken=false; glassCup.visible=true; while(shards.length){ const s=shards.pop(); scene.remove(s.mesh); }
    drawers.forEach(d=>{ d.open=false; d.targetZ=.06; d.vel=0; const delta=.06-d.mesh.position.z; d.mesh.position.z=.06; d.knob.position.z+=delta; });
    if(flashBody?.userData.pickupGroup) flashBody.userData.pickupGroup.visible=true;
    if(uvBody?.userData.pickupGroup) uvBody.userData.pickupGroup.visible=true;
    if(remoteMesh?.userData.pickupGroup) remoteMesh.userData.pickupGroup.visible=true;
    brassKey.visible=false; bookOpened=false; bookBody.rotation.x=0; lockboxOpen=false; lockboxLid.rotation.x=0; lockboxNoteVisible=false; if(lockboxNotePlane) lockboxNotePlane.visible=false;
    wallLightsEnabled=true; fuseSwitches.forEach((s,i)=>s.on=i===0);

    story={title:"Storm Protocol: "+rand(pools.title), blood:rand(pools.blood), tv:rand(pools.tv), uv:rand(pools.uv), underGlass:rand(pools.underGlass), web:rand(pools.web), lockbox:rand(pools.lockbox)};
    storyEl.innerHTML = `<strong>${story.title}</strong><br>The room is assembled from multiple clue mediums and interaction chains. Some information is hidden in light, some in props, some behind manipulation.`;
    renderInventory(); renderTools();

    await applyEnhancedSurfaceTextures();

    const picks=shuffle([...MODELS]).slice(0,5), slots=shuffle([...SLOTS]).slice(0,picks.length);

    await createClues();

    // place simple decor puzzle props
    const chessBoard=addMesh(new THREE.BoxGeometry(.6,.04,.6), woodMat(0xe8e5dd), new THREE.Vector3(-.6,1.02,-3.1), decorGroup);
    for(let x=0;x<8;x++) for(let z=0;z<8;z++){ const sq=addMesh(new THREE.BoxGeometry(.075,.005,.075), woodMat((x+z)%2?0x1b1b1b:0xe9dfcb), new THREE.Vector3(-.26+x*.075,1.045,-3.36+z*.075), decorGroup); sq.castShadow=false; }
    const diceGroup=new THREE.Group(); diceGroup.position.set(.9,1.02,-3.0); decorGroup.add(diceGroup);
    for(let i=0;i<3;i++){ const die=addMesh(new THREE.BoxGeometry(.1,.1,.1), new THREE.MeshStandardMaterial({color:0xf1eee7,roughness:.5}), new THREE.Vector3(i*.12,0,0), diceGroup); die.rotation.set(Math.random(),Math.random(),Math.random()); }
    const scaleBase=addMesh(new THREE.CylinderGeometry(.22,.22,.04,18), woodMat(0x646d77), new THREE.Vector3(2.5,1.02,-3.1), decorGroup);
    addMesh(new THREE.CylinderGeometry(.18,.18,.04,18), woodMat(0xe7e7e7), new THREE.Vector3(2.5,1.08,-3.1), decorGroup);
    const briefcase=addMesh(new THREE.BoxGeometry(.66,.42,.12), new THREE.MeshStandardMaterial({color:0x272d34,roughness:.4,metalness:.3}), new THREE.Vector3(5.25,.23,4.65), decorGroup);
    addMesh(new THREE.TorusGeometry(.12,.016,8,16), new THREE.MeshStandardMaterial({color:0x9d8c62,roughness:.4,metalness:.55}), new THREE.Vector3(5.25,.48,4.65), decorGroup);
    const clockFace=await makePlane(["3:15"],"paper",.7,.38); clockFace.position.set(0,3.65,5.91); clockFace.rotation.y=Math.PI; staticWorld.add(clockFace); clues.push(clockFace);

    // reset others
    await updateTVTexture();
    camera.position.set(0,1.66,4.3); yaw=0; pitch=0; camera.rotation.set(0,0,0); doorPivot.rotation.y=0;
    log("room_generated"); loading.style.display="none";
    // All network GLBs arrive AFTER the room is playable. The backend makes these
    // same-origin and disk-caches them after the first request.
    setTimeout(async()=>{
      for(let i=0;i<picks.length;i++){
        const loaded=await loadModel(picks[i],slots[i]);
        if(loaded) log(`asset_loaded: ${picks[i].name}`);
        await new Promise(r=>setTimeout(r,90));
      }
    },80);
    setTimeout(()=>streamPremiumClutter().catch(()=>{}),500);
  }
  $("#regen").addEventListener("click", async()=>{ if(document.pointerLockElement) document.exitPointerLock(); loading.style.display="grid"; await generate(); });

  function resize(){ const r=stage.getBoundingClientRect(); renderer.setSize(Math.max(300,r.width),Math.max(360,r.height),false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(stage); resize();

  await generate();
  animate(performance.now());
}
