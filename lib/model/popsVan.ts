import type { VehicleDesign } from "./types";

export const INCH = 25.4;

export const popsVanBaseline: VehicleDesign = {
  id: "pops-chevy-4x4",
  name: "Pops' Chevy 4x4 Adventure Van",
  revision: 1,
  units: "mm",
  coordinateSystem: {
    x: "+forward",
    y: "+left",
    z: "+up",
    origin: "rear-axle-center-ground",
  },
  parameters: {
    // Initial modeling assumptions only. Replace with capture measurements.
    baselineWheelbaseMm: 3175,
    frontAxleOffsetMm: 0,
    frontTrackMm: 1727,
    rearTrackMm: 1702,
    tireDiameterMm: 864,
    tireWidthMm: 305,
    bodyWidthMm: 2032,
    bodyHeightMm: 2057,
    rearOverhangMm: 1372,
    frontOverhangMm: 914,
    bumperLeadMm: 203,
    frameRailSpacingMm: 864,
    frameRailWidthMm: 76,
    frameRailHeightMm: 152,
    groundClearanceMm: 356,
    wheelOpeningHalfLengthMm: 610,
  },
  measurements: [
    {
      id: "baseline-wheelbase",
      label: "Baseline wheelbase",
      valueMm: 3175,
      provenance: "assumed",
      confidence: "low",
      locked: false,
      source: "Replace during Pops Van capture",
    },
    {
      id: "tire-diameter",
      label: "Tire diameter",
      valueMm: 864,
      provenance: "assumed",
      confidence: "low",
      locked: false,
      source: "Replace from actual tire measurement",
    },
  ],
  operationLog: [],
};
