"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addOrMoveMarker, datumLabels, photoScale, wheelbaseCrosscheck,
} from "@/lib/model/photoCalibration";
import { loadPhotoBlob, removePhotoBlob, storePhotoFile } from "@/lib/model/photoStore";
import type { CapturePhoto, PhotoView } from "@/lib/model/capture";

const views: { value: PhotoView; label: string }[] = [
  { value: "driver-side", label: "Driver side" },
  { value: "passenger-side", label: "Passenger side" },
  { value: "front", label: "Front" },
  { value: "rear", label: "Rear" },
  { value: "front-three-quarter", label: "Front three-quarter" },
  { value: "underbody", label: "Underbody / chassis" },
];

interface Props {
  photos: CapturePhoto[];
  wheelbaseMm: number;
  wheelbaseMeasured: boolean;
  onCreatePhoto: (photo: CapturePhoto) => void;
  onUpdatePhoto: (photo: CapturePhoto) => void;
  onRemovePhoto: (id: string) => void;
}

export function PhotoCalibrationBoard({
  photos, wheelbaseMm, wheelbaseMeasured, onCreatePhoto, onUpdatePhoto, onRemovePhoto,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [view, setView] = useState<PhotoView>("driver-side");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [markerLabel, setMarkerLabel] = useState<string>("SCALE-A");
  const [firstMarkerId, setFirstMarkerId] = useState("");
  const [secondMarkerId, setSecondMarkerId] = useState("");
  const [knownDistanceIn, setKnownDistanceIn] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [attachmentVersion, setAttachmentVersion] = useState(0);
  const [message, setMessage] = useState("");
  const selected = photos.find(p => p.id === selectedId) ?? photos[0];
  const activeId = selected?.id ?? "";

  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    let url: string | null = null;
    setImageUrl(null);
    loadPhotoBlob(activeId).then(blob => {
      if (blob && alive) {
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    }).catch(() => {
      if (alive) setMessage("Could not load the image from this browser.");
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeId, selected?.widthPx, selected?.heightPx, attachmentVersion]);

  useEffect(() => {
    setFirstMarkerId(selected?.scale?.firstMarkerId ?? "");
    setSecondMarkerId(selected?.scale?.secondMarkerId ?? "");
    setKnownDistanceIn(selected?.scale ? String(Number((selected.scale.knownDistanceMm / 25.4).toFixed(4))) : "");
  }, [activeId, selected?.scale?.firstMarkerId, selected?.scale?.secondMarkerId, selected?.scale?.knownDistanceMm]);

  const calibration = useMemo(() => selected ? photoScale(selected) : null, [selected]);
  const crosscheck = useMemo(() => selected ? wheelbaseCrosscheck(selected, wheelbaseMm) : null, [selected, wheelbaseMm]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      try {
        const dimensions = await storePhotoFile(id, file);
        onCreatePhoto({ id, view, reference: file.name, notes: "", ...dimensions, markers: [] });
        setSelectedId(id);
        setMessage(`Imported ${file.name} locally. Image bytes stay in this browser.`);
      } catch (error) {
        setMessage(`Photo import rejected: ${String(error)}`);
      }
    }
  }

  async function attachImage(file?: File) {
    if (!selected || !file) return;
    try {
      const expected = selected.widthPx && selected.heightPx ? {
        reference: selected.reference, widthPx: selected.widthPx,
        heightPx: selected.heightPx, sha256: selected.sha256,
      } : undefined;
      const dimensions = await storePhotoFile(selected.id, file, expected);
      onUpdatePhoto({ ...selected, reference: file.name, ...dimensions });
      setAttachmentVersion(v => v + 1);
      setMessage(expected
        ? "Original image reattached; saved markers and scale were preserved."
        : "Image attached to filename-only reference. You can now place markers.");
    } catch (error) {
      setMessage(`Reattachment rejected: ${String(error)}`);
    }
  }

  async function replaceImage(file?: File) {
    if (!selected || !file) return;
    try {
      const dimensions = await storePhotoFile(selected.id, file);
      onUpdatePhoto({
        ...selected, reference: file.name, ...dimensions,
        markers: [], scale: undefined,
      });
      setAttachmentVersion(v => v + 1);
      setMessage("Image replaced; previous marker coordinates and scale were explicitly cleared.");
    } catch (error) {
      setMessage(`Replacement rejected: ${String(error)}`);
    }
  }

  function addReference() {
    if (!reference.trim()) {
      setMessage("Enter a filename or reference first.");
      return;
    }
    const id = crypto.randomUUID();
    onCreatePhoto({ id, view, reference: reference.trim(), notes: notes.trim() });
    setSelectedId(id);
    setReference("");
    setNotes("");
    setMessage("Reference added. Attach the actual image to place datum markers.");
  }

  function placeMarker(event: React.MouseEvent<HTMLImageElement>) {
    if (!selected || !imageUrl) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    try {
      onUpdatePhoto(addOrMoveMarker(selected, markerLabel, x, y, crypto.randomUUID()));
      setMessage(`${markerLabel} placed. Select the same label and click again to reposition.`);
    } catch (error) {
      setMessage(String(error));
    }
  }

  function setScale() {
    if (!selected) return;
    const distanceIn = Number(knownDistanceIn);
    if (!firstMarkerId || !secondMarkerId || firstMarkerId === secondMarkerId ||
        !Number.isFinite(distanceIn) || distanceIn <= 0) {
      setMessage("Select two distinct markers and enter a positive measured distance.");
      return;
    }
    const next: CapturePhoto = {
      ...selected,
      scale: { firstMarkerId, secondMarkerId, knownDistanceMm: distanceIn * 25.4 },
    };
    if (!photoScale(next)) {
      setMessage("Markers must be at least 20 image pixels apart. Reposition or select a different pair.");
      return;
    }
    onUpdatePhoto(next);
    setMessage("2D image-plane scale saved. Perspective and camera pose remain uncalibrated.");
  }

  async function removeSelected() {
    if (!selected) return;
    const id = selected.id;
    onRemovePhoto(id);
    setSelectedId("");
    try { await removePhotoBlob(id); } catch { /* Local blob may already be missing. */ }
    setMessage("Photo record removed from this draft and its local image storage.");
  }

  return (
    <div className="photo-calibration-board">
      <div className="capture-section-label">PHOTO IMPORT & DATUM BOARD</div>
      <p className="capture-help">
        Import PNG, JPEG or WebP images (15 MB max each). Photos are kept only in this browser&apos;s
        IndexedDB—not uploaded to AeroVista and not included in JSON exports. Keep original photos separately.
      </p>
      <div className="photo-input-row">
        <label>Photo view
          <select aria-label="Photo view" value={view} onChange={event => setView(event.target.value as PhotoView)}>
            {views.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>Import photo files
          <input aria-label="Import photo files" type="file" accept="image/png,image/jpeg,image/webp"
            multiple onChange={event => { void addFiles(event.target.files); event.target.value = ""; }} />
        </label>
      </div>
      <div className="photo-reference-row">
        <input aria-label="Filename-only reference" placeholder="Or add a filename-only reference"
          value={reference} onChange={event => setReference(event.target.value)} />
        <input aria-label="Photo notes" placeholder="Optional photo notes"
          value={notes} onChange={event => setNotes(event.target.value)} />
        <button onClick={addReference}>Add reference</button>
      </div>
      {message && <p role="status" className="photo-status">{message}</p>}

      <div className="photo-collection">
        {photos.length === 0 && <p className="capture-help">No photos yet. Start with a straight driver-side view.</p>}
        {photos.map(photo => (
          <button key={photo.id} className={`photo-collection-item ${activeId === photo.id ? "selected" : ""}`}
            onClick={() => setSelectedId(photo.id)}>
            <strong>{views.find(item => item.value === photo.view)?.label ?? photo.view}</strong>
            <span>{photo.reference}</span>
            <small>{photo.widthPx ? `${photo.widthPx}×${photo.heightPx} px` : "Reference only"} · {photo.markers?.length ?? 0} markers</small>
          </button>
        ))}
      </div>

      {selected && (
        <div className="photo-calibration-editor">
          <div className="photo-calibration-heading">
            <strong>{selected.reference}</strong>
            <button onClick={() => void removeSelected()}>Remove photo</button>
          </div>
          <label className="photo-replace-label">Replace with a different image (clears markers and scale)
            <input aria-label="Replace image" type="file" accept="image/png,image/jpeg,image/webp"
              onChange={event => { void replaceImage(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
          {imageUrl ? (
            <div className="photo-image-stage">
              <img src={imageUrl} alt={`Calibration image: ${selected.reference}`} onClick={placeMarker}
                draggable={false} />
              {selected.markers?.map(marker => (
                <span key={marker.id} className="photo-marker"
                  style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}>
                  {marker.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="photo-image-missing">
              Image not available in this browser. Attach the original image to mark datums.
              <label>Attach / replace image
                <input aria-label="Attach image" type="file" accept="image/png,image/jpeg,image/webp"
                  onChange={event => { void attachImage(event.target.files?.[0]); event.target.value = ""; }} />
              </label>
            </div>
          )}

          {imageUrl && (
            <>
              <div className="photo-marker-toolbar">
                <label>Marker to place or move
                  <select aria-label="Marker label" value={markerLabel} onChange={event => setMarkerLabel(event.target.value)}>
                    {datumLabels.map(label => <option key={label} value={label}>{label}</option>)}
                  </select>
                </label>
                <p className="capture-help">Choose a named datum, then click its location on the photo. Repeat to move it.</p>
              </div>
              <div className="photo-marker-list">
                {selected.markers?.map(marker => (
                  <div key={marker.id}>
                    <span>{marker.label} · {(marker.x * 100).toFixed(1)}%, {(marker.y * 100).toFixed(1)}%</span>
                    <button onClick={() => onUpdatePhoto({
                      ...selected, markers: selected.markers?.filter(m => m.id !== marker.id),
                      scale: selected.scale?.firstMarkerId === marker.id || selected.scale?.secondMarkerId === marker.id
                        ? undefined : selected.scale,
                    })}>Delete</button>
                  </div>
                ))}
              </div>
              <div className="photo-scale-form">
                <div className="capture-section-label">TWO-POINT IMAGE SCALE</div>
                <p className="capture-help">Place SCALE-A and SCALE-B on a known-length marker. Measure its actual length; do not estimate from the photo.</p>
                <label>First datum
                  <select aria-label="First scale marker" value={firstMarkerId} onChange={event => setFirstMarkerId(event.target.value)}>
                    <option value="">Choose marker</option>
                    {selected.markers?.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
                <label>Second datum
                  <select aria-label="Second scale marker" value={secondMarkerId} onChange={event => setSecondMarkerId(event.target.value)}>
                    <option value="">Choose marker</option>
                    {selected.markers?.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
                <label>Actual distance (inches)
                  <input aria-label="Known marker distance" type="number" min="0.001" step="any"
                    value={knownDistanceIn} onChange={event => setKnownDistanceIn(event.target.value)} />
                </label>
                <button onClick={setScale}>Set photo scale</button>
              </div>
              {calibration && (
                <div className="photo-scale-result">
                  <strong>Image-plane scale: {calibration.millimetersPerPixel.toFixed(3)} mm/px</strong>
                  <span>{calibration.pixels.toFixed(1)} pixels between scale markers</span>
                  <p>{calibration.warning}</p>
                  {crosscheck && (
                    <p>Wheel-center image estimate: {(crosscheck.measuredMm / 25.4).toFixed(2)} in;
                      captured wheelbase: {(crosscheck.expectedMm / 25.4).toFixed(2)} in;
                      difference: {(crosscheck.deltaMm / 25.4).toFixed(2)} in.
                      {!crosscheck.independentScale && " This comparison reuses the scale datums and is not independent."}
                      {!wheelbaseMeasured && " Captured wheelbase is still assumed."}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
