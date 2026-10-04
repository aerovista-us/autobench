# Pops Van Capture Specification v0.1

## Goal

Create a calibrated reference set for Pops' Chevy 4x4 van so AutoBench can fit a parametric chassis/body model to the actual vehicle.

The first capture does not need body-shop scan accuracy. It needs enough verified anchors to make changes such as the planned front-axle move, front-clip extension, bumper packaging, and wheel/tire clearance spatially honest.

## Before photographing

- park on the flattest practical surface
- straighten steering
- set normal tire pressure
- unload unusual temporary cargo if possible
- measure ground-to-frame/body datums at all four corners so suspension lean is known
- avoid changing ride height during the capture session

## Minimum known dimensions

Record these directly with tape/laser where accessible.

### Vehicle baseline

- tire overall diameter, front
- tire overall diameter, rear
- front wheel center to rear wheel center on both sides
- front track width
- rear track width
- outside body width at a repeatable datum
- rocker/floor height at front and rear
- overall height at a named roof point
- rear axle center to rear body end
- front axle center to current front body/grille end

### Front geometry

- front axle centerline to firewall/body datum
- front axle centerline to grille plane
- front axle centerline to bumper face
- frame rail spacing, inside and outside
- frame rail section height/width where accessible
- frame rail height above ground near axle
- steering box location relative to frame datum
- leaf spring/link mounting points
- shock mounting points
- radiator support plane
- radiator/fan envelope
- wheel opening fore/aft edges relative to axle center
- tire clearance to body/frame at straight ahead

### Driveline

- transfer case output location
- front differential input/pinion location
- driveshaft length at static ride height
- approximate transfer-case and pinion angles if measurable

## Required photo sets

### Set A — orthographic-ish reference

Capture from farther away with moderate zoom to reduce perspective distortion:

- driver side
- passenger side
- dead front
- dead rear
- front 3/4 both sides
- rear 3/4 both sides
- elevated front/side if possible

Include a visible known-length scale marker in several frames.

### Set B — photogrammetry orbit

Walk around the vehicle with strong overlap. Move laterally between frames; do not only rotate from one spot.

Target consistent lighting and avoid strong reflections if possible.

Capture lower and upper rings around the van.

### Set C — underbody/front assembly

Detailed overlapping sets for:

- front axle
- frame rails
- steering
- suspension mounts
- front driveshaft
- radiator support
- bumper mounts
- wheel wells

## Named physical markers

Temporary removable markers improve fitting.

Suggested IDs:

- FAX-L / FAX-R — front wheel centers
- RAX-L / RAX-R — rear wheel centers
- FR-L1 / FR-R1 — front frame rail datum pair
- FR-L2 / FR-R2 — second frame datum pair
- FW-L / FW-R — firewall datum pair
- RS-L / RS-R — radiator-support datum pair
- BF-L / BF-R — current bumper-face datum pair

Measure marker-to-marker distances where practical.

## Capture confidence

Every measurement receives:

- source image(s)
- who measured it
- tool used
- repeated measurement count
- estimated tolerance
- confidence

Examples:

- wheelbase measured twice with tape: high
- grille plane inferred from one angled photo: low
- scan-derived rocker line checked against three tape dimensions: medium/high

## First model acceptance

The baseline model is ready for design work when:

1. wheel centers align with measured wheelbase/track
2. tire diameter matches measured tire size
3. body and frame datums agree with at least five independent measured distances
4. side/front/top projections visually register with calibrated reference photos
5. front frame, axle, wheel opening and current front clip are sufficiently resolved to test an 8–14 inch axle-forward scenario
6. unknown dimensions are explicitly marked assumed instead of silently guessed

## Initial design scenarios to preserve

Create these as branches, not destructive edits:

- **Baseline / As Captured**
- **Axle +8 in**
- **Axle +10 in**
- **Axle +12 in**
- **Axle +14 in feasibility envelope**

Each scenario should report:

- wheelbase
- tire/body/frame clearance
- front overhang
- approach angle
- required wheel-opening change
- front-clip interference
- steering/suspension packaging conflicts
- frame-extension implication
- bumper/winch packaging space

The point is to make the axle decision with geometry evidence before fabrication.
