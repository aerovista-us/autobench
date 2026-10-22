import type { CapturePhoto } from "./capture";

export interface PhotoCalibration {
  pixels: number;
  millimetersPerPixel: number;
  pixelsPerMillimeter: number;
  warning: string;
}

export const datumLabels = [
  "SCALE-A", "SCALE-B", "FAX-L", "RAX-L", "FAX-R", "RAX-R",
  "FR-L1", "FR-R1", "FR-L2", "FR-R2", "FW-L", "FW-R", "RS-L", "RS-R", "BF-L", "BF-R",
] as const;

export function photoScale(photo: CapturePhoto): PhotoCalibration | null {
  if (!photo.scale || !photo.widthPx || !photo.heightPx || !photo.markers) return null;
  const a = photo.markers.find(m => m.id === photo.scale?.firstMarkerId);
  const b = photo.markers.find(m => m.id === photo.scale?.secondMarkerId);
  if (!a || !b || a.id === b.id) return null;
  const dx = (a.x - b.x) * photo.widthPx;
  const dy = (a.y - b.y) * photo.heightPx;
  const pixels = Math.hypot(dx, dy);
  if (!Number.isFinite(pixels) || pixels < 20 ||
      !Number.isFinite(photo.scale.knownDistanceMm) || photo.scale.knownDistanceMm <= 0) return null;
  return {
    pixels,
    millimetersPerPixel: photo.scale.knownDistanceMm / pixels,
    pixelsPerMillimeter: pixels / photo.scale.knownDistanceMm,
    warning: "Image-plane scale only. Perspective, lens distortion, camera pose, and 3D registration are not calibrated.",
  };
}

export function wheelbaseCrosscheck(photo: CapturePhoto, expectedMm: number) {
  const scale = photoScale(photo);
  if (!scale || !photo.markers || !Number.isFinite(expectedMm) || expectedMm <= 0 ||
      !photo.widthPx || !photo.heightPx) return null;
  const left = photo.markers.find(m => m.label === "FAX-L");
  const rear = photo.markers.find(m => m.label === "RAX-L");
  if (!left || !rear) return null;
  const measuredPx = Math.hypot((left.x - rear.x) * photo.widthPx, (left.y - rear.y) * photo.heightPx);
  const measuredMm = measuredPx * scale.millimetersPerPixel;
  const deltaMm = measuredMm - expectedMm;
  const scaleMarkers = [photo.scale?.firstMarkerId, photo.scale?.secondMarkerId];
  return {
    measuredMm,
    expectedMm,
    deltaMm,
    independentScale: !scaleMarkers.includes(left.id) && !scaleMarkers.includes(rear.id),
    warning: "A 2D comparison cannot verify 3D wheelbase without camera calibration.",
  };
}

export function addOrMoveMarker(photo: CapturePhoto, label: string, x: number, y: number, id: string): CapturePhoto {
  if (!datumLabels.includes(label as typeof datumLabels[number]) ||
      !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error("Marker must use a known datum label and normalized image coordinates.");
  }
  const markers = photo.markers ?? [];
  const existing = markers.find(m => m.label === label);
  return {
    ...photo,
    markers: existing
      ? markers.map(m => m.id === existing.id ? { ...m, x, y } : m)
      : [...markers, { id, label, x, y }],
  };
}
