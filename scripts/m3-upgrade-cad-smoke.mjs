import { readFile, writeFile, mkdir } from "node:fs/promises";
import { compileExactPops, initializeExactKernel, disposeExactKernel } from "../lib/geometry/occtExact.ts";

const baseline = JSON.parse(await readFile(new URL("../data/pops-van.baseline.json", import.meta.url), "utf8"));
const scenarios = [
  { name: "stock", bumper: "chrome-stock", shock: "unverified", spring: "unverified" },
  { name: "trail", bumper: "plate-trail", shock: "monotube", spring: "leaf-service" },
  { name: "winch", bumper: "winch-plate", shock: "remote-reservoir", spring: "heavy-duty-leaf" },
  { name: "guard", bumper: "brush-guard", shock: "unverified", spring: "unverified" },
];
const results = [];
const close = (actual, expected, field) => {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > 0.03) {
    throw new Error(`${field}: expected ${expected}, got ${actual}`);
  }
};
await mkdir("artifacts", { recursive: true });
try {
  await initializeExactKernel();
  for (const [index, scenario] of scenarios.entries()) {
    const design = structuredClone(baseline);
    design.revision = 200 + index;
    design.conceptOptions = {
      bumper: scenario.bumper, shock: scenario.shock, spring: scenario.spring,
    };
    if (scenario.name === "winch") {
      design.parameters.bodyWidthMm = 84 * 25.4;
      design.parameters.bodyHeightMm = 84 * 25.4;
      design.parameters.rearOverhangMm = 58 * 25.4;
      design.parameters.frontAxleOffsetMm = 10 * 25.4;
    }
    const exact = await compileExactPops(design, { exportStep: scenario.name === "winch" });
    const names = exact.partNames;
    for (const required of ["raked-windshield-glass", "roof-crown", "left-roof-shoulder",
      "left-cutout-side-glass", "right-shaped-cabin-panel", "sloped-g10-hood",
      "front-left-silver-wheel-face", "front-right-rim-bead-ring"]) {
      if (!names.includes(required)) throw new Error(`${scenario.name}: missing ${required}`);
    }
    if (!names.some(name => name.includes(scenario.bumper === "chrome-stock" ? "chrome-original-profile" :
      scenario.bumper === "plate-trail" ? "trail-steel-center" :
      scenario.bumper === "winch-plate" ? "winch-envelope" : "brush-guard-crossbar"))) {
      throw new Error(`${scenario.name}: bumper option not modeled`);
    }
    if (scenario.spring !== "unverified" && !names.some(n => n.includes("spring-leaf"))) {
      throw new Error(`${scenario.name}: missing leaf-pack CAD`);
    }
    if (scenario.shock !== "unverified" && !names.some(n => n.includes("shock-envelope"))) {
      throw new Error(`${scenario.name}: missing shock CAD`);
    }
    if (scenario.shock === "unverified" && names.some(n => n.includes("shock-envelope"))) {
      throw new Error(`${scenario.name}: invented shock geometry in unknown state`);
    }
    if (scenario.spring === "unverified" && names.some(n => n.includes("spring-leaf"))) {
      throw new Error(`${scenario.name}: invented spring geometry in unknown state`);
    }
    close(exact.metrics.bodyRearXmm, -design.parameters.rearOverhangMm, "rear datum");
    close(exact.metrics.bodyFrontXmm,
      design.parameters.baselineWheelbaseMm + design.parameters.frontOverhangMm, "front datum");
    close(exact.metrics.wheelbaseMm,
      design.parameters.baselineWheelbaseMm + design.parameters.frontAxleOffsetMm, "wheelbase");
    if (exact.triangleCount < 2500) throw new Error("CAD tessellation unexpectedly coarse");
    if (scenario.name === "winch") {
      for (const material of ["steel", "chrome", "dark"]) {
        const groups = exact.materialGroups.filter(g => g.material === material);
        if (!groups.some(g => g.inspectionVisible) || !groups.some(g => !g.inspectionVisible)) {
          throw new Error(`Inspection failed to separate ${material} chassis parts from body/bumper parts`);
        }
      }
    }
    if (scenario.name === "winch") {
      if (!exact.step?.includes("ISO-10303-21")) throw new Error("Winch + suspension STEP failed");
      await writeFile("artifacts/pops-m3-winch-suspension-CONCEPT.step", exact.step);
    }
    results.push({
      scenario: scenario.name, bumper: scenario.bumper, shock: scenario.shock,
      spring: scenario.spring, parts: names.length, triangles: exact.triangleCount,
      bodyLengthMm: design.parameters.rearOverhangMm + design.parameters.baselineWheelbaseMm +
        design.parameters.frontOverhangMm, bodyWidthMm: design.parameters.bodyWidthMm,
      bodyHeightMm: design.parameters.bodyHeightMm,
      measuredFitment: "BLOCKED", fabricationApproved: false,
    });
  }
  await writeFile("artifacts/pops-m3-concept-validation.json", JSON.stringify({
    status: "CAD-concept-pass", source: "styling reference and assumed baseline",
    measuredVehicleFitment: "BLOCKED", fabricationApproved: false, scenarios: results,
  }, null, 2));
  console.log(JSON.stringify({ status: "pass", scenarios: results }, null, 2));
} finally {
  await disposeExactKernel();
}
