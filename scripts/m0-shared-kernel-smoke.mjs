import { OcctKernel } from "occt-wasm";
import {
  OcctWasmAdapter,
  box,
  getBounds,
  registerKernel,
} from "brepjs";

const initStart = performance.now();
const kernel = await OcctKernel.init();
const initMs = performance.now() - initStart;

registerKernel("occt-wasm", OcctWasmAdapter.fromKernel(kernel));

let brepShape;
let directShape;

try {
  // Both calls allocate into the same underlying OcctKernel arena.
  brepShape = box(3000, 76, 152, {
    at: [1500, 0, 76],
    centered: true,
  });
  directShape = kernel.makeBoxFromCorners(
    { x: 0, y: -38, z: 0 },
    { x: 3000, y: 38, z: 152 },
  );

  const brepBounds = getBounds(brepShape);
  const directBounds = kernel.getBoundingBox(directShape);

  const checks = [
    ["xMin", brepBounds.xMin, directBounds.xmin],
    ["xMax", brepBounds.xMax, directBounds.xmax],
    ["yMin", brepBounds.yMin, directBounds.ymin],
    ["yMax", brepBounds.yMax, directBounds.ymax],
    ["zMin", brepBounds.zMin, directBounds.zmin],
    ["zMax", brepBounds.zMax, directBounds.zmax],
  ];

  for (const [label, brepValue, directValue] of checks) {
    if (!Number.isFinite(brepValue) || !Number.isFinite(directValue)) {
      throw new Error(`${label}: non-finite shared-kernel result`);
    }
    if (Math.abs(brepValue - directValue) > 1e-6) {
      throw new Error(
        `${label}: brepjs=${brepValue} direct=${directValue}`,
      );
    }
  }

  const svg = kernel.toMultiviewSVG(directShape);
  if (!svg.includes("<svg")) {
    throw new Error("Shared direct kernel projection failed");
  }

  console.log(
    JSON.stringify(
      {
        status: "pass",
        architecture: "single-occt-wasm-instance",
        brepjsAdapter: "OcctWasmAdapter.fromKernel",
        initMs,
        bounds: {
          xMin: directBounds.xmin,
          xMax: directBounds.xmax,
          yMin: directBounds.ymin,
          yMax: directBounds.ymax,
          zMin: directBounds.zmin,
          zMax: directBounds.zmax,
        },
        directProjection: "pass",
      },
      null,
      2,
    ),
  );
} finally {
  brepShape?.[Symbol.dispose]();
  if (directShape) kernel.release(directShape);
  kernel[Symbol.dispose]();
}
