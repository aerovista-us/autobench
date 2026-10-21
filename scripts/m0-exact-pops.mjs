import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  compileExactPops,
  disposeExactKernel,
  initializeExactKernel,
} from "../lib/geometry/occtExact.ts";

const INCH = 25.4;
const baseline = JSON.parse(
  await readFile(new URL("../data/pops-van.baseline.json", import.meta.url), "utf8"),
);

const candidate = structuredClone(baseline);
candidate.revision = baseline.revision + 1;
candidate.parameters.frontAxleOffsetMm = 10 * INCH;
candidate.operationLog = [
  {
    id: "ci-front-axle-plus-10",
    type: "setParameter",
    target: "frontAxleOffsetMm",
    previousValue: 0,
    nextValue: 10 * INCH,
    reason: "M0 exact Pops fixture",
    timestamp: "2026-10-04T00:00:00.000Z"
  }
];

let baseExact;
let movedExact;

try {
  const initStart = performance.now();
  await initializeExactKernel();
  const initMs = performance.now() - initStart;

  const baselineStart = performance.now();
  baseExact = await compileExactPops(baseline, {
    exportStep: true,
    exportProjection: true,
  });
  const baselineTotalMs = performance.now() - baselineStart;

  const movedStart = performance.now();
  movedExact = await compileExactPops(candidate, {
    exportStep: true,
    exportProjection: true,
  });
  const movedTotalMs = performance.now() - movedStart;

const approx = (actual, expected, tolerance = 0.05, label = "value") => {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    throw new Error(`${label}: non-finite geometry value (actual=${actual}, expected=${expected})`);
  }

  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

approx(
  baseExact.metrics.frontAxleXmm,
  baseline.parameters.baselineWheelbaseMm,
  0.01,
  "baseline front axle absolute X",
);
approx(
  baseExact.metrics.rearAxleXmm,
  0,
  0.01,
  "baseline rear axle absolute X",
);
approx(
  movedExact.metrics.frontAxleXmm,
  baseline.parameters.baselineWheelbaseMm + 10 * INCH,
  0.01,
  "moved front axle absolute X",
);
approx(
  movedExact.metrics.rearAxleXmm,
  0,
  0.01,
  "moved rear axle absolute X",
);
approx(
  movedExact.metrics.frontAxleXmm - baseExact.metrics.frontAxleXmm,
  10 * INCH,
  0.01,
  "front axle exact delta",
);
approx(
  movedExact.metrics.wheelbaseMm - baseExact.metrics.wheelbaseMm,
  10 * INCH,
  0.01,
  "wheelbase exact delta",
);
approx(
  movedExact.metrics.bodyFrontXmm,
  baseExact.metrics.bodyFrontXmm,
  0.001,
  "body front must remain fixed",
);
approx(
  movedExact.metrics.bodyRearXmm,
  baseExact.metrics.bodyRearXmm,
  0.001,
  "body rear must remain fixed",
);

if (!baseExact.step?.length || !movedExact.step?.length) {
  throw new Error("STEP export was empty");
}

if (!baseExact.projectionSvg?.includes("<svg") || !movedExact.projectionSvg?.includes("<svg")) {
  throw new Error("Direct OCCT multiview projection was empty");
}

const baselineProjectionPaths = (baseExact.projectionSvg.match(/<path\b/g) ?? []).length;
const movedProjectionPaths = (movedExact.projectionSvg.match(/<path\b/g) ?? []).length;
if (baselineProjectionPaths <= 0 || movedProjectionPaths <= 0) {
  throw new Error("Direct OCCT multiview projection contained no paths");
}

if (baseExact.triangleCount <= 0 || movedExact.triangleCount <= 0) {
  throw new Error(
    `Exact tessellation was empty (baseline=${baseExact.triangleCount}, moved=${movedExact.triangleCount})`,
  );
}

await mkdir("artifacts", { recursive: true });
await Promise.all([
  writeFile("artifacts/pops-baseline.step", baseExact.step),
  writeFile("artifacts/pops-axle-plus-10.step", movedExact.step),
  writeFile("artifacts/pops-baseline-multiview.svg", baseExact.projectionSvg),
  writeFile("artifacts/pops-axle-plus-10-multiview.svg", movedExact.projectionSvg),
  writeFile(
    "artifacts/pops-exact-fixture.report.json",
    JSON.stringify(
      {
        status: "pass",
        source: "data/pops-van.baseline.json",
        kernel: baseExact.kernel,
        initMs,
        baseline: {
          revision: baseExact.revision,
          triangleCount: baseExact.triangleCount,
          metrics: baseExact.metrics,
          stepBytes: baseExact.step.length,
          projectionPaths: baselineProjectionPaths,
          totalMs: baselineTotalMs,
        },
        axlePlus10: {
          revision: movedExact.revision,
          triangleCount: movedExact.triangleCount,
          metrics: movedExact.metrics,
          stepBytes: movedExact.step.length,
          projectionPaths: movedProjectionPaths,
          totalMs: movedTotalMs,
        },
        assertions: {
          frontAxleDeltaMm: 254,
          wheelbaseDeltaMm: 254,
          bodyEnvelopePreserved: true,
        },
      },
      null,
      2,
    ),
  ),
]);

  console.log(
    JSON.stringify(
      {
        status: "pass",
        kernel: baseExact.kernel,
        initMs,
        baselineWheelbaseMm: baseExact.metrics.wheelbaseMm,
        movedWheelbaseMm: movedExact.metrics.wheelbaseMm,
        movedFrontAxleXmm: movedExact.metrics.frontAxleXmm,
        bodyFrontXmm: movedExact.metrics.bodyFrontXmm,
        baselineTriangles: baseExact.triangleCount,
        movedTriangles: movedExact.triangleCount,
        baselineProjectionPaths,
        movedProjectionPaths,
        baselineTotalMs,
        movedTotalMs,
      },
      null,
      2,
    ),
  );
} finally {
  await disposeExactKernel();
}
