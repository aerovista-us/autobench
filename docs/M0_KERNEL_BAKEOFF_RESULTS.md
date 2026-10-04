# AutoBench M0 Kernel Bake-Off — Results

## Decision

AutoBench will use a **single direct `occt-wasm` kernel instance as the authoritative geometry engine**.

brepjs will sit on top of that same kernel instance as the preferred **AI authoring, typed operation, and deterministic verification layer**.

This is intentionally a stack rather than a winner-take-all library choice:

```
VehicleDesign
    |
    v
AutoBench typed feature compiler
    |
    +--> brepjs authoring / verification API
    |        |
    |        v
    +---- shared OcctKernel instance <---- direct occt-wasm APIs
             |
             +--> exact BREP measurements
             +--> tessellation for Three.js
             +--> HLR / multiview SVG
             +--> STEP
             +--> XCAF assembly path
```

Replicad remains a strong fallback/reference implementation. OpenGeometry remains a useful browser-native research path, especially for interactive projection performance, but is not the primary fabrication geometry path in M0.

## Common fixture

Every candidate was tested against the same shared Pops Van baseline manifest.

Baseline:

- wheelbase: 3175 mm
- rear axle X: 0 mm
- front axle X: 3175 mm
- body front X: 4089 mm

Candidate operation:

- `frontAxleOffsetMm = 254` (+10 in)

Required result:

- front axle X: 3429 mm
- wheelbase: 3429 mm
- body front/rear envelope unchanged
- non-empty render geometry
- deterministic output
- STEP capability evaluated
- projection capability evaluated where exposed

## Measured M0 results

Representative GitHub Actions results from the current bake-off. Timings are CI observations, not guarantees or production benchmarks.

| Candidate | Init | Baseline compile/export | Warm +10 in | Exact wheelbase | Display mesh | Whole assembly STEP | HLR/projection |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| direct occt-wasm | 113 ms | 254 ms | 116 ms | PASS | 1,260 tri | PASS as compound | PASS; deterministic multiview SVG |
| Replicad | 232 ms | 199 ms | 78 ms | PASS | 1,260 tri | PASS | PASS; visible + hidden paths |
| brepjs / occt-wasm | 98 ms | 208 ms | 74 ms | PASS | 1,260 tri | **PASS; named XCAF assembly** | High-level projection bridge not currently exposed |
| OpenGeometry | 153 ms | 112 ms | **33 ms** | PASS | 756 tri | per-solid PASS; analytic multi-body blocked | **PASS; 249/251 HLR lines** |

Timing scope is not perfectly identical:

- direct occt-wasm timing includes exact tessellation, STEP and 4-view multiview HLR SVG.
- Replicad timing includes mesh, one side HLR projection and whole-assembly STEP.
- brepjs timing includes mesh and named multi-part XCAF STEP, but no high-level HLR projection.
- OpenGeometry timing includes display geometry, side HLR projection and selected per-solid STEP exports, not a whole analytic assembly STEP.

Use these values to identify gross performance risk, not to claim a microbenchmark winner.

## Candidate findings

### Direct occt-wasm

**Strengths**

- exact BREP measurements pass the full Pops baseline and +10 in fixture
- production Next.js browser/WASM runtime proven in Chromium
- live exact rebuild proven after workbench edit
- STEP export proven
- native HLR and deterministic multiview SVG
- direct access to OCCT capabilities without abstraction gaps
- worker support exists upstream
- MIT license
- same kernel can be retained by brepjs through `OcctWasmAdapter.fromKernel()`

**Weaknesses**

- lowest-level TypeScript authoring API of the finalists
- AutoBench must supply its own higher-level feature vocabulary and operation semantics
- current M0 direct STEP proof is a geometric compound; named XCAF assembly should be the production assembly export path

**Role:** authoritative kernel.

### brepjs

**Strengths**

- exact full Pops fixture passes on occt-wasm
- exact measurements and display mesh match direct OCCT
- named/color-aware multi-shape XCAF STEP export passes
- strong typed functional API
- Result-based error handling
- explicit resource-disposal patterns
- `brepjs-cad` verification loop is unusually well suited to AI-authored geometry
- Apache-2.0
- can register onto the same `OcctKernel` instance AutoBench uses directly

**Weaknesses**

- installed v20 package exposed `getBounds` while current documentation still showed `getBoundingBox`; the first fixture failed until aligned to the real package API
- high-level projection bridge is not currently exposed even though the underlying OCCT kernel supports HLR
- fast-moving API surface raises adapter-version maintenance risk

**Role:** AI authoring + verification layer on the authoritative kernel.

### Replicad

**Strengths**

- full Pops exact fixture passes
- whole multi-body STEP passes
- projection API is straightforward and returns visible/hidden geometry
- very good TypeScript ergonomics
- same 1,260-triangle result as the OCCT-family fixtures
- mature OpenCascade-based browser CAD approach
- root LICENSE and package metadata are MIT

**Weaknesses**

- package README still contains stale AGPL wording despite MIT LICENSE/package metadata
- introduces a separate OpenCascade WASM distribution rather than reusing AutoBench's chosen occt-wasm instance
- less purpose-built deterministic AI verification than brepjs
- slower initialization in current CI sample

**Role:** fallback/reference engine; useful benchmark for CAD ergonomics and projection behavior.

### OpenGeometry

**Strengths**

- fastest warm rebuild in current M0 sample
- browser-native Rust/WASM architecture
- exact fixture passes
- built-in world graph maps well to assemblies
- built-in hidden-line projection works cleanly
- excellent Three.js fit
- deterministic side projection produced 249 baseline and 251 moved lines

**Weaknesses**

- current analytic WorldGraph cannot export the entire multi-body van as one authoritative STEP assembly; per-solid STEP works
- measured body bounds show tiny floating representation differences after meter scaling, although axle datums remain exact and error is far below current capture tolerance
- APIs and export paths are still evolving
- MPL-2.0 requires more care than permissive MIT/Apache dependencies when modifying library source

**Role:** research/performance challenger and source of useful browser-CAD patterns.

## Weighted decision aid

Scores are engineering judgment from 1–5 applied to the weighting already defined in the M0 plan. They are not external benchmark claims.

| Candidate | Weighted score |
| --- | ---: |
| direct occt-wasm | **92.7 / 100** |
| Replicad | **91.5 / 100** |
| brepjs | **90.9 / 100** |
| OpenGeometry | **84.2 / 100** |

The top three are too close for the numeric total alone to choose the architecture.

The deciding fact is that **direct occt-wasm and brepjs can share one kernel instance**. AutoBench therefore gets direct projection/XCAF/kernel access and brepjs AI-safe authoring without maintaining a second geometry truth.

## Shared-kernel proof

CI initializes one `OcctKernel`, registers it into brepjs using:

```ts
registerKernel("occt-wasm", OcctWasmAdapter.fromKernel(kernel))
```

Then AutoBench creates geometry through both the brepjs API and the direct occt-wasm API against that same instance and verifies matching exact bounds.

The same direct kernel also generates an HLR multiview projection before deterministic teardown.

This proof is the basis of the selected M0 architecture.

## M0 architecture lock

**Selected**

- exact kernel: `occt-wasm`
- AI/typed CAD layer: `brepjs` over the shared kernel
- viewport: React Three Fiber using tessellation derived from committed BREP
- projection: direct occt-wasm HLR/multiview initially
- assembly STEP: XCAF path; brepjs named assembly export is already proven
- analytical calculations: AutoBench canonical `VehicleDesign` derivations, cross-checked against exact BREP measurements

**Not selected as primary**

- Replicad: retain through M0 evidence/fixtures, then remove from production dependency surface unless a concrete feature needs it
- OpenGeometry: retain as research fixture until its assembly/export story closes the current gap

## Remaining M0 closure work

1. add reproducible npm lockfile and switch CI to `npm ci`
2. record lightweight memory/bundle-size evidence
3. move selected shared-kernel initialization from smoke proof into the production workbench path
4. update Issue #2 and close M0 only after those gates pass

After that, move to M1 capture/calibration rather than adding more generic CAD surface area.
