"use client";
import { useMemo, useState } from "react";
import type { VehicleDesign } from "@/lib/model/types";
import { buildEvidenceSchedule, buildPartsSchedule } from "@/lib/model/planSchedule";

export function EngineeringPreparation({design}:{design:VehicleDesign}){
 const [assembly,setAssembly]=useState("All");
 const evidence=useMemo(()=>buildEvidenceSchedule(design),[design]);
 const parts=useMemo(()=>buildPartsSchedule(design),[design]);
 const groups=["All",...new Set([...evidence.map(e=>e.assembly),...parts.map(p=>p.assembly)])];
 const filtered=evidence.filter(e=>assembly==="All"||e.assembly===assembly);
 const visibleParts=parts.filter(p=>assembly==="All"||p.assembly===assembly);
 const missing=evidence.filter(e=>e.status!=="verified").length;
 const exportCsv=()=>{
  const rows=[["ID","Assembly","Item","Qty","Design basis","Status","Notes"],...parts.map(p=>[p.id,p.assembly,p.item,String(p.quantity),p.basis,p.status,p.notes])];
  const csv=rows.map(row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=`pops-van-rev-${design.revision}-preliminary-parts.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <section className="plan-engineering" aria-label="Engineering preparation schedules">
  <div className="plan-engineering-header"><div><span className="plan-kicker">MEASUREMENT / ASSEMBLY PREPARATION</span><h2>Evidence & parts schedules</h2><p>Linked to local design revision {design.revision}. No measurements are promoted from untrusted browser storage.</p></div><button onClick={exportCsv}>Export preliminary parts CSV</button></div>
  <div className="plan-engineering-summary"><strong>{missing} / {evidence.length} measurement references missing</strong><span>Verified evidence: {evidence.length-missing}</span><span>Parts: {parts.length} provisional line items</span></div>
  <label className="plan-filter">Assembly <select value={assembly} onChange={e=>setAssembly(e.target.value)}>{groups.map(g=><option key={g}>{g}</option>)}</select></label>
  <div className="plan-engineering-tables">
   <div><h3>Measurement reference overlay / register</h3><p>Design targets alongside observed evidence, when independently verified. Unverified dimensions remain gaps.</p><div className="plan-table-scroll"><table><thead><tr><th>Reference</th><th>Design</th><th>Measured</th><th>Evidence</th></tr></thead><tbody>{filtered.map(e=><tr key={e.id}><td>{e.label}<small>{e.assembly}</small></td><td>{e.designValue}</td><td>{e.observedValue}</td><td className={e.status==="verified"?"plan-good":"plan-missing"}>{e.status==="verified"?"Verified":"Missing"}<small>{e.source}</small></td></tr>)}</tbody></table></div></div>
   <div><h3>Preliminary assembly / parts schedule</h3><p>Planning placeholders, not an order list or bill of materials for construction.</p><div className="plan-table-scroll"><table><thead><tr><th>ID / item</th><th>Qty</th><th>Design basis</th><th>Gate</th></tr></thead><tbody>{visibleParts.map(p=><tr key={p.id}><td><b>{p.id}</b> · {p.item}<small>{p.notes}</small></td><td>{p.quantity}</td><td>{p.basis}</td><td className="plan-missing">{p.status.replace("-"," ")}</td></tr>)}</tbody></table></div></div>
  </div>
 </section>;
}
