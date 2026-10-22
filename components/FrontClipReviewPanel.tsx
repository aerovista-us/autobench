"use client";

import { useEffect, useMemo, useState } from "react";
import { CAPTURE_STORAGE_KEY, parseCaptureDraft, type CaptureDraft } from "@/lib/model/capture";
import { checkFrontClipAgainstCapture } from "@/lib/geometry/frontClipCapture";
import { frontClipSpec } from "@/lib/geometry/frontClipSpec";
import { resolveConceptOptions } from "@/lib/model/conceptOptions";
import { compileExactPops } from "@/lib/geometry/occtExact";
import type { VehicleDesign } from "@/lib/model/types";

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FrontClipReviewPanel({ design }: { design: VehicleDesign }) {
  const [capture, setCapture] = useState<CaptureDraft | null>(null);
  const [captureMessage, setCaptureMessage] = useState("Checking this browser for Pops Van capture...");
  const [exportState, setExportState] = useState<"idle" | "working" | "error">("idle");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CAPTURE_STORAGE_KEY);
      if (stored) {
        const draft = parseCaptureDraft(stored);
        setCapture(draft);
        setCaptureMessage("Loaded browser-local capture register. Values have NOT been applied to CAD.");
      } else {
        setCaptureMessage("No measured Pops Van capture found in this browser.");
      }
    } catch {
      setCaptureMessage("Saved capture was invalid or unavailable. Geometry review is blocked.");
    }
  }, []);

  const spec = useMemo(() => frontClipSpec(design), [design]);
  const review = useMemo(() => checkFrontClipAgainstCapture(design, capture), [design, capture]);

  async function importCapture(file?: File) {
    if (!file) return;
    try {
      const parsed = parseCaptureDraft(await file.text());
      setCapture(parsed);
      setCaptureMessage("Capture JSON loaded for this comparison only. It has NOT replaced the canonical CAD or browser capture.");
    } catch (error) {
      setCaptureMessage(`Capture rejected: ${String(error)}`);
    }
  }

  async function exportStep() {
    setExportState("working");
    setExportError("");
    try {
      const compiled = await compileExactPops(design, { exportStep: true });
      if (!compiled.step) throw new Error("Exact STEP export was empty");
      download(`PROVISIONAL-pops-g10-rev-${design.revision}-offset-${Math.round(design.parameters.frontAxleOffsetMm)}mm.step`,
        compiled.step, "application/step");
      setExportState("idle");
    } catch (error) {
      setExportState("error");
      setExportError(`STEP export failed: ${String(error)}`);
    }
  }

  function exportReview() {
    download(`PROVISIONAL-pops-g10-rev-${design.revision}-review.json`,
      JSON.stringify({
        schemaVersion: 1, vehicleId: design.id, revision: design.revision,
        frontClip: spec, captureReview: review,
        conceptOptions: resolveConceptOptions(design),
        provisionalBodyDimensionsMm: {
          width: design.parameters.bodyWidthMm,
          height: design.parameters.bodyHeightMm,
          rearOverhang: design.parameters.rearOverhangMm,
        },
        source: "G10 styling-only reference 1986-g10-front-three-quarter",
        approval: "NOT APPROVED FOR FABRICATION OR ROAD USE",
      }, null, 2), "application/json");
  }

  return (
    <section className="front-clip-review" aria-label="Front clip CAD and measured capture review">
      <div className="front-review-heading">
        <div>
          <span>PARAMETRIC FRONT CLIP / M3 BODY & UPGRADE CONCEPTS</span>
          <h2>G10 body · hood · fenders · grille · bumper</h2>
          <p>Contoured roof and cab, revised body proportions, axle-driven wheel arches, selectable bumper and front suspension CAD. Provisional dimensions until measured capture.</p>
        </div>
        <a href="/references/g10-1986">Styling targets ↗</a>
      </div>
      <div className="front-clip-metrics">
        <div><span>Axle-driven arch center</span><strong>{(spec.wheelOpeningCenterXmm / 25.4).toFixed(1)} in</strong></div>
        <div><span>Static tire-to-arch margin</span><strong>{(spec.radialStaticMarginMm / 25.4).toFixed(1)} in</strong></div>
        <div><span>Arch to front face</span><strong>{(spec.faceLandMm / 25.4).toFixed(1)} in</strong></div>
        <div><span>Hood rear → nose</span><strong>{(spec.hoodRearTopZmm / 25.4).toFixed(1)} → {(spec.hoodNoseTopZmm / 25.4).toFixed(1)} in</strong></div>
      </div>
      <div className="front-review-gate">
        <div className="front-review-gate-head">
          <span>MEASURED POPS VAN GEOMETRY CHECK</span>
          <strong className={review.gate === "review-required" ? "review-warn" : "review-block"}>
            {review.gate === "blocked" ? "BLOCKED · NO COMPLETE MEASUREMENTS"
              : review.gate === "mismatch" ? "DIMENSION MISMATCH"
              : "READY FOR HUMAN REVIEW · NOT APPROVED"}
          </strong>
        </div>
        <p>{review.note}</p>
        <p className="front-capture-message" role="status">{captureMessage}</p>
        {review.missingMeasurements.length > 0 && (
          <p>Pending dimensions: <b>{review.missingMeasurements.slice(0, 5).join(", ")}</b>
            {review.missingMeasurements.length > 5 ? ` +${review.missingMeasurements.length - 5} more` : ""}</p>
        )}
        {review.missingViews.length > 0 && (
          <p>Missing views: <b>{review.missingViews.join(", ")}</b></p>
        )}
        {review.comparisons.length > 0 && (
          <div className="front-compare-table">
            <div className="front-compare-label">Compared observed dimensions · model minus measurement</div>
            {review.comparisons.map(c => (
              <div key={c.field} className={c.withinTolerance ? "" : "mismatch"}>
                <span>{c.field}</span>
                <strong>{c.deltaMm >= 0 ? "+" : ""}{c.deltaMm.toFixed(1)} mm</strong>
                <small>±{c.toleranceMm.toFixed(1)} mm</small>
              </div>
            ))}
          </div>
        )}
        {review.designWarnings.map(warning => <p className="front-review-warning" key={warning}>{warning}</p>)}
      </div>
      <div className="front-review-actions">
        <a href="/capture">Capture real vehicle dimensions →</a>
        <label className="front-review-import">Compare capture JSON
          <input type="file" accept=".json,application/json" aria-label="Compare capture JSON"
            onChange={event => void importCapture(event.target.files?.[0])} />
        </label>
        <button onClick={() => void exportStep()} disabled={exportState === "working"}>
          {exportState === "working" ? "Building exact STEP..." : "Export provisional STEP"}
        </button>
        <button onClick={exportReview}>Export geometry review</button>
      </div>
      {exportError && <p className="front-review-warning" role="alert">{exportError}</p>}
      <p className="front-review-disclaimer">
        The wheel opening is a true BREP subtraction; the 85 mm radial gap is a STATIC concept value,
        not full-lock tire sweep, bump travel, articulation, steering, brake, cooling, crash or structural clearance.
        No physical modifications have been approved.
      </p>
    </section>
  );
}
