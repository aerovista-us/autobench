"use client";

import { useMemo, useState } from "react";
import { popsVanBaseline } from "@/lib/model/popsVan";
import { calculateM5Clearance, popsM5Scenario } from "@/lib/model/m5Clearance";

export default function M5ClearancePage() {
  const [tireDiameterIn, setTire] = useState(popsM5Scenario.tireDiameterIn);
  const [frontAxleOffsetIn, setAxle] = useState(popsM5Scenario.frontAxleOffsetIn);
  const [compressionPercent, setCompression] = useState(popsM5Scenario.compressionPercent);
  const [steeringDeg, setSteering] = useState(popsM5Scenario.steeringDeg);
  const result = useMemo(() => calculateM5Clearance(popsVanBaseline, {
    tireDiameterIn, frontAxleOffsetIn, compressionPercent, steeringDeg,
  }), [tireDiameterIn, frontAxleOffsetIn, compressionPercent, steeringDeg]);
  return <main style={{maxWidth:960,margin:"2rem auto",padding:24,color:"#d9e9f4",background:"#081521",fontFamily:"system-ui"}}>
    <nav><a href="/" style={{color:"#75c9ff"}}>← Return to AutoBench</a></nav>
    <h1>M5 · Suspension & Clearance Lab</h1>
    <p>Provisional geometric screening only. Source measurements and the canonical vehicle model are never edited here.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
      <label>Tire diameter (in)<select value={tireDiameterIn} onChange={e=>setTire(Number(e.target.value))} style={{display:"block",width:"100%",padding:12}}>{[33,35,37].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Front axle offset (in)<select value={frontAxleOffsetIn} onChange={e=>setAxle(Number(e.target.value))} style={{display:"block",width:"100%",padding:12}}>{[0,8,10,12,14].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Compression request: {compressionPercent}%<input aria-label="Compression percentage" type="range" min="0" max="100" value={compressionPercent} onChange={e=>setCompression(Number(e.target.value))} style={{display:"block",width:"100%"}} /></label>
      <label>Steering request: {steeringDeg}°<input aria-label="Steering degrees" type="range" min="-40" max="40" value={steeringDeg} onChange={e=>setSteering(Number(e.target.value))} style={{display:"block",width:"100%"}} /></label>
    </div>
    <section style={{border:"1px solid #ae673f",padding:20,marginTop:24,borderRadius:8}}>
      <h2>{result.status === "conflict" ? "CONFLICT — provisional tire envelope" : "BLOCKED — insufficient measured evidence"}</h2>
      <p>{result.explanation}</p>
      <dl>
        <dt>Calculated wheelbase</dt><dd>{(result.wheelbaseMm/25.4).toFixed(1)} in</dd>
        <dt>Conservative steering tire half-envelope</dt><dd>{result.steeringSweepHalfLengthMm.toFixed(1)} mm</dd>
        <dt>Remaining original opening half-length</dt><dd>{result.availableOpeningHalfLengthMm.toFixed(1)} mm</dd>
        <dt>Longitudinal projected clearance</dt><dd>{result.longitudinalClearanceMm.toFixed(1)} mm</dd>
      </dl>
      <p><strong>Compression at {compressionPercent}% is NOT calculated:</strong> no measured jounce distance or axle travel path exists. This percentage is stored only as a requested scenario input.</p>
      <h3>Required before physical fitment evaluation</h3>
      <ul>{result.missingEvidence.map(s=><li key={s}>{s}</li>)}</ul>
      <button style={{padding:12,cursor:"pointer"}} onClick={()=>{
        const data = {scenario:{tireDiameterIn,frontAxleOffsetIn,compressionPercent,steeringDeg},result,source:"assumed M0 baseline",fabricationApproved:false};
        const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="pops-m5-clearance-scenario.json";a.click();URL.revokeObjectURL(a.href);
      }}>Export scenario review JSON</button>
    </section>
  </main>;
}
