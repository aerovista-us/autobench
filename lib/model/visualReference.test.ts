import { describe, expect, it } from "vitest";
import { frontAxleScenarioInches, frontEndScenarios, g10FrontReference, parseFrontAxleScenario } from "./visualReference";
import { popsVanBaseline } from "./popsVan";

describe("G10 front-end visual reference", () => {
  it("never becomes measurement or Pops Van evidence", () => {
    expect(g10FrontReference.role).toBe("styling-only");
    expect(g10FrontReference.dimensionAuthority).toBe(false);
    expect(g10FrontReference.referenceVehicleIsPopsVan).toBe(false);
    expect(g10FrontReference.sourceUrl).toMatch(/^https:\/\//);
  });
  it("has distinct cue labels and normalized annotation locations", () => {
    const cues = g10FrontReference.designCues;
    expect(new Set(cues.map(c => c.id)).size).toBe(cues.length);
    for (const cue of cues) {
      expect(cue.x).toBeGreaterThanOrEqual(0);
      expect(cue.x).toBeLessThanOrEqual(1);
      expect(cue.y).toBeGreaterThanOrEqual(0);
      expect(cue.y).toBeLessThanOrEqual(1);
    }
  });
  it("provides an explicit plan for every axle-forward scenario", () => {
    expect(frontAxleScenarioInches).toEqual([0, 8, 10, 12, 14]);
    for (const inches of frontAxleScenarioInches) {
      expect(frontEndScenarios[inches].focus.length).toBeGreaterThan(0);
    }
  });
  it("links styling guidance into the canonical project manifest without changing measurements", () => {
    const link = popsVanBaseline.visualReferences?.[0];
    expect(link?.referenceId).toBe(g10FrontReference.id);
    expect(link?.role).toBe("styling-only");
    expect(link?.imagePath).toBe(g10FrontReference.imagePath);
    expect(link?.designCueIds).toEqual(g10FrontReference.designCues.map(cue => cue.id));
    expect(popsVanBaseline.measurements.every(m => m.provenance === "assumed")).toBe(true);
    expect(popsVanBaseline.parameters.frontAxleOffsetMm).toBe(0);
  });
  it("rejects unsupported offsets for the reference guide", () => {
    expect(parseFrontAxleScenario("8")).toBe(8);
    expect(parseFrontAxleScenario("10")).toBe(10);
    expect(parseFrontAxleScenario("13")).toBe(12);
    expect(parseFrontAxleScenario("12.5")).toBe(12);
    expect(parseFrontAxleScenario("9.5")).toBe(10);
    expect(parseFrontAxleScenario("15")).toBe(10);
    expect(parseFrontAxleScenario(null)).toBe(10);
  });
});
