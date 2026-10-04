import type { VehicleDesign } from "../model/types";

export interface ExactVehicleMetrics {
  frontAxleXmm: number;
  rearAxleXmm: number;
  wheelbaseMm: number;
  bodyFrontXmm: number;
  bodyRearXmm: number;
  assemblyBounds: {
    xmin: number;
    ymin: number;
    zmin: number;
    xmax: number;
    ymax: number;
    zmax: number;
  };
}

export interface ExactVehicleMesh {
  revision: number;
  kernel: "occt-wasm";
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  metrics: ExactVehicleMetrics;
  step?: string;
}

let kernelPromise: ReturnType<typeof createKernel> | undefined;
let compileQueue: Promise<void> = Promise.resolve();

async function createKernel() {
  const { OcctKernel } = await import("occt-wasm");
  return OcctKernel.init();
}

async function getKernel() {
  kernelPromise ??= createKernel();
  return kernelPromise;
}

function midpoint(min: number, max: number) {
  return (min + max) / 2;
}

export function compileExactPops(
  design: VehicleDesign,
  options: { exportStep?: boolean } = {},
): Promise<ExactVehicleMesh> {
  const run = compileQueue.then(() => compileInternal(design, options));
  compileQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function compileInternal(
  design: VehicleDesign,
  options: { exportStep?: boolean },
): Promise<ExactVehicleMesh> {
  const kernel = await getKernel();
  kernel.releaseAll();

  const p = design.parameters;
  const rearAxleX = 0;
  const frontAxleX = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const bodyRearX = -p.rearOverhangMm;
  const bodyFrontX = p.baselineWheelbaseMm + p.frontOverhangMm;
  const tireRadius = p.tireDiameterMm / 2;

  const placedBox = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
  ) =>
    kernel.makeBoxFromCorners(
      { x: x1, y: y1, z: z1 },
      { x: x2, y: y2, z: z2 },
    );

  const body = placedBox(
    bodyRearX,
    -p.bodyWidthMm / 2,
    p.groundClearanceMm,
    bodyFrontX,
    p.bodyWidthMm / 2,
    p.groundClearanceMm + p.bodyHeightMm,
  );

  const clipWidth = p.bodyWidthMm * 0.94;
  const clipHeight = p.bodyHeightMm * 0.74;
  const frontClip = placedBox(
    bodyFrontX - 520,
    -clipWidth / 2,
    p.groundClearanceMm,
    bodyFrontX,
    clipWidth / 2,
    p.groundClearanceMm + clipHeight,
  );

  const bumper = placedBox(
    bodyFrontX,
    -(p.bodyWidthMm + 90) / 2,
    p.groundClearanceMm,
    bodyFrontX + p.bumperLeadMm,
    (p.bodyWidthMm + 90) / 2,
    p.groundClearanceMm + 180,
  );

  const frameLength = bodyFrontX - bodyRearX - 180;
  const frameCenterX = (bodyFrontX + bodyRearX) / 2 - 40;
  const frameStartX = frameCenterX - frameLength / 2;
  const frameEndX = frameCenterX + frameLength / 2;

  const leftRail = placedBox(
    frameStartX,
    p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
    p.groundClearanceMm,
    frameEndX,
    p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
    p.groundClearanceMm + p.frameRailHeightMm,
  );

  const rightRail = placedBox(
    frameStartX,
    -p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
    p.groundClearanceMm,
    frameEndX,
    -p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
    p.groundClearanceMm + p.frameRailHeightMm,
  );

  const makeLateralCylinder = (
    radius: number,
    length: number,
    x: number,
    centerY: number,
    centerZ: number,
  ) => {
    const raw = kernel.makeCylinder(radius, length);
    const lateral = kernel.rotate(
      raw,
      {
        point: { x: 0, y: 0, z: 0 },
        direction: { x: 1, y: 0, z: 0 },
      },
      -Math.PI / 2,
    );
    return kernel.translate(
      lateral,
      x,
      centerY - length / 2,
      centerZ,
    );
  };

  const frontAxle = makeLateralCylinder(
    55,
    p.frontTrackMm + 160,
    frontAxleX,
    0,
    tireRadius,
  );
  const rearAxle = makeLateralCylinder(
    55,
    p.rearTrackMm + 160,
    rearAxleX,
    0,
    tireRadius,
  );

  const frontLeftTire = makeLateralCylinder(
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    p.frontTrackMm / 2,
    tireRadius,
  );
  const frontRightTire = makeLateralCylinder(
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    -p.frontTrackMm / 2,
    tireRadius,
  );
  const rearLeftTire = makeLateralCylinder(
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    p.rearTrackMm / 2,
    tireRadius,
  );
  const rearRightTire = makeLateralCylinder(
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    -p.rearTrackMm / 2,
    tireRadius,
  );

  const assembly = kernel.makeCompound([
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

  const mesh = kernel.tessellate(assembly, {
    linearDeflection: 4,
    angularDeflection: 0.25,
  });

  // Measurements must come from exact BREP surfaces, not the display mesh.
  // Tessellated bounds are allowed to be approximate and can shift derived
  // centers by the mesh deflection tolerance.
  const assemblyBounds = kernel.getBoundingBox(assembly);
  const bodyBounds = kernel.getBoundingBox(body);
  const frontTireBounds = kernel.getBoundingBox(frontLeftTire);
  const rearTireBounds = kernel.getBoundingBox(rearLeftTire);

  const measuredFrontAxleX = midpoint(frontTireBounds.xmin, frontTireBounds.xmax);
  const measuredRearAxleX = midpoint(rearTireBounds.xmin, rearTireBounds.xmax);

  const result: ExactVehicleMesh = {
    revision: design.revision,
    kernel: "occt-wasm",
    positions: mesh.positions.slice(),
    normals: mesh.normals.slice(),
    indices: mesh.indices.slice(),
    triangleCount: mesh.indices.length / 3,
    metrics: {
      frontAxleXmm: measuredFrontAxleX,
      rearAxleXmm: measuredRearAxleX,
      wheelbaseMm: measuredFrontAxleX - measuredRearAxleX,
      bodyFrontXmm: bodyBounds.xmax,
      bodyRearXmm: bodyBounds.xmin,
      assemblyBounds: { ...assemblyBounds },
    },
  };

  if (options.exportStep) {
    result.step = kernel.exportStep(assembly);
  }

  return result;
}


/**
 * Deterministic teardown for Node/CI callers.
 * The browser workbench intentionally keeps the kernel cached between edits.
 */
export async function disposeExactKernel() {
  await compileQueue;

  if (!kernelPromise) return;

  const kernel = await kernelPromise;
  kernel[Symbol.dispose]();
  kernelPromise = undefined;
  compileQueue = Promise.resolve();
}
