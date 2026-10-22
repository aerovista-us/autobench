import type { OcctKernel } from "occt-wasm";
import type { VehicleDesign } from "../model/types";
import { frontClipSpec } from "./frontClipSpec.ts";
import { resolveConceptOptions } from "../model/conceptOptions.ts";
import type { NamedCadPart, CadMaterial } from "./frontClipCad";

type Kernel = Awaited<ReturnType<typeof OcctKernel.init>>;
type Handle = ReturnType<Kernel["makeBox"]>;
type XZ = { x: number; z: number };

export function xzSolid(kernel: Kernel, profile: XZ[], y: number, width: number): Handle {
  const pts = profile.map(p => ({ x: p.x, y, z: p.z }));
  const edges = pts.map((v, i) => kernel.makeLineEdge(v, pts[(i + 1) % pts.length]));
  return kernel.extrude(kernel.makeFace(kernel.makeWire(edges)), 0, width, 0);
}
function yzSolid(kernel: Kernel, profile: { y: number; z: number }[], x: number, length: number): Handle {
  const pts = profile.map(p => ({ x, y: p.y, z: p.z }));
  const edges = pts.map((v, i) => kernel.makeLineEdge(v, pts[(i + 1) % pts.length]));
  return kernel.extrude(kernel.makeFace(kernel.makeWire(edges)), length, 0, 0);
}

/**
 * G-series inspired cabin, built inside the *assumed* M0 envelope.
 * The roof shoulder, raked pillars and window openings are true solids.
 * Photo ratios inform appearance only; they are not vehicle measurements.
 */
export function buildRefinedCabin(kernel: Kernel, design: VehicleDesign,
  frontArch: Handle, rearArch: Handle): NamedCadPart[] {
  const p = design.parameters;
  const choices = resolveConceptOptions(design);
  const s = frontClipSpec(design);
  const halfW = p.bodyWidthMm / 2;
  const roofZ = p.groundClearanceMm + p.bodyHeightMm;
  const cab = s.cabinFrontXmm;
  const rear = s.bodyRearXmm;
  const parts: NamedCadPart[] = [];
  const add = (name: string, material: CadMaterial, shape: Handle) =>
    parts.push({ name, material, shape });
  const box = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) =>
    kernel.makeBoxFromCorners({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });
  const archCut = (shape: Handle) => kernel.cutAll(shape, [frontArch, rearArch]);

  // Cut back the top-front corner so the cab has a raked A-pillar, rather than
  // the previous rectangular face and oversized black window sticker.
  const rakeCutter = xzSolid(kernel, [
    { x: cab - 295, z: roofZ + 70 },
    { x: cab + 110, z: roofZ + 70 },
    { x: cab + 110, z: roofZ - 970 },
  ], -halfW - 70, p.bodyWidthMm + 140);
  const windowProfile: XZ[] = [
    { x: cab - 1130, z: roofZ - 845 },
    { x: cab - 135, z: roofZ - 845 },
    { x: cab - 315, z: roofZ - 210 },
    { x: cab - 1130, z: roofZ - 210 },
  ];
  const windowCutter = xzSolid(kernel, windowProfile, -halfW - 75, p.bodyWidthMm + 150);
  // Passenger/conversion glazing is cut through the same exact side BREP.
  // A cargo variant retains the sheet metal; portholes are 16-sided cutouts.
  const roundedPane = (left: number, right: number, bottom: number, top: number, corner = 80): XZ[] => {
    // Rounded corners in exact BREP using a segmented sketch, rather than
    // the former eight-sided polygon that read like a cartoon window.
    const corners = [
      { x: right - corner, z: bottom + corner, start: -Math.PI / 2 },
      { x: right - corner, z: top - corner, start: 0 },
      { x: left + corner, z: top - corner, start: Math.PI / 2 },
      { x: left + corner, z: bottom + corner, start: Math.PI },
    ];
    return corners.flatMap(c => Array.from({ length: 5 }, (_, i) => {
      const angle = c.start + i * Math.PI / 8;
      return { x: c.x + Math.cos(angle) * corner,
        z: c.z + Math.sin(angle) * corner };
    }));
  };
  const sidePanes: { name: string; profile: XZ[] }[] = [];
  if (choices.sideGlass === "conversion") {
    sidePanes.push({ name: "sliding-door", profile: roundedPane(480, 1820,
      roofZ - 835, roofZ - 230, 75) });
    sidePanes.push({ name: "rear-quarter", profile: roundedPane(rear + 205, -170,
      roofZ - 825, roofZ - 235, 75) });
  } else if (choices.sideGlass === "porthole") {
    const radius = 220;
    const centerX = rear + 710;
    const centerZ = roofZ - 530;
    sidePanes.push({ name: "rear-porthole", profile: Array.from({ length: 16 }, (_, i) => {
      const angle = Math.PI * 2 * i / 16;
      return { x: centerX + Math.cos(angle) * radius,
        z: centerZ + Math.sin(angle) * radius };
    }) });
  }
  const sidePaneCutters = sidePanes.map(pane =>
    xzSolid(kernel, pane.profile, -halfW - 75, p.bodyWidthMm + 150));
  const rearCornerCutter = xzSolid(kernel, [
    { x: rear - 95, z: roofZ + 65 },
    { x: rear + 170, z: roofZ + 65 },
    { x: rear - 95, z: roofZ - 430 },
  ], -halfW - 90, p.bodyWidthMm + 180);


  for (const side of [-1, 1]) {
    const y1 = side > 0 ? halfW - 58 : -halfW;
    const y2 = side > 0 ? halfW : -halfW + 58;
    const panel = box(rear, y1, p.groundClearanceMm + 30,
      cab, y2, roofZ - 115);
    add(side > 0 ? "left-shaped-cabin-panel" : "right-shaped-cabin-panel", "body",
      kernel.cutAll(panel, [frontArch, rearArch, rakeCutter,
        rearCornerCutter, windowCutter, ...sidePaneCutters]));

    const outerY = side > 0 ? halfW + 4 : -halfW - 20;
    add(side > 0 ? "left-cutout-side-glass" : "right-cutout-side-glass", "glass",
      xzSolid(kernel, windowProfile, outerY, 16));

    for (const pane of sidePanes) {
      const frameY = side > 0 ? halfW + 5 : -halfW - 25;
      const paneY = side > 0 ? halfW + 12 : -halfW - 18;
      const centerX = pane.profile.reduce((sum, point) => sum + point.x, 0) / pane.profile.length;
      const centerZ = pane.profile.reduce((sum, point) => sum + point.z, 0) / pane.profile.length;
      const surround = pane.profile.map(point => ({
        x: centerX + (point.x - centerX) * 1.065,
        z: centerZ + (point.z - centerZ) * 1.065,
      }));
      const inner = xzSolid(kernel, pane.profile, frameY - 1, 34);
      const outer = xzSolid(kernel, surround, frameY, 32);
      add(`${side > 0 ? "left" : "right"}-${pane.name}-window-surround`, "dark",
        kernel.cut(outer, inner));
      add(`${side > 0 ? "left" : "right"}-${pane.name}-window-glass`, "glass",
        xzSolid(kernel, pane.profile, paneY, 15));
    }
    const trimY = side > 0 ? halfW + 7 : -halfW - 16;
    add(side > 0 ? "left-upper-window-frame" : "right-upper-window-frame", "dark",
      box(cab - 1160, trimY, roofZ - 222, cab - 290, trimY + 10, roofZ - 195));
    add(side > 0 ? "left-window-sill" : "right-window-sill", "chrome",
      box(cab - 1160, trimY, roofZ - 858, cab - 108, trimY + 12, roofZ - 840));
    add(side > 0 ? "left-b-pillar" : "right-b-pillar", "dark",
      box(cab - 1165, trimY, roofZ - 850, cab - 1124, trimY + 12, roofZ - 185));
    add(side > 0 ? "left-a-pillar" : "right-a-pillar", "dark",
      xzSolid(kernel, [
        { x: cab - 346, z: roofZ - 185 },
        { x: cab - 297, z: roofZ - 185 },
        { x: cab - 92, z: roofZ - 865 },
        { x: cab - 145, z: roofZ - 865 },
      ], trimY, 13));

    // Door boundaries and handles help communicate real body scale.
    add(side > 0 ? "left-door-rear-seam" : "right-door-rear-seam", "dark",
      box(cab - 1190, trimY, p.groundClearanceMm + 345,
        cab - 1182, trimY + 9, roofZ - 870));
    add(side > 0 ? "left-door-front-seam" : "right-door-front-seam", "dark",
      box(cab - 125, trimY, p.groundClearanceMm + 355,
        cab - 117, trimY + 9, roofZ - 900));
    add(side > 0 ? "left-door-handle" : "right-door-handle", "chrome",
      box(cab - 1050, trimY + 8, roofZ - 1000,
        cab - 880, trimY + 28, roofZ - 974));

    add(side > 0 ? "left-mirror-arm" : "right-mirror-arm", "chrome",
      box(cab - 315, side > 0 ? halfW + 10 : -halfW - 170,
        roofZ - 950, cab - 255, side > 0 ? halfW + 170 : -halfW - 10,
        roofZ - 931));
    add(side > 0 ? "left-mirror-housing" : "right-mirror-housing", "chrome",
      box(cab - 360, side > 0 ? halfW + 120 : -halfW - 220,
        roofZ - 925, cab - 225, side > 0 ? halfW + 220 : -halfW - 120,
        roofZ - 735));

    // Actual side-door definition is crucial: an unbroken cargo wall reads as
    // a panel truck even with the right front clip. The passenger side has
    // a large sliding-door aperture/track; the other side has a panel seam.
    for (const x of [350, 1950]) {
      add(`${side > 0 ? "left" : "right"}-sliding-door-seam-${x}`, "dark",
        box(x, trimY, p.groundClearanceMm + 345,
          x + 9, trimY + 11, roofZ - 890));
    }
    add(`${side > 0 ? "left" : "right"}-sliding-door-bottom-seam`, "dark",
      box(350, trimY, p.groundClearanceMm + 335,
        1960, trimY + 11, p.groundClearanceMm + 345));
    add(`${side > 0 ? "left" : "right"}-sliding-door-track`, "chrome",
      box(335, trimY, roofZ - 930, 1970, trimY + 14, roofZ - 917));
    add(`${side > 0 ? "left" : "right"}-sliding-door-handle`, "chrome",
      box(1690, trimY + 11, roofZ - 1065,
        1830, trimY + 31, roofZ - 1037));
    if (choices.twoTone) {
      add(`${side > 0 ? "left" : "right"}-two-tone-side-sweep`, "accent",
        archCut(box(rear + 105, trimY + 3, p.groundClearanceMm + 1130,
          cab - 100, trimY + 19, p.groundClearanceMm + 1190)));
    }
    // A gently stepped shoulder creates a visible side contour, not a slab.
    add(`${side > 0 ? "left" : "right"}-upper-side-shoulder`, "body",
      box(rear + 150, trimY - 9, roofZ - 1170,
        cab - 145, trimY + 8, roofZ - 1115));
    add(side > 0 ? "left-beltline" : "right-beltline", "chrome",
      box(rear + 100, trimY, p.groundClearanceMm + 1230,
        cab - 120, trimY + 10, p.groundClearanceMm + 1246));
    add(side > 0 ? "left-dark-rocker" : "right-dark-rocker", "dark",
      archCut(box(rear + 50, trimY, p.groundClearanceMm + 85,
        cab - 90, trimY + 12, p.groundClearanceMm + 335)));
  }

  // Beveled roof shoulders and forward taper replace the M2 sharp slab roof.
  const roofEnd = cab - 240;
  const roofStart = rear + 110;
  add("roof-crown", "body", box(roofStart, -halfW + 155, roofZ - 88,
    roofEnd, halfW - 155, roofZ - 12));
  for (const side of [-1, 1]) {
    const shoulder = [
      { y: side * (halfW - 155), z: roofZ - 12 },
      { y: side * (halfW - 118), z: roofZ - 17 },
      { y: side * (halfW - 78), z: roofZ - 33 },
      { y: side * (halfW - 40), z: roofZ - 61 },
      { y: side * (halfW - 12), z: roofZ - 96 },
      { y: side * halfW, z: roofZ - 135 },
      { y: side * (halfW - 155), z: roofZ - 135 },
    ];
    add(side > 0 ? "left-roof-shoulder" : "right-roof-shoulder", "body",
      yzSolid(kernel, shoulder, roofStart, roofEnd - roofStart));
  }
  add("raked-front-roof-brow", "body", xzSolid(kernel, [
    { x: roofEnd - 30, z: roofZ - 118 },
    { x: roofEnd + 95, z: roofZ - 177 },
    { x: roofEnd + 95, z: roofZ - 115 },
    { x: roofEnd - 30, z: roofZ - 20 },
  ], -halfW + 115, p.bodyWidthMm - 230));
  add("cabin-floor", "body", archCut(box(rear + 40, -halfW + 65,
    p.groundClearanceMm + 570, cab - 50, halfW - 65,
    p.groundClearanceMm + 635)));
  add("rear-closure", "body", kernel.cut(
    box(rear, -halfW + 58, p.groundClearanceMm + 635,
      rear + 58, halfW - 58, roofZ - 125), rearCornerCutter));

  // Windshield glass is a sloping extrusion with matching narrow pillar rails.
  const windshieldProfile: XZ[] = [
    { x: cab + 18, z: roofZ - 740 },
    { x: cab + 37, z: roofZ - 740 },
    { x: cab - 210, z: roofZ - 163 },
    { x: cab - 229, z: roofZ - 163 },
  ];
  add("raked-windshield-glass", "glass",
    xzSolid(kernel, windshieldProfile, -halfW + 128, p.bodyWidthMm - 256));
  for (const side of [-1, 1]) {
    const edgeY = side > 0 ? halfW - 138 : -halfW + 120;
    add(side > 0 ? "left-windshield-frame" : "right-windshield-frame", "dark",
      xzSolid(kernel, [
        { x: cab + 5, z: roofZ - 755 },
        { x: cab + 58, z: roofZ - 755 },
        { x: cab - 194, z: roofZ - 147 },
        { x: cab - 249, z: roofZ - 147 },
      ], edgeY, 18));
  }
  return parts;
}
