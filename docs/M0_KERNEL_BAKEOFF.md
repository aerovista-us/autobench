# M0 Geometry Kernel Bake-Off

## Purpose

Select AutoBench's primary exact geometry kernel using the same Pops Van geometry and acceptance rules rather than package positioning or demos.

The canonical `VehicleDesign` and `GeometryEngine` contract stay independent of the winner.

## Candidates

| Kernel | Exact geometry | STEP | Browser fit | AI verification | M0 status |
| --- | --- | --- | --- | --- | --- |
| brepjs + occt-wasm | BREP / OCCT | Yes | TypeScript/WASM; browser integration still to prove | Strong CLI verification workflow | **Smoke PASS** |
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

**brepjs leads, but the decision is not locked.**

Its exact frame-rail proof is the first candidate to pass real AutoBench CI. Replicad and OpenGeometry still need the same Pops Van fixture before M0 can close.
