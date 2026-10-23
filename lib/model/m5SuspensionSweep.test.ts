import { describe, expect, it } from "vitest";
import { popsVanBaseline } from "./popsVan";
import { popsM5Scenario } from "./m5Clearance";
import { evaluateSuspensionSweep } from "./m5SuspensionSweep";

describe("M5 evidence-gated travel sampling", () => {
  const evidence = {fullBumpTravelMm:100,fullBumpForeAftMm:-12,
    measuredOpeningHalfLengthMm:800,measuredTireWidthMm:305,verified:true};
  it("blocks without verified travel geometry",()=>{
    expect(evaluateSuspensionSweep(popsVanBaseline,popsM5Scenario).status).toBe("blocked");
    expect(evaluateSuspensionSweep(popsVanBaseline,popsM5Scenario,{...evidence,verified:false}).samples).toHaveLength(0);
  });
  it("samples 50% compression and +/-25-degree steering without modifying the manifest",()=>{
    const before=JSON.stringify(popsVanBaseline);
    const result=evaluateSuspensionSweep(popsVanBaseline,popsM5Scenario,evidence);
    expect(result.samples).toHaveLength(33);
    expect(result.samples.at(-1)?.compressionPercent).toBe(50);
    expect(result.samples.at(-1)?.steeringDeg).toBe(25);
    expect(result.samples.at(-1)?.axleZmm).toBeCloseTo(494.5);
    expect(result.status).not.toBe("blocked");
    expect(result.status).not.toBe("verified");
    expect(JSON.stringify(popsVanBaseline)).toBe(before);
  });
  it("fails closed on invalid travel measurements",()=>{
    expect(evaluateSuspensionSweep(popsVanBaseline,popsM5Scenario,{...evidence,fullBumpTravelMm:0}).status).toBe("blocked");
  });
});
