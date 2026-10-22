"use client";

import { useEffect, useMemo, useState } from "react";
import {
  frontAxleScenarioInches, frontEndScenarios, g10FrontReference,
  parseFrontAxleScenario, type FrontAxleScenarioInches,
} from "@/lib/model/visualReference";
import { deriveVehicle, formatInches } from "@/lib/model/derive";
import { INCH, popsVanBaseline } from "@/lib/model/popsVan";
import { setVehicleParameter } from "@/lib/model/operations";

export function FrontEndReferenceGuide() {
  const [scenario, setScenario] = useState<FrontAxleScenarioInches>(10);
  const [requestedOffset, setRequestedOffset] = useState<number | null>(null);
  const [selectedCue, setSelectedCue] = useState(g10FrontReference.designCues[0].id);
  const [showMarkers, setShowMarkers] = useState(true);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("offset");
    const nearest = parseFrontAxleScenario(raw);
    setScenario(nearest);
    const requested = raw !== null && raw.trim() !== "" ? Number(raw) : Number.NaN;
    setRequestedOffset(Number.isFinite(requested) && requested >= 0 && requested <= 14 &&
      requested !== nearest ? requested : null);
  }, []);

  const selected = g10FrontReference.designCues.find(cue => cue.id === selectedCue)!;
  const current = frontEndScenarios[scenario];
  const metrics = useMemo(() => deriveVehicle(setVehicleParameter(
    popsVanBaseline, "frontAxleOffsetMm", scenario * INCH, "Reference guide: preview only",
  )), [scenario]);

  return (
    <main className="reference-workbench">
      <header className="reference-header">
        <div>
          <div className="eyebrow">AEROVISTA / AUTOBENCH / VISUAL REFERENCE 01</div>
          <h1>G10 front-end design reference</h1>
          <p>Factory-style visual language for Pops Van&apos;s 4×4 axle-forward redesign.</p>
        </div>
        <div className="reference-nav">
          <a href="/">Return to 3D workbench</a>
          <a href="/capture">Pops Van measurements</a>
        </div>
      </header>

      <section className="reference-alert" role="note">
        <strong>STYLING REFERENCE · NOT CAPTURE EVIDENCE</strong>
        <span>This is a different 1986 G10 van. Image markers are visual callouts only, not calibrated dimensions.
          The photo cannot establish wheelbase, frame geometry, fender clearance or camera pose.</span>
      </section>

      <div className="reference-grid">
        <section className="reference-photo-panel">
          <div className="reference-panel-heading">
            <div>
              <span>INITIAL REFERENCE VEHICLE</span>
              <h2>{g10FrontReference.vehicle}</h2>
            </div>
            <label className="reference-toggle">
              <input type="checkbox" checked={showMarkers}
                onChange={event => setShowMarkers(event.target.checked)} />
              Show callouts
            </label>
          </div>
          <div className="reference-photo-stage">
            <img
              src={g10FrontReference.imagePath}
              width={g10FrontReference.imageWidth}
              height={g10FrontReference.imageHeight}
              alt="Dark blue 1986 Chevrolet G10 van, front driver-side three-quarter view; GR Auto Gallery photograph"
            />
            {showMarkers && g10FrontReference.designCues.map((cue, index) => (
              <button
                key={cue.id}
                aria-label={`Show design cue: ${cue.title}`}
                className={`reference-pin ${cue.id === selectedCue ? "active" : ""}`}
                style={{ left: `${cue.x * 100}%`, top: `${cue.y * 100}%` }}
                onClick={() => setSelectedCue(cue.id)}
                title={cue.title}
              >{index + 1}</button>
            ))}
          </div>
          <div className="reference-source">
            <span>{g10FrontReference.credit}</span>
            <a href={g10FrontReference.sourceUrl} target="_blank" rel="noreferrer">Original vehicle listing ↗</a>
          </div>
          <p className="reference-caption">{g10FrontReference.sourceDescription}</p>
        </section>

        <aside className="reference-cue-panel">
          <div className="reference-panel-heading">
            <div>
              <span>VISUAL DESIGN TARGETS</span>
              <h2>Keep the original G10 identity</h2>
            </div>
          </div>
          <div className="reference-cue-list">
            {g10FrontReference.designCues.map((cue, index) => (
              <button
                key={cue.id}
                className={`reference-cue-item ${selectedCue === cue.id ? "selected" : ""}`}
                onClick={() => { setSelectedCue(cue.id); setShowMarkers(true); }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{cue.title}</strong>
              </button>
            ))}
          </div>
          <div className="reference-cue-detail" aria-live="polite">
            <span>SELECTED DETAIL</span>
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>
          </div>
          <div className="reference-design-boundary">
            <strong>Geometry stays independent</strong>
            <p>These style cues guide grille, lights, hood, bumper, fenders and beltline. They do not change
              the canonical CAD model, the Pops Van capture register, or any locked measurement.</p>
          </div>
        </aside>
      </div>

      <section className="reference-scenarios">
        <div className="reference-panel-heading">
          <div>
            <span>FRONT AXLE SCENARIO STUDY</span>
            <h2>Preserve the face. Compare the stance.</h2>
          </div>
          <small>Provisional geometry · no fabrication approval</small>
        </div>
        <div className="reference-scenario-picker" role="group" aria-label="Front axle scenario">
          {frontAxleScenarioInches.map(inches => (
            <button key={inches}
              className={scenario === inches ? "selected" : ""}
              aria-pressed={scenario === inches}
              onClick={() => { setScenario(inches); setRequestedOffset(null); }}
            >{inches === 0 ? "Baseline" : `+${inches} in`}</button>
          ))}
        </div>
        {requestedOffset !== null && (
          <p className="reference-offset-notice" role="status">
            Workbench offset was +{requestedOffset.toFixed(1)} in. This guide is showing the nearest
            supported styling preset (+{scenario} in), <strong>not the exact same geometry</strong>.
            The original workbench design was not changed.
          </p>
        )}
        <div className="reference-scenario-detail">
          <div className="reference-scenario-copy">
            <div className="reference-kicker">{scenario === 10 ? "INITIAL DESIGN PRIORITY" : "ALTERNATIVE STUDY"}</div>
            <h3>{current.title}</h3>
            <p>{current.intent}</p>
            <ul>{current.focus.map(focus => <li key={focus}>{focus}</li>)}</ul>
          </div>
          <div className="reference-scenario-metrics">
            <div><span>Front axle offset</span><strong>+{scenario} in</strong></div>
            <div><span>Model wheelbase</span><strong>{formatInches(metrics.wheelbaseMm)} in</strong></div>
            <div><span>Opening envelope (simplified)</span>
              <strong>{formatInches(metrics.wheelOpeningClearanceMm)} in</strong></div>
            <p>Numbers come from the existing provisional M0 CAD model, not from this photograph.
              Negative opening envelope indicates a modeled conflict requiring a revised fender.</p>
          </div>
        </div>
      </section>

      <footer className="reference-footer">
        <span>Next: capture actual Pops Van photos and dimensions, then validate body and chassis geometry
          before revising the front clip.</span>
        <a href="/capture">Continue to actual vehicle capture →</a>
      </footer>
    </main>
  );
}
