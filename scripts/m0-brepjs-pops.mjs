import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  box,
  cylinder,
  exportAssemblySTEP,
  getBounds,
  init,
  mesh,
  unwrap,
} from "brepjs";

const INCH = 25.4;
const baseline = JSON.parse(
  await readFile(new URL("../data/pops-van.baseline.json", import.meta.url), "utf8"),
);
const movedDesign = structuredClone(baseline);
movedDesign.revision = baseline.revision + 1;
movedDesign.parameters.frontAxleOffsetMm = 10 * INCH;

function approx(actual, expected, tolerance, label) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    throw new Error(`${label}: non-finite value actual=${actual} expected=${expected}`);
  }
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function midpoint(min, max) {
  return (min + max) / 2;
}

function buildScenario(design) {
  const p = design.parameters;
  const rearAxleX = 0;
  const frontAxleX = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const bodyRearX = -p.rearOverhangMm;
  const bodyFrontX = p.baselineWheelbaseMm + p.frontOverhangMm;
  const tireRadius = p.tireDiameterMm / 2;
  const parts = [];

  const addBox = (name, x1, y1, z1, x2, y2, z2, color) => {
    const solid = box(x2 - x1, y2 - y1, z2 - z1, {
      at: [(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2],
      centered: true,
    });
    parts.push({ name, shape: solid, color });
    return solid;
  };

  const addCylinder = (name, radius, length, x, centerY, centerZ, color) => {
    const solid = cylinder(radius, length, {
      at: [x, centerY, centerZ],
      axis: [0, 1, 0],
      centered: true,
    });
    parts.push({ name, shape: solid, color });
    return solid;
  };

  const body = addBox(
    "Body envelope",
    bodyRearX,
    -p.bodyWidthMm / 2,
    p.groundClearanceMm,
    bodyFrontX,
    p.bodyWidthMm / 2,
    p.groundClearanceMm + p.bodyHeightMm,
    "#245277",
  );

  const clipWidth = p.bodyWidthMm * 0.94;
  const clipHeight = p.bodyHeightMm * 0.74;
  addBox(
    "Front clip",
    bodyFrontX - 520,
    -clipWidth / 2,
    p.groundClearanceMm,
    bodyFrontX,
    clipWidth / 2,
    p.groundClearanceMm + clipHeight,
    "#32678f",
  );

  addBox(
    "Front bumper",
    bodyFrontX,
    -(p.bodyWidthMm + 90) / 2,
    p.groundClearanceMm,
    bodyFrontX + p.bumperLeadMm,
    (p.bodyWidthMm + 90) / 2,
    p.groundClearanceMm + 180,
    "#20262d",
  );

  const frameLength = bodyFrontX - bodyRearX - 180;
  const frameCenterX = (bodyFrontX + bodyRearX) / 2 - 40;
  const frameStartX = frameCenterX - frameLength / 2;
  const frameEndX = frameCenterX + frameLength / 2;

  addBox(
    "Left frame rail",
    frameStartX,
    p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
    p.groundClearanceMm,
    frameEndX,
    p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
    p.groundClearanceMm + p.frameRailHeightMm,
    "#4a5560",
  );
  addBox(
    "Right frame rail",
    frameStartX,
    -p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
    p.groundClearanceMm,
    frameEndX,
    -p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
    p.groundClearanceMm + p.frameRailHeightMm,
    "#4a5560",
  );

  addCylinder("Front axle", 55, p.frontTrackMm + 160, frontAxleX, 0, tireRadius, "#70808e");
  addCylinder("Rear axle", 55, p.rearTrackMm + 160, rearAxleX, 0, tireRadius, "#70808e");

  const frontLeftTire = addCylinder(
    "Front left tire",
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    p.frontTrackMm / 2,
    tireRadius,
    "#1f252b",
  );
  addCylinder(
    "Front right tire",
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    -p.frontTrackMm / 2,
    tireRadius,
    "#1f252b",
  );
  const rearLeftTire = addCylinder(
    "Rear left tire",
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    p.rearTrackMm / 2,
    tireRadius,
    "#1f252b",
  );
  addCylinder(
    "Rear right tire",
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    -p.rearTrackMm / 2,
    tireRadius,
    "#1f252b",
  );

  return { parts, body, frontLeftTire, rearLeftTire };
}

async function compileScenario(design) {
  const start = performance.now();
  const fixture = buildScenario(design);

  try {
    const bodyBounds = getBounds(fixture.body);
    const frontBounds = getBounds(fixture.frontLeftTire);
    const rearBounds = getBounds(fixture.rearLeftTire);

    const metrics = {
      frontAxleXmm: midpoint(frontBounds.xMin, frontBounds.xMax),
      rearAxleXmm: midpoint(rearBounds.xMin, rearBounds.xMax),
      wheelbaseMm:
        midpoint(frontBounds.xMin, frontBounds.xMax) -
        midpoint(rearBounds.xMin, rearBounds.xMax),
      bodyFrontXmm: bodyBounds.xMax,
      bodyRearXmm: bodyBounds.xMin,
    };

    const meshStart = performance.now();
    let triangleCount = 0;
    let vertexCount = 0;
    for (const part of fixture.parts) {
      const display = mesh(part.shape, {
        tolerance: 4,
        angularTolerance: 0.25,
        cache: false,
      });
      triangleCount += display.triangles.length / 3;
      vertexCount += display.vertices.length / 3;
    }
    const meshMs = performance.now() - meshStart;

    const stepStart = performance.now();
    const stepBlob = unwrap(
      exportAssemblySTEP(fixture.parts, { unit: "MM", modelUnit: "MM" }),
    );
    const stepText = await stepBlob.text();
    const stepMs = performance.now() - stepStart;

    return {
      metrics,
      triangleCount,
      vertexCount,
      stepText,
      timings: {
        totalMs: performance.now() - start,
        meshMs,
        stepMs,
      },
    };
  } finally {
    for (const part of fixture.parts) {
      if (!part.shape.disposed) part.shape[Symbol.dispose]();
    }
  }
}

const initStart = performance.now();
const kernelId = await init();
const initMs = performance.now() - initStart;

const base = await compileScenario(baseline);
const moved = await compileScenario(movedDesign);

approx(base.metrics.frontAxleXmm, baseline.parameters.baselineWheelbaseMm, 0.01, "baseline front axle X");
approx(base.metrics.rearAxleXmm, 0, 0.01, "baseline rear axle X");
approx(moved.metrics.frontAxleXmm, baseline.parameters.baselineWheelbaseMm + 254, 0.01, "moved front axle X");
approx(moved.metrics.rearAxleXmm, 0, 0.01, "moved rear axle X");
approx(moved.metrics.wheelbaseMm - base.metrics.wheelbaseMm, 254, 0.01, "wheelbase delta");
approx(moved.metrics.bodyFrontXmm, base.metrics.bodyFrontXmm, 0.001, "body front preserved");
approx(moved.metrics.bodyRearXmm, base.metrics.bodyRearXmm, 0.001, "body rear preserved");

if (base.triangleCount <= 0 || moved.triangleCount <= 0) {
  throw new Error("brepjs produced an empty display mesh");
}
if (!base.stepText.includes("ISO-10303-21") || !moved.stepText.includes("ISO-10303-21")) {
  throw new Error("brepjs assembly STEP export is missing ISO-10303-21 header");
}

await mkdir("artifacts", { recursive: true });
await Promise.all([
  writeFile("artifacts/brepjs-pops-baseline.step", base.stepText),
  writeFile("artifacts/brepjs-pops-axle-plus-10.step", moved.stepText),
  writeFile(
    "artifacts/brepjs-pops.report.json",
    JSON.stringify(
      {
        status: "pass",
        kernel: "brepjs",
        underlyingKernel: kernelId,
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

console.log(
  JSON.stringify(
    {
      status: "pass",
      kernel: "brepjs",
      underlyingKernel: kernelId,
      initMs,
      baselineWheelbaseMm: base.metrics.wheelbaseMm,
      movedWheelbaseMm: moved.metrics.wheelbaseMm,
      movedFrontAxleXmm: moved.metrics.frontAxleXmm,
      bodyFrontXmm: moved.metrics.bodyFrontXmm,
      baselineTriangles: base.triangleCount,
      movedTriangles: moved.triangleCount,
      baselineTotalMs: base.timings.totalMs,
      movedTotalMs: moved.timings.totalMs,
    },
    null,
    2,
  ),
);
