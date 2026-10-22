import { mkdir, readFile, writeFile } from "node:fs/promises";
import { compileExactPops, disposeExactKernel, initializeExactKernel } from "../lib/geometry/occtExact.ts";
import { frontClipSpec } from "../lib/geometry/frontClipSpec.ts";

const baseline = JSON.parse(await readFile(new URL("../data/pops-van.baseline.json", import.meta.url), "utf8"));
const offsets = [0, 8, 10, 12, 14];
const summary = [];
const close = (a, b, label, tolerance = 0.02) => {
  if (!Number.isFinite(a) || Math.abs(a - b) > tolerance) {
    throw new Error(`${label}: expected ${b}, got ${a}`);
  }
};

try {
  await initializeExactKernel();
  await mkdir("artifacts", { recursive: true });
  for (const inches of offsets) {
    const design = structuredClone(baseline);
    design.revision = 100 + inches;
    design.parameters.frontAxleOffsetMm = inches * 25.4;
    const spec = frontClipSpec(design);
    const exact = await compileExactPops(design, {
      exportStep: inches === 10, exportProjection: inches === 10,
    });
    close(exact.metrics.frontAxleXmm, spec.frontAxleXmm, "axle");
    close(exact.metrics.bodyFrontXmm, spec.bodyFrontXmm, "front body datum");
    close(exact.metrics.bodyRearXmm, spec.bodyRearXmm, "rear body datum");
    close(exact.metrics.frontClip.wheelOpeningCenterXmm, spec.frontAxleXmm, "arch alignment");
    close(exact.metrics.frontClip.wheelOpeningRadiusMm, design.parameters.tireDiameterMm / 2 + 85, "arch radius");
    close(exact.metrics.frontClip.staticRadialMarginMm, 85, "static margin");
    if (exact.metrics.frontClip.leftFenderCutVolumeMm3 < 1e6 ||
        exact.metrics.frontClip.rightFenderCutVolumeMm3 < 1e6) {
      throw new Error(`+ ${inches} in: fender opening boolean did not remove meaningful BREP volume`);
    }
    if (exact.metrics.frontClip.hoodRearTopZmm <= exact.metrics.frontClip.hoodNoseTopZmm) {
      throw new Error("Hood should slope toward the front");
    }
    if (exact.materialGroups.length < 6 ||
        !exact.materialGroups.some(g => g.material === "chrome") ||
        !exact.materialGroups.some(g => g.material === "glass")) {
      throw new Error("Styled exact BREP materials missing");
    }
    if (exact.triangleCount < 1500) throw new Error("Detailed geometry did not tessellate");
    if (inches === 10) {
      if (!exact.step?.includes("ISO-10303-21") || !exact.projectionSvg?.includes("<svg")) {
        throw new Error("STEP/projection output invalid");
      }
      await writeFile("artifacts/pops-g10-front-clip-plus-10.step", exact.step);
      await writeFile("artifacts/pops-g10-front-clip-plus-10.svg", exact.projectionSvg);
    }
    summary.push({
      offsetInches: inches, wheelbaseMm: exact.metrics.wheelbaseMm,
      frontAxleXmm: exact.metrics.frontAxleXmm,
      archCenterXmm: exact.metrics.frontClip.wheelOpeningCenterXmm,
      archRadiusMm: exact.metrics.frontClip.wheelOpeningRadiusMm,
      faceLandMm: exact.metrics.frontClip.frontFaceLandMm,
      cabinArchOverlapMm: exact.metrics.frontClip.cabinArchOverlapMm,
      leftFenderCutVolumeMm3: Math.round(exact.metrics.frontClip.leftFenderCutVolumeMm3),
      rightFenderCutVolumeMm3: Math.round(exact.metrics.frontClip.rightFenderCutVolumeMm3),
      materialGroups: exact.materialGroups.map(g => g.material),
      triangles: exact.triangleCount,
    });
  }
  await writeFile("artifacts/pops-g10-front-clip-validation.json", JSON.stringify({
    status: "concept-cad-verified", kernel: "occt-wasm", scenarios: summary,
    measuredPopsVanGeometry: "not available in repository; separate capture review required",
    fabricationApproval: false,
  }, null, 2));
  console.log(JSON.stringify({ status: "pass", scenarios: summary }, null, 2));
} finally {
  await disposeExactKernel();
}
