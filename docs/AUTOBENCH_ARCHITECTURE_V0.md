# AutoBench Architecture v0.1

## Product definition

AutoBench is an AI-first vehicle design workbench for converting observed vehicle geometry and modification intent into a controlled parametric model, reproducible views, validation results, and fabrication-oriented documentation.

The first production project is Pops' Chevy 4x4 Adventure Van.

## Core rule: one design truth

All meaningful outputs derive from one versioned `VehicleDesign` document.

Concept renders and AI-generated images are never authoritative.

### Measurement states

Every critical value must carry provenance:

- `observed` — directly measured on the vehicle
- `scanDerived` — derived from calibrated reconstruction/point cloud
- `reference` — sourced from trusted documentation
- `assumed` — temporary estimate
- `designed` — intentional modification
- `locked` — verified and protected from silent changes

A value also carries confidence, units, source references, author, and revision.

## Canonical model

Initial shape:

```ts
type VehicleDesign = {
  id: string
  revision: string
  units: "mm"
  vehicle: VehicleIdentity
  datums: DatumSet
  parameters: ParameterSet
  parts: PartInstance[]
  anchors: Anchor[]
  constraints: Constraint[]
  measurements: Measurement[]
  validations: ValidationResult[]
  sources: SourceAsset[]
  operationLog: DesignOperation[]
}
```

Store internally in millimeters. UI may display inches.

## Coordinate system

Lock this immediately:

- X = longitudinal, positive toward front
- Y = lateral, positive driver-left
- Z = vertical, positive upward
- origin = rear-axle centerline projected onto vehicle center plane at ground datum, unless project capture establishes a better durable datum

Each project may define additional named datum planes and axes.

## Geometry pipeline

```
VehicleDesign JSON
      |
      v
Typed feature compiler
      |
      v
Replicad / OpenCascade BREP
      |
      +--> Three.js display mesh
      +--> STEP
      +--> STL if needed
      +--> orthographic SVG projections
      +--> measurements / bounding boxes / intersections
```

The mesh rendered in the UI is disposable. Rebuild it from `VehicleDesign`.

## Front-end workbench

Proposed primary layout:

- left rail: project / revisions / assemblies
- center: 3D or orthographic viewport
- right rail: selected-part parameters, measurements, constraints, validation
- bottom tray: AI command bar + operation preview + history
- top modes: **Capture / Model / Modify / Validate / Plan / Render**

### Interaction

Support both direct-manipulation and parameter editing:

- select a part
- drag a permitted anchor/axis
- type an exact dimension
- use context menu operations
- ask AI for a change in natural language

Every interaction resolves into the same typed operation.

## AI action contract

AI does not directly write geometry.

Example operation:

```json
{
  "type": "setParameter",
  "target": "frontAxle.centerX",
  "value": 254,
  "unit": "mm",
  "reason": "Move front axle forward 10 in from baseline"
}
```

### Required flow

1. parse intent
2. identify affected parameters and dependencies
3. generate proposed operations
4. compile a temporary candidate revision
5. run impacted validations
6. show geometric/measurement diff
7. user accepts or rejects
8. commit accepted operations to the design log

AI cannot alter a `locked` value without an explicit unlock operation.

## Pops Van model hierarchy

Initial assemblies:

- Reference
  - scan / point cloud
  - photos
  - manual measurements
- Chassis
  - left/right frame rails
  - crossmembers
  - front frame extension
- Axles
  - front axle
  - rear axle
- Suspension
  - front springs/links/shocks
  - rear suspension envelope
- Steering
  - steering box
  - drag link / tie rod envelopes
- Wheels & Tires
- Body
  - main van body
  - wheel openings
  - floor / rocker envelope
- Front Clip
  - grille
  - radiator support
  - headlights
  - hood/nose envelope
- Armor
  - bumper
  - winch
  - recovery points
- Power / Cooling
  - engine envelope
  - radiator/fans
  - battery/electrical boxes
- Interior / Cargo
- Trailer / Hitch envelope

## Vehicle-specific validation engine

Phase-one checks:

- wheelbase
- track width
- front/rear overhang
- ground clearance
- approach/departure/breakover angles
- tire-to-body clearance
- tire-to-frame clearance
- steering sweep envelope
- suspension bump/droop envelope
- axle/front-clip collision
- bumper/winch packaging
- radiator/fan package envelope
- frame-extension length and overlap tracking
- driveshaft envelope and approximate working-angle reporting
- hitch/cargo interference

Results are advisory design checks, not engineering certification.

## Capture pipeline

Inputs can include:

- phone photos
- video frames
- tape/laser measurements
- wheel/tire known dimensions
- printed or rigid scale markers
- point cloud / mesh
- manuals/spec sheets
- sketches

Optional processing:

```
photos/video
   -> COLMAP or Meshroom
   -> point cloud / reference mesh + camera poses
   -> Open3D alignment / cleanup
   -> calibrated reference asset
   -> landmark fitting against parametric model
```

The reconstructed surface is a **reference**, not the final parametric model.

## Accuracy strategy

AutoBench should show uncertainty instead of hiding it.

Each dimension and fitted landmark gets:

- value
- confidence
- source
- tolerance or estimated error
- status

Viewport overlays:

- green: verified/locked
- amber: inferred/scan-derived
- red: conflicting or invalid
- gray: assumed

## Plans and drawings

Phase 1: generate projections directly from Replicad and overlay dimensions/annotations from the canonical model.

Phase 2: send STEP + drawing manifest to a FreeCAD TechDraw worker for richer:

- dimensioned pages
- sections
- detail views
- tolerances
- DXF
- SVG
- PDF

## Rendering

### Accurate render

Use the geometry directly in Three.js/React Three Fiber with PBR materials, environment lighting, fixed camera presets, and saved view definitions.

### High-quality render

Export a tessellated asset to a headless Blender render worker.

### Generative enhancement

Optional image-generation passes may use geometry-derived depth/normal/edge images to improve realism. These images never change measurements or geometry.

## Persistence

Suggested project structure:

```
projects/<project-id>/
  design.json
  revisions/
  sources/
    photos/
    scans/
    references/
  exports/
    step/
    drawings/
    renders/
  reports/
```

Application persistence can move to database/object storage later, but the project format should remain portable and human-inspectable.

## Revision model

Every accepted edit creates:

- parent revision
- operations
- changed parameters
- affected assemblies
- validation delta
- generated artifact hashes
- author/agent
- timestamp

Support branch/compare/restore early.

## Guardrails

1. geometry export must be reproducible from the committed design document
2. no unlocked hidden "magic" dimensions
3. no AI mutation without operation log
4. no drawing dimension that is not traceable back to design geometry
5. no render presented as dimensionally accurate unless produced from the committed geometry
6. no safety-critical claim based only on visual clearance
7. all assumptions visible in the UI and export report
