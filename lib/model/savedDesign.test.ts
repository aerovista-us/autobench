import { describe, expect, it } from "vitest";
import { parseStoredDesign } from "./savedDesign";
import { popsVanBaseline } from "./popsVan";
import { setVehicleParameter } from "./operations";
import { setVehicleConceptOption } from "./conceptOptions";

describe("saved design revision boundary", () => {
  it("restores a non-default edited candidate without changing the baseline", () => {
    const changed = setVehicleConceptOption(
      setVehicleParameter(popsVanBaseline, "frontAxleOffsetMm", 203.2, "Test axle candidate"),
      "sideGlass", "cargo",
    );
    const restored = parseStoredDesign(JSON.stringify(changed));
    expect(restored?.revision).toBe(changed.revision);
    expect(restored?.parameters.frontAxleOffsetMm).toBe(203.2);
    expect(restored?.conceptOptions?.sideGlass).toBe("cargo");
    expect(popsVanBaseline.parameters.frontAxleOffsetMm).toBe(0);
  });

  it("rejects foreign projects, corrupt JSON and invalid dimensions", () => {
    expect(parseStoredDesign("not-json")).toBeNull();
    expect(parseStoredDesign(JSON.stringify({...popsVanBaseline,id:"other"}))).toBeNull();
    expect(parseStoredDesign(JSON.stringify({...popsVanBaseline,parameters:{...popsVanBaseline.parameters,frontAxleOffsetMm:-1}}))).toBeNull();
    expect(parseStoredDesign(JSON.stringify({...popsVanBaseline,parameters:{...popsVanBaseline.parameters,frontAxleOffsetMm:"eight"}}))).toBeNull();
  });

  it("never imports forged measurement verification as evidence", () => {
    const forged = {...popsVanBaseline,measurements:popsVanBaseline.measurements.map(m=>({...m,confidence:"verified",provenance:"observed"}))};
    const restored = parseStoredDesign(JSON.stringify(forged));
    expect(restored?.measurements).toEqual(popsVanBaseline.measurements);
    expect(restored?.measurements.every(m=>m.confidence!=="verified")).toBe(true);
  });
});
