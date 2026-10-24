import type { VehicleDesign } from "../model/types";

/** Concept geometry only: no physical Pops Van dimensions are asserted here. */
export interface FrontClipSpec {
  frontAxleXmm: number;
  bodyFrontXmm: number;
  bodyRearXmm: number;
  cabinFrontXmm: number;
  wheelOpeningCenterXmm: number;
  wheelOpeningCenterZmm: number;
  wheelOpeningRadiusMm: number;
  radialStaticMarginMm: number;
  faceLandMm: number;
  cabinArchOverlapMm: number;
  hoodRearTopZmm: number;
  hoodNoseTopZmm: number;
  hoodRearBottomZmm: number;
  hoodNoseBottomZmm: number;
  bumperFrontXmm: number;
  widthMm: number;
  groundClearanceMm: number;
}

export function frontClipSpec(design: VehicleDesign): FrontClipSpec {
  const p = design.parameters;
  const frontAxleXmm = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const bodyFrontXmm = p.baselineWheelbaseMm + p.frontOverhangMm;
  // Short-nose G-series proportion. Provisional visual proportion, NOT measured.
  const cabinFrontXmm = bodyFrontXmm - 700;
  const wheelOpeningRadiusMm = p.tireDiameterMm / 2 + 85;
  const faceLandMm = bodyFrontXmm - frontAxleXmm - wheelOpeningRadiusMm;
  return {
    frontAxleXmm,
    bodyFrontXmm,
    bodyRearXmm: -p.rearOverhangMm,
    cabinFrontXmm,
    wheelOpeningCenterXmm: frontAxleXmm,
    wheelOpeningCenterZmm: p.tireDiameterMm / 2,
    wheelOpeningRadiusMm,
    radialStaticMarginMm: 85,
    faceLandMm,
    cabinArchOverlapMm: Math.max(0, cabinFrontXmm - (frontAxleXmm - wheelOpeningRadiusMm)),
    hoodRearTopZmm: p.groundClearanceMm + 1230,
    hoodNoseTopZmm: p.groundClearanceMm + 1190,
    hoodRearBottomZmm: p.groundClearanceMm + 1090,
    hoodNoseBottomZmm: p.groundClearanceMm + 1050,
    bumperFrontXmm: bodyFrontXmm + p.bumperLeadMm,
    widthMm: p.bodyWidthMm,
    groundClearanceMm: p.groundClearanceMm,
  };
}
