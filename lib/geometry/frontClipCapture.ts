import { captureReadiness, type CaptureDraft, type CaptureMeasurement } from "../model/capture";
import type { VehicleDesign, VehicleParameters } from "../model/types";
import { frontClipSpec } from "./frontClipSpec";

export type FrontClipGate = "blocked" | "mismatch" | "review-required";
export interface CaptureDimensionCheck {
  field: keyof VehicleParameters;
  observedMm: number;
  modelMm: number;
  toleranceMm: number;
  deltaMm: number;
  withinTolerance: boolean;
  source: string;
}
export interface FrontClipCheck {
  gate: FrontClipGate;
  measured: boolean;
  ready: boolean;
  missingMeasurements: string[];
  missingViews: string[];
  comparisons: CaptureDimensionCheck[];
  mismatches: CaptureDimensionCheck[];
  designWarnings: string[];
  note: string;
}

const trusted = (m: CaptureMeasurement) =>
  (m.provenance === "observed" || m.provenance === "scanDerived") &&
  (m.confidence === "high" || m.confidence === "verified") &&
  Boolean(m.method.trim()) && Boolean(m.observedAt.trim()) &&
  Number.isFinite(m.toleranceMm) && m.toleranceMm >= 0;

export function checkFrontClipAgainstCapture(
  design: VehicleDesign,
  capture: CaptureDraft | null,
): FrontClipCheck {
  const spec = frontClipSpec(design);
  const designWarnings: string[] = [];
  if (spec.faceLandMm < 60) {
    designWarnings.push("Front arch reaches within 60 mm of the fixed nose: front face and fender packaging require redesign.");
  }
  if (spec.cabinArchOverlapMm > 0) {
    designWarnings.push("The exact CAD cuts the front arch into the cabin-side panel. Seam placement, reinforcement and the original body structure still need review.");
  }
  if (spec.radialStaticMarginMm < 100) {
    designWarnings.push("85 mm is a static CAD arch allowance only; steering sweep, suspension compression, articulation, tire growth and liner clearance are NOT verified.");
  }
  const readiness = capture ? captureReadiness(capture) : null;
  const comparisons: CaptureDimensionCheck[] = capture
    ? capture.measurements.filter(trusted).map(m => {
        const modelMm = design.parameters[m.id];
        const deltaMm = modelMm - m.valueMm;
        return {
          field: m.id, observedMm: m.valueMm, modelMm,
          toleranceMm: m.toleranceMm, deltaMm,
          withinTolerance: Math.abs(deltaMm) <= m.toleranceMm,
          source: m.source,
        };
      })
    : [];
  const mismatches = comparisons.filter(c => !c.withinTolerance);
  const ready = readiness?.ready ?? false;
  const gate: FrontClipGate = !ready ? "blocked" : mismatches.length ? "mismatch" : "review-required";
  return {
    gate, measured: comparisons.length > 0, ready,
    missingMeasurements: readiness?.missingMeasurements ?? [
      "No imported or browser-local Pops Van capture; all required measurements pending",
    ],
    missingViews: readiness?.missingViews ?? ["driver-side", "front", "rear"],
    comparisons, mismatches, designWarnings,
    note: ready
      ? "Observed dimensions compared with the provisional CAD envelope. This is a review gate, not steering, suspension, frame, crash, structural or fabrication approval."
      : "Measured geometry check is BLOCKED until Pops Van capture evidence is complete. No photo or styling reference can substitute for actual measurements.",
  };
}
