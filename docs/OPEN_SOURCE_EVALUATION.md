# AutoBench Open-Source Evaluation v0.1

## Recommendation

Use **Replicad + OpenCascade/WASM** as the first geometry kernel and keep the canonical model in TypeScript.

That lets AutoBench use the same parameter schema and geometry compiler in the browser and in Node workers. It avoids making a Python CAD service the source of truth while still leaving build123d/CadQuery available as fallback or specialist tooling.

## Candidate stack

| Tool | Role | License | Adopt? | Notes |
| --- | --- | --- | --- | --- |
| Replicad | Parametric BREP geometry in browser/Node | MIT | **Core** | OpenCascade abstraction built for embedding in web apps. STEP/STL/JSON and SVG projection workflow. |
| OpenCascade.js | Geometry kernel under Replicad | LGPL-style OCCT ecosystem/build dependent | **Indirect** | Use through Replicad's packaged WASM unless a lower-level need appears. |
| Three.js + React Three Fiber | Interactive 3D viewport | MIT | **Core** | Selection, cameras, materials, helpers, transforms, overlays, animation. |
| COLMAP / PyCOLMAP | Photo-based SfM/MVS reconstruction | BSD | **Capture** | Good automated reconstruction and camera recovery from overlapping photos. |
| Meshroom / AliceVision | Guided photogrammetry pipelines | MPL-2.0 | **Optional capture worker** | Useful desktop/batch reconstruction and modern segmentation/depth plugins. Keep isolated from app source. |
| Open3D | Point clouds, registration, cleanup, comparison | MIT | **Capture/QA** | Useful for alignment, ICP/global registration, point-cloud cleanup and scan-to-model comparison. |
| FreeCAD TechDraw | Technical drawings from 3D | LGPL-2.1 | **Downstream worker** | Strong dimensioned pages, sections, DXF/SVG/PDF. Do not make it the interactive UI. |
| build123d | Python parametric CAD | Apache-2.0 | **Fallback / analysis** | Strong, modern OpenCascade Python API. Good option for geometry jobs that exceed Replicad. |
| CadQuery | Python parametric CAD | Apache-2.0 | **Fallback / ecosystem** | Mature parametric scripting and STEP/DXF export. |
| Project Chrono | Vehicle dynamics / multibody simulation | BSD-style | **Later** | Useful after geometry is stable for suspension/steering/tire and multibody studies. |

## Why Replicad first

1. AutoBench is a web workbench. Replicad is specifically intended to be integrated into browser applications.
2. It runs on OpenCascade, so it produces BREP solids rather than only display meshes.
3. Its CLI can export STEP/STL/JSON and SVG projections.
4. The same TypeScript model compiler can run client-side in a Web Worker and server-side in Node.
5. It minimizes geometry drift between "interactive preview" and "exported model."

### Risk

Replicad is smaller than FreeCAD/CadQuery/build123d and may expose OpenCascade edge cases during advanced body surfacing.

### Mitigation

Create an internal geometry adapter from day one:

```ts
interface GeometryEngine {
  compile(model: VehicleDesign): Promise<CompiledGeometry>
  exportStep(model: VehicleDesign): Promise<Blob>
  exportProjection(model: VehicleDesign, view: OrthoView): Promise<string>
  measure(model: VehicleDesign): Promise<MeasurementResult[]>
}
```

The vehicle schema and tests stay independent of the chosen kernel. If a feature becomes unreliable in Replicad, a server worker can execute a build123d/CadQuery equivalent without changing the product model.

## What not to do

- Do not make an AI image model the vehicle modeler.
- Do not begin from a generic downloaded Chevy van mesh and silently treat it as Pops' van.
- Do not keep independent 2D plan geometry and 3D geometry.
- Do not let the browser display mesh become the authoritative geometry.
- Do not implement a full general-purpose CAD program before the first van workflow works.

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
