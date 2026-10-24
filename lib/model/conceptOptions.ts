import type { VehicleDesign } from "./types";

export type FrontBumperConcept = "chrome-stock" | "plate-trail" | "winch-plate" | "brush-guard";
export type FrontShockConcept = "unverified" | "monotube" | "remote-reservoir";
export type FrontSpringConcept = "unverified" | "leaf-service" | "heavy-duty-leaf";

export type SideGlassConcept = "conversion" | "cargo" | "porthole";

export interface VehicleConceptOptions {
  sideGlass: SideGlassConcept;
  roofRack: boolean;
  sideSteps: boolean;
  rearSpare: boolean;
  auxiliaryLights: boolean;
  twoTone: boolean;
  bumper: FrontBumperConcept;
  shock: FrontShockConcept;
  spring: FrontSpringConcept;
}

export const defaultConceptOptions: VehicleConceptOptions = {
  sideGlass: "cargo",
  roofRack: false,
  sideSteps: true,
  rearSpare: false,
  auxiliaryLights: false,
  twoTone: true,
  bumper: "chrome-stock",
  shock: "unverified",
  spring: "unverified",
};

export function resolveConceptOptions(design: VehicleDesign): VehicleConceptOptions {
  return { ...defaultConceptOptions, ...design.conceptOptions };
}

export function setVehicleConceptOption<K extends keyof VehicleConceptOptions>(
  design: VehicleDesign,
  key: K,
  value: VehicleConceptOptions[K],
): VehicleDesign {
  if (resolveConceptOptions(design)[key] === value) return design;
  return {
    ...design,
    revision: design.revision + 1,
    conceptOptions: { ...resolveConceptOptions(design), [key]: value },
    conceptHistory: [...(design.conceptHistory ?? []), {
      revision: design.revision + 1,
      key, value: String(value),
      note: "Unapproved visual/mechanical concept; no measured mount or fitment evidence",
    }],
  };
}

export const conceptCautions = [
  "The exact front suspension type, axle, shock mounting points and spring perches on Pops Van have not been measured.",
  "Leaf-service and heavy-duty-leaf concepts are illustrations, not confirmed replacement spring packs or compatible kits.",
  "Monotube and remote-reservoir shock concepts have no verified extended/compressed lengths, mount type or travel envelope.",
  "Bumper concepts lack frame bracket, airbag/crash, cooling, steering, winch-load, recovery and approach-angle validation.",
  "Roof accessories, steps, lamps, spare carriers and window cutouts are visual proposals without verified mounting, wiring, sealing, weight or structure.",
  "No parts are approved for ordering, fabrication, installation or road use.",
];

export type ExteriorPreset = "cargo" | "classic" | "camper" | "expedition";

export const exteriorPresets: Record<ExteriorPreset, Pick<VehicleConceptOptions,
  "sideGlass" | "roofRack" | "sideSteps" | "rearSpare" | "auxiliaryLights" | "twoTone">> = {
  cargo: { sideGlass: "cargo", roofRack: false, sideSteps: false,
    rearSpare: false, auxiliaryLights: false, twoTone: false },
  classic: { sideGlass: "conversion", roofRack: false, sideSteps: true,
    rearSpare: false, auxiliaryLights: false, twoTone: true },
  camper: { sideGlass: "porthole", roofRack: true, sideSteps: true,
    rearSpare: false, auxiliaryLights: true, twoTone: true },
  expedition: { sideGlass: "conversion", roofRack: true, sideSteps: true,
    rearSpare: true, auxiliaryLights: true, twoTone: true },
};

export function currentExteriorPreset(design: VehicleDesign): ExteriorPreset | "custom" {
  const current = resolveConceptOptions(design);
  for (const [name, preset] of Object.entries(exteriorPresets)) {
    if (Object.entries(preset).every(([key, value]) =>
      current[key as keyof VehicleConceptOptions] === value)) return name as ExteriorPreset;
  }
  return "custom";
}

/** Apply a group of visual choices as one revision, never changing dimensions. */
export function applyExteriorPreset(design: VehicleDesign, name: ExteriorPreset): VehicleDesign {
  const next = { ...resolveConceptOptions(design), ...exteriorPresets[name] };
  const before = resolveConceptOptions(design);
  const changed = (Object.keys(exteriorPresets[name]) as Array<keyof VehicleConceptOptions>)
    .filter(key => before[key] !== next[key]);
  if (!changed.length) return design;
  return {
    ...design,
    revision: design.revision + 1,
    conceptOptions: next,
    conceptHistory: [...(design.conceptHistory ?? []), ...changed.map(key => ({
      revision: design.revision + 1,
      key, value: String(next[key]),
      note: `Unapproved exterior preset ${name}; visual CAD only, no measured fitment`,
    }))],
  };
}
