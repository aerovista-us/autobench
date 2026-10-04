import type {
  DesignOperation,
  VehicleDesign,
  VehicleParameters,
} from "./types";

export function setVehicleParameter(
  design: VehicleDesign,
  target: keyof VehicleParameters,
  nextValue: number,
  reason: string,
): VehicleDesign {
  const previousValue = design.parameters[target];

  if (previousValue === nextValue) return design;

  const operation: DesignOperation = {
    id: `op-${design.revision + 1}-${String(target)}`,
    type: "setParameter",
    target,
    previousValue,
    nextValue,
    reason,
    timestamp: new Date().toISOString(),
  };

  return {
    ...design,
    revision: design.revision + 1,
    parameters: {
      ...design.parameters,
      [target]: nextValue,
    },
    operationLog: [...design.operationLog, operation],
  };
}
