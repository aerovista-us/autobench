import { readFile, writeFile, mkdir } from "node:fs/promises";
import { compileExactPops, initializeExactKernel, disposeExactKernel } from "../lib/geometry/occtExact.ts";

const baseline = JSON.parse(await readFile(new URL("../data/pops-van.baseline.json", import.meta.url), "utf8"));
const presets = {
  cargo: { sideGlass: "cargo", roofRack: false, sideSteps: false,
    rearSpare: false, auxiliaryLights: false, twoTone: false },
  classic: { sideGlass: "conversion", roofRack: false, sideSteps: true,
    rearSpare: false, auxiliaryLights: false, twoTone: true },
  camper: { sideGlass: "porthole", roofRack: true, sideSteps: true,
    rearSpare: false, auxiliaryLights: true, twoTone: true },
  expedition: { sideGlass: "conversion", roofRack: true, sideSteps: true,
    rearSpare: true, auxiliaryLights: true, twoTone: true },
};
const expected = {
  cargo: ["rear-door-center-gap", "rear-step-bumper", "rear-left-taillamp"],
  classic: ["left-sliding-door-window-glass", "right-rear-quarter-window-glass",
    "left-two-tone-side-sweep", "right-entry-step"],
  camper: ["left-rear-porthole-window-glass", "roof-rack-crossbar-0",
    "front-left-aux-lamp-lens"],
  expedition: ["right-rear-quarter-window-glass", "rear-door-spare-tire-envelope",
    "left-roof-rack-rail", "right-entry-step", "front-right-aux-lamp-lens"],
};
const close = (actual, expected, label) => {
  if (Math.abs(actual - expected) > 0.04) throw new Error(`${label}: ${actual} != ${expected}`);
};
const results = {};
await mkdir("artifacts", { recursive: true });
try {
  await initializeExactKernel();
  for (const [index, [name, choices]] of Object.entries(presets).entries()) {
    const design = structuredClone(baseline);
    design.revision = 310 + index;
    design.conceptOptions = { ...choices, bumper: "plate-trail",
      shock: "unverified", spring: "unverified" };
    design.parameters.frontAxleOffsetMm = 10 * 25.4;
    const exact = await compileExactPops(design, { exportStep: name === "expedition" });
    for (const required of expected[name]) {
      if (!exact.partNames.includes(required)) throw new Error(`${name}: missing ${required}`);
    }
    const has = part => exact.partNames.includes(part);
    if (name === "cargo" && (has("left-rear-quarter-window-glass") ||
      has("left-rear-porthole-window-glass"))) throw new Error("Cargo contains window glass");
    if (name !== "expedition" && has("rear-door-spare-tire-envelope")) {
      throw new Error(`${name}: spare carrier appeared unrequested`);
    }
    if (name === "classic" && has("roof-rack-crossbar-0")) {
      throw new Error("Classic preset unexpectedly has roof rack");
    }
    close(exact.metrics.wheelbaseMm,
      design.parameters.baselineWheelbaseMm + design.parameters.frontAxleOffsetMm, "wheelbase");
    close(exact.metrics.bodyRearXmm, -design.parameters.rearOverhangMm, "rear body datum");
    close(exact.metrics.bodyFrontXmm,
      design.parameters.baselineWheelbaseMm + design.parameters.frontOverhangMm, "front body datum");
    if (exact.metrics.bodyIdentity.sideGlass !== choices.sideGlass) {
      throw new Error(`${name}: incorrect side glazing identity`);
    }
    if (exact.metrics.bodyIdentity.leftSidePanelVolumeMm3 <= 0 ||
      exact.metrics.bodyIdentity.rightSidePanelVolumeMm3 <= 0) {
      throw new Error(`${name}: empty BREP side panels`);
    }
    if (name === "expedition") {
      if (!exact.step?.includes("ISO-10303-21")) throw new Error("Expedition STEP export failed");
      await writeFile("artifacts/pops-m4-expedition-CONCEPT.step", exact.step);
    }
    results[name] = {
      parts: exact.partNames.length, triangles: exact.triangleCount,
      sideGlass: exact.metrics.bodyIdentity.sideGlass,
      sidePanelVolumeMm3: exact.metrics.bodyIdentity.leftSidePanelVolumeMm3,
      accessoryPartCount: exact.metrics.bodyIdentity.accessoryPartCount,
      wheelbaseMm: exact.metrics.wheelbaseMm, measuredFitment: "BLOCKED",
      fabricationApproved: false,
    };
  }
  if (!(results.classic.sidePanelVolumeMm3 < results.cargo.sidePanelVolumeMm3)) {
    throw new Error("Conversion glass did not physically subtract BREP sheet metal");
  }
  if (!(results.camper.sidePanelVolumeMm3 < results.cargo.sidePanelVolumeMm3)) {
    throw new Error("Camper porthole did not physically subtract BREP sheet metal");
  }
  if (!(results.expedition.accessoryPartCount > results.classic.accessoryPartCount)) {
    throw new Error("Expedition features were not built into CAD assembly");
  }
  await writeFile("artifacts/pops-m4-van-identity-validation.json", JSON.stringify({
    status: "CAD-concept-pass", measuredGeometry: false,
    physicalModificationApproved: false, presets: results,
  }, null, 2));
  console.log(JSON.stringify({ status: "pass", vanProfiles: results }, null, 2));
} finally {
  await disposeExactKernel();
}
