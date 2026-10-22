import type { VehicleDesign } from "./types";

export type FrontBumperConcept = "chrome-stock" | "plate-trail" | "winch-plate" | "brush-guard";
export type FrontShockConcept = "unverified" | "monotube" | "remote-reservoir";
export type FrontSpringConcept = "unverified" | "leaf-service" | "heavy-duty-leaf";

export interface VehicleConceptOptions {
  bumper: FrontBumperConcept;
  shock: FrontShockConcept;
  spring: FrontSpringConcept;
}

export const defaultConceptOptions: VehicleConceptOptions = {
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
      key, value,
      note: "Unapproved visual/mechanical concept; no measured mount or fitment evidence",
    }],
  };
}

export const conceptCautions = [
  "The exact front suspension type, axle, shock mounting points and spring perches on Pops Van have not been measured.",
  "Leaf-service and heavy-duty-leaf concepts are illustrations, not confirmed replacement spring packs or compatible kits.",
  "Monotube and remote-reservoir shock concepts have no verified extended/compressed lengths, mount type or travel envelope.",
  "Bumper concepts lack frame bracket, airbag/crash, cooling, steering, winch-load, recovery and approach-angle validation.",
  "No parts are approved for ordering, fabrication, installation or road use.",
];
