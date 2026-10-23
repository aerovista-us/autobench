"use client";

import Link from "next/link";
import { useRef } from "react";
import { useSavedVehicleDesign } from "@/lib/model/savedDesign";
import { deriveVehicle, formatInches } from "@/lib/model/derive";
import { resolveConceptOptions } from "@/lib/model/conceptOptions";

const line = "#8fcaed";
const secondary = "#416987";
const amber = "#f8c36a";
function Dim({x1,x2,y,label}:{x1:number;x2:number;y:number;label:string}) {
  return <g stroke={line} fill="none" strokeWidth="1">
    <path d={`M${x1} ${y-9}v18 M${x2} ${y-9}v18 M${x1} ${y}H${x2}`}/>
    <path d={`M${x1+6} ${y-4}l-6 4 6 4 M${x2-6} ${y-4}l6 4-6 4`}/>
    <rect x={(x1+x2)/2-47} y={y-18} width="94" height="16" fill="#092039" stroke="none"/>
    <text x={(x1+x2)/2} y={y-6} textAnchor="middle" fill="#d5e9f8" stroke="none" fontSize="12">{label}</text>
  </g>;
}
export function BlueprintPlan() {
  const {design,hydrated} = useSavedVehicleDesign();
  const svg = useRef<SVGSVGElement>(null);
  const p=design.parameters, m=deriveVehicle(design), concept=resolveConceptOptions(design);
  const left=105,right=1040, top=130;
  const total=m.bumperFrontXmm-m.bodyRearXmm;
  const scale=900/Math.max(total,1);
  const x=(mm:number)=>left+(mm-m.bodyRearXmm)*scale;
  const rear=x(0),front=x(m.frontAxleXmm),bodyEnd=x(m.bodyFrontXmm), bumper=x(m.bumperFrontXmm);
  const radius=p.tireDiameterMm*scale/2;
  const baseY=top+255;
  const download=()=>{
    if(!svg.current)return;
    const clone=svg.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
    const data=new XMLSerializer().serializeToString(clone);
    const url=URL.createObjectURL(new Blob([data],{type:"image/svg+xml;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=`pops-van-rev-${design.revision}-concept-sheet.svg`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <main className="plan-page">
    <header className="plan-header">
      <div><span className="plan-kicker">AEROVISTA / AUTOBENCH / CONCEPT SHEET</span><h1>Fabrication planning board</h1><p>Dimensioned concept illustration generated from your selected local vehicle revision.</p></div>
      <div className="plan-actions"><Link href="/">← Modify design</Link><Link href="/validate">Validate</Link><button onClick={download} disabled={!hydrated}>Export SVG sheet</button><button onClick={()=>window.print()}>Print / PDF</button></div>
    </header>
    <div className="plan-status"><strong>REV {design.revision}</strong><span>{hydrated?"LOCAL SAVED CANDIDATE":"LOADING LOCAL DESIGN"}</span><span>UNVERIFIED · NOT FOR FABRICATION</span><span>SCHEMATIC · NOT TO SCALE ON SCREEN</span></div>
    <div className="plan-grid">
      <section className="plan-sheet">
        <svg ref={svg} viewBox="0 0 1140 740" role="img" aria-label="Dimensioned conceptual side and top schematic of the selected Pops Van with fabrication callouts">
          <defs><pattern id="plan-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#163754" strokeWidth=".7"/></pattern></defs>
          <rect width="1140" height="740" fill="#092039"/><rect width="1140" height="740" fill="url(#plan-grid-pattern)"/>
          <g fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace">
            <text x="40" y="43" fill="#e2f2ff" fontSize="23" fontWeight="bold">POPS VAN / GENERAL ARRANGEMENT</text>
            <text x="40" y="68" fill={line} fontSize="12">SHEET A-101  ·  CONCEPT / MEASUREMENT REQUIRED</text>
            <text x="1085" y="42" fill={amber} textAnchor="end" fontSize="14">REV {design.revision}  /  DRAFT</text>
            <text x="40" y="105" fill={line} fontSize="14">01 — SIDE ELEVATION · DIMENSION REFERENCES</text>
            <g fill="none" stroke={line} strokeWidth="2.5">
              <path d={`M${x(m.bodyRearXmm)} ${baseY-185} L${x(m.bodyRearXmm+160)} ${baseY-207} H${x(m.bodyFrontXmm-680)} Q${x(m.bodyFrontXmm-450)} ${baseY-207} ${x(m.bodyFrontXmm-290)} ${baseY-168} L${bodyEnd} ${baseY-100} V${baseY-23} H${bumper} V${baseY-7} H${x(m.bodyRearXmm)} Z`}/>
              <path d={`M${x(m.bodyRearXmm+450)} ${baseY-200} V${baseY-12} M${x(m.bodyFrontXmm-920)} ${baseY-200} V${baseY-12} M${x(m.bodyFrontXmm-910)} ${baseY-195}L${x(m.bodyFrontXmm-350)} ${baseY-170}L${x(m.bodyFrontXmm-130)} ${baseY-102}H${x(m.bodyFrontXmm-910)}Z`}/>
              <path d={`M${x(m.bodyRearXmm+470)} ${baseY-170} H${x(m.bodyFrontXmm-940)} M${x(m.bodyRearXmm+470)} ${baseY-18} H${x(m.bodyFrontXmm-940)}`} stroke={secondary}/>
              <circle cx={rear} cy={baseY-10} r={radius} fill="#092039"/><circle cx={front} cy={baseY-10} r={radius} fill="#092039"/>
              <circle cx={rear} cy={baseY-10} r={radius*.49}/><circle cx={front} cy={baseY-10} r={radius*.49}/>
              <path d={`M${rear-20} ${baseY-10}h40 M${rear} ${baseY-30}v40 M${front-20} ${baseY-10}h40 M${front} ${baseY-30}v40`} stroke={amber} strokeWidth="1"/>
            </g>
            <path d={`M60 ${baseY+radius-10} H1085`} stroke={secondary} strokeDasharray="9 6"/>
            <Dim x1={rear} x2={front} y={baseY+radius+32} label={formatInches(m.wheelbaseMm)+" in WB"}/>
            <Dim x1={x(m.bodyRearXmm)} x2={bodyEnd} y={baseY+radius+69} label={formatInches(m.bodyFrontXmm-m.bodyRearXmm)+" in BODY"}/>
            <g fill={amber} fontSize="12"><text x={front+30} y={baseY-125}>FRONT AXLE +{formatInches(p.frontAxleOffsetMm)} in</text><text x={rear+20} y={baseY-220}>BODY HEIGHT {formatInches(p.bodyHeightMm)} in</text><text x={front+30} y={baseY+radius+105}>TIRE Ø {formatInches(p.tireDiameterMm)} in</text></g>
            <text x="40" y="535" fill={line} fontSize="14">02 — TOP VIEW · WIDTH ENVELOPE (SCHEMATIC)</text>
            <g fill="none" stroke={line} strokeWidth="2"><rect x={x(m.bodyRearXmm)} y="563" width={Math.max(1,bodyEnd-x(m.bodyRearXmm))} height="94" rx="12"/><path d={`M${rear} 551v118 M${front} 551v118`} stroke={amber} strokeDasharray="5 5"/><path d={`M${x(m.bodyRearXmm)} 610 H${bodyEnd}`} stroke={secondary} strokeDasharray="9 5"/></g>
            <text x="40" y="688" fill="#d4eafa" fontSize="12">BODY WIDTH {formatInches(p.bodyWidthMm)} in · FRONT TRACK {formatInches(p.frontTrackMm)} in · REAR TRACK {formatInches(p.rearTrackMm)} in</text>
            <path d="M40 705H1100" stroke={secondary}/>
            <text x="40" y="724" fill={amber} fontSize="12">CONCEPTUAL GEOMETRY ONLY — NO CUTTING, WELDING OR ROADWORTHINESS APPROVAL</text>
            <text x="1098" y="724" textAnchor="end" fill={line} fontSize="12">A-101 / 01</text>
          </g>
        </svg>
      </section>
      <aside className="plan-aside">
        <section><span className="plan-kicker">01 / SELECTED CONFIGURATION</span><h2>Design schedule</h2>
          <dl>{[["Wheelbase",formatInches(m.wheelbaseMm)+" in"],["Body width",formatInches(p.bodyWidthMm)+" in"],["Body height",formatInches(p.bodyHeightMm)+" in"],["Rear overhang",formatInches(p.rearOverhangMm)+" in"],["Ground clearance",formatInches(p.groundClearanceMm)+" in"],["Front bumper",concept.bumper],["Side glass",concept.sideGlass],["Shock concept",concept.shock],["Spring concept",concept.spring]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
        <section><span className="plan-kicker">02 / WORK PACKAGES</span><h2>Fabrication preparation</h2><ol><li>Capture physical dimensions, axle location and reference photographs</li><li>Confirm wheel opening, tire sweep and full suspension travel</li><li>Review front clip, bumper mounts and chassis interference</li><li>Produce measured component drawings and material specifications</li><li>Obtain engineering and shop review before fabrication</li></ol></section>
        <section className="plan-warning"><span className="plan-kicker">03 / RELEASE GATE</span><h2>Physical fitment blocked</h2><p>All dimensions are digital design inputs. These are not certified shop drawings, cutting templates, weld specifications, or verified physical clearances.</p><p>{design.measurements.filter(m=>m.confidence==="verified").length} of {design.measurements.length} baseline measurement records are verified. Local browser data cannot certify measurements.</p><Link href="/capture">Capture evidence →</Link></section>
      </aside>
    </div>
  </main>;
}
