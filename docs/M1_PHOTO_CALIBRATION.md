# M1 Photo Import and Datum Placement

## Implemented

1. Open `/capture`; choose a view and import PNG/JPEG/WebP files (maximum 15 MB each).
2. Images are saved to browser-local IndexedDB. The capture draft autosaves its metadata and can be exported as JSON.
3. Select an image. Choose named physical datums (SCALE-A, SCALE-B, front/rear axle centers, frame, firewall, radiator support and bumper face), then click the matching pixels on the image.
4. For a known-length physical scale bar, select two marker IDs, enter the **actually measured** distance in inches, and save the image-plane scale.
5. If the image also has FAX-L and RAX-L markers, AutoBench compares their image-plane distance to the capture register's wheelbase, indicating whether the scale uses independent datums.
6. To transfer the capture to another browser, export JSON **and keep the original photos separately**. Reattach photos by filename after import.

## Critical limitations

- A 2-point scale is **not** camera calibration: it does not recover perspective, camera pose, lens distortion or a 3D transform.
- The apparent pixel-to-mm scale is only reliable near the reference marker's plane; angled photographs and depth differences distort it.
- A wheelbase comparison reusing wheel centers as scale anchors is not independent.
- All body/frame geometry remains provisional until real dimensions, multiple independent cross-checks, and camera registration are accepted.
- Image files are not sent to AeroVista, Vercel or a server. They are not embedded in JSON and can be lost if the browser storage is cleared.
- No capture value automatically mutates the canonical VehicleDesign or locked geometry.
- This is **not** engineering, fabrication or road-safety signoff.

## Security isolation

The historical OpenGeometry research-only `/bakeoff` route was removed from the deployable Next.js application, and `opengeometry` moved to devDependencies. The browser fixture component remains in `research/` for future controlled kernel comparisons. The production dependency audit and route-404 browser smoke gate must pass before preview deployment.

## Next engineering work

- Reference image orientation / lens metadata and marker correspondence across views
- Camera-pose fitting with independent distance constraints and reprojection residuals
- Reviewed apply-to-model operation with revision/lock protection
- Repeat-measurement consistency and a geometry-calibration acceptance report
- Optional server-backed photo evidence after authentication, access and retention design
