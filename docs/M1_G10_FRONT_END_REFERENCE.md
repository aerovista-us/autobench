# Initial Pops Van front-end visual reference

**Reference 01:** 1986 Chevrolet G10, dark blue, factory front driver-side three-quarter photo.

- AutoBench page: `/references/g10-1986`
- Canonical project seed `data/pops-van.baseline.json` now contains a typed `visualReferences` link to the photo, six cue IDs and front-clip design target. This is included in exported design JSON and does not change dimensions.
- Local image: `public/references/1986-chevrolet-g10-gr-auto-gallery.jpg`
- Photo source: GR Auto Gallery of Metro Detroit via [ClassicCars listing CC-1998014](https://classiccars.com/listings/view/1998014/1986-chevrolet-g10-van-for-sale-in-kentwood-michigan-49512).
- The source photograph retains the dealer's original watermark. No copyright ownership or reuse license is asserted.
- Local working copy: 790 × 527 JPEG from the original public listing. The user supplied a 1920 × 1280 version of the same composition, but the working copy is lower resolution.
- This photo depicts a **different G10 van**, not Pops Van. Its 4.3L V6/RWD drivetrain is not evidence for Pops Van's proposed V8/4x4 drivetrain.

## Design cues for front-end modification

1. Square horizontal chrome grille and central Chevrolet emblem: preserve the recognizable factory fascia.
2. Stacked rectangular headlights and bright bezel: keep the original vertical lamp arrangement.
3. Short hood and steep windshield: preserve the visual proportion while checking actual cooling and 4x4 packaging.
4. Straight bumper line: treat as a styling datum; bumper/winch mounts require independent design and engineering.
5. Rounded front wheel arch: adapt to axle-forward geometry, tire sweep and clearance instead of stretching the photo.
6. Long clean beltline: maintain continuity into the modified front fenders.

The page offers baseline, +8, +10, +12 and +14-inch design guides. +10 inches is the **first design priority**, not an approved fitment. When opened from a non-preset workbench offset (such as +12.5 inches), the guide selects the nearest supported preset and displays an explicit warning that its displayed model numbers are **not** for the exact workbench offset.

## Strict authority boundaries

- **Styling-only reference**. Do not import into the measured capture register as observed or scan-derived evidence.
- The six callout markers are hand-authored visual annotations, not calibrated datums.
- Perspective, lens, scale, camera pose, and actual G10 dimensions are unknown from this single photograph.
- The M0 geometry remains provisional. No photo-derived dimension modifies the VehicleDesign or its operation log.
- Actual Pops Van side/front/rear photos and physical measurements must be captured separately under `/capture`.
- Fabrication, frame extension, steering, braking, suspension and roadworthiness require independent engineering verification.

## Verification

- Reference manifest unit tests require styling-only role and prohibit dimension authority.
- Chromium smoke checks local image rendering, all scenario buttons, cue selection, and links from model/capture.
- Do not promote the guide as 3D photogrammetry or a measured vehicle baseline.
