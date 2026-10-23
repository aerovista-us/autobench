import Link from "next/link";
import { SavedDesignReview } from "@/components/SavedDesignReview";
import { popsVanBaseline, INCH } from "@/lib/model/popsVan";
import { deriveVehicle } from "@/lib/model/derive";
import type { Measurement, Provenance } from "@/lib/model/types";

export const metadata = {
  title: "Model | Pops Van AutoBench",
  description: "Inspect the baseline vehicle model, geometry, measurement provenance and assumption flags.",
};
const baseline = popsVanBaseline;
const metrics = deriveVehicle(baseline);
const groups: Array<{ title: string; entries: Array<[string, number]> }> = [
  { title: "Chassis", entries: [["Baseline wheelbase", baseline.parameters.baselineWheelbaseMm], ["Front track", baseline.parameters.frontTrackMm], ["Rear track", baseline.parameters.rearTrackMm], ["Frame rail spacing", baseline.parameters.frameRailSpacingMm], ["Ground clearance", baseline.parameters.groundClearanceMm]] },
  { title: "Body", entries: [["Body width", baseline.parameters.bodyWidthMm], ["Body height", baseline.parameters.bodyHeightMm], ["Front overhang", baseline.parameters.frontOverhangMm], ["Rear overhang", baseline.parameters.rearOverhangMm]] },
  { title: "Wheels / front clip", entries: [["Tire diameter", baseline.parameters.tireDiameterMm], ["Tire width", baseline.parameters.tireWidthMm], ["Front axle offset", baseline.parameters.frontAxleOffsetMm], ["Bumper lead", baseline.parameters.bumperLeadMm], ["Wheel opening half-length", baseline.parameters.wheelOpeningHalfLengthMm]] },
];
const labels: Record<Provenance, string> = { observed: "Observed", scanDerived: "Scan-derived", reference: "Reference", assumed: "Assumed", designed: "Designed" };
function measurementLine(item: Measurement) {
  return <tr key={item.id}><td style={{padding:"12px 8px"}}>{item.label}</td><td style={{padding:"12px 8px",whiteSpace:"nowrap"}}>{(item.valueMm / INCH).toFixed(2)} in</td><td style={{padding:"12px 8px"}}>{labels[item.provenance]}</td><td style={{padding:"12px 8px"}}>{item.confidence}</td><td style={{padding:"12px 8px"}}>{item.source || "Not recorded"}</td></tr>;
}
export default function ModelPage() {
  const evidence = baseline.measurements;
  const unverified = evidence.filter(m => m.confidence !== "verified");
  return <main style={{minHeight:"100vh",padding:"clamp(20px,5vw,64px)",background:"#071018",color:"#e8f0f6",fontFamily:"system-ui,sans-serif"}}>
    <nav aria-label="Workbench stages" style={{display:"flex",gap:18,flexWrap:"wrap",marginBottom:45}}>
      <Link href="/capture" style={{color:"#8bcdf6"}}>Capture</Link><strong>Model</strong><Link href="/" style={{color:"#8bcdf6"}}>Modify</Link><Link href="/validate" style={{color:"#8bcdf6"}}>Validate</Link><Link href="/plan" style={{color:"#8bcdf6"}}>Plan</Link><Link href="/render" style={{color:"#8bcdf6"}}>Render</Link>
    </nav>
    <p style={{color:"#85caee",letterSpacing:3}}>AEROVISTA / AUTOBENCH / BASELINE MODEL</p>
    <h1 style={{fontSize:"clamp(40px,6vw,72px)",margin:"8px 0"}}>Vehicle model</h1>
    <p style={{fontSize:19,lineHeight:1.6,maxWidth:850,color:"#bdceda"}}>This is the authoritative checked-in baseline, not an unsaved Modify scenario. Dimensions are in millimeters internally and displayed in inches. Reference and assumed measurements are not physical fitment evidence.</p>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",margin:"28px 0"}}>
      <div style={{background:"#132533",padding:20,borderRadius:12,minWidth:175}}><small>Baseline revision</small><h2>{baseline.revision}</h2></div>
      <div style={{background:"#132533",padding:20,borderRadius:12,minWidth:175}}><small>Wheelbase</small><h2>{(metrics.wheelbaseMm/INCH).toFixed(1)} in</h2></div>
      <div style={{background:"#132533",padding:20,borderRadius:12,minWidth:175}}><small>Approach angle · derived</small><h2>{metrics.approachAngleDeg.toFixed(1)}°</h2></div>
      <div style={{background:"#132533",padding:20,borderRadius:12,minWidth:175}}><small>Not verified measurements</small><h2>{unverified.length} / {evidence.length}</h2></div>
    </div>
    <SavedDesignReview stage="model" />
    <h2>Checked-in baseline assembly dimensions</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
      {groups.map(group=><section key={group.title} style={{border:"1px solid #314b5b",borderRadius:12,padding:20}}><h3>{group.title}</h3><dl>{group.entries.map(([label,value])=><div key={label} style={{display:"flex",justifyContent:"space-between",gap:12,borderTop:"1px solid #263c4c",padding:"11px 0"}}><dt>{label}</dt><dd style={{margin:0,whiteSpace:"nowrap"}}>{(value/INCH).toFixed(2)} in</dd></div>)}</dl></section>)}
    </div>
    <h2 style={{marginTop:36}}>Measurement provenance</h2>
    <p style={{color:"#bdceda"}}>Evidence sources, confidence and unresolved assumptions travel with the baseline. Missing source entries must be captured before engineering sign-off.</p>
    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left",minWidth:640}}><thead><tr>{["Measurement","Value","Provenance","Confidence","Source"].map(label=><th key={label} style={{padding:"12px 8px",borderBottom:"1px solid #4d7186"}}>{label}</th>)}</tr></thead><tbody>{evidence.map(measurementLine)}</tbody></table></div>
    <div style={{marginTop:30,padding:22,border:"1px solid #966f2b",borderRadius:12}}><strong>Engineering release gate</strong><p>Do not approve cutting, welding, suspension parts, tire fitment or fabrication from this baseline alone. Confirm actual Pops Van measurements and test clearance through travel and steering.</p></div>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:25}}><Link href="/capture" style={{color:"#8bcdf6"}}>Capture measurements →</Link><Link href="/" style={{color:"#8bcdf6"}}>Modify a candidate →</Link><Link href="/validate" style={{color:"#8bcdf6"}}>Review validation gates →</Link></div>
  </main>;
}
