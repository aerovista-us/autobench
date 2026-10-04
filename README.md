# AutoBench

AI-first vehicle design and fabrication-planning workbench for AeroVista.

AutoBench is intended to turn real vehicle measurements, photographs, scan data, and design intent into a controlled parametric vehicle model that can produce believable 3D views, orthographic projections, dimensioned plans, fit/clearance checks, and fabrication-oriented documentation.

## First project

**Pops' Chevy 4x4 Adventure Van**

The first proving ground is the family-built Chevy G-series 4x4 van. Initial design questions include the front-axle relocation, front-clip/nose proportions, frame modifications, tire and steering clearance, bumper/winch packaging, cooling/electrical packaging, and the overall adventure/base-camp configuration.

## Non-negotiable principles

1. **Geometry before imagery.** Pretty renders are outputs of the model, never the source of truth.
2. **One canonical design state.** Measurements, assumptions, parameters, anchors, constraints, locks, and revisions live in a versioned vehicle manifest.
3. **AI proposes operations, not hallucinated meshes.** Natural-language requests become typed geometry operations that must validate before commit.
4. **Observed vs assumed vs designed are different states.** Every important dimension carries provenance and confidence.
5. **Locked measurements stay locked.** AI and manual tools cannot silently alter verified dimensions.
6. **Every view is reproducible.** 3D, side/front/top projections, drawings, exports, and renders derive from the same revision.
7. **Plans are fabrication-oriented, not stamped engineering.** Structural, steering, braking, suspension, and road-safety changes still require competent real-world verification.

## Proposed core stack

- Next.js + React + TypeScript
- Tailwind CSS
- Three.js / React Three Fiber for the interactive viewport
- Replicad + OpenCascade/WASM for browser/server parametric BREP geometry
- STEP/STL/SVG projection export from the same geometry engine
- COLMAP / Meshroom for optional photo reconstruction
- Open3D for point-cloud cleanup, alignment, and comparison
- FreeCAD TechDraw as an optional downstream technical-drawing worker
- Project Chrono as a later-stage vehicle-dynamics/suspension analysis integration

## Product workflow

Capture -> Calibrate -> Model -> Modify -> Validate -> Compare -> Render -> Draw -> Export -> Build

## Status

Repository initialized. Architecture and Pops Van capture specifications are being authored next.
