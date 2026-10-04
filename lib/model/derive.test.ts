import { describe, expect, it } from "vitest";
import { deriveVehicle } from "./derive";
import { INCH, popsVanBaseline } from "./popsVan";
import { setVehicleParameter } from "./operations";

describe("Pops Van derived geometry", () => {
  it("moves front axle forward without moving the captured body envelope", () => {
    const baseline = deriveVehicle(popsVanBaseline);
    const moved = setVehicleParameter(
      popsVanBaseline,
      "frontAxleOffsetMm",
      10 * INCH,
      "M0 fixture",
    );
    const candidate = deriveVehicle(moved);

    expect(candidate.frontAxleXmm - baseline.frontAxleXmm).toBeCloseTo(254);
    expect(candidate.bodyFrontXmm).toBe(baseline.bodyFrontXmm);
    expect(candidate.wheelbaseMm - baseline.wheelbaseMm).toBeCloseTo(254);
  });

  it("improves approach angle as the axle moves toward the bumper", () => {
    const baseline = deriveVehicle(popsVanBaseline);
    const moved = deriveVehicle(
      setVehicleParameter(
        popsVanBaseline,
        "frontAxleOffsetMm",
        10 * INCH,
        "M0 fixture",
      ),
    );

    expect(moved.approachAngleDeg).toBeGreaterThan(baseline.approachAngleDeg);
  });

  it("reports wheel-opening conflict rather than hiding it", () => {
    const moved = deriveVehicle(
      setVehicleParameter(
        popsVanBaseline,
        "frontAxleOffsetMm",
        10 * INCH,
        "M0 fixture",
      ),
    );

    expect(moved.wheelOpeningClearanceMm).toBeLessThan(0);
  });
});
