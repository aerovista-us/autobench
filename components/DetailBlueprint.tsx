"use client";
import type { VehicleDesign } from "@/lib/model/types";
import { deriveVehicle, formatInches } from "@/lib/model/derive";
import { resolveConceptOptions } from "@/lib/model/conceptOptions";

export type DetailSheetId = "front" | "openings" | "suspension" | "body";
export const detailSheets: {id:DetailSheetId;title:string;number:string}[]=[
  {id:"front",title:"Front clip + bumper",number:"F-201"},
  {id:"openings",title:"Wheel openings",number:"F-202"},
  {id:"suspension",title:"Suspension envelope",number:"F-203"},
  {id:"body",title:"Body dimensions",number:"F-204"},
];
const ink="#9dd5f3", muted="#557c97", caution="#ffca79";
const mm=(n:number)=>formatInches(n)+" in";
function Dimension({x1,y1,x2,y2,label}:{x1:number;y1:number;x2:number;y2:number;label:string}){
 const mx=(x1+x2)/2,my=(y1+y2)/2;
 return <g stroke={ink} strokeWidth="1" fill="none"><path d={`M${x1} ${y1}L${x2} ${y2}`}/><path d={`M${x1-5} ${y1-6}l10 12 M${x2-5} ${y2-6}l10 12`}/><rect x={mx-60} y={my-24} width="120" height="18" fill="#092039" stroke="none"/><text x={mx} y={my-10} textAnchor="middle" fontSize="13" fill="#e3f3ff" stroke="none">{label}</text></g>;
}
function Note({x,y,code,text}:{x:number;y:number;code:string;text:string}){
 return <g><circle cx={x} cy={y} r="16" stroke={caution} fill="#153049"/><text x={x} y={y+5} fill={caution} textAnchor="middle" fontSize="13">{code}</text><text x={x+26} y={y+5} fill="#d7eafb" fontSize="13">{text}</text></g>;
}
export function DetailBlueprint({design,sheet}:{design:VehicleDesign;sheet:DetailSheetId}){
 const p=design.parameters,m=deriveVehicle(design),options=resolveConceptOptions(design);
 const selected=detailSheets.find(s=>s.id===sheet)!;
 const radius=125*p.tireDiameterMm/864;
 const bodyW=450,bodyH=280;
 return <svg viewBox="0 0 1140 740" role="img" aria-label={selected.title+" preliminary technical illustration for revision "+design.revision}>
 <defs><pattern id="detail-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" stroke="#153854" strokeWidth=".7" fill="none"/></pattern></defs>
 <rect width="1140" height="740" fill="#092039"/><rect width="1140" height="740" fill="url(#detail-grid)"/>
 <g fontFamily="ui-monospace,Consolas,monospace">
 <text x="42" y="46" fontSize="23" fontWeight="bold" fill="#e2f2ff">POPS VAN / {selected.title.toUpperCase()}</text>
 <text x="42" y="71" fontSize="13" fill={ink}>SHEET {selected.number} · REV {design.revision} · CONCEPTUAL ONLY</text>
 <text x="1090" y="47" fontSize="13" fill={caution} textAnchor="end">MEASURE BEFORE FABRICATION</text>
 {sheet==="front"&&<>
 <text x="48" y="123" fill={ink} fontSize="14">01 — FRONT ELEVATION / DESIGN INTENT</text>
 <g fill="none" stroke={ink} strokeWidth="3"><path d="M310 455L310 250Q320 194 384 188H760Q824 194 834 250V455Z"/><path d="M350 262H795V340H350Z"/><path d="M390 350H754V412H390Z"/><path d="M310 410H834V475H310Z"/><path d="M380 365H765M380 381H765M380 397H765" stroke={muted}/><circle cx="350" cy="378" r="20"/><circle cx="792" cy="378" r="20"/></g>
 <path d="M310 480H834" stroke={caution} strokeWidth="6"/>
 <Dimension x1={310} y1={515} x2={834} y2={515} label={"BODY "+mm(p.bodyWidthMm)}/>
 <Note x={74} y={230} code="01" text="Hood height: not measured"/><Note x={74} y={265} code="02" text="Grille opening: styling only"/>
 <Note x={650} y={590} code="03" text={"Bumper: "+options.bumper}/><Note x={650} y={625} code="04" text="Mounting points: unverified"/>
 </>}
 {sheet==="openings"&&<>
 <text x="48" y="123" fill={ink} fontSize="14">01 — FRONT WHEEL OPENING / NOMINAL 2D ENVELOPE</text>
 <g fill="none" stroke={ink} strokeWidth="3"><path d="M195 465H925V285H195Z" stroke={muted}/><path d="M320 465V335Q570 125 820 335V465" strokeDasharray="9 5"/><circle cx={570+p.frontAxleOffsetMm*.3} cy="430" r={radius}/><circle cx={570+p.frontAxleOffsetMm*.3} cy="430" r={radius*.45}/><path d="M570 180V590" stroke={caution} strokeDasharray="7 7"/></g>
 <Dimension x1={320} y1={505} x2={820} y2={505} label={"OPENING HALF "+mm(p.wheelOpeningHalfLengthMm)}/>
 <Dimension x1={570-radius} y1={570} x2={570+radius} y2={570} label={"TIRE Ø "+mm(p.tireDiameterMm)}/>
 <Note x={65} y={620} code="01" text={"Axle offset "+mm(p.frontAxleOffsetMm)}/><Note x={65} y={655} code="02" text="Steering + compression sweep pending"/>
 </>}
 {sheet==="suspension"&&<>
 <text x="48" y="123" fill={ink} fontSize="14">01 — FRONT AXLE / SUSPENSION SCHEMATIC</text>
 <g fill="none" stroke={ink} strokeWidth="3"><path d="M280 255H860V290H280Z"/><path d="M325 290L380 440H760L815 290"/><path d="M240 445H900" strokeWidth="12"/><circle cx="260" cy="445" r="95"/><circle cx="880" cy="445" r="95"/><path d="M370 300l40 30-40 30 40 30-40 30 M770 300l-40 30 40 30-40 30 40 30" stroke={caution}/><path d="M570 250V545" stroke={muted} strokeDasharray="8 7"/></g>
 <Dimension x1={260} y1={580} x2={880} y2={580} label={"FRONT TRACK "+mm(p.frontTrackMm)}/>
 <Note x={60} y={630} code="01" text={"Shock concept: "+options.shock}/><Note x={60} y={665} code="02" text={"Spring concept: "+options.spring}/>
 <Note x={600} y={630} code="03" text="Full bump + droop: unmeasured"/><Note x={600} y={665} code="04" text="No verified 3D fitment"/>
 </>}
 {sheet==="body"&&<>
 <text x="48" y="123" fill={ink} fontSize="14">01 — BODY ENVELOPE / NOT TO SCALE</text>
 <g fill="none" stroke={ink} strokeWidth="3"><rect x={340} y={210} width={bodyW} height={bodyH} rx="16"/><path d="M340 330H790M565 210V490" stroke={muted} strokeDasharray="9 6"/><path d="M340 250H790" stroke={muted}/></g>
 <Dimension x1={340} y1={530} x2={790} y2={530} label={"WIDTH "+mm(p.bodyWidthMm)}/>
 <Dimension x1={820} y1={210} x2={820} y2={490} label={"HEIGHT "+mm(p.bodyHeightMm)}/>
 <Note x={60} y={605} code="01" text={"Rear overhang "+mm(p.rearOverhangMm)}/><Note x={60} y={640} code="02" text={"Front overhang "+mm(p.frontOverhangMm)}/>
 <Note x={595} y={605} code="03" text={"Ground clearance "+mm(p.groundClearanceMm)}/><Note x={595} y={640} code="04" text="Hood / roof details: unmeasured"/>
 </>}
 <path d="M42 690H1098" stroke={muted}/>
 <text x="42" y="714" fill={caution} fontSize="12">NO CUT LINES · NO MATERIAL SPECIFICATIONS · PHYSICAL FITMENT BLOCKED</text>
 <text x="1098" y="714" textAnchor="end" fill={ink} fontSize="12">{selected.number} / CONCEPT</text>
 </g></svg>;
}
