"use client";

import { useMemo, useState } from "react";
import { popsVanBaseline } from "@/lib/model/popsVan";
import { calculateM5Clearance, popsM5Scenario } from "@/lib/model/m5Clearance";
import { evaluateSuspensionSweep } from "@/lib/model/m5SuspensionSweep";
import { checkTireBody3D, type MeshEvidence } from "@/lib/model/m5TireBody3D";

export default function M5ClearancePage() {
  const [tireDiameterIn, setTire] = useState(popsM5Scenario.tireDiameterIn);
  const [frontAxleOffsetIn, setAxle] = useState(popsM5Scenario.frontAxleOffsetIn);
  const [compressionPercent, setCompression] = useState(popsM5Scenario.compressionPercent);
  const [steeringDeg, setSteering] = useState(popsM5Scenario.steeringDeg);
  const [travel,setTravel] = useState({fullBumpTravelMm:"",fullBumpForeAftMm:"",measuredOpeningHalfLengthMm:"",measuredTireWidthMm:"",source:"",verified:false});
  const [meshText,setMeshText] = useState("");
  const [meshSource,setMeshSource] = useState("");
  const [meshVerified,setMeshVerified] = useState(false);
  const scenario={tireDiameterIn,frontAxleOffsetIn,compressionPercent,steeringDeg};
  const evidence = Object.values(travel).slice(0,4).every(v=>String(v).trim()!=="") && travel.source.trim() && travel.verified ? {
    fullBumpTravelMm:Number(travel.fullBumpTravelMm),fullBumpForeAftMm:Number(travel.fullBumpForeAftMm),
    measuredOpeningHalfLengthMm:Number(travel.measuredOpeningHalfLengthMm),measuredTireWidthMm:Number(travel.measuredTireWidthMm),verified:true
  } : undefined;
  const sweep=useMemo(()=>evaluateSuspensionSweep(popsVanBaseline,scenario,evidence),[tireDiameterIn,frontAxleOffsetIn,compressionPercent,steeringDeg,travel]);
  let bodyMesh:MeshEvidence|undefined;
  try {if(meshText.trim())bodyMesh={...JSON.parse(meshText),source:meshSource,measured:meshVerified};}catch{ /* invalid mesh remains blocked */ }
  const pose=sweep.samples.length ? sweep.samples[sweep.samples.length-1] : undefined;
  const collision=useMemo(()=>checkTireBody3D(bodyMesh,{
    centerMm:[pose?.axleXmm??0,popsVanBaseline.parameters.frontTrackMm/2,pose?.axleZmm??0],
    diameterMm:tireDiameterIn*25.4,widthMm:Number(travel.measuredTireWidthMm)||popsVanBaseline.parameters.tireWidthMm,steerDeg:steeringDeg
  }),[meshText,meshSource,meshVerified,pose?.axleXmm,pose?.axleZmm,tireDiameterIn,steeringDeg,travel.measuredTireWidthMm]);
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
    <section style={{padding:20,border:"1px solid #456c85",marginTop:24,borderRadius:8}}>
      <h2>Measured suspension-travel evidence</h2>
      <p>Enter actual measurements in millimeters. Nothing here modifies the vehicle manifest. Unverified values cannot unlock the sweep.</p>
      {(["fullBumpTravelMm","fullBumpForeAftMm","measuredOpeningHalfLengthMm","measuredTireWidthMm"] as const).map(key=><label key={key} style={{display:"block",marginBottom:10}}>{key}<input type="number" aria-label={key} value={travel[key]} onChange={e=>setTravel(t=>({...t,[key]:e.target.value,verified:false}))} style={{display:"block",padding:8,width:"100%"}} /></label>)}
      <label>Measurement source / capture reference<input value={travel.source} onChange={e=>setTravel(t=>({...t,source:e.target.value,verified:false}))} style={{display:"block",padding:8,width:"100%"}} /></label>
      <label><input type="checkbox" checked={travel.verified} onChange={e=>setTravel(t=>({...t,verified:e.target.checked}))}/> I have verified these measurements against the physical van</label>
      <h3>Sampled wheel-center positions — {sweep.status}</h3>
      {sweep.samples.length ? <svg viewBox="0 0 650 180" role="img" aria-label="Side-view sampled axle center travel path" style={{width:"100%",background:"#122a3d"}}>
        <path d="M20 145 H630" stroke="#688fa8"/>
        {sweep.samples.filter(s=>s.steeringDeg===0).map((s,i)=><circle key={i} cx={60+(s.axleXmm-sweep.samples[0].axleXmm)*2+Math.max(0,i)*35} cy={145-(s.axleZmm-sweep.samples[0].axleZmm)} r="5" fill={s.projectedClearanceMm<0?"#ff927a":"#82d3fc"}/>)}
      </svg> : <p>Blocked: measured, verified suspension geometry required.</p>}
      <p>Projected minimum clearance: {sweep.minimumProjectedClearanceMm===null?"not calculated":sweep.minimumProjectedClearanceMm.toFixed(1)+" mm"}. Linear interpolation is provisional, not a certified suspension path.</p>
      <h3>3D tire-to-body mesh screening</h3>
      <p>Paste measured body triangle mesh JSON with verticesMm and triangleIndices. The collision screen checks 3D surface intersections, not complete continuous motion or physical fitment.</p>
      <textarea aria-label="Measured body mesh JSON" value={meshText} onChange={e=>{setMeshText(e.target.value);setMeshVerified(false);}} rows={5} style={{width:"100%"}} placeholder='{"verticesMm":[...],"triangleIndices":[...]}' />
      <input aria-label="Body mesh evidence source" value={meshSource} onChange={e=>{setMeshSource(e.target.value);setMeshVerified(false);}} placeholder="Measured mesh source" style={{padding:8,width:"100%"}} />
      <label><input type="checkbox" checked={meshVerified} onChange={e=>setMeshVerified(e.target.checked)}/> Measured mesh verified</label>
      <p><strong>3D screening: {pose?collision.status:"blocked — verified axle travel required"}</strong> · {pose?collision.intersections:0} detected intersections</p>
      <p>Mesh results are screening only. No fabrication approval is implied.</p>
    </section>
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
