import { describe, expect, it } from "vitest";
import { popsVanBaseline } from "./popsVan";
import { calculateM5Clearance, popsM5Scenario } from "./m5Clearance";

describe("M5 clearance scenario", () => {
  it("computes the requested 35-inch, +10-inch, 50%, 25-degree envelope without modifying source geometry", () => {
    const original = JSON.stringify(popsVanBaseline);
    const result = calculateM5Clearance(popsVanBaseline, popsM5Scenario);
    expect(result.frontAxleXmm).toBeCloseTo(3429, 6);
    expect(result.tireRadiusMm).toBeCloseTo(444.5, 6);
    expect(result.longitudinalClearanceMm).toBeLessThan(0);
    expect(result.status).toBe("conflict");
    expect(result.missingEvidence).toContain("Measured jounce travel, axle path and bump-stop location");
    expect(JSON.stringify(popsVanBaseline)).toBe(original);
  });
  it("fails on invalid input", () => {
    expect(() => calculateM5Clearance(popsVanBaseline, {...popsM5Scenario, compressionPercent: 150})).toThrow();
  });
  it("does not claim verified clearance when only a horizontal projection is known", () => {
    const result = calculateM5Clearance(popsVanBaseline, {...popsM5Scenario, frontAxleOffsetIn: 0, tireDiameterIn: 30});
    expect(result.status).not.toBe("provisional");
    expect(result.missingEvidence.length).toBeGreaterThan(0);
  });
});
