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

## Proposed stack

- Next.js + React + TypeScript
- Tailwind CSS
- Three.js / React Three Fiber for the interactive viewport
- **M0 geometry-kernel bake-off:** brepjs/occt-wasm vs Replicad/OpenCascade vs OpenGeometry/Rust-WASM
- STEP/STL/projection export from the selected deterministic geometry engine
- FormDrive as a reference for automotive studio/camera/material interaction patterns
- COLMAP / Meshroom for optional photo reconstruction
- Open3D for point-cloud cleanup, alignment, and comparison
- FreeCAD TechDraw as an optional downstream technical-drawing worker
- brepjs-cad for deterministic AI-authored geometry verification in CI
- build123d/CadQuery as server-side geometry fallbacks/specialist tools
- Project Chrono as a later-stage vehicle-dynamics/suspension analysis integration

## Product workflow

Capture -> Calibrate -> Model -> Modify -> Validate -> Compare -> Render -> Draw -> Export -> Build

## Status (October 2026)

- **M0 merged:** one authoritative OCCT runtime with brepjs authoring; exact baseline/+10-inch geometry, STEP, projection, and browser smoke tests.
- **M1 capture register merged:** `/capture` has measured/assumed provenance, confidence, tolerance, source, lock, local JSON and draft persistence.
- **M1 photo calibration in progress:** browser-local PNG/JPEG/WebP import, named photo datums, 2-point image-plane scale and wheel-center cross-check. This does **not** solve camera pose, perspective correction, 3D fitting or structural approval.
- **Security isolation:** OpenGeometry research code is not served by the production Next.js app; its vulnerable transitive `uuid` is excluded from production dependencies. The historical browser research fixture is archived under `research/`.

### Run locally

```bash
npm ci
npm test
npm run build
npm start
```

Open `/` for the 3D model, `/capture` for actual Pops Van measurement/photo evidence, or `/references/g10-1986` for the initial factory G10 front-end styling reference and +8/+10/+12/+14 in design guides. The G10 image is **not** a measured Pops Van photo; see `docs/M1_G10_FRONT_END_REFERENCE.md`. The 3D workbench now includes an exact BREP G10-inspired front-clip concept (hood, body shell, cut fenders, curved flares, bumper, grille and stacked lamps), a provisional STEP export and a fail-closed capture comparison. See `docs/M2_G10_FRONT_CLIP_CAD.md` for geometry assumptions and engineering gates.

**Photo privacy and backups:** image bytes are stored in the current browser's IndexedDB only. Capture JSON includes filenames, measurements, marker positions and scales, **not the image bytes**. Keep your original photos separately; reattach them after importing JSON on another browser. No cloud upload or automatic apply-to-model is implemented.

**Build safety:** This is an exploratory design and evidence workbench, not a structural, steering, suspension, brake, roadworthiness or fabrication certification.
