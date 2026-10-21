"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CAPTURE_STORAGE_KEY, captureFields, captureReadiness, fromMillimeters,
  makeCaptureDraft, parseCaptureDraft, toMillimeters, updateCaptureMeasurement,
  type CaptureDraft, type CaptureField, type CaptureMeasurement, type PhotoView,
} from "@/lib/model/capture";
import type { Confidence, Provenance } from "@/lib/model/types";

const views: { value: PhotoView; label: string }[] = [
  { value: "driver-side", label: "Driver side" },
  { value: "passenger-side", label: "Passenger side" },
  { value: "front", label: "Front" },
  { value: "rear", label: "Rear" },
  { value: "front-three-quarter", label: "Front three-quarter" },
  { value: "underbody", label: "Underbody / chassis" },
];

function downloadJson(draft: CaptureDraft) {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pops-van-capture-v1.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CaptureWorkbench() {
  const [draft, setDraft] = useState<CaptureDraft>(makeCaptureDraft);
  const [unit, setUnit] = useState<"in" | "mm">("in");
  const [selected, setSelected] = useState<CaptureField>("baselineWheelbaseMm");
  const [photoView, setPhotoView] = useState<PhotoView>("driver-side");
  const [photoReference, setPhotoReference] = useState("");
  const [photoNotes, setPhotoNotes] = useState("");
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CAPTURE_STORAGE_KEY);
      if (stored) setDraft(parseCaptureDraft(stored));
    } catch {
      setMessage("Stored capture could not be loaded. Export your draft before clearing browser data.");
    } finally {
      setHydrated(true);
    }
  }, []);

  const status = useMemo(() => captureReadiness(draft), [draft]);
  const measurement = draft.measurements.find(m => m.id === selected)!;
  const completed = draft.measurements.filter(m =>
    ["observed", "scanDerived"].includes(m.provenance) &&
    ["high", "verified"].includes(m.confidence)
  ).length;

  function edit(changes: Partial<Omit<CaptureMeasurement, "id" | "label">>) {
    try {
      setDraft(current => updateCaptureMeasurement(current, selected, changes));
      setMessage("");
    } catch (error) {
      setMessage(String(error));
    }
  }

  function save() {
    try {
      localStorage.setItem(CAPTURE_STORAGE_KEY, JSON.stringify(draft));
      setMessage("Draft saved in this browser only. Export JSON for a portable backup.");
    } catch {
      setMessage("Local save failed. Use Export JSON to preserve this draft.");
    }
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      const next = parseCaptureDraft(await file.text());
      setDraft(next);
      setMessage("Capture imported. Review measurements before applying any design changes.");
    } catch (error) {
      setMessage(`Import rejected: ${String(error)}`);
    }
  }

  function addPhoto() {
    const reference = photoReference.trim();
    if (!reference) {
      setMessage("Enter a photo filename or reference before adding.");
      return;
    }
    setDraft(current => ({
      ...current,
      updatedAt: new Date().toISOString(),
      photos: [...current.photos, {
        id: crypto.randomUUID(), view: photoView, reference, notes: photoNotes.trim(),
      }],
    }));
    setPhotoReference("");
    setPhotoNotes("");
    setMessage("Photo reference added. The image bytes are not uploaded or stored.");
  }

  return (
    <main className="capture-workbench">
      <header className="capture-topbar">
        <div>
          <div className="eyebrow">AEROVISTA / AUTOBENCH / M1 CAPTURE</div>
          <h1>Pops&apos; Van — as-captured baseline</h1>
          <p>Replace provisional dimensions with measured evidence. Nothing here authorizes fabrication.</p>
        </div>
        <div className="capture-top-actions">
          <a href="/">Return to model</a>
          <button onClick={save} disabled={!hydrated}>Save locally</button>
          <button onClick={() => downloadJson(draft)}>Export JSON</button>
          <label className="capture-file-label">
            Import JSON
            <input aria-label="Import capture JSON" type="file" accept=".json,application/json"
              onChange={event => void importFile(event.target.files?.[0])} />
          </label>
        </div>
      </header>

      <section className="capture-summary">
        <div><span>MEASURED / HIGH CONFIDENCE</span><strong>{completed} / {captureFields.length}</strong></div>
        <div><span>REQUIRED MEASUREMENTS PENDING</span><strong>{status.missingMeasurements.length}</strong></div>
        <div><span>REQUIRED PHOTO VIEWS PENDING</span><strong>{status.missingViews.length}</strong></div>
        <div className={status.ready ? "capture-ready" : "capture-not-ready"}>
          <span>CALIBRATION EVIDENCE</span><strong>{status.ready ? "READY FOR REVIEW" : "INCOMPLETE"}</strong>
        </div>
      </section>

      {message && <p role="status" className="capture-message">{message}</p>}

      <div className="capture-layout">
        <aside className="capture-sidebar">
          <div className="capture-section-label">MEASUREMENT REGISTER</div>
          {Array.from(new Set(captureFields.map(f => f.group))).map(group => (
            <div key={group}>
              <h2>{group}</h2>
              {captureFields.filter(f => f.group === group).map(field => {
                const m = draft.measurements.find(item => item.id === field.id)!;
                const trusted = ["observed", "scanDerived"].includes(m.provenance) &&
                  ["high", "verified"].includes(m.confidence);
                return (
                  <button key={field.id} onClick={() => setSelected(field.id)}
                    className={`capture-field ${selected === field.id ? "selected" : ""}`}>
                    <span>{field.label}{field.required ? " *" : ""}</span>
                    <small className={trusted ? "capture-confirmed" : "capture-provisional"}>
                      {m.locked ? "LOCKED · " : ""}{trusted ? "MEASURED" : "PROVISIONAL"}
                    </small>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <section className="capture-editor">
          <div className="capture-section-label">SELECTED MEASUREMENT</div>
          <div className="capture-editor-title">
            <div><h2>{measurement.label}</h2><p>Datum-aligned measurement. Original M0 values are assumptions until verified.</p></div>
            <label>Display units
              <select aria-label="Display units" value={unit} onChange={event => setUnit(event.target.value as "in" | "mm")}>
                <option value="in">Inches</option><option value="mm">Millimeters</option>
              </select>
            </label>
          </div>
          <div className="capture-form-grid">
            <label>Measured value ({unit})
              <input aria-label="Measured value" key={selected + unit} type="number" min="0.001" step="any"
                defaultValue={Number(fromMillimeters(measurement.valueMm, unit).toFixed(3))}
                disabled={measurement.locked}
                onBlur={event => {
                  const n = Number(event.target.value);
                  if (event.target.value.trim() && Number.isFinite(n) && n > 0) edit({ valueMm: toMillimeters(n, unit) });
                  else setMessage("Enter a positive measurement value.");
                }} />
            </label>
            <label>Estimated tolerance ({unit})
              <input aria-label="Estimated tolerance" key={selected + unit + "-tolerance"} type="number" min="0" step="any"
                defaultValue={Number(fromMillimeters(measurement.toleranceMm, unit).toFixed(3))}
                disabled={measurement.locked}
                onBlur={event => {
                  const n = Number(event.target.value);
                  if (event.target.value.trim() && Number.isFinite(n) && n >= 0)
                    edit({ toleranceMm: unit === "in" ? n * 25.4 : n });
                  else setMessage("Enter a nonnegative tolerance.");
                }} />
            </label>
            <label>Provenance
              <select aria-label="Provenance" value={measurement.provenance} disabled={measurement.locked}
                onChange={event => edit({ provenance: event.target.value as Provenance })}>
                <option value="assumed">Assumed / placeholder</option>
                <option value="observed">Observed / tape or laser</option>
                <option value="scanDerived">Scan-derived</option>
                <option value="reference">External reference</option>
                <option value="designed">Designed (not measured)</option>
              </select>
            </label>
            <label>Confidence
              <select aria-label="Confidence" value={measurement.confidence} disabled={measurement.locked}
                onChange={event => edit({ confidence: event.target.value as Confidence })}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="verified">Verified</option>
              </select>
            </label>
            <label>Measurement method
              <input aria-label="Measurement method" value={measurement.method} disabled={measurement.locked}
                placeholder="e.g. tape twice, laser from datum"
                onChange={event => edit({ method: event.target.value })} />
            </label>
            <label>Date observed
              <input aria-label="Date observed" type="date" value={measurement.observedAt} disabled={measurement.locked}
                onChange={event => edit({ observedAt: event.target.value })} />
            </label>
            <label className="capture-span">Source / photo reference
              <input aria-label="Measurement source" value={measurement.source} disabled={measurement.locked}
                placeholder="e.g. photo-front-left-001.jpg, tape log"
                onChange={event => edit({ source: event.target.value })} />
            </label>
            <label className="capture-span">Notes
              <textarea aria-label="Measurement notes" value={measurement.notes} disabled={measurement.locked}
                rows={3} placeholder="Physical datum, repeated reading, known limitations"
                onChange={event => edit({ notes: event.target.value })} />
            </label>
          </div>
          <label className="capture-lock">
            <input type="checkbox" checked={measurement.locked}
              onChange={event => edit({ locked: event.target.checked })} />
            Lock this measurement against accidental edits
          </label>
          <p className="capture-help">Locking preserves this record in the capture editor. It does not certify the measurement or automatically overwrite the model.</p>
        </section>

        <aside className="capture-evidence">
          <div className="capture-section-label">BASELINE ACCEPTANCE</div>
          <div className="capture-validation">
            <strong>{status.ready ? "Evidence ready for review" : "Capture incomplete"}</strong>
            <p>{status.note}</p>
            {status.missingMeasurements.length > 0 && (
              <div><h3>Measurements still needing evidence</h3><p>{status.missingMeasurements.join(" · ")}</p></div>
            )}
            {status.missingViews.length > 0 && (
              <div><h3>Photo views missing</h3><p>{status.missingViews.join(" · ")}</p></div>
            )}
          </div>

          <div className="capture-section-label capture-spaced">PHOTO REFERENCE BOARD</div>
          <p className="capture-help">Record filenames or secure references. Actual image upload, alignment, and calibration will follow in M1.</p>
          <label>View
            <select value={photoView} onChange={event => setPhotoView(event.target.value as PhotoView)}>
              {views.map(view => <option key={view.value} value={view.value}>{view.label}</option>)}
            </select>
          </label>
          <label>Filename / reference
            <input value={photoReference} placeholder="IMG_0001.jpg"
              onChange={event => setPhotoReference(event.target.value)} />
          </label>
          <label>Notes
            <input value={photoNotes} placeholder="Known-length marker visible"
              onChange={event => setPhotoNotes(event.target.value)} />
          </label>
          <button className="capture-add-photo" onClick={addPhoto}>Add photo reference</button>
          <div className="capture-photo-list">
            {draft.photos.length === 0 && <p className="capture-help">No photo references yet.</p>}
            {draft.photos.map(photo => (
              <div key={photo.id}>
                <strong>{views.find(v => v.value === photo.view)?.label}</strong>
                <span>{photo.reference}</span>
                {photo.notes && <small>{photo.notes}</small>}
                <button aria-label={`Remove ${photo.reference}`} onClick={() => setDraft(current => ({
                  ...current, photos: current.photos.filter(p => p.id !== photo.id),
                }))}>Remove</button>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <footer className="capture-footer">M1 CAPTURE · LOCAL DRAFT ONLY · MM SOURCE OF TRUTH · NO STRUCTURAL OR FABRICATION APPROVAL</footer>
    </main>
  );
}
