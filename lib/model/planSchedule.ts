import type { VehicleDesign, Measurement } from "./types";
import { formatInches } from "./derive";

export type EvidenceRow = {
 id:string; label:string; designValue:string; observedValue:string; status:"verified"|"needs-measurement";
 source:string; assembly:string;
};
export type PartsRow = {id:string;assembly:string;item:string;quantity:number;basis:string;status:"concept-only"|"measurement-required";notes:string};
const dimensions: Array<{id:string;label:string;key:keyof VehicleDesign["parameters"];assembly:string}> = [
 {id:"body-width",label:"Body overall width",key:"bodyWidthMm",assembly:"Body"},
 {id:"body-height",label:"Body overall height",key:"bodyHeightMm",assembly:"Body"},
 {id:"wheelbase",label:"Wheelbase",key:"baselineWheelbaseMm",assembly:"Chassis"},
 {id:"front-track",label:"Front track",key:"frontTrackMm",assembly:"Suspension"},
 {id:"rear-track",label:"Rear track",key:"rearTrackMm",assembly:"Suspension"},
 {id:"tire-diameter",label:"Tire diameter",key:"tireDiameterMm",assembly:"Wheel openings"},
 {id:"tire-width",label:"Tire width",key:"tireWidthMm",assembly:"Wheel openings"},
 {id:"opening-half",label:"Wheel opening half-length",key:"wheelOpeningHalfLengthMm",assembly:"Wheel openings"},
 {id:"axle-offset",label:"Front axle offset",key:"frontAxleOffsetMm",assembly:"Suspension"},
 {id:"rear-overhang",label:"Rear overhang",key:"rearOverhangMm",assembly:"Body"},
 {id:"front-overhang",label:"Front overhang",key:"frontOverhangMm",assembly:"Front clip"},
 {id:"bumper-lead",label:"Bumper projection",key:"bumperLeadMm",assembly:"Front clip"},
 {id:"ground-clearance",label:"Ground clearance",key:"groundClearanceMm",assembly:"Suspension"},
 {id:"frame-rail-spacing",label:"Frame rail spacing",key:"frameRailSpacingMm",assembly:"Front clip"},
];
/** Capture records must be evidence-verified by a trusted capture workflow.
 * Stored browser drafts are not accepted as measured evidence.
 */
export function buildEvidenceSchedule(design:VehicleDesign):EvidenceRow[]{
 return dimensions.map(d=>{
  const evidence:Measurement|undefined=design.measurements.find(m=>m.id===d.id && m.confidence==="verified" && m.provenance==="observed" && Boolean(m.source?.trim()));
  return {id:d.id,label:d.label,assembly:d.assembly,designValue:formatInches(design.parameters[d.key])+" in",
   observedValue:evidence?formatInches(evidence.valueMm)+" in":"—",
   status:evidence?"verified":"needs-measurement",source:evidence?.source??"No verified measurement source"};
 });
}
export function buildPartsSchedule(design:VehicleDesign):PartsRow[]{
 const opts=design.conceptOptions;
 return [
  {id:"FC-01",assembly:"Front clip",item:"Hood and grille styling envelope",quantity:1,basis:"Concept outline",status:"measurement-required",notes:"Hood profile, grille opening and support locations not measured"},
  {id:"BM-01",assembly:"Front bumper",item:"Bumper concept: "+(opts?.bumper??"stock reference"),quantity:1,basis:"Selected revision",status:"measurement-required",notes:"Frame mounts, loads, material thickness and weld design require engineering"},
  {id:"WO-01",assembly:"Wheel openings",item:"Front wheel-opening clearance review",quantity:2,basis:"Tire Ø "+formatInches(design.parameters.tireDiameterMm)+" in",status:"measurement-required",notes:"Both sides: verify body profile and complete steering/compression travel"},
  {id:"SU-01",assembly:"Suspension",item:"Front suspension concept: "+(opts?.shock??"unverified"),quantity:2,basis:"Selected revision",status:"measurement-required",notes:"Shock travel, brackets, axle path and brake line routing unverified"},
  {id:"BD-01",assembly:"Body",item:"Body width / height envelope",quantity:1,basis:formatInches(design.parameters.bodyWidthMm)+" × "+formatInches(design.parameters.bodyHeightMm)+" in",status:"concept-only",notes:"Envelope reference, not a panel cut pattern"},
 ];
}
