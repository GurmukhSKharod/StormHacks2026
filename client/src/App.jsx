import {useEffect,useState} from "react";
import {startGame} from "./game/startGame.js";
import {getAssetStatus} from "./api.js";
import "./styles.css";

export default function App(){
  const [assetStatus,setAssetStatus]=useState("Asset cache connecting…");
  useEffect(()=>{
    let live=true;
    getAssetStatus().then(s=>{
      if(live)setAssetStatus(`3D asset cache ready · ${s.cached}/${s.total} cached locally`);
    }).catch(()=>live&&setAssetStatus("3D asset cache will initialize on first model request"));
    startGame().catch(err=>console.error("EscapeForge startup failed",err));
    return()=>{live=false};
  },[]);

  return <div className="shell">
    <div className="top">
      <div>
        <h1>EscapeForge: Storm Protocol V3</h1>
        <div className="sub">Original V3 lighting · original dense clutter · React/Vite frontend · cached same-origin 3D assets</div>
        <div className="asset-status">{assetStatus}</div>
      </div>
      <button id="regen" className="btn primary">⛈ Generate New Night</button>
    </div>

    <div id="win" className="win">🎉 You solved the room. Generate another one for a new random layout, props and clues.</div>

    <div className="layout">
      <div id="stage" className="stage">
        <div id="loading" className="loading">Generating the original V3 room…<br/><small>Fast local texture enhancement. 3D furniture streams in afterward from the local asset cache.</small></div>
        <div className="hud"><b>WASD</b> move · <b>mouse</b> look · <b>Shift</b> sprint · <b>E</b> interact · <b>F</b> flashlight · <b>U</b> UV</div>
        <div className="crosshair"></div><div id="prompt" className="prompt"></div>
        <div id="start" className="start"><div className="startbox"><strong>This is the V3 room, not a redesign.</strong><p>The same lighting, fog, candles, blinds, lightning, physical drawers and dense clutter are preserved. Network 3D furniture loads only after the room is usable.</p><button id="play" className="btn primary" style={{width:"100%"}}>▶ Enter Room</button></div></div>
        <div className="mobile"><div className="pad"><span></span><button className="mbtn" data-move="w">▲</button><span></span><button className="mbtn" data-move="a">◀</button><button className="mbtn" data-move="s">▼</button><button className="mbtn" data-move="d">▶</button></div><div className="act"><button id="mUse" className="mbtn">E</button><button id="mFlash" className="mbtn">F</button></div></div>
        <div id="doorModal" className="modal"><div className="modalCard"><div className="modalTitle">Exit Terminal</div><div className="modalSub">Answer with what you discovered in the environment</div><form id="doorForm"><div id="questions"></div><div className="row"><button className="btn primary">Submit</button><button id="closeDoor" className="btn" type="button">Close</button></div></form><div id="modalMsg"></div></div></div>
      </div>

      <aside className="side">
        <section className="card"><div className="label">Story Seed</div><div id="story" className="story"></div></section>
        <section className="card"><div className="label">Inventory</div><div id="inventory" className="inv"><span className="small">Empty.</span></div></section>
        <section className="card"><div className="label">Tools</div><div className="bars"><div className="barline"><span>Flashlight</span><div className="bar"><span id="flashMeter" style={{width:"100%"}}></span></div><strong id="flashLabel">100%</strong></div><div className="barline"><span>UV</span><div className="bar uv"><span id="uvMeter" style={{width:"100%"}}></span></div><strong id="uvLabel">10.0s</strong></div></div><div id="toolStatus" className="status">Find the flashlight.</div></section>
        <section className="card"><div className="label">V3 Room Systems</div><div className="small">• original V3 surface textures<br/>• candles and wall lights flicker independently<br/>• TV / blood / UV / web / glass / lockbox clues<br/>• drawers, hollow book, key, lockbox and fuse interactions<br/>• moving 3D blinds and storm lightning<br/>• cached GLB furniture streams in after play starts</div></section>
        <section className="card wide"><div className="label">Event Stream</div><div id="events" style={{marginTop:8}}></div></section>
      </aside>
    </div>
  </div>;
}
