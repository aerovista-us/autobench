import type { OcctKernel } from "occt-wasm";
import type { VehicleDesign } from "../model/types";
import { frontClipSpec } from "./frontClipSpec.ts";
import { buildRefinedCabin } from "./bodyContourCad.ts";
import { buildBumperConcept } from "./upgradeConceptCad.ts";

export type CadMaterial = "body" | "chrome" | "dark" | "glass" | "rubber" | "steel" | "light" | "suspension";
type Kernel = Awaited<ReturnType<typeof OcctKernel.init>>;
type Handle = ReturnType<Kernel["makeBox"]>;

export interface NamedCadPart {
  name: string;
  material: CadMaterial;
  shape: Handle;
}

export interface FrontClipCad {
  parts: NamedCadPart[];
  bodyDatum: Handle;
  frontArchCutter: Handle;
  leftFrontFender: Handle;
  rightFrontFender: Handle;
}

/**
 * Authoring features for the G10-inspired front clip. Everything is built as
 * actual OCCT BREP solids. Values are provisional styling dimensions, not a
 * reconstructed scan of the real van or a fitment/roadworthiness certificate.
 */
export function buildFrontClipCad(kernel: Kernel, design: VehicleDesign): FrontClipCad {
  const p = design.parameters;
  const s = frontClipSpec(design);
  const parts: NamedCadPart[] = [];
  const add = (name: string, material: CadMaterial, shape: Handle) => {
    parts.push({ name, material, shape });
    return shape;
  };
  const box = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) =>
    kernel.makeBoxFromCorners({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });

  const lateralCylinder = (radius: number, x: number, y: number, z: number, length: number) => {
    const cylinder = kernel.makeCylinder(radius, length);
    const turned = kernel.rotate(cylinder, {
      point: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 },
    }, -Math.PI / 2);
    return kernel.translate(turned, x, y - length / 2, z);
  };

  const halfW = p.bodyWidthMm / 2;
  const roofZ = p.groundClearanceMm + p.bodyHeightMm;
  const frontArchCutter = lateralCylinder(
    s.wheelOpeningRadiusMm, s.frontAxleXmm, 0, s.wheelOpeningCenterZmm, p.bodyWidthMm + 500,
  );
  const rearArchCutter = lateralCylinder(
    p.tireDiameterMm / 2 + 85, 0, 0, p.tireDiameterMm / 2, p.bodyWidthMm + 500,
  );
  const cutArch = (shape: Handle) => kernel.cutAll(shape, [frontArchCutter, rearArchCutter]);

  parts.push(...buildRefinedCabin(kernel, design, frontArchCutter, rearArchCutter));

  // Both fender shells are cut by the axle-driven exact cylindrical arch.
  // The axle moves; the main body front/rear datums do not.
  let leftFrontFender!: Handle;
  let rightFrontFender!: Handle;
  for (const side of [-1, 1]) {
    const y1 = side > 0 ? halfW - 80 : -halfW;
    const y2 = side > 0 ? halfW : -halfW + 80;
    const fender = kernel.cut(
      box(s.cabinFrontXmm, y1, p.groundClearanceMm + 70,
        s.bodyFrontXmm, y2, p.groundClearanceMm + 1250),
      frontArchCutter,
    );
    add(side > 0 ? "left-front-fender-arch-cut" : "right-front-fender-arch-cut",
      "body", fender);
    if (side > 0) leftFrontFender = fender;
    else rightFrontFender = fender;
    const lowerTrimY = side > 0 ? halfW + 4 : -halfW - 17;
    add(side > 0 ? "left-dark-front-lower-panel" : "right-dark-front-lower-panel",
      "dark", kernel.cut(
        box(s.cabinFrontXmm, lowerTrimY, p.groundClearanceMm + 95,
          s.bodyFrontXmm, lowerTrimY + 13, p.groundClearanceMm + 340),
        frontArchCutter,
      ));

    // Semicircular, genuine BREP annular fender flare: boolean common of a
    // cylinder and upper panel, minus the wheel-opening cutter.
    const flareY1 = side > 0 ? halfW + 5 : -halfW - 46;
    const flareY2 = flareY1 + 41;
    const outer = lateralCylinder(s.wheelOpeningRadiusMm + 60,
      s.frontAxleXmm, (flareY1 + flareY2) / 2, s.wheelOpeningCenterZmm, 41);
    const topHalf = box(s.frontAxleXmm - s.wheelOpeningRadiusMm - 65,
      flareY1, s.wheelOpeningCenterZmm,
      s.frontAxleXmm + s.wheelOpeningRadiusMm + 65,
      flareY2, s.wheelOpeningCenterZmm + s.wheelOpeningRadiusMm + 65);
    const outerArc = kernel.common(outer, topHalf);
    const innerArc = lateralCylinder(s.wheelOpeningRadiusMm,
      s.frontAxleXmm, (flareY1 + flareY2) / 2, s.wheelOpeningCenterZmm, 45);
    add(side > 0 ? "left-arched-fender-flare" : "right-arched-fender-flare",
      "dark", kernel.cut(outerArc, innerArc));
  }

  // A sloping hood with real planar surfaces. Draw a closed X/Z profile at
  // the passenger-side edge, then extrude the planar face across vehicle Y.
  const hoodY = -halfW + 94;
  const profile = [
    { x: s.cabinFrontXmm, y: hoodY, z: s.hoodRearBottomZmm },
    { x: s.bodyFrontXmm, y: hoodY, z: s.hoodNoseBottomZmm },
    { x: s.bodyFrontXmm, y: hoodY, z: s.hoodNoseTopZmm },
    { x: s.cabinFrontXmm, y: hoodY, z: s.hoodRearTopZmm },
  ];
  const edges = profile.map((v, i) => kernel.makeLineEdge(v, profile[(i + 1) % profile.length]));
  const hoodFace = kernel.makeFace(kernel.makeWire(edges));
  add("sloped-g10-hood", "body", kernel.extrude(hoodFace, 0, p.bodyWidthMm - 188, 0));

  // Fixed front fascia, horizontal grille rhythm, stacked rectangular lamps.
  const nose = s.bodyFrontXmm;
  add("front-fascia", "body", box(nose - 16, -halfW + 80,
    p.groundClearanceMm + 780, nose + 18, halfW - 80,
    p.groundClearanceMm + 1280));
  add("recessed-grille", "dark", box(nose + 19, -565,
    p.groundClearanceMm + 850, nose + 42, 565, p.groundClearanceMm + 1220));
  for (let i = 0; i < 6; i++) {
    const z = p.groundClearanceMm + 878 + i * 59;
    add(`chrome-grille-slat-${i + 1}`, "chrome",
      box(nose + 43, -555, z, nose + 57, 555, z + 15));
  }
  add("chevrolet-grille-emblem", "chrome", box(nose + 58, -85,
    p.groundClearanceMm + 1020, nose + 70, 85, p.groundClearanceMm + 1070));

  for (const side of [-1, 1]) {
    const centerY = side * (halfW - 175);
    for (let level = 0; level < 2; level++) {
      const z = p.groundClearanceMm + 990 + level * 140;
      add(`${side > 0 ? "left" : "right"}-${level ? "upper" : "lower"}-lamp-bezel`,
        "chrome", box(nose + 20, centerY - 115, z,
          nose + 73, centerY + 115, z + 118));
      add(`${side > 0 ? "left" : "right"}-${level ? "upper" : "lower"}-lamp-lens`,
        "light", box(nose + 74, centerY - 97, z + 14,
          nose + 89, centerY + 97, z + 104));
    }
  }

  parts.push(...buildBumperConcept(kernel, design));
  const bodyDatum = add("front-body-datum", "body",
    box(nose - 12, -halfW + 80, p.groundClearanceMm + 1270,
      nose, halfW - 80, p.groundClearanceMm + 1290));

  return { parts, bodyDatum, frontArchCutter, leftFrontFender, rightFrontFender };
}
