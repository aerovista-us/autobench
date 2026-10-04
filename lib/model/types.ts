export type Provenance =
  | "observed"
  | "scanDerived"
  | "reference"
  | "assumed"
  | "designed";

export type Confidence = "low" | "medium" | "high" | "verified";

export interface Measurement {
  id: string;
  label: string;
  valueMm: number;
  provenance: Provenance;
  confidence: Confidence;
  locked: boolean;
  source?: string;
}

export interface VehicleParameters {
  baselineWheelbaseMm: number;
  frontAxleOffsetMm: number;
  frontTrackMm: number;
  rearTrackMm: number;
  tireDiameterMm: number;
  tireWidthMm: number;
  bodyWidthMm: number;
  bodyHeightMm: number;
  rearOverhangMm: number;
  frontOverhangMm: number;
  bumperLeadMm: number;
  frameRailSpacingMm: number;
  frameRailWidthMm: number;
  frameRailHeightMm: number;
  groundClearanceMm: number;
  wheelOpeningHalfLengthMm: number;
}

export interface DesignOperation {
  id: string;
  type: "setParameter";
  target: keyof VehicleParameters;
  previousValue: number;
  nextValue: number;
  reason: string;
  timestamp: string;
}

export interface VehicleDesign {
  id: string;
  name: string;
  revision: number;
  units: "mm";
  coordinateSystem: {
    x: "+forward";
    y: "+left";
    z: "+up";
    origin: "rear-axle-center-ground";
  };
  parameters: VehicleParameters;
  measurements: Measurement[];
  operationLog: DesignOperation[];
}
