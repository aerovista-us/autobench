import type { OcctKernel } from "occt-wasm";
import type { VehicleDesign } from "../model/types";
import { resolveConceptOptions } from "../model/conceptOptions.ts";
import { frontClipSpec } from "./frontClipSpec.ts";
import type { NamedCadPart, CadMaterial } from "./frontClipCad";

type Kernel = Awaited<ReturnType<typeof OcctKernel.init>>;
type Handle = ReturnType<Kernel["makeBox"]>;

/**
 * M4 accessory packages are independent OCCT BREP bodies, not parts sourced
 * from a catalog. Their dimensions are visual placeholders until measured.
 */
export function buildVanExteriorFeatures(kernel: Kernel, design: VehicleDesign): NamedCadPart[] {
  const p = design.parameters;
  const s = frontClipSpec(design);
  const choices = resolveConceptOptions(design);
  const roofZ = p.groundClearanceMm + p.bodyHeightMm;
  const halfW = p.bodyWidthMm / 2;
  const rear = s.bodyRearXmm;
  const front = s.bodyFrontXmm;
  const parts: NamedCadPart[] = [];
  const add = (name: string, material: CadMaterial, shape: Handle) =>
    parts.push({ name, material, shape });
  const box = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) =>
    kernel.makeBoxFromCorners({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });

  // Rear door details and wraparound lamp housings: standard on all variants.
  add("rear-step-bumper", "chrome", box(rear - 220, -halfW - 42,
    p.groundClearanceMm + 125, rear + 5, halfW + 42, p.groundClearanceMm + 275));
  add("rear-door-center-gap", "dark", box(rear - 26, -9,
    p.groundClearanceMm + 370, rear - 13, 9, roofZ - 165));
  add("rear-door-left-handle", "chrome", box(rear - 54, 65,
    p.groundClearanceMm + 970, rear - 26, 185, p.groundClearanceMm + 1010));
  add("rear-license-plate", "light", box(rear - 62, -155,
    p.groundClearanceMm + 370, rear - 35, 155, p.groundClearanceMm + 550));
  for (const side of [-1, 1]) {
    const y = side * (halfW - 125);
    const label = side > 0 ? "left" : "right";
    add(`rear-${label}-taillamp`, "light", box(rear - 57,
      y - 68, p.groundClearanceMm + 610,
      rear - 14, y + 68, p.groundClearanceMm + 1090));
    for (const z of [p.groundClearanceMm + 550, roofZ - 370]) {
      add(`rear-${label}-door-hinge-${z}`, "chrome",
        box(rear - 58, side * (halfW - 65) - 36, z,
          rear - 12, side * (halfW - 65) + 36, z + 66));
    }
    // Narrow rear quarter vertical panel break, visible in 3/4 views.
    add(`rear-${label}-corner-seam`, "dark",
      box(rear + 85, side > 0 ? halfW + 4 : -halfW - 13,
        p.groundClearanceMm + 480, rear + 96,
        side > 0 ? halfW + 13 : -halfW - 4, roofZ - 230));
  }

  if (choices.roofRack) {
    const railStart = rear + 350;
    const railEnd = s.cabinFrontXmm - 350;
    for (const side of [-1, 1]) {
      const y = side * (halfW - 260);
      const label = side > 0 ? "left" : "right";
      add(`${label}-roof-rack-rail`, "steel",
        box(railStart, y - 23, roofZ + 105,
          railEnd, y + 23, roofZ + 155));
      for (let i = 0; i < 4; i++) {
        const x = railStart + 140 + (railEnd - railStart - 280) * i / 3;
        add(`${label}-rack-foot-${i}`, "dark",
          box(x - 30, y - 36, roofZ - 8, x + 30, y + 36, roofZ + 112));
      }
    }
    for (let i = 0; i < 5; i++) {
      const x = railStart + 115 + (railEnd - railStart - 230) * i / 4;
      add(`roof-rack-crossbar-${i}`, "steel",
        box(x - 23, -halfW + 260, roofZ + 110,
          x + 23, halfW - 260, roofZ + 155));
    }
  }

  if (choices.sideSteps) {
    for (const side of [-1, 1]) {
      const label = side > 0 ? "left" : "right";
      const outerY = side > 0 ? halfW + 85 : -halfW - 235;
      add(`${label}-entry-step`, "steel",
        box(430, outerY, p.groundClearanceMm + 85,
          1890, outerY + 150, p.groundClearanceMm + 130));
      for (const x of [650, 1590]) {
        add(`${label}-step-bracket-${x}`, "dark",
          box(x, side > 0 ? halfW - 30 : -halfW - 120,
            p.groundClearanceMm + 80, x + 65,
            side > 0 ? halfW + 120 : -halfW + 30,
            p.groundClearanceMm + 240));
      }
    }
  }

  if (choices.auxiliaryLights) {
    for (const side of [-1, 1]) {
      const y = side * 480;
      add(`front-${side > 0 ? "left" : "right"}-aux-lamp-housing`, "dark",
        box(front + 68, y - 100, p.groundClearanceMm + 1310,
          front + 165, y + 100, p.groundClearanceMm + 1490));
      add(`front-${side > 0 ? "left" : "right"}-aux-lamp-lens`, "light",
        box(front + 166, y - 78, p.groundClearanceMm + 1330,
          front + 185, y + 78, p.groundClearanceMm + 1470));
    }
  }

  if (choices.rearSpare) {
    // Spare tyre mounted on rear door in YZ plane; bracket/load not validated.
    const tire = kernel.makeCylinder(p.tireDiameterMm / 2, p.tireWidthMm * 0.75);
    const turned = kernel.rotate(tire, {
      point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 },
    }, Math.PI / 2);
    add("rear-door-spare-tire-envelope", "rubber",
      kernel.translate(turned, rear - 315, 275, p.groundClearanceMm + 1220));
    add("rear-spare-carrier-mount-envelope", "steel",
      box(rear - 320, 205, p.groundClearanceMm + 1160,
        rear - 18, 345, p.groundClearanceMm + 1280));
  }

  return parts;
}
