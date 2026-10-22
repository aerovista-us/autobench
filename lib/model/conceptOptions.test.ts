import { describe, expect, it } from "vitest";
import { popsVanBaseline } from "./popsVan";
import { resolveConceptOptions, setVehicleConceptOption, conceptCautions } from "./conceptOptions";
import { setVehicleParameter } from "./operations";

describe("Pops Van aftermarket concepts", () => {
  it("starts with unverified suspension, not fabricated bolt-on fitment", () => {
    const options = resolveConceptOptions(popsVanBaseline);
    expect(options.shock).toBe("unverified");
    expect(options.spring).toBe("unverified");
    expect(options.bumper).toBe("chrome-stock");
  });
  it("updates revision and exported concept without mutating canonical measured parameters", () => {
    const upgraded = setVehicleConceptOption(popsVanBaseline, "bumper", "winch-plate");
    const shocks = setVehicleConceptOption(upgraded, "shock", "remote-reservoir");
    const spring = setVehicleConceptOption(shocks, "spring", "heavy-duty-leaf");
    expect(spring.revision).toBe(popsVanBaseline.revision + 3);
    expect(spring.parameters).toEqual(popsVanBaseline.parameters);
    expect(spring.measurements).toEqual(popsVanBaseline.measurements);
    expect(spring.conceptHistory).toHaveLength(3);
    expect(spring.conceptHistory?.every(c => c.note.includes("Unapproved"))).toBe(true);
    expect(setVehicleConceptOption(spring, "spring", "heavy-duty-leaf")).toBe(spring);
  });
  it("keeps size changes as reversible, logged designed operations", () => {
    const revised = setVehicleParameter(popsVanBaseline, "bodyHeightMm", 2133.6, "provisional");
    expect(revised.parameters.bodyHeightMm).toBe(2133.6);
    expect(revised.operationLog.at(-1)?.target).toBe("bodyHeightMm");
    expect(popsVanBaseline.parameters.bodyHeightMm).toBe(2057);
  });
  it("explicitly refuses any unmeasured part fitment claim", () => {
    expect(conceptCautions.join(" ")).toContain("No parts are approved");
    expect(conceptCautions.join(" ")).toContain("shock");
    expect(conceptCautions.join(" ")).toContain("frame");
  });
});
