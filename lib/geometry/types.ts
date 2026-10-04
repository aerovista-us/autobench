import type { VehicleDesign } from "@/lib/model/types";

export type KernelName = "preview" | "brepjs" | "replicad" | "opengeometry";

export interface GeometryArtifact {
  kernel: KernelName;
  revision: number;
  generatedAt: string;
  notes: string[];
}

export interface GeometryEngine {
  name: KernelName;
  compile(design: VehicleDesign): Promise<GeometryArtifact>;
  exportStep?(design: VehicleDesign): Promise<Blob>;
  exportProjectionSvg?(design: VehicleDesign): Promise<string>;
}

export interface KernelScore {
  kernel: Exclude<KernelName, "preview">;
  status: "not-run" | "pass" | "fail" | "blocked";
  notes: string[];
}
