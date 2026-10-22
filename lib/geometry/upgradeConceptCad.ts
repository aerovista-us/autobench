import type { OcctKernel } from "occt-wasm";
import type { VehicleDesign } from "../model/types";
import { resolveConceptOptions } from "../model/conceptOptions.ts";
import type { NamedCadPart, CadMaterial } from "./frontClipCad";
import { frontClipSpec } from "./frontClipSpec.ts";

type Kernel = Awaited<ReturnType<typeof OcctKernel.init>>;
type Handle = ReturnType<Kernel["makeBox"]>;

export function buildBumperConcept(kernel: Kernel, design: VehicleDesign): NamedCadPart[] {
  const p = design.parameters;
  const s = frontClipSpec(design);
  const { bumper } = resolveConceptOptions(design);
  const parts: NamedCadPart[] = [];
  const add = (name: string, material: CadMaterial, shape: Handle) =>
    parts.push({ name, material, shape });
  const box = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) =>
    kernel.makeBoxFromCorners({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });
  const nose = s.bodyFrontXmm;
  const outer = p.bodyWidthMm / 2 + 65;
  const z = p.groundClearanceMm;
  const leading = Math.max(nose + 125, s.bumperFrontXmm);

  if (bumper === "chrome-stock" || bumper === "brush-guard") {
    add("chrome-original-profile-bumper", "chrome",
      box(nose + 55, -outer, z + 95, leading, outer, z + 245));
  }
  if (bumper === "plate-trail" || bumper === "winch-plate") {
    add("trail-steel-center-bumper", "steel",
      box(nose + 52, -600, z + 115, leading, 600, z + 365));
    for (const side of [-1, 1]) {
      const y1 = side > 0 ? 590 : -outer;
      const y2 = side > 0 ? outer : -590;
      add(side > 0 ? "left-angled-bumper-wing" : "right-angled-bumper-wing", "steel",
        box(nose + 70, y1, z + 135, leading - 35, y2, z + 275));
      add(side > 0 ? "left-bumper-end-cap" : "right-bumper-end-cap", "dark",
        box(nose + 70, side > 0 ? outer - 25 : -outer,
          z + 135, leading - 35, side > 0 ? outer : -outer + 25, z + 270));
    }
    for (const side of [-1, 1]) {
      const y = side * 440;
      add(side > 0 ? "left-concept-recovery-tab" : "right-concept-recovery-tab",
        "dark", box(leading - 5, y - 40, z + 115, leading + 55, y + 40, z + 205));
    }
  }
  if (bumper === "winch-plate") {
    add("unverified-winch-envelope", "dark",
      box(leading - 20, -260, z + 280, leading + 165, 260, z + 510));
    add("winch-fairlead-envelope", "chrome",
      box(leading + 166, -145, z + 285, leading + 192, 145, z + 365));
  }
  if (bumper === "brush-guard") {
    for (const side of [-1, 1]) {
      const y = side * 600;
      add(side > 0 ? "left-guard-upright" : "right-guard-upright", "dark",
        box(leading - 12, y - 32, z + 190, leading + 65, y + 32, z + 1180));
    }
    for (const level of [540, 990]) {
      add(`brush-guard-crossbar-${level}`, "steel",
        box(leading + 65, -660, z + level, leading + 99, 660, z + level + 46));
    }
  }
  return parts;
}

export function buildFrontSuspensionConcept(kernel: Kernel, design: VehicleDesign): NamedCadPart[] {
  const p = design.parameters;
  const { shock, spring } = resolveConceptOptions(design);
  const parts: NamedCadPart[] = [];
  const add = (name: string, material: CadMaterial, shape: Handle) =>
    parts.push({ name, material, shape });
  const box = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) =>
    kernel.makeBoxFromCorners({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });
  const axleX = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const axleZ = p.tireDiameterMm / 2;
  for (const side of [-1, 1]) {
    const y = side * (p.frameRailSpacingMm / 2 + 125);
    const sideLabel = side > 0 ? "left" : "right";
    if (spring !== "unverified") {
      const layers = spring === "heavy-duty-leaf" ? 6 : 3;
      for (let layer = 0; layer < layers; layer++) {
        const halfLength = 460 - layer * 55;
        const layerZ = axleZ + 95 + layer * 20;
        add(`${sideLabel}-${spring}-spring-leaf-${layer}`, "suspension",
          box(axleX - halfLength, y - 34, layerZ,
            axleX + halfLength, y + 34, layerZ + 15));
      }
      for (const end of [-1, 1]) {
        add(`${sideLabel}-spring-eye-envelope-${end}`, "steel",
          box(axleX + end * 475 - 32, y - 48, axleZ + 90,
            axleX + end * 475 + 32, y + 48, axleZ + 160));
      }
    }
    if (shock !== "unverified") {
      // Illustration of package size only. These are NOT actual measured
      // mount coordinates or travel/stroke geometry.
      const length = shock === "remote-reservoir" ? 510 : 430;
      const radius = shock === "remote-reservoir" ? 52 : 44;
      const cylinder = kernel.makeCylinder(radius, length);
      const tilted = kernel.rotate(cylinder, {
        point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 },
      }, -0.20);
      add(`${sideLabel}-${shock}-shock-envelope`, "suspension",
        kernel.translate(tilted, axleX - 250, y, axleZ + 85));
      add(`${sideLabel}-shock-upper-mount-placeholder`, "steel",
        box(axleX - 370, y - 65, axleZ + 510,
          axleX - 235, y + 65, axleZ + 555));
      if (shock === "remote-reservoir") {
        const reservoir = kernel.makeCylinder(35, 260);
        add(`${sideLabel}-reservoir-envelope`, "suspension",
          kernel.translate(reservoir, axleX - 85, y + side * 80, axleZ + 355));
      }
    }
  }
  return parts;
}
