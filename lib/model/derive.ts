import type { VehicleDesign } from "./types";

export interface DerivedVehicleMetrics {
  frontAxleXmm: number;
  rearAxleXmm: number;
  wheelbaseMm: number;
  bodyRearXmm: number;
  bodyFrontXmm: number;
  bumperFrontXmm: number;
  approachRunMm: number;
  approachAngleDeg: number;
  wheelOpeningClearanceMm: number;
  frontAxleOffsetIn: number;
}

export function deriveVehicle(design: VehicleDesign): DerivedVehicleMetrics {
  const p = design.parameters;
  const rearAxleXmm = 0;
  const frontAxleXmm = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const bodyRearXmm = -p.rearOverhangMm;
  const bodyFrontXmm = p.baselineWheelbaseMm + p.frontOverhangMm;
  const bumperFrontXmm = bodyFrontXmm + p.bumperLeadMm;
  const approachRunMm = Math.max(1, bumperFrontXmm - frontAxleXmm);
  const approachAngleDeg =
    (Math.atan2(p.groundClearanceMm, approachRunMm) * 180) / Math.PI;

  const tireRadiusMm = p.tireDiameterMm / 2;
  const wheelOpeningClearanceMm =
    p.wheelOpeningHalfLengthMm -
    tireRadiusMm -
    Math.abs(p.frontAxleOffsetMm);

  return {
    frontAxleXmm,
    rearAxleXmm,
    wheelbaseMm: frontAxleXmm - rearAxleXmm,
    bodyRearXmm,
    bodyFrontXmm,
    bumperFrontXmm,
    approachRunMm,
    approachAngleDeg,
    wheelOpeningClearanceMm,
    frontAxleOffsetIn: p.frontAxleOffsetMm / 25.4,
  };
}

export function formatInches(mm: number, digits = 1) {
  return (mm / 25.4).toFixed(digits);
}
