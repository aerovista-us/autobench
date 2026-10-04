import type { KernelScore } from "./types";

export const kernelScorecard: KernelScore[] = [
  {
    kernel: "occt-wasm",
    status: "pass",
    notes: [
      "Full Pops baseline +10 in exact fixture PASS",
      "Exact BREP measurements, STEP export, 1,260-triangle display mesh",
      "Production Next build + Chromium runtime/WASM rebuild PASS",
      "Direct TypeScript/WASM API; current strongest end-to-end evidence",
    ],
  },
  {
    kernel: "brepjs",
    status: "pass",
    notes: [
      "Exact frame-rail CLI smoke PASS in GitHub Actions",
      "Declared volume verified and STEP export generated",
      "brepjs 20.0.0 on occt-wasm 5.5.0",
      "Full Pops fixture through brepjs API still pending",
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
