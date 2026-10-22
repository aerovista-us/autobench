# M4 · Pops Van silhouette and configurable exterior

**Status:** exact BREP styling study. **Not a dimensioned scan, not an engineering approval.**

## Problem and decision

The M3 body still read like a panel truck: a long, uninterrupted rectangular cargo wall, weak side-door and rear-door definition, sharp roof, and little indication of a van's passenger/conversion identity. The supplied blue Chevrolet G-series photograph is a *style reference*, not proof of Pops Van dimensions or an instruction to cut real sheet metal.

M4 keeps the same front/rear body datums and wheelbase/axle scenario engine, but changes the exterior to be visibly identifiable as a classic van.

## Implemented

- Real BREP **side-window openings** in both side panels, with rounded polygon glass and surrounds. The conversion configuration has a large sliding-door window and rear-quarter window on each side; cargo has solid side panels; porthole has circular camper windows.
- Separate **sliding-door tracks, handles, seams and lower door boundary**, rear door center gap, handles, hinges, taillamps, license plate and rear step bumper.
- Reprofiled **rear upper corner** and roof shoulder into a multisegment curved-looking BREP roof edge; existing raked windshield, front clip and wheel-arch geometry retained.
- Thin **two-tone accent sweep**, rather than a full-height contrasting slab.
- Independent, toggleable BREP exterior packages: roof rack with rails/crossbars/feet, side entry steps and brackets, rear-door spare tire/carrier envelope, and auxiliary front lamp housings/lenses.
- Four **one-click presets**: Cargo, Classic van (default), Camper and Expedition. All changes are revisioned and recorded in conceptHistory; no baseline measurement or canonical axle dimension is changed.
- Four viewport camera views: 3/4 Front, Side, 3/4 Rear and Top. Orbit/pan remains available.
- Exact CAD mesh preserves material/part identity for chassis-only inspection. Exterior parts export in the same STEP assembly and concept choices in the design JSON.
- The **Classic van** default has side glazing, subtle accent sweep and entry steps. Other presets are optional.

## Verification

    npm test
    node scripts/m2-front-clip-exact.mjs
    node scripts/m3-upgrade-cad-smoke.mjs
    node scripts/m4-van-identity-cad-smoke.mjs
    npm run build
    node scripts/m4-van-identity-browser-smoke.mjs

M4 CAD test checks four profiles with +10 inch front-axle scenario, required and forbidden parts, unchanged wheelbase/front/rear datums, **actual OCCT side panel volume reduction when window openings are selected**, and Expedition STEP output. The browser test checks default style, all four presets, four camera views, individual toggles, design export, exact revision rebuild, and mobile layout.

Artifacts:
- artifacts/pops-m4-expedition-CONCEPT.step
- artifacts/pops-m4-van-identity-validation.json
- artifacts/m4-classic-van-front.png, artifacts/m4-classic-van-side.png, artifacts/m4-classic-van-rear.png
- artifacts/m4-camper-portholes-rack.png, artifacts/m4-expedition-spare-rack.png, artifacts/m4-mobile-expedition.png

## Fitment and safety gates

**Do not cut actual window apertures** or drill roof/frame/rear doors from this concept. No body panel strength, sealing, glass compliance, corrosion, water ingress, occupant safety, roof load, wind load, spare-carrier hinge load, tire clearance, electrical circuits, accessory bracket or suspension mount has been validated. First measure Pops Van, identify chassis/axle, register photos and body datums, verify OEM construction, then obtain appropriate engineering review and explicit owner approval. Exterior design variants are *reversible in CAD only*.

## Next design intelligence

- Side-profile comparison against **calibrated Pops Van photographs** rather than another stock G10.
- Reconstruct true **curved side surfaces, rounded rear corner and real cab A/B pillars** from scans or physical sections. Current roof/side curves are multi-face approximations.
- Add user-approved component catalogs only after chassis and bracket fitment checks.
- Persistent compare/save for named exterior variants, with automatic drawing and report propagation.
