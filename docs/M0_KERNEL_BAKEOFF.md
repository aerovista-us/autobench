# M0 Geometry Kernel Bake-Off

## Purpose

Select AutoBench's primary exact geometry kernel using the same Pops Van geometry and acceptance rules rather than package positioning or demos.

The canonical `VehicleDesign` and `GeometryEngine` contract stay independent of the winner.

## Candidates

| Kernel | Exact geometry | STEP | Browser fit | AI verification | M0 status |
| --- | --- | --- | --- | --- | --- |
| occt-wasm direct | BREP / OCCT | Yes | **Production Chromium PASS** | Custom deterministic assertions | **Full Pops PASS** |
| brepjs | BREP / OCCT | Yes | Browser-capable; full Pops path not yet run | Strong CLI verification workflow | **Frame-rail smoke PASS** |
| Replicad + OpenCascade | BREP / OCCT | Yes | Strong browser/Node fit | Build our own fixture assertions | Pending |
| OpenGeometry | Rust/WASM CAD kernel | Yes | Browser-native | Deterministic modeling API | Pending |

## Completed brepjs proof

Fixture: `cad/m0-frame-rail.brep.ts`

The fixture creates a 3000 mm × 76 mm × 152 mm solid frame rail and declares its expected volume.

GitHub Actions now performs:

```
npx brep cad/m0-frame-rail.brep.ts \
  --check \
  --step artifacts/m0-frame-rail.step \
  --json artifacts/m0-frame-rail.report.json
```

The exact-CAD step has passed. The workflow also passes AutoBench's analytical geometry tests and Next.js production build.

CI publishes the STEP file and verification JSON as the `m0-exact-cad-artifacts` workflow artifact.

## Completed direct occt-wasm Pops proof

The shared baseline now lives in `data/pops-van.baseline.json` and is consumed by both the web workbench and the exact fixture.

The direct `occt-wasm` compiler now proves baseline and +10 in scenarios with:

- exact front/rear axle datums,
- exact wheelbase,
- preserved body front/rear envelope,
- non-empty tessellation,
- STEP export for both scenarios,
- production Next.js build,
- Chromium runtime initialization of the WASM kernel,
- live UI candidate edit followed by a second exact rebuild.

Latest proven values:

- baseline wheelbase: **3175 mm**
- +10 in wheelbase: **3429 mm**
- moved front axle X: **3429 mm**
- body front X remains: **4089 mm**
- display mesh: **1,260 triangles** in both scenarios

This proves the low-level OCCT browser path. It does not prove that the higher-level brepjs API should be the production authoring layer.

## Full Pops Van comparison fixture

Each candidate must compile the same inputs:

- left/right frame rails
- rear axle datum
- front axle datum
- four tires
- simplified body envelope
- front clip envelope
- bumper envelope
- baseline and +10 in front-axle scenarios

The +10 in operation must not silently change the body envelope.

## Required outputs

For baseline and +10 in:

1. exact or deterministic geometry rebuild
2. display mesh
3. wheelbase measurement
4. front-axle position
5. body/front-axle interference result
6. approach-angle inputs
7. side projection or equivalent edge representation
8. STEP export
9. deterministic revision/hash evidence

## Scorecard

Score 1–5 with notes:

| Criterion | Weight |
| --- | ---: |
| geometry / boolean reliability | 5 |
| dimensional measurement reliability | 5 |
| STEP export and round-trip | 5 |
| deterministic rebuild | 5 |
| browser worker responsiveness | 4 |
| projection / drawing ergonomics | 4 |
| sweep / loft / body-envelope capability | 4 |
| Three.js integration | 3 |
| TypeScript developer ergonomics | 3 |
| memory / startup cost | 3 |
| automated testing / AI verification | 5 |
| license / distribution fit | 5 |
| API stability / maintenance risk | 4 |

## Selection rule

Do not pick the winner solely from the weighted total.

A candidate is disqualified if it cannot reliably:

- rebuild the Pops Van M0 fixture,
- preserve declared dimensions,
- export usable STEP,
- run within the intended web/worker architecture, or
- support deterministic automated verification.

## Current conclusion

**Direct occt-wasm currently leads on evidence, but the decision is not locked.**

It is the first path to pass the full Pops fixture, STEP export, production browser/WASM runtime, and live +10 in rebuild. brepjs remains attractive for its higher-level authoring and verification ergonomics, but only its frame-rail CLI fixture is proven so far. Replicad and OpenGeometry still need the same Pops Van fixture before M0 can close.
