import { describe, expect, it } from "vitest";
import { popsVanBaseline, INCH } from "../model/popsVan";
import { makeCaptureDraft } from "../model/capture";
import { setVehicleParameter } from "../model/operations";
import { frontClipSpec } from "./frontClipSpec";
import { checkFrontClipAgainstCapture } from "./frontClipCapture";

describe("G10 parametric front-clip geometry", () => {
  it("keeps the fixed body datum and moves arch with axle", () => {
    const base = frontClipSpec(popsVanBaseline);
    const moved = frontClipSpec(setVehicleParameter(popsVanBaseline, "frontAxleOffsetMm", 10 * INCH, "test"));
    expect(moved.wheelOpeningCenterXmm - base.wheelOpeningCenterXmm).toBeCloseTo(254, 6);
    expect(moved.bodyFrontXmm).toBe(base.bodyFrontXmm);
    expect(moved.bodyRearXmm).toBe(base.bodyRearXmm);
    expect(moved.radialStaticMarginMm).toBe(85);
    expect(moved.hoodRearTopZmm).toBeGreaterThan(moved.hoodNoseTopZmm);
  });
  it("evaluates all five axle scenarios and flags aggressive face overlap", () => {
    for (const offset of [0, 8, 10, 12, 14]) {
      const d = setVehicleParameter(popsVanBaseline, "frontAxleOffsetMm", offset * INCH, "test");
      const s = frontClipSpec(d);
      expect(s.faceLandMm).toBeCloseTo(s.bodyFrontXmm - s.frontAxleXmm - s.wheelOpeningRadiusMm, 5);
      expect(s.wheelOpeningCenterZmm).toBe(d.parameters.tireDiameterMm / 2);
    }
    const d14 = setVehicleParameter(popsVanBaseline, "frontAxleOffsetMm", 14 * INCH, "test");
    expect(checkFrontClipAgainstCapture(d14, null).designWarnings.some(x => x.includes("60 mm"))).toBe(true);
  });
  it("fails closed without measured capture and rejects assumed values", () => {
    const check = checkFrontClipAgainstCapture(popsVanBaseline, makeCaptureDraft());
    expect(check.gate).toBe("blocked");
    expect(check.measured).toBe(false);
    expect(check.missingMeasurements.length).toBeGreaterThan(0);
  });
  it("flags trusted measurement mismatches without changing model", () => {
    const capture = makeCaptureDraft();
    capture.measurements = capture.measurements.map(m => m.id === "bodyWidthMm" ? {
      ...m, valueMm: 2200, toleranceMm: 5, provenance: "observed" as const,
      confidence: "verified" as const, method: "tape", observedAt: "2026-10-21",
      source: "user tape", locked: true,
    } : m);
    const check = checkFrontClipAgainstCapture(popsVanBaseline, capture);
    expect(check.gate).toBe("blocked");
    expect(check.mismatches[0]?.field).toBe("bodyWidthMm");
    expect(popsVanBaseline.parameters.bodyWidthMm).toBe(2032);
  });
  it("never claims engineering approval even with complete user-entered evidence", () => {
    const capture = makeCaptureDraft();
    capture.measurements = capture.measurements.map(m => ({
      ...m, provenance: "observed", confidence: "high", method: "tape",
      observedAt: "2026-10-21", source: "user", toleranceMm: 2,
    }));
    capture.photos = ["driver-side", "front", "rear"].map((view, i) => ({
      id: String(i), view: view as "driver-side" | "front" | "rear",
      reference: "private-local-photo-" + i, notes: "",
    }));
    const check = checkFrontClipAgainstCapture(popsVanBaseline, capture);
    expect(check.gate).toBe("review-required");
    expect(check.ready).toBe(true);
    expect(check.note).toContain("not steering");
  });
});
