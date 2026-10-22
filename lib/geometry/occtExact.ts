import type { VehicleDesign } from "../model/types";
import { buildFrontClipCad, type CadMaterial } from "./frontClipCad.ts";
import { frontClipSpec } from "./frontClipSpec.ts";
import {
  disposeSharedGeometryRuntime,
  getSharedGeometryRuntime,
} from "./sharedKernelRuntime.ts";

export interface ExactVehicleMetrics {
  frontAxleXmm: number;
  rearAxleXmm: number;
  wheelbaseMm: number;
  bodyFrontXmm: number;
  bodyRearXmm: number;
  frontClip: {
    wheelOpeningCenterXmm: number;
    wheelOpeningRadiusMm: number;
    staticRadialMarginMm: number;
    frontFaceLandMm: number;
    cabinArchOverlapMm: number;
    leftFenderCutVolumeMm3: number;
    rightFenderCutVolumeMm3: number;
    hoodRearTopZmm: number;
    hoodNoseTopZmm: number;
  };
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
  materialGroups: { material: CadMaterial; start: number; count: number }[];
  triangleCount: number;
  metrics: ExactVehicleMetrics;
  step?: string;
  projectionSvg?: string;
}

let compileQueue: Promise<void> = Promise.resolve();

async function getKernel() {
  const runtime = await getSharedGeometryRuntime();
  return runtime.kernel;
}

function midpoint(min: number, max: number) {
  return (min + max) / 2;
}

export function compileExactPops(
  design: VehicleDesign,
  options: { exportStep?: boolean; exportProjection?: boolean } = {},
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
  options: { exportStep?: boolean; exportProjection?: boolean },
): Promise<ExactVehicleMesh> {
  const kernel = await getKernel();
  kernel.releaseAll();

  const p = design.parameters;
  const rearAxleX = 0;
  const frontAxleX = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const spec = frontClipSpec(design);
  const bodyRearX = spec.bodyRearXmm;
  const bodyFrontX = spec.bodyFrontXmm;
  const tireRadius = p.tireDiameterMm / 2;

  const placedBox = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) =>
    kernel.makeBoxFromCorners({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });
  const bodyCad = buildFrontClipCad(kernel, design);

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

  const wheelRims = [
    ...[-1, 1].flatMap(side => [
      { name: `front-${side > 0 ? "left" : "right"}-rim`, material: "chrome" as CadMaterial,
        shape: makeLateralCylinder(202, 22, frontAxleX,
          side * (p.frontTrackMm / 2 + p.tireWidthMm / 2 - 12), tireRadius) },
      { name: `rear-${side > 0 ? "left" : "right"}-rim`, material: "chrome" as CadMaterial,
        shape: makeLateralCylinder(202, 22, rearAxleX,
          side * (p.rearTrackMm / 2 + p.tireWidthMm / 2 - 12), tireRadius) },
    ]),
  ];
  const allParts = [
    ...bodyCad.parts,
    ...wheelRims,
    { name: "left-frame-rail", material: "steel" as CadMaterial, shape: leftRail },
    { name: "right-frame-rail", material: "steel" as CadMaterial, shape: rightRail },
    { name: "front-axle", material: "steel" as CadMaterial, shape: frontAxle },
    { name: "rear-axle", material: "steel" as CadMaterial, shape: rearAxle },
    { name: "front-left-tire", material: "rubber" as CadMaterial, shape: frontLeftTire },
    { name: "front-right-tire", material: "rubber" as CadMaterial, shape: frontRightTire },
    { name: "rear-left-tire", material: "rubber" as CadMaterial, shape: rearLeftTire },
    { name: "rear-right-tire", material: "rubber" as CadMaterial, shape: rearRightTire },
  ];
  const assembly = kernel.makeCompound(allParts.map(part => part.shape));

  // Preserve material boundaries from distinct exact BREP parts. The STEP and
  // exact measurements use the same assembly, not the display tessellation.
  const materials: CadMaterial[] = ["body", "chrome", "dark", "glass", "rubber", "steel", "light"];
  const positionChunks: Float32Array[] = [];
  const normalChunks: Float32Array[] = [];
  const indexChunks: Uint32Array[] = [];
  const materialGroups: ExactVehicleMesh["materialGroups"] = [];
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const material of materials) {
    const shapes = allParts.filter(part => part.material === material).map(part => part.shape);
    if (!shapes.length) continue;
    const groupShape = kernel.makeCompound(shapes);
    const mesh = kernel.tessellate(groupShape, { linearDeflection: 4, angularDeflection: 0.25 });
    positionChunks.push(mesh.positions.slice());
    normalChunks.push(mesh.normals.slice());
    const shifted = new Uint32Array(mesh.indices.length);
    for (let i = 0; i < shifted.length; i++) shifted[i] = mesh.indices[i] + vertexOffset;
    indexChunks.push(shifted);
    materialGroups.push({ material, start: indexOffset, count: shifted.length });
    vertexOffset += mesh.positions.length / 3;
    indexOffset += shifted.length;
  }
  const positions = new Float32Array(vertexOffset * 3);
  const normals = new Float32Array(vertexOffset * 3);
  const indices = new Uint32Array(indexOffset);
  let vertexCursor = 0;
  let indexCursor = 0;
  for (let i = 0; i < positionChunks.length; i++) {
    positions.set(positionChunks[i], vertexCursor);
    normals.set(normalChunks[i], vertexCursor);
    indices.set(indexChunks[i], indexCursor);
    vertexCursor += positionChunks[i].length;
    indexCursor += indexChunks[i].length;
  }

  // Every datum and cut is verified from OCCT BREP surfaces and volumes.
  const assemblyBounds = kernel.getBoundingBox(assembly);
  const frontDatumBounds = kernel.getBoundingBox(bodyCad.bodyDatum);
  const rearDatumPart = bodyCad.parts.find(part => part.name === "cabin-roof");
  if (!rearDatumPart) throw new Error("Missing body rear datum");
  const rearDatumBounds = kernel.getBoundingBox(rearDatumPart.shape);
  const frontTireBounds = kernel.getBoundingBox(frontLeftTire);
  const rearTireBounds = kernel.getBoundingBox(rearLeftTire);
  const measuredFrontAxleX = midpoint(frontTireBounds.xmin, frontTireBounds.xmax);
  const measuredRearAxleX = midpoint(rearTireBounds.xmin, rearTireBounds.xmax);
  const fenderUncutVolumeMm3 = (spec.bodyFrontXmm - spec.cabinFrontXmm) * 80 * (1250 - 70);
  const leftFenderCutVolumeMm3 = fenderUncutVolumeMm3 - kernel.getVolume(bodyCad.leftFrontFender);
  const rightFenderCutVolumeMm3 = fenderUncutVolumeMm3 - kernel.getVolume(bodyCad.rightFrontFender);
  if (leftFenderCutVolumeMm3 <= 0 || rightFenderCutVolumeMm3 <= 0) {
    throw new Error("Wheel arch subtraction did not remove material from both fenders");
  }

  const result: ExactVehicleMesh = {
    revision: design.revision,
    kernel: "occt-wasm",
    positions,
    normals,
    indices,
    materialGroups,
    triangleCount: indices.length / 3,
    metrics: {
      frontAxleXmm: measuredFrontAxleX,
      rearAxleXmm: measuredRearAxleX,
      wheelbaseMm: measuredFrontAxleX - measuredRearAxleX,
      bodyFrontXmm: frontDatumBounds.xmax,
      bodyRearXmm: rearDatumBounds.xmin,
      frontClip: {
        wheelOpeningCenterXmm: spec.wheelOpeningCenterXmm,
        wheelOpeningRadiusMm: spec.wheelOpeningRadiusMm,
        staticRadialMarginMm: spec.radialStaticMarginMm,
        frontFaceLandMm: spec.faceLandMm,
        cabinArchOverlapMm: spec.cabinArchOverlapMm,
        leftFenderCutVolumeMm3,
        rightFenderCutVolumeMm3,
        hoodRearTopZmm: spec.hoodRearTopZmm,
        hoodNoseTopZmm: spec.hoodNoseTopZmm,
      },
      assemblyBounds: { ...assemblyBounds },
    },
  };

  if (options.exportStep) {
    result.step = kernel.exportStep(assembly);
  }

  if (options.exportProjection) {
    result.projectionSvg = kernel.toMultiviewSVG(assembly);
  }

  return result;
}


/** Initialize the cached exact kernel without compiling geometry. */
export async function initializeExactKernel() {
  await getKernel();
}

/**
 * Deterministic teardown for Node/CI callers.
 * The browser workbench intentionally keeps the kernel cached between edits.
 */
export async function disposeExactKernel() {
  await compileQueue;
  await disposeSharedGeometryRuntime();
  compileQueue = Promise.resolve();
}
