type BrepModule = typeof import("brepjs");
type OcctModule = typeof import("occt-wasm");

export interface SharedGeometryRuntime {
  kernel: Awaited<ReturnType<OcctModule["OcctKernel"]["init"]>>;
  brepjs: BrepModule;
  initializedAt: number;
}

let runtimePromise: Promise<SharedGeometryRuntime> | undefined;

async function createRuntime(): Promise<SharedGeometryRuntime> {
  const startedAt = performance.now();
  const [occt, brepjs] = await Promise.all([
    import("occt-wasm"),
    import("brepjs"),
  ]);

  const kernel = await occt.OcctKernel.init();

  // brepjs is an authoring/verification layer over the exact same OCCT arena
  // used directly by AutoBench for HLR, low-level measurement and export.
  type KernelArg = Parameters<typeof brepjs.OcctWasmAdapter.fromKernel>[0];
  brepjs.registerKernel(
    "occt-wasm",
    brepjs.OcctWasmAdapter.fromKernel(kernel as unknown as KernelArg),
  );

  return {
    kernel,
    brepjs,
    initializedAt: performance.now() - startedAt,
  };
}

export function getSharedGeometryRuntime(): Promise<SharedGeometryRuntime> {
  runtimePromise ??= createRuntime();
  return runtimePromise;
}

export async function disposeSharedGeometryRuntime() {
  if (!runtimePromise) return;

  const runtime = await runtimePromise;
  runtime.kernel[Symbol.dispose]();
  runtimePromise = undefined;
}
