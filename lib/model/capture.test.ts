import { describe, expect, it } from "vitest";
import {
  captureReadiness, fromMillimeters, makeCaptureDraft, parseCaptureDraft,
  toMillimeters, updateCaptureMeasurement, captureFields,
} from "./capture";

describe("M1 capture evidence", () => {
  it("round-trips inch/mm without changing the canonical mm value", () => {
    expect(toMillimeters(125, "in")).toBe(3175);
    expect(fromMillimeters(3175, "in")).toBe(125);
    expect(() => toMillimeters(Number.NaN, "mm")).toThrow();
  });

  it("keeps provisional dimensions explicitly unready", () => {
    const status = captureReadiness(makeCaptureDraft());
    expect(status.ready).toBe(false);
    expect(status.missingMeasurements).toContain("Wheelbase");
    expect(status.missingViews).toContain("driver-side");
  });

  it("rejects changes to a locked observed measurement", () => {
    let draft = makeCaptureDraft();
    draft = updateCaptureMeasurement(draft, "baselineWheelbaseMm", { locked: true });
    expect(() => updateCaptureMeasurement(draft, "baselineWheelbaseMm", { valueMm: 4000 })).toThrow(/locked/);
    draft = updateCaptureMeasurement(draft, "baselineWheelbaseMm", { locked: false });
    expect(updateCaptureMeasurement(draft, "baselineWheelbaseMm", { valueMm: 4000 }).measurements[0].valueMm).toBe(4000);
  });

  it("fails closed until independent measurements and photo views exist", () => {
    let draft = makeCaptureDraft();
    for (const field of captureFields.filter(f => f.required)) {
      draft = updateCaptureMeasurement(draft, field.id, {
        provenance: "observed", confidence: "high", method: "tape twice",
        observedAt: "2026-10-20", toleranceMm: 5,
      });
    }
    expect(captureReadiness(draft).ready).toBe(false);
    draft.photos = ["driver-side","front","rear"].map((view, i) => ({
      id: String(i), view: view as "driver-side" | "front" | "rear",
      reference: `photo-${i}.jpg`, notes: "",
    }));
    expect(captureReadiness(draft).ready).toBe(true);
  });

  it("rejects corrupted photo marker and scale data on JSON import", () => {
    const draft = makeCaptureDraft();
    draft.photos.push({
      id: "side-1", view: "driver-side", reference: "side.png", notes: "",
      widthPx: 800, heightPx: 400,
      markers: [
        { id: "a", label: "SCALE-A", x: 0.1, y: 0.5 },
        { id: "b", label: "SCALE-B", x: 0.3, y: 0.5 },
      ],
      scale: { firstMarkerId: "a", secondMarkerId: "b", knownDistanceMm: 508 },
    });
    expect(parseCaptureDraft(JSON.stringify(draft)).photos[0].scale?.knownDistanceMm).toBe(508);
    draft.photos[0].markers![1].x = Number.NaN;
    expect(() => parseCaptureDraft(JSON.stringify(draft))).toThrow(/marker/);
    draft.photos[0].markers![1].x = 0.3;
    draft.photos[0].scale!.firstMarkerId = "missing";
    expect(() => parseCaptureDraft(JSON.stringify(draft))).toThrow(/scale/);
  });

  it("validates imported capture documents and rejects duplicate IDs", () => {
    const draft = makeCaptureDraft();
    expect(parseCaptureDraft(JSON.stringify(draft)).measurements.length).toBe(captureFields.length);
    draft.measurements[1].id = draft.measurements[0].id;
    expect(() => parseCaptureDraft(JSON.stringify(draft))).toThrow(/Duplicate/);
  });
});
