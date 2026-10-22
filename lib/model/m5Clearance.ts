import type { VehicleDesign } from "./types";
import { INCH } from "./popsVan";

export interface M5Scenario {
  tireDiameterIn: number;
  frontAxleOffsetIn: number;
  compressionPercent: number;
  steeringDeg: number;
}
export interface M5ClearanceResult {
  status: "conflict" | "provisional" | "blocked";
  frontAxleXmm: number;
  wheelbaseMm: number;
  tireRadiusMm: number;
  tireWidthMm: number;
  steeringSweepHalfLengthMm: number;
  availableOpeningHalfLengthMm: number;
  longitudinalClearanceMm: number;
  missingEvidence: string[];
  explanation: string;
}
export const popsM5Scenario: M5Scenario = {
  tireDiameterIn: 35, frontAxleOffsetIn: 10, compressionPercent: 50, steeringDeg: 25,
};

/**
 * Exact analytical horizontal projection of a rotated rectangular tire envelope.
 * This is an intentionally conservative bounding calculation, NOT a 3D suspension
 * simulation or a physical fitment pass. Compression requires measured jounce
 * and axle path, so it is never silently translated to invented millimeters.
 */
export function calculateM5Clearance(design: VehicleDesign, scenario: M5Scenario): M5ClearanceResult {
  const p = design.parameters;
  const values = [scenario.tireDiameterIn, scenario.frontAxleOffsetIn,
    scenario.compressionPercent, scenario.steeringDeg, p.tireWidthMm,
    p.wheelOpeningHalfLengthMm, p.baselineWheelbaseMm];
  if (values.some(v => !Number.isFinite(v)) ||
      scenario.tireDiameterIn <= 0 || scenario.frontAxleOffsetIn < 0 ||
      scenario.compressionPercent < 0 || scenario.compressionPercent > 100 ||
      Math.abs(scenario.steeringDeg) > 90 || p.tireWidthMm <= 0) {
    throw new Error("Invalid M5 scenario or vehicle dimensions");
  }
  const tireRadiusMm = scenario.tireDiameterIn * INCH / 2;
  const theta = Math.abs(scenario.steeringDeg) * Math.PI / 180;
  const steeringSweepHalfLengthMm =
    tireRadiusMm * Math.cos(theta) + p.tireWidthMm / 2 * Math.sin(theta);
  const frontAxleXmm = p.baselineWheelbaseMm + scenario.frontAxleOffsetIn * INCH;
  const availableOpeningHalfLengthMm = p.wheelOpeningHalfLengthMm -
    scenario.frontAxleOffsetIn * INCH;
  const longitudinalClearanceMm = availableOpeningHalfLengthMm - steeringSweepHalfLengthMm;
  const missingEvidence = [
    "Measured tire section width and dynamic tire growth",
    "Measured front fender/wheel opening contour",
    "Measured jounce travel, axle path and bump-stop location",
    "Measured steering linkage, scrub radius and wheel offset",
    "Measured spring, shock, frame and brake hose envelopes",
  ];
  const status = longitudinalClearanceMm < 0 ? "conflict" : "blocked";
  return {
    status, frontAxleXmm, wheelbaseMm: frontAxleXmm,
    tireRadiusMm, tireWidthMm: p.tireWidthMm,
    steeringSweepHalfLengthMm, availableOpeningHalfLengthMm,
    longitudinalClearanceMm, missingEvidence,
    explanation: longitudinalClearanceMm < 0
      ? "The conservative tire envelope intersects the provisional original longitudinal opening. This is a design conflict, not a measured physical collision."
      : "No conflict found in this single projected envelope, but compression and full 3D fitment cannot be evaluated without measured suspension geometry.",
  };
}
