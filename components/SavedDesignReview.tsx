"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useSavedVehicleDesign } from "@/lib/model/savedDesign";
import { deriveVehicle } from "@/lib/model/derive";
import { INCH } from "@/lib/model/popsVan";
import { resolveConceptOptions } from "@/lib/model/conceptOptions";
import { calculateM5Clearance } from "@/lib/model/m5Clearance";
import { evaluateSuspensionSweep } from "@/lib/model/m5SuspensionSweep";

export function SavedDesignReview({ stage }: { stage: "model" | "validate" }) {
  const { design, hydrated } = useSavedVehicleDesign();
  const metrics = useMemo(() => deriveVehicle(design), [design]);
  const concepts = resolveConceptOptions(design);
  const baselineClearance = metrics.wheelOpeningClearanceMm;
  const scenario = useMemo(() => ({
    tireDiameterIn: design.parameters.tireDiameterMm / INCH,
    frontAxleOffsetIn: design.parameters.frontAxleOffsetMm / INCH,
    compressionPercent: 100,
    steeringDeg: 35,
  }), [design]);
  const m5 = useMemo(() => calculateM5Clearance(design, scenario), [design, scenario]);
  const sweep = useMemo(() => evaluateSuspensionSweep(design, scenario), [design, scenario]);
  return <section aria-label="Saved vehicle design" style={{padding:24,margin:"24px 0",border:"1px solid #3c667d",borderRadius:14,background:"#112533"}}>
    <h2>{stage === "model" ? "Selected design revision" : "Candidate validation screening"}</h2>
    {!hydrated ? <p>Loading saved design from this browser…</p> : <>
      <p>Revision <strong>{design.revision}</strong> · local browser draft · not server-synced or engineering-approved</p>
      <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
        <p>Front axle offset: <strong>{(design.parameters.frontAxleOffsetMm/INCH).toFixed(1)} in</strong></p>
        <p>Wheelbase: <strong>{(metrics.wheelbaseMm/INCH).toFixed(1)} in</strong></p>
        <p>Tire diameter: <strong>{(design.parameters.tireDiameterMm/INCH).toFixed(1)} in</strong></p>
        <p>Body width: <strong>{(design.parameters.bodyWidthMm/INCH).toFixed(1)} in</strong></p>
        <p>Side glass: <strong>{concepts.sideGlass}</strong></p>
        <p>Front bumper: <strong>{concepts.bumper}</strong></p>
      </div>
      {stage === "validate" ? <>
        <h3>M5 steering-envelope screening · selected revision</h3>
        <p>Conservative steering projection at {scenario.steeringDeg}°: <strong>{(m5.longitudinalClearanceMm/INCH).toFixed(2)} in</strong> · {m5.status.toUpperCase()}</p>
        <p>Suspension sweep: <strong>{sweep.status.toUpperCase()}</strong> — {sweep.blockers.join("; ")}</p>
        <p style={{color:"#ffca78"}}>M5 does not infer suspension travel from compression percentage. 3D tire/body screening remains blocked until measured body mesh and verified axle travel are supplied.</p>
        <h3>Legacy 2D opening-envelope screening</h3>
        <p>Calculated clearance: <strong>{(baselineClearance/INCH).toFixed(2)} in</strong> — {baselineClearance < 0 ? "Geometric conflict in legacy approximation" : "No conflict in legacy approximation only"}</p>
        <p style={{color:"#ffca78"}}>This calculation is not a tire/body intersection test. It does not account for turning envelopes, steering, compression, shock travel, body mesh accuracy or mount geometry. Physical fitment remains unverified.</p>
        <p>Measurement evidence: {design.measurements.filter(m=>m.confidence==="verified").length} verified of {design.measurements.length} baseline records. Local draft data cannot upgrade evidence confidence.</p>
      </> : <p>Derived approach angle: {metrics.approachAngleDeg.toFixed(1)}°. Values reflect this saved candidate, not just the checked-in baseline.</p>}
      <Link href="/" style={{color:"#9cdaff"}}>Return to Modify to change this revision →</Link>
    </>}
  </section>;
}
