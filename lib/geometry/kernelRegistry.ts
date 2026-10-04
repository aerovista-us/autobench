import type { KernelScore } from "./types";

export const kernelScorecard: KernelScore[] = [
  {
    kernel: "occt-wasm",
    status: "pass",
    notes: [
      "SELECTED authoritative M0 geometry kernel",
      "Full Pops baseline +10 in exact fixture PASS",
      "Exact BREP measurements, STEP, 1,260-triangle display mesh",
      "HLR/multiview SVG PASS",
      "Production Chromium/WASM live rebuild PASS",
      "Can be shared with brepjs through OcctWasmAdapter.fromKernel",
    ],
  },
  {
    kernel: "brepjs",
    status: "pass",
    notes: [
      "SELECTED AI authoring + verification layer over shared occt-wasm",
      "Full Pops exact fixture PASS",
      "Named multi-part XCAF STEP PASS",
      "1,260-triangle display mesh",
      "High-level projection bridge not currently exposed",
      "v20 package API uses getBounds; current docs still showed getBoundingBox",
    ],
  },
  {
    kernel: "replicad",
    status: "pass",
    notes: [
      "Full Pops exact fixture PASS",
      "Whole assembly STEP PASS",
      "Visible + hidden HLR projection PASS",
      "1,260-triangle display mesh",
      "Strong fallback/reference; separate OpenCascade WASM distribution",
      "Root LICENSE/package metadata MIT; package README contains stale AGPL wording",
    ],
  },
  {
    kernel: "opengeometry",
    status: "pass",
    notes: [
      "Full browser-native Pops geometry fixture PASS",
      "Fast warm rebuild in M0 sample",
      "HLR projection PASS",
      "Per-solid STEP PASS",
      "Analytic WorldGraph whole-assembly STEP currently blocked",
      "Research/performance challenger; not selected primary",
    ],
  },
];
