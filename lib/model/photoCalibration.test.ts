import { describe, expect, it } from "vitest";
import { addOrMoveMarker, photoScale, wheelbaseCrosscheck } from "./photoCalibration";
import type { CapturePhoto } from "./capture";

const base: CapturePhoto = {
  id: "photo-1", view: "driver-side", reference: "side.jpg", notes: "",
  widthPx: 1000, heightPx: 500,
  markers: [
    { id: "a", label: "SCALE-A", x: 0.1, y: 0.5 },
    { id: "b", label: "SCALE-B", x: 0.3, y: 0.5 },
    { id: "f", label: "FAX-L", x: 0.8, y: 0.5 },
    { id: "r", label: "RAX-L", x: 0.3, y: 0.5 },
  ],
  scale: { firstMarkerId: "a", secondMarkerId: "b", knownDistanceMm: 1000 },
};

describe("M1 image-plane datum calibration", () => {
  it("computes physical image-plane scale from two named markers", () => {
    const scale = photoScale(base);
    expect(scale?.pixels).toBeCloseTo(200);
    expect(scale?.millimetersPerPixel).toBeCloseTo(5);
  });
  it("rejects zero/short separation and impossible physical length", () => {
    expect(photoScale({ ...base, scale: { ...base.scale!, knownDistanceMm: 0 } })).toBeNull();
    expect(photoScale({ ...base, markers: base.markers!.map(m => m.id === "b" ? { ...m, x: 0.11 } : m) })).toBeNull();
  });
  it("compares image wheelbase to measured baseline without treating it as 3D registration", () => {
    const check = wheelbaseCrosscheck(base, 2500);
    expect(check?.measuredMm).toBeCloseTo(2500);
    expect(check?.deltaMm).toBeCloseTo(0);
    expect(check?.independentScale).toBe(true);
  });
  it("moves an existing named marker rather than silently duplicating it", () => {
    const moved = addOrMoveMarker(base, "FAX-L", 0.75, 0.45, "unused");
    expect(moved.markers).toHaveLength(4);
    expect(moved.markers?.find(m => m.label === "FAX-L")?.x).toBe(0.75);
    expect(() => addOrMoveMarker(base, "BAD", 0.5, 0.5, "bad")).toThrow();
  });
});
