# M5 — Mechanical 4x4 and Clearance Lab

Status: proposed implementation, not fitment-verified.

## Objective
Replace static suspension/bumper illustrations with configurable parametric assemblies and repeatable geometric checks. Keep the original Chevy G-series appearance, windowless cargo body and front-door glazing only. Preserve all measured/locked data.

## Work packages
1. **Chassis identification:** capture front/rear axle make, spring arrangement, shackle/hanger locations, steering box and linkage, shock mount centers, frame section and crossmembers, transfer case and driveshaft paths. Unknowns must remain explicit.
2. **Mechanical CAD:** front/rear axle housings, spring/shackle and damper envelopes, steering linkage, bump stops, tires, transfer case, driveshafts, recovery hardware and service zones. Author all parts against shared vehicle datums.
3. **Clearance Lab:** evaluate tire sweep with steering and jounce/rebound; axle articulation; shock stroke and bump-stop contact; driveshaft angles; fender/door/body/bumper interference. Use exact geometry or conservative envelopes. Never report a PASS from a static radial gap alone.
4. **Configurable parts:** 33/35/37 inch nominal tire scenarios, front axle offsets 0/+8/+10/+12/+14 inches, alternative bumper/winch/shock/spring configurations. Each item records manufacturer, product link, dimensions, mass, mounting requirements, price/date, evidence, and fitment status (reference-only, adaptable, verified).
5. **Plan and export:** scenario comparison, interference list, BOM, install sequence, dependency graph, and STEP plus drawing export. Exported plans remain non-certified concepts.
6. **Browser acceptance:** desktop/mobile layout, save/reload exact scenario, compare baseline and alternatives, ensure windowless cargo sides, no change to locked measurements, deterministic exported geometry.

## Release gates
- CI tests on exact branch head; no regressions in capture, front-end scenarios, M3/M4 exterior and STEP.
- Adversarial tests for max steering plus compression, unequal articulation, bumper interference, and missing chassis measurements.
- No fabricated fitment, structural, braking, steering, recovery-load or roadworthiness approvals.
- No production deployment until reviewed.

## Suggested implementation order
First implement structured assembly and parts data, then geometry and tests, then UI controls, then report/BOM exports.

## Physical evidence required
Actual Pops Van front/rear axle identification, spring/shock mount measurements, frame cross-section, tire size, steering layout, and clear photographs of suspension and underbody. Factory G10 styling photographs cannot substitute for measurements.
