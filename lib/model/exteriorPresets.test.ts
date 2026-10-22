import { describe, expect, it } from "vitest";
import { popsVanBaseline } from "./popsVan";
import {
  resolveConceptOptions, applyExteriorPreset, currentExteriorPreset,
  setVehicleConceptOption, exteriorPresets,
} from "./conceptOptions";

describe("M4 van identity presets", () => {
  it("defaults to a recognizable conversion van, not a windowless panel truck", () => {
    expect(currentExteriorPreset(popsVanBaseline)).toBe("classic");
    expect(resolveConceptOptions(popsVanBaseline).sideGlass).toBe("conversion");
    expect(resolveConceptOptions(popsVanBaseline).twoTone).toBe(true);
  });
  it("applies a preset as one reversible revision without altering captured data", () => {
    const expedition = applyExteriorPreset(popsVanBaseline, "expedition");
    expect(expedition.revision).toBe(popsVanBaseline.revision + 1);
    expect(expedition.parameters).toEqual(popsVanBaseline.parameters);
    expect(expedition.measurements).toEqual(popsVanBaseline.measurements);
    expect(currentExteriorPreset(expedition)).toBe("expedition");
    expect(expedition.conceptHistory?.every(c => c.note.includes("Unapproved"))).toBe(true);
    expect(applyExteriorPreset(expedition, "expedition")).toBe(expedition);
    const back = applyExteriorPreset(expedition, "classic");
    expect(currentExteriorPreset(back)).toBe("classic");
    expect(back.revision).toBe(expedition.revision + 1);
  });
  it("keeps cargo, camper, and expedition configurations distinct", () => {
    expect(exteriorPresets.cargo.sideGlass).toBe("cargo");
    expect(exteriorPresets.camper.sideGlass).toBe("porthole");
    expect(exteriorPresets.expedition.rearSpare).toBe(true);
    expect(exteriorPresets.classic.roofRack).toBe(false);
  });
  it("preserves independent feature edits and exported revision history", () => {
    const changed = setVehicleConceptOption(popsVanBaseline, "roofRack", true);
    expect(currentExteriorPreset(changed)).toBe("custom");
    expect(changed.conceptOptions?.roofRack).toBe(true);
    expect(changed.conceptHistory?.at(-1)?.value).toBe("true");
    const parsed = JSON.parse(JSON.stringify(changed));
    expect(parsed.conceptOptions.roofRack).toBe(true);
    expect(parsed.conceptHistory).toHaveLength(1);
  });
});
