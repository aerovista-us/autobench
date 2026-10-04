import type { KernelScore } from "./types";

export const kernelScorecard: KernelScore[] = [
  {
    kernel: "replicad",
    status: "not-run",
    notes: [
      "Replicad 1.1.0",
      "OpenCascade-backed",
      "Upstream LICENSE verified MIT; npm readme contains stale/conflicting AGPL text",
    ],
  },
  {
    kernel: "opengeometry",
    status: "not-run",
    notes: [
      "OpenGeometry 2.0.16",
      "Rust/WASM browser CAD kernel",
      "MPL-2.0",
    ],
  },
];
