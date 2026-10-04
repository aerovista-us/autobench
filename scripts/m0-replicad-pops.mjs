import { mkdir, readFile, writeFile } from "node:fs/promises";
import opencascade from "replicad-opencascadejs";
import {
  makeBox,
  makeCompound,
  makeCylinder,
  setOC,
} from "replicad";

const INCH = 25.4;
const baseline = JSON.parse(
  await readFile(new URL("../data/pops-van.baseline.json", import.meta.url), "utf8"),
);

const candidate = structuredClone(baseline);
candidate.revision = baseline.revision + 1;
candidate.parameters.frontAxleOffsetMm = 10 * INCH;

const assertFinite = (value, label) => {
  if (!Number.isFinite(value)) throw new Error(`${label} is not finite: ${value}`);
};

const approx = (actual, expected, tolerance, label) => {
  assertFinite(actual, label);
  assertFinite(expected, `${label} expected`);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

function readBounds(shape) {
  const bbox = shape.boundingBox;
  try {
    const [min, max] = bbox.bounds;
    return {
      xmin: min[0],
      ymin: min[1],
      zmin: min[2],
      xmax: max[0],
      ymax: max[1],
      zmax: max[2],
    };
  } finally {
    bbox.delete();
  }
}

function midpoint(min, max) {
  return (min + max) / 2;
}

function buildPops(design) {
  const p = design.parameters;
  const rearAxleX = 0;
  const frontAxleX = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const bodyRearX = -p.rearOverhangMm;
  const bodyFrontX = p.baselineWheelbaseMm + p.frontOverhangMm;
  const tireRadius = p.tireDiameterMm / 2;

  const body = makeBox(
    [bodyRearX, -p.bodyWidthMm / 2, p.groundClearanceMm],
    [bodyFrontX, p.bodyWidthMm / 2, p.groundClearanceMm + p.bodyHeightMm],
  );

  const clipWidth = p.bodyWidthMm * 0.94;
  const clipHeight = p.bodyHeightMm * 0.74;
  const frontClip = makeBox(
    [bodyFrontX - 520, -clipWidth / 2, p.groundClearanceMm],
    [bodyFrontX, clipWidth / 2, p.groundClearanceMm + clipHeight],
  );

  const bumper = makeBox(
    [bodyFrontX, -(p.bodyWidthMm + 90) / 2, p.groundClearanceMm],
    [
      bodyFrontX + p.bumperLeadMm,
      (p.bodyWidthMm + 90) / 2,
      p.groundClearanceMm + 180,
    ],
  );

  const frameLength = bodyFrontX - bodyRearX - 180;
  const frameCenterX = (bodyFrontX + bodyRearX) / 2 - 40;
  const frameStartX = frameCenterX - frameLength / 2;
  const frameEndX = frameCenterX + frameLength / 2;

  const leftRail = makeBox(
    [
      frameStartX,
      p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
      p.groundClearanceMm,
    ],
    [
      frameEndX,
      p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
      p.groundClearanceMm + p.frameRailHeightMm,
    ],
  );

  const rightRail = makeBox(
    [
      frameStartX,
      -p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
      p.groundClearanceMm,
    ],
    [
      frameEndX,
      -p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
      p.groundClearanceMm + p.frameRailHeightMm,
    ],
  );

  const lateralCylinder = (radius, length, x, centerY, centerZ) =>
    makeCylinder(
      radius,
      length,
      [x, centerY - length / 2, centerZ],
      [0, 1, 0],
    );

  const frontAxle = lateralCylinder(
    55,
    p.frontTrackMm + 160,
    frontAxleX,
    0,
    tireRadius,
  );
  const rearAxle = lateralCylinder(
    55,
    p.rearTrackMm + 160,
    rearAxleX,
    0,
    tireRadius,
  );

  const frontLeftTire = lateralCylinder(
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    p.frontTrackMm / 2,
    tireRadius,
  );
  const frontRightTire = lateralCylinder(
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    -p.frontTrackMm / 2,
    tireRadius,
  );
  const rearLeftTire = lateralCylinder(
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    p.rearTrackMm / 2,
    tireRadius,
  );
  const rearRightTire = lateralCylinder(
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    -p.rearTrackMm / 2,
    tireRadius,
  );

  const bodyBounds = readBounds(body);
  const frontTireBounds = readBounds(frontLeftTire);
  const rearTireBounds = readBounds(rearLeftTire);

  const assembly = makeCompound([
    body,
    frontClip,
    bumper,
    leftRail,
    rightRail,
    frontAxle,
    rearAxle,
    frontLeftTire,
    frontRightTire,
    rearLeftTire,
    rearRightTire,
  ]);

  return {
    assembly,
    metrics: {
      frontAxleXmm: midpoint(frontTireBounds.xmin, frontTireBounds.xmax),
      rearAxleXmm: midpoint(rearTireBounds.xmin, rearTireBounds.xmax),
      bodyFrontXmm: bodyBounds.xmax,
      bodyRearXmm: bodyBounds.xmin,
    },
  };
}

const initStart = performance.now();
const oc = await opencascade();
setOC(oc);
const initMs = performance.now() - initStart;

async function compile(design) {
  const start = performance.now();
  const { assembly, metrics } = buildPops(design);

  try {
    metrics.wheelbaseMm = metrics.frontAxleXmm - metrics.rearAxleXmm;

    const meshStart = performance.now();
    const mesh = assembly.mesh({ tolerance: 4, angularTolerance: 0.25 });
    const meshMs = performance.now() - meshStart;

    const stepStart = performance.now();
    const stepBlob = assembly.blobSTEP();
    const stepText = await stepBlob.text();
    const stepMs = performance.now() - stepStart;

    return {
      metrics,
      triangleCount: mesh.triangles.length / 3,
      vertexCount: mesh.vertices.length / 3,
      stepText,
      timings: {
        totalMs: performance.now() - start,
        meshMs,
        stepMs,
      },
    };
  } finally {
    assembly.delete();
  }
}

const base = await compile(baseline);
const moved = await compile(candidate);

approx(base.metrics.frontAxleXmm, baseline.parameters.baselineWheelbaseMm, 0.01, "baseline front axle X");
approx(base.metrics.rearAxleXmm, 0, 0.01, "baseline rear axle X");
approx(moved.metrics.frontAxleXmm, baseline.parameters.baselineWheelbaseMm + 254, 0.01, "moved front axle X");
approx(moved.metrics.rearAxleXmm, 0, 0.01, "moved rear axle X");
approx(moved.metrics.wheelbaseMm - base.metrics.wheelbaseMm, 254, 0.01, "wheelbase delta");
approx(moved.metrics.bodyFrontXmm, base.metrics.bodyFrontXmm, 0.001, "body front preserved");
approx(moved.metrics.bodyRearXmm, base.metrics.bodyRearXmm, 0.001, "body rear preserved");

if (base.triangleCount <= 0 || moved.triangleCount <= 0) {
  throw new Error("Replicad produced an empty display mesh");
}
if (!base.stepText.includes("ISO-10303-21") || !moved.stepText.includes("ISO-10303-21")) {
  throw new Error("Replicad STEP export is missing ISO-10303-21 header");
}

await mkdir("artifacts", { recursive: true });
await Promise.all([
  writeFile("artifacts/replicad-pops-baseline.step", base.stepText),
  writeFile("artifacts/replicad-pops-axle-plus-10.step", moved.stepText),
  writeFile(
    "artifacts/replicad-pops.report.json",
    JSON.stringify(
      {
        status: "pass",
        kernel: "replicad",
        initMs,
        baseline: {
          metrics: base.metrics,
          triangleCount: base.triangleCount,
          vertexCount: base.vertexCount,
          stepBytes: Buffer.byteLength(base.stepText),
          timings: base.timings,
        },
        axlePlus10: {
          metrics: moved.metrics,
          triangleCount: moved.triangleCount,
          vertexCount: moved.vertexCount,
          stepBytes: Buffer.byteLength(moved.stepText),
          timings: moved.timings,
        },
      },
      null,
      2,
    ),
  ),
]);

console.log(JSON.stringify({
  status: "pass",
  kernel: "replicad",
  initMs,
  baselineWheelbaseMm: base.metrics.wheelbaseMm,
  movedWheelbaseMm: moved.metrics.wheelbaseMm,
  movedFrontAxleXmm: moved.metrics.frontAxleXmm,
  bodyFrontXmm: moved.metrics.bodyFrontXmm,
  baselineTriangles: base.triangleCount,
  movedTriangles: moved.triangleCount,
  baselineTotalMs: base.timings.totalMs,
  movedTotalMs: moved.timings.totalMs,
}, null, 2));
