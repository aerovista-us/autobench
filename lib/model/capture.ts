import { popsVanBaseline } from "./popsVan";
import type { Confidence, Provenance, VehicleParameters } from "./types";

export const CAPTURE_VERSION = 1;
export const CAPTURE_STORAGE_KEY = "autobench:pops-van:capture:v1";
export const INCH_TO_MM = 25.4;

export type CaptureField = Exclude<keyof VehicleParameters, "frontAxleOffsetMm">;
export type PhotoView = "driver-side" | "passenger-side" | "front" | "rear" | "front-three-quarter" | "underbody";

export interface CaptureMeasurement {
  id: CaptureField;
  label: string;
  valueMm: number;
  toleranceMm: number;
  provenance: Provenance;
  confidence: Confidence;
  method: string;
  notes: string;
  source: string;
  observedAt: string;
  locked: boolean;
}

export interface PhotoMarker {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface PhotoScale {
  firstMarkerId: string;
  secondMarkerId: string;
  knownDistanceMm: number;
}

export interface CapturePhoto {
  id: string;
  view: PhotoView;
  reference: string;
  notes: string;
  widthPx?: number;
  heightPx?: number;
  markers?: PhotoMarker[];
  scale?: PhotoScale;
}

export interface CaptureDraft {
  schemaVersion: 1;
  vehicleId: string;
  updatedAt: string;
  measurements: CaptureMeasurement[];
  photos: CapturePhoto[];
}

export const captureFields: { id: CaptureField; label: string; required: boolean; group: string }[] = [
  { id: "baselineWheelbaseMm", label: "Wheelbase", required: true, group: "Axles & tires" },
  { id: "frontTrackMm", label: "Front track", required: true, group: "Axles & tires" },
  { id: "rearTrackMm", label: "Rear track", required: true, group: "Axles & tires" },
  { id: "tireDiameterMm", label: "Tire diameter", required: true, group: "Axles & tires" },
  { id: "tireWidthMm", label: "Tire width", required: false, group: "Axles & tires" },
  { id: "bodyWidthMm", label: "Body width", required: true, group: "Body envelope" },
  { id: "bodyHeightMm", label: "Body height", required: true, group: "Body envelope" },
  { id: "rearOverhangMm", label: "Rear overhang", required: true, group: "Body envelope" },
  { id: "frontOverhangMm", label: "Front overhang", required: true, group: "Body envelope" },
  { id: "bumperLeadMm", label: "Bumper lead", required: false, group: "Body envelope" },
  { id: "frameRailSpacingMm", label: "Frame rail spacing", required: true, group: "Frame & ride height" },
  { id: "frameRailWidthMm", label: "Frame rail width", required: false, group: "Frame & ride height" },
  { id: "frameRailHeightMm", label: "Frame rail height", required: true, group: "Frame & ride height" },
  { id: "groundClearanceMm", label: "Ground clearance", required: true, group: "Frame & ride height" },
  { id: "wheelOpeningHalfLengthMm", label: "Wheel opening half-length", required: false, group: "Body envelope" },
];

export function makeCaptureDraft(): CaptureDraft {
  return {
    schemaVersion: CAPTURE_VERSION,
    vehicleId: popsVanBaseline.id,
    updatedAt: "",
    measurements: captureFields.map(({ id, label }) => ({
      id, label, valueMm: popsVanBaseline.parameters[id], toleranceMm: 25.4,
      provenance: "assumed", confidence: "low", method: "", notes: "",
      source: "M0 provisional model", observedAt: "", locked: false,
    })),
    photos: [],
  };
}

export function toMillimeters(value: number, unit: "in" | "mm") {
  if (!Number.isFinite(value) || value <= 0) throw new Error("Measurement must be a positive finite number");
  return unit === "in" ? Math.round(value * INCH_TO_MM * 1000) / 1000 : value;
}

export function fromMillimeters(value: number, unit: "in" | "mm") {
  return unit === "in" ? value / INCH_TO_MM : value;
}

export function updateCaptureMeasurement(
  draft: CaptureDraft,
  id: CaptureField,
  changes: Partial<Omit<CaptureMeasurement, "id" | "label">>,
): CaptureDraft {
  const existing = draft.measurements.find(m => m.id === id);
  if (!existing) throw new Error(`Unknown capture measurement: ${id}`);
  if (existing.locked && Object.keys(changes).some(key => key !== "locked")) {
    throw new Error(`${existing.label} is locked. Unlock it before editing.`);
  }
  if (changes.valueMm !== undefined && (!Number.isFinite(changes.valueMm) || changes.valueMm <= 0)) {
    throw new Error("Measurement must be a positive finite number");
  }
  if (changes.toleranceMm !== undefined && (!Number.isFinite(changes.toleranceMm) || changes.toleranceMm < 0)) {
    throw new Error("Tolerance must be a nonnegative finite number");
  }
  return {
    ...draft,
    updatedAt: new Date().toISOString(),
    measurements: draft.measurements.map(m => m.id === id ? { ...m, ...changes } : m),
  };
}

export function captureReadiness(draft: CaptureDraft) {
  const missing = captureFields.filter(f => f.required).filter(f => {
    const m = draft.measurements.find(x => x.id === f.id);
    return !m || !Number.isFinite(m.valueMm) || m.valueMm <= 0 ||
      !["observed", "scanDerived"].includes(m.provenance) ||
      !["high", "verified"].includes(m.confidence) ||
      !m.method.trim() || !m.observedAt.trim() ||
      !Number.isFinite(m.toleranceMm) || m.toleranceMm < 0;
  }).map(f => f.label);
  const requiredViews: PhotoView[] = ["driver-side", "front", "rear"];
  const missingViews = requiredViews.filter(view => !draft.photos.some(p => p.view === view && p.reference.trim()));
  const observed = draft.measurements.filter(m =>
    ["observed", "scanDerived"].includes(m.provenance) &&
    ["high", "verified"].includes(m.confidence) && !!m.method.trim() && !!m.observedAt.trim()
  ).length;
  return {
    ready: missing.length === 0 && missingViews.length === 0 && observed >= 5,
    missingMeasurements: missing,
    missingViews,
    observedCount: observed,
    requiredCount: captureFields.filter(f => f.required).length,
    note: "Capture readiness is not structural, steering, brake, suspension, or fabrication approval.",
  };
}

const provenanceValues: Provenance[] = ["observed", "scanDerived", "reference", "assumed", "designed"];
const confidenceValues: Confidence[] = ["low", "medium", "high", "verified"];
const photoViews: PhotoView[] = ["driver-side", "passenger-side", "front", "rear", "front-three-quarter", "underbody"];

export function parseCaptureDraft(json: string): CaptureDraft {
  const value: unknown = JSON.parse(json);
  if (!value || typeof value !== "object") throw new Error("Invalid capture document");
  const draft = value as Partial<CaptureDraft>;
  if (draft.schemaVersion !== CAPTURE_VERSION || draft.vehicleId !== popsVanBaseline.id) {
    throw new Error("Capture version or vehicle ID does not match Pops Van");
  }
  if (!Array.isArray(draft.measurements) || !Array.isArray(draft.photos)) {
    throw new Error("Capture document is missing measurements or photos");
  }
  if (draft.measurements.length !== captureFields.length) {
    throw new Error("Capture document has missing or extra measurement fields");
  }
  const ids = new Set<string>();
  for (const measurement of draft.measurements) {
    if (!measurement || !captureFields.some(f => f.id === measurement.id) || ids.has(measurement.id)) {
      throw new Error("Duplicate or unknown capture measurement");
    }
    ids.add(measurement.id);
    if (!Number.isFinite(measurement.valueMm) || measurement.valueMm <= 0 ||
        !Number.isFinite(measurement.toleranceMm) || measurement.toleranceMm < 0 ||
        !provenanceValues.includes(measurement.provenance) ||
        !confidenceValues.includes(measurement.confidence) ||
        typeof measurement.locked !== "boolean" ||
        !["label","method","notes","source","observedAt"].every(k => typeof (measurement as unknown as Record<string,unknown>)[k] === "string")) {
      throw new Error(`Invalid capture field: ${measurement.id}`);
    }
  }
  const photoIds = new Set<string>();
  for (const photo of draft.photos) {
    if (!photo || typeof photo.id !== "string" || !photo.id || photoIds.has(photo.id) ||
        !photoViews.includes(photo.view) || typeof photo.reference !== "string" ||
        typeof photo.notes !== "string") {
      throw new Error("Invalid or duplicate photo reference");
    }
    photoIds.add(photo.id);
    if ((photo.widthPx !== undefined && (!Number.isInteger(photo.widthPx) || photo.widthPx < 1 || photo.widthPx > 30000)) ||
        (photo.heightPx !== undefined && (!Number.isInteger(photo.heightPx) || photo.heightPx < 1 || photo.heightPx > 30000))) {
      throw new Error("Invalid photo dimensions");
    }
    if (photo.markers !== undefined) {
      if (!Array.isArray(photo.markers) || photo.markers.length > 100) throw new Error("Invalid marker list");
      const markerIds = new Set<string>();
      const labels = new Set<string>();
      for (const marker of photo.markers) {
        if (!marker || typeof marker.id !== "string" || !marker.id ||
            typeof marker.label !== "string" || !marker.label || marker.label.length > 40 ||
            markerIds.has(marker.id) || labels.has(marker.label) ||
            !Number.isFinite(marker.x) || marker.x < 0 || marker.x > 1 ||
            !Number.isFinite(marker.y) || marker.y < 0 || marker.y > 1) {
          throw new Error("Invalid or duplicate photo marker");
        }
        markerIds.add(marker.id);
        labels.add(marker.label);
      }
    }
    if (photo.scale !== undefined) {
      if (!photo.scale || !photo.markers ||
          typeof photo.scale.firstMarkerId !== "string" ||
          typeof photo.scale.secondMarkerId !== "string" ||
          photo.scale.firstMarkerId === photo.scale.secondMarkerId ||
          !photo.markers.some(m => m.id === photo.scale?.firstMarkerId) ||
          !photo.markers.some(m => m.id === photo.scale?.secondMarkerId) ||
          !Number.isFinite(photo.scale.knownDistanceMm) ||
          photo.scale.knownDistanceMm <= 0 || photo.scale.knownDistanceMm > 100000) {
        throw new Error("Invalid photo scale");
      }
    }
  }
  return draft as CaptureDraft;
}
