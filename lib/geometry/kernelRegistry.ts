import type { KernelScore } from "./types";

export const kernelScorecard: KernelScore[] = [
  {
    kernel: "brepjs",
    status: "pass",
    notes: [
      "M0 exact frame-rail smoke PASS in GitHub Actions",
      "Declared volume verified and STEP export generated",
      "brepjs 20.0.0 + occt-wasm 5.5.0",
      "Apache-2.0 API with LGPL-2.1 OCCT WASM kernel",
      "Exact BREP + STEP + deterministic AI verification CLI",
    ],
  },
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
