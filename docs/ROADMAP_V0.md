# AutoBench Roadmap v0.1

## M0 — Foundation

- [ ] Next.js / React / TypeScript application shell
- [ ] canonical VehicleDesign schema
- [ ] units and datum conventions
- [ ] revision + operation-log model
- [ ] Replicad/OpenCascade worker proof
- [ ] Three.js/R3F viewport
- [ ] STEP + SVG projection export smoke test

**Exit:** edit one dimension and reproduce the same result in 3D, STEP and side projection.

## M1 — Pops Van baseline

- [ ] capture/import UI
- [ ] manual measurement entry
- [ ] reference photo board
- [ ] wheel/axle/frame/body-envelope primitives
- [ ] datum/anchor editor
- [ ] confidence/provenance system
- [ ] baseline acceptance report

**Exit:** AutoBench contains a believable calibrated as-captured van envelope.

## M2 — Modification workbench

- [ ] selection and transform handles
- [ ] exact parameter editing
- [ ] context menu
- [ ] add/remove/edit anchor points
- [ ] mirror/lock/suppress part
- [ ] scenario branches and compare
- [ ] undo/redo

**Exit:** front axle can be moved through the 8–14 in range with dependent geometry updating.

## M3 — AI-first operations

- [ ] natural-language intent parser
- [ ] typed operation proposals
- [ ] affected-part preview
- [ ] temporary candidate compile
- [ ] validation delta
- [ ] accept/reject
- [ ] locked-dimension protection

**Exit:** "move the front axle forward 10 inches and extend the nose enough to preserve tire clearance" produces a reviewable candidate revision rather than direct uncontrolled geometry.

## M4 — Vehicle validation

- [ ] clearances
- [ ] tire steering sweep
- [ ] suspension travel envelopes
- [ ] approach/departure/breakover
- [ ] frame/front-clip interference
- [ ] cooling/electrical package envelopes
- [ ] driveshaft envelope and approximate angle checks
- [ ] validation report

## M5 — Plans and fabrication package

- [ ] dimensioned orthographic pages
- [ ] hidden-line mode
- [ ] sections/details
- [ ] cut/fabrication notes
- [ ] STEP/DXF/SVG/PDF package
- [ ] revision watermark/hash
- [ ] assumption and validation schedule

## M6 — Capture automation

- [ ] COLMAP/PyCOLMAP worker
- [ ] Open3D cleanup/alignment
- [ ] photo-camera pose viewer
- [ ] point-cloud/reference-mesh overlay
- [ ] assisted landmark fitting
- [ ] scan-to-parametric deviation heatmap

## M7 — Render and simulation

- [ ] saved camera/view presets
- [ ] accurate PBR render
- [ ] headless Blender render
- [ ] optional geometry-conditioned generative enhancement
- [ ] Project Chrono feasibility spike for suspension/steering dynamics

## First coding slice

Do not build all of M0 before seeing geometry.

Build one vertical slice:

1. create VehicleDesign with wheelbase, tracks, tire diameter, frame rails and body envelope
2. compile with Replicad
3. render with R3F
4. expose "front axle offset"
5. update geometry live
6. generate side SVG projection
7. export STEP
8. compute wheelbase and approach angle
9. save revision

That slice proves the architecture.
