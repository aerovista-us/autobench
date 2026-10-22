# M3 · Pops Van G-series body refinement and front-end upgrade concepts

**Approval:** reference study and parametric CAD only. **No physical modifications approved.**

## Why this pass was needed

The M2 screenshot showed an overly rectangular roof, square side-window sticker, vertical windshield, long hood and black-disk wheels. The supplied 1986 G10 photograph is a **styling target**, not a dimensioned or photographed view of Pops Van. M3 improves silhouette and selectable options while retaining the provisional baseline geometry.

## CAD improvements

- **Body shape:** exact BREP raked cab front, real side-window cutouts and recessed glass, angled windshield, beveled roof shoulders/crown and front brow, door seams, handles, side mirrors, chrome beltline and dark rocker treatment.
- **Shorter nose:** concept hood length reduced from 1,220 to **850 mm**; hood rear and nose heights revised to meet the windshield and grille more naturally. These are *not* measured G-series or Pops Van dimensions.
- **Wheels:** exact chrome wheel faces, raised bead rings, hubs and six visible lug details per wheel. Lug PCD, offset, tire clearance and wheel fitment are unverified.
- **Size:** UI sliders for body width, body height and rear overhang. Values update canonical *designed* parameters and are recorded in the operation log; no measured capture data is overwritten.
- **Front bumper choices:** original-style chrome, trail steel plate, winch-plate envelope and chrome bumper with brush guard. Bumper envelopes are separate BREP parts and export with the same STEP assembly. They are aftermarket-*style* concepts, not actual commercial part numbers or fitment promises.
- **Shock concepts:** not identified, heavy-duty monotube, remote reservoir. Illustrated BREP cylinders/upper mounts, not measured mounts, shock stroke or safe travel.
- **Spring concepts:** not identified, service leaf pack, heavy-duty leaf pack. BREP layer stacks and spring-eye placeholders are only valid as packaging illustrations **if** actual Pops Van suspension is verified to use leaf springs in those locations. No coilover or leaf conversion is authorized by this study.
- **Inspection:** chassis/suspension isolation hides body, glass and trim material groups to reveal frame, wheels, shocks and leaf-pack envelopes without misleading transparency artifacts.

## Model constraints and verification

Coordinate system remains rear axle ground datum, +X forward, +Y left, +Z up, mm internal. Baseline M0 dimensions are still assumed. Five front-axle scenarios (+0/+8/+10/+12/+14 in) remain supported. Fixed body front/rear datums are retained when only the axle offset changes.

Run:

```bash
npm test
node scripts/m2-front-clip-exact.mjs
node scripts/m3-upgrade-cad-smoke.mjs
npm run build
node scripts/m3-upgrades-browser-smoke.mjs
```

The M3 exact script verifies four bumper/suspension packages, real BREP feature names, no accidental spring/shock geometry in unknown state, fixed datums, revised body width/height/overhang, STEP export, and no fitment-approval claims. Playwright verifies user selectors, isolated chassis/suspension inspection, size slider, manifest preservation, mobile rendering and screenshots. Artifacts:

- `artifacts/pops-m3-winch-suspension-CONCEPT.step` — CAD only.
- `artifacts/pops-m3-concept-validation.json` — scenario report.
- `artifacts/m3-steel-bumper-contoured-body.png`, `m3-winch-reservoir-leaf-inspection.png`, `m3-brush-guard-body-size.png`, `m3-mobile-upgrades.png`.

## Required physical verification before buying or fabricating

1. **Identify chassis and front axle:** actual axle manufacturer/model, spring type, frame mounts, front spring-eye and shackle dimensions, existing shock mounting points and suspension travel.
2. **Capture the van body:** physical wheelbase, body length/width/height, front clip/hood/windshield reference datums, wheel/tire geometry, ride height and photo calibration.
3. **Check bumper:** frame bracket spacing and steel condition, radiator/airflow, steering clearance, approach angle, airbag/crash implications if applicable, winch mount and rated recovery load paths.
4. **Check shocks:** fully compressed/extended lengths, eye/stud mounting, bushings, valving, spring rate compatibility, bump-stop location, brake lines and full articulation.
5. **Check springs:** real spring pack dimensions, rate, arch, axle perch and U-bolt dimensions, shackle angle, pinion/caster change, driveline angle, steering geometry and alignment.
6. Obtain qualified mechanical/structural review and explicit owner approval before any purchase, cut, weld, installation or road-use claim.

**Reference-only visual study. No verified measured Pops Van geometry in this repository. No physical modifications approved.**
