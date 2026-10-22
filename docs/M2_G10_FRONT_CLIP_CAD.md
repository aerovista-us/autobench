# AutoBench M2 — G10 parametric front-clip concept and Pops Van fitment gate

## Goal and scope

Develop the revised **front fenders, straight bumper, sloped hood, cabin/body panels, front fascia, stacked rectangular headlights, chrome horizontal grille, wheel openings and flare rings** from the 1986 G10 styling reference. The photo is a **styling reference only**, not a dimensioned scan of Pops Van.

All parts are authored in the **shared direct occt-wasm BREP kernel**, not as cosmetic Three.js primitives. The main 3D workbench renders tessellation of that BREP assembly, with material groups for body, chrome, dark trim, glass, rubber, steel and lamp lenses. The user can export provisional STEP from the workbench.

## Canonical geometry and assumptions

- Units: millimeters; +X forward, +Y left, +Z up, rear axle ground datum.
- Original M0 baseline: wheelbase **3175 mm (125 in)**, front axle +0. All parameters remain provisional low-confidence values. Older concept boards also show an estimated current wheelbase near **104 in** and another estimated proposed wheelbase of **125–131 in**. These are conflicting concept estimates, not actual measured dimensions. Physical tape/scan capture must determine the authoritative wheelbase.
- First front axle design: **+254 mm (+10 in)**. Compare +0/+203.2/+254/+304.8/+355.6 mm (+0/+8/+10/+12/+14 in).
- **Body front X = 4089 mm** and **body rear X = -1372 mm** remain fixed as axle offsets change.
- Revised wheel arch is a true cylindrical **BREP subtraction** through each fender. Its center follows the front axle, radius = modeled tire radius + **85 mm** static allowance. Each side also has a separate curved annular flare built with BREP intersection and subtraction.
- Main cabin side panels are separate solids with front/rear wheel cuts. Roof, floor, rear closure, side windows and windshield are independent BREP features. Dark lower-body/rocker skins retain a simplified blue-to-black heritage treatment (not a photorealistic paint gradient). This is a conceptual shell, not a reverse-engineered unibody structure.
- Hood uses an exact X/Z profile face extruded across the body: rear top = ground clearance + 1520 mm; nose top = ground clearance + 1280 mm.
- Grille bars, central badge, two stacked headlight pairs per side and straight bumper are separate BREP parts. Their dimensions are authored styling assumptions, not OEM drawings.
- Static radial arch allowance is **not** tire steering envelope, bump travel, full articulation, tire growth, liner clearance, braking, suspension, steering linkage, frame, winch recovery loads, cooling or crashworthiness verification.

## Exact CAD acceptance

Run:

```bash
npm ci
npm test
node scripts/m0-exact-pops.mjs
node scripts/m2-front-clip-exact.mjs
npm run build
```

The M2 script builds **all five axle positions** from the same baseline design, checks exact BREP wheelbase and fixed body datum, axle/arch alignment, 85 mm arch radius allowance, meaningful material removed from both front fenders, descending hood profile, material groups, STEP and projection. It writes:

- `artifacts/pops-g10-front-clip-plus-10.step` — provisional +10-inch front-clip CAD assembly.
- `artifacts/pops-g10-front-clip-plus-10.svg` — OCCT multiview projection.
- `artifacts/pops-g10-front-clip-validation.json` — five-scenario exact CAD report.
- `artifacts/m2-g10-front-clip.png` — Playwright proof of the rendered workbench and capture gate.

The +14-inch scenario has only **41.4 mm** nominal arch-to-front-face land. This is explicitly flagged for front fascia/fender redesign rather than marked fit-ready.

## Measured Pops Van geometry comparison

The workbench reads an existing browser-local capture from `autobench:pops-van:capture:v1` or accepts a `pops-van-capture-v1.json` upload for comparison. Uploading does **not** overwrite the model or saved capture.

Comparison logic checks observed/scan-derived, high/verified, dated and sourced measurements against canonical CAD parameters using their declared tolerances. The gate is:

- **BLOCKED** if required measurements/photos are absent or incomplete.
- **DIMENSION MISMATCH** if evidence is complete but any observed dimension exceeds its declared tolerance against CAD.
- **READY FOR HUMAN REVIEW — NOT APPROVED** only if evidence is complete and compared dimensions match.

The gate is an **evidence-completeness and dimensional comparison**, not an independent authenticity check, photogrammetric reconstruction, or engineering acceptance. User-entered provenance and tolerances must be audited.

No actual measured Pops Van capture has been committed to the repository. Browser-local data may exist on the owner's computer but is not available in this build environment. Accordingly **measured vehicle acceptance is blocked** until the user captures and supplies actual vehicle measurements, including wheelbase, track, tire size, body width/height, overhangs, frame spacing/height, ground clearance and driver/front/rear photos. Photo calibration still needs verified camera pose and perspective correction.

## Safety and next engineering gates

1. Capture and lock real Pops Van dimensions, with tolerances, source dates and photos; import them into the comparison panel.
2. Reconcile any differences **through explicit reviewed design operations**, not silent baseline replacement.
3. Create tire sweep and steering-envelope geometry at full lock, compression and articulation; check fender, bumper, frame and body interference.
4. Verify chassis frame extension/boxing, crossmembers, steering, brakes, suspension, driveshaft, radiator/cooling, winch/recovery mounts, and structural load paths with a qualified engineer.
5. Validate real body/fender seam and flange construction, sheet thickness, weather sealing, corrosion protection and shop manufacturing drawings.
6. Only after physical fitment and professional approvals should any design be considered fabrication-ready or roadworthy.

**Approval state: CONCEPT CAD ONLY. NO PHYSICAL MODIFICATIONS APPROVED.**
