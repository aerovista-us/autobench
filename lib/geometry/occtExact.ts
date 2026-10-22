import type { VehicleDesign } from "../model/types";
import { buildFrontClipCad, type CadMaterial } from "./frontClipCad.ts";
import { frontClipSpec } from "./frontClipSpec.ts";
import { resolveConceptOptions } from "../model/conceptOptions.ts";
import { buildFrontSuspensionConcept } from "./upgradeConceptCad.ts";
import {
  disposeSharedGeometryRuntime,
  getSharedGeometryRuntime,
} from "./sharedKernelRuntime.ts";

export interface ExactVehicleMetrics {
  bodyIdentity: {
    sideGlass: "conversion" | "cargo" | "porthole";
    leftSidePanelVolumeMm3: number;
    rightSidePanelVolumeMm3: number;
    rearClosureVolumeMm3: number;
    accessoryPartCount: number;
  };
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
  materialGroups: { material: CadMaterial; start: number; count: number; inspectionVisible: boolean }[];
  triangleCount: number;
  partNames: string[];
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

  // Distinct raised metal wheel faces and lug details replace black disk wheels.
  // Sizes are styling envelopes, not verified hub PCD, offset or wheel fitment.
  const wheelRims: Array<{ name: string; material: CadMaterial; shape: ReturnType<typeof kernel.makeBox> }> = [];
  for (const axle of [
    { name: "front", x: frontAxleX, track: p.frontTrackMm },
    { name: "rear", x: rearAxleX, track: p.rearTrackMm },
  ]) {
    for (const side of [-1, 1]) {
      const prefix = `${axle.name}-${side > 0 ? "left" : "right"}`;
      const faceY = side * (axle.track / 2 + p.tireWidthMm / 2 + 27);
      wheelRims.push({ name: `${prefix}-silver-wheel-face`, material: "chrome",
        shape: makeLateralCylinder(209, 19, axle.x, faceY, tireRadius) });
      wheelRims.push({ name: `${prefix}-center-cap`, material: "steel",
        shape: makeLateralCylinder(76, 25, axle.x, faceY + side * 13, tireRadius) });
      const torus = kernel.makeTorus(218, 15);
      const turned = kernel.rotate(torus, {
        point: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 },
      }, -Math.PI / 2);
      wheelRims.push({ name: `${prefix}-rim-bead-ring`, material: "chrome",
        shape: kernel.translate(turned, axle.x, faceY, tireRadius) });
      for (let lug = 0; lug < 6; lug++) {
        const theta = lug * Math.PI / 3;
        wheelRims.push({ name: `${prefix}-lug-${lug}`, material: "dark",
          shape: makeLateralCylinder(14, 21,
            axle.x + Math.cos(theta) * 123, faceY + side * 17,
            tireRadius + Math.sin(theta) * 123) });
      }
    }
  }
  const allParts = [
    ...bodyCad.parts,
    ...buildFrontSuspensionConcept(kernel, design),
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
  const materials: CadMaterial[] = ["body", "chrome", "dark", "glass", "rubber", "steel", "light", "suspension", "accent"];
  const positionChunks: Float32Array[] = [];
  const normalChunks: Float32Array[] = [];
  const indexChunks: Uint32Array[] = [];
  const materialGroups: ExactVehicleMesh["materialGroups"] = [];
  let vertexOffset = 0;
  let indexOffset = 0;
  // Inspection is based on *part identity*, not shared paint/material. This
  // excludes trail/winch bumpers while retaining chrome rims and dark lug nuts.
  const isChassisInspectionPart = (name: string) =>
    /(?:^|-)frame-rail$/.test(name) ||
    name === "front-axle" || name === "rear-axle" ||
    /-(?:tire|silver-wheel-face|center-cap|rim-bead-ring)$/.test(name) ||
    /-lug-\d+$/.test(name) ||
    /(?:spring-leaf|spring-eye-envelope|shock-envelope|shock-upper-mount|reservoir-envelope)/.test(name);
  for (const material of materials) {
    for (const inspectionVisible of [false, true]) {
      const shapes = allParts.filter(part =>
        part.material === material && isChassisInspectionPart(part.name) === inspectionVisible,
      ).map(part => part.shape);
      if (!shapes.length) continue;
      const groupShape = kernel.makeCompound(shapes);
      const mesh = kernel.tessellate(groupShape, { linearDeflection: 4, angularDeflection: 0.25 });
      positionChunks.push(mesh.positions.slice());
      normalChunks.push(mesh.normals.slice());
      const shifted = new Uint32Array(mesh.indices.length);
      for (let i = 0; i < shifted.length; i++) shifted[i] = mesh.indices[i] + vertexOffset;
      indexChunks.push(shifted);
      materialGroups.push({ material, start: indexOffset, count: shifted.length, inspectionVisible });
      vertexOffset += mesh.positions.length / 3;
      indexOffset += shifted.length;
    }
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
  const rearDatumPart = bodyCad.parts.find(part => part.name === "rear-closure");
  if (!rearDatumPart) throw new Error("Missing rear body closure datum");
  const rearDatumBounds = kernel.getBoundingBox(rearDatumPart.shape);
  const leftPanel = bodyCad.parts.find(part => part.name === "left-shaped-cabin-panel");
  const rightPanel = bodyCad.parts.find(part => part.name === "right-shaped-cabin-panel");
  if (!leftPanel || !rightPanel) throw new Error("Missing van side BREP panels");
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
    partNames: allParts.map(part => part.name),
    metrics: {
      bodyIdentity: {
        sideGlass: resolveConceptOptions(design).sideGlass,
        leftSidePanelVolumeMm3: kernel.getVolume(leftPanel.shape),
        rightSidePanelVolumeMm3: kernel.getVolume(rightPanel.shape),
        rearClosureVolumeMm3: kernel.getVolume(rearDatumPart.shape),
        accessoryPartCount: bodyCad.parts.filter(part =>
          /^(?:roof-rack-crossbar-|(?:left|right)-(?:roof-rack-rail|rack-foot-|entry-step|step-bracket-)|rear-(?:door-spare-tire-envelope|spare-carrier-mount-envelope)|front-(?:left|right)-aux-lamp-)/.test(part.name)).length,
      },
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
