import type { VehicleDesign } from "./types";
import { INCH } from "./popsVan";
import type { M5Scenario } from "./m5Clearance";

export interface SuspensionTravelEvidence {
  /** Measured axle center vertical displacement from ride height at full bump, mm. */
  fullBumpTravelMm: number;
  /** Measured axle center fore/aft displacement at full bump, mm. */
  fullBumpForeAftMm: number;
  /** Measured wheel opening half-length at the evaluated tire center height, mm. */
  measuredOpeningHalfLengthMm: number;
  /** Measured actual tire section width, mm. */
  measuredTireWidthMm: number;
  /** Provenance: must be backed by measured vehicle evidence. */
  verified: boolean;
}
export interface SuspensionSweepResult {
  status: "blocked" | "conflict" | "screened-only";
  samples: Array<{compressionPercent:number; steeringDeg:number; axleXmm:number; axleZmm:number; projectedClearanceMm:number}>;
  minimumProjectedClearanceMm: number | null;
  blockers: string[];
}

/** Sample an explicitly measured, linearly interpolated axle-center path.
 * Only horizontal projected envelope is checked; this never proves 3D clearance.
 */
export function evaluateSuspensionSweep(design: VehicleDesign, scenario: M5Scenario, evidence?: SuspensionTravelEvidence): SuspensionSweepResult {
  if (!evidence || !evidence.verified ||
      [evidence.fullBumpTravelMm,evidence.fullBumpForeAftMm,evidence.measuredOpeningHalfLengthMm,evidence.measuredTireWidthMm].some(v=>!Number.isFinite(v)) ||
      evidence.fullBumpTravelMm <= 0 || evidence.measuredOpeningHalfLengthMm <= 0 || evidence.measuredTireWidthMm <= 0) {
    return {status:"blocked",samples:[],minimumProjectedClearanceMm:null,blockers:["Measured and verified axle travel, tire width and wheel-opening profile required"]};
  }
  if (!Number.isFinite(scenario.compressionPercent) || scenario.compressionPercent<0 || scenario.compressionPercent>100 ||
      !Number.isFinite(scenario.steeringDeg) || Math.abs(scenario.steeringDeg)>90 ||
      !Number.isFinite(scenario.tireDiameterIn) || scenario.tireDiameterIn<=0 ||
      !Number.isFinite(scenario.frontAxleOffsetIn)) {
    throw new Error("Invalid sweep scenario");
  }
  const samples = [];
  const tireRadius = scenario.tireDiameterIn * INCH / 2;
  const maxSteer = Math.abs(scenario.steeringDeg);
  const frontAxleXmm = design.parameters.baselineWheelbaseMm + scenario.frontAxleOffsetIn * INCH;
  for (let i=0;i<=10;i++) {
    const fraction = i/10;
    const compressionPercent = scenario.compressionPercent*fraction;
    const axleXmm = frontAxleXmm + evidence.fullBumpForeAftMm * compressionPercent/100;
    const axleZmm = tireRadius + evidence.fullBumpTravelMm * compressionPercent/100;
    for (const steeringDeg of [-maxSteer,0,maxSteer]) {
      const angle = Math.abs(steeringDeg)*Math.PI/180;
      const halfLength = tireRadius*Math.cos(angle) + evidence.measuredTireWidthMm/2*Math.sin(angle);
      const projectedClearanceMm = evidence.measuredOpeningHalfLengthMm -
        Math.abs(axleXmm-design.parameters.baselineWheelbaseMm) - halfLength;
      samples.push({compressionPercent,steeringDeg,axleXmm,axleZmm,projectedClearanceMm});
    }
  }
  const minimumProjectedClearanceMm = Math.min(...samples.map(s=>s.projectedClearanceMm));
  return {status:minimumProjectedClearanceMm<0?"conflict":"screened-only",samples,minimumProjectedClearanceMm,
    blockers:["3D fender contour and lateral wheel sweep not evaluated","Linear axle path approximation requires measured intermediate positions","No steering linkage, shock, brake hose, or frame collision certification"]};
}
