# AutoBench Open-Source Evaluation v0.1

## Recommendation

Do **not** lock the geometry kernel before M0.

Run the same Pops Van vertical slice through:

1. **brepjs + occt-wasm** — new front-runner because it combines exact browser BREP, STEP, TypeScript, Three.js mesh output, and a deterministic AI verification CLI that can fail CI when geometry does not match declared intent.
2. **Replicad + OpenCascade/WASM** — mature browser BREP option with straightforward STEP and hidden-line projection export.
3. **OpenGeometry + Rust/WASM** — strong challenger designed explicitly for browser/AI CAD with direct Three.js integration and deterministic modeling operations.

Keep the canonical `VehicleDesign` schema independent of either engine.

## Candidate stack

| Tool | Role | License | Adopt? | Notes |
| --- | --- | --- | --- | --- |
| brepjs + occt-wasm | Exact BREP geometry + AI verification | Apache-2.0 + LGPL-2.1 kernel | **M0 front-runner** | Exact STEP-grade solids, TypeScript API, R3F-compatible mesh output, measurements, and brepjs-cad verification CLI. |
| Replicad | Parametric BREP geometry in browser/Node | MIT | **M0 challenger** | OpenCascade abstraction built for embedding in web apps. STEP/STL/JSON and SVG projection workflow. |
| OpenGeometry | Browser-native Rust/WASM CAD kernel | MPL-2.0 | **M0 challenger** | Explicitly targets web/AI CAD; Three.js-friendly; primitives, sweeps, booleans, STEP/STL and projection/export paths. APIs/exports are still evolving. |
| OpenCascade.js | Geometry kernel under Replicad | OCCT ecosystem licensing | **Indirect** | Use through Replicad's packaged WASM unless a lower-level need appears. |
| Three.js + React Three Fiber | Interactive 3D viewport | MIT | **Core** | Selection, cameras, materials, helpers, transforms, overlays, animation. |
| FormDrive | Automotive R3F/WebGPU studio reference | MIT app source | **Reference / selective reuse** | Useful patterns for deterministic cameras, PBR materials, vehicle-part pivots, loading and browser verification; not engineering CAD. |
| COLMAP / PyCOLMAP | Photo-based SfM/MVS reconstruction | BSD | **Capture** | Automated reconstruction and camera recovery from overlapping photos. |
| Meshroom / AliceVision | Guided photogrammetry pipelines | MPL-2.0 | **Optional capture worker** | Desktop/batch reconstruction and modern segmentation/depth plugins. Keep isolated from app source. |
| Open3D | Point clouds, registration, cleanup, comparison | MIT | **Capture/QA** | Alignment, ICP/global registration, point-cloud cleanup and scan-to-model comparison. |
| FreeCAD TechDraw | Technical drawings from 3D | LGPL-2.1 | **Downstream worker** | Dimensioned pages, sections, DXF/SVG/PDF. Do not make it the interactive UI. |
| build123d | Python parametric CAD | Apache-2.0 | **Fallback / analysis** | Modern OpenCascade Python API for geometry jobs that exceed the browser kernel. |
| CadQuery | Python parametric CAD | Apache-2.0 | **Fallback / ecosystem** | Mature parametric scripting and STEP/DXF export. |
| Project Chrono | Vehicle dynamics / multibody simulation | BSD-style | **Later** | Candidate for suspension/steering/tire and multibody studies after geometry is stable. |
| Suspension Explorer Core | Suspension kinematic solver | AGPL-3.0 current | **Reference only** | Excellent ISO 8855 hardpoint/metric ideas, but current license and lack of solid-axle support make it a poor AutoBench dependency for Pops Van. |

## Geometry-kernel bake-off

Implement the exact same model and test fixture against Replicad and OpenGeometry:

- two frame rails
- front/rear axle centerlines
- four tires
- simplified body envelope
- front-clip envelope
- bumper envelope
- editable front-axle offset

Score both engines on:

- deterministic rebuild
- boolean reliability
- sweep/loft capability needed for vehicle body envelopes
- dimensional measurement
- projection/hidden-line output
- STEP round-trip quality
- browser load/start time
- worker responsiveness
- mesh generation speed
- memory use
- TypeScript integration
- automated-test ergonomics
- long-term API risk
- licensing/distribution fit

Pick the winner only after this fixture passes.

## Why Replicad currently leads

1. It is explicitly meant for integration into browser apps.
2. It uses OpenCascade BREP geometry.
3. Its CLI already exports STEP/STL/JSON and SVG projections, including hidden-line mode.
4. Browser and Node can share the same TypeScript model compiler.
5. OpenCascade gives us a mature geometry foundation for mechanical solids.

### Replicad risk

The project is smaller than FreeCAD/CadQuery/build123d and advanced body surfacing may expose kernel/API edge cases.

## Why OpenGeometry deserves the bake-off

1. It is explicitly designed for browser CAD and AI-assisted CAD.
2. Rust/WASM + TypeScript/Three.js is an attractive fit for AutoBench.
3. It exposes deterministic primitives, booleans, sweeps, editing, projections and STEP/STL export.
4. It is actively maintained.

### OpenGeometry risk

The APIs are evolving and some export/technical-drawing work is still described as experimental or in-flight. We should prove it on our geometry rather than adopting from positioning alone.

## Geometry abstraction

Create an internal adapter from day one:

```ts
interface GeometryEngine {
  compile(model: VehicleDesign): Promise<CompiledGeometry>
  exportStep(model: VehicleDesign): Promise<Blob>
  exportProjection(model: VehicleDesign, view: OrthoView): Promise<string>
  measure(model: VehicleDesign): Promise<MeasurementResult[]>
}
```

The vehicle schema and tests stay independent of the chosen kernel. A server worker can later execute a build123d/CadQuery equivalent for specialist jobs without changing the product model.

## What not to do

- Do not make an AI image model the vehicle modeler.
- Do not begin from a generic downloaded Chevy van mesh and silently treat it as Pops' van.
- Do not keep independent 2D plan geometry and 3D geometry.
- Do not let the browser display mesh become authoritative geometry.
- Do not implement a full general-purpose CAD program before the first van workflow works.
- Do not embed AGPL vehicle-solver code into the proprietary app without intentionally accepting the license obligations.

## First proof-of-concept

The first geometry proof should be deliberately boring:

1. frame rails
2. front and rear axle centerlines
3. tires/wheels
4. simplified body envelope
5. front clip envelope
6. bumper envelope

Then prove that one parameter edit—e.g. moving the front axle forward 10 inches—updates:

- the 3D model,
- side/top/front projections,
- wheelbase and approach-angle calculations,
- tire/body clearance checks,
- exported STEP,
- a revision diff.

Only then add detailed surfacing.


## brepjs finding

brepjs materially changes the M0 comparison because its `brepjs-cad` workflow directly addresses the main AI-CAD failure mode: an agent can author a model, run it against a real kernel, and receive deterministic geometry measurements and pass/fail assertions instead of judging correctness from source code or a render.

AutoBench now includes an exact frame-rail fixture under `cad/`. CI verifies that fixture and exports a STEP file before the Next.js build is allowed to pass.

This does **not** automatically make brepjs the final winner. AutoBench still needs to compare live rebuild latency, complex body-envelope operations, drawing/projection ergonomics, browser memory use, and long-term API stability across all candidates.
