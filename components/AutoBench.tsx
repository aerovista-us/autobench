"use client";

import { useMemo, useState } from "react";
import { parseStoredDesign, useSavedVehicleDesign } from "@/lib/model/savedDesign";
import { VehicleViewport } from "./VehicleViewport";
import { FrontClipReviewPanel } from "./FrontClipReviewPanel";
import { deriveVehicle, formatInches } from "@/lib/model/derive";
import { INCH, popsVanBaseline } from "@/lib/model/popsVan";
import { setVehicleParameter } from "@/lib/model/operations";
import { resolveConceptOptions, setVehicleConceptOption, conceptCautions,
  applyExteriorPreset, currentExteriorPreset, exteriorPresets } from "@/lib/model/conceptOptions";
import type { VehicleConceptOptions, ExteriorPreset } from "@/lib/model/conceptOptions";
import { createSideProjectionSvg } from "@/lib/export/sideProjection";
import { kernelScorecard } from "@/lib/geometry/kernelRegistry";
import type { VehicleDesign } from "@/lib/model/types";

const scenarioInches = [0, 8, 10, 12, 14];

function downloadText(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AutoBench() {
  const { design, setDesign, hydrated } = useSavedVehicleDesign();
  const [inspectSuspension, setInspectSuspension] = useState(false);
  const [importFeedback, setImportFeedback] = useState("");
  const concepts = resolveConceptOptions(design);
  const exteriorPreset = currentExteriorPreset(design);
  function setConcept<K extends keyof VehicleConceptOptions>(key: K, value: VehicleConceptOptions[K]) {
    setDesign(current => setVehicleConceptOption(current, key, value));
  }
  const metrics = useMemo(() => deriveVehicle(design), [design]);
  const offsetIn = Number(metrics.frontAxleOffsetIn.toFixed(1));
  const clearanceState =
    metrics.wheelOpeningClearanceMm >= 0 ? "pass" : "conflict";

  function setOffset(nextInches: number, reason = "Manual workbench edit") {
    setDesign((current) =>
      setVehicleParameter(
        current,
        "frontAxleOffsetMm",
        nextInches * INCH,
        reason,
      ),
    );
  }

  async function importManifest(file: File | undefined) {
    if (!file) return;
    if (file.size > 250_000) { setImportFeedback("Import rejected: manifest exceeds 250 KB."); return; }
    try {
      const restored = parseStoredDesign(await file.text());
      if (!restored) { setImportFeedback("Import rejected: invalid, incompatible or foreign AutoBench manifest."); return; }
      if (!window.confirm(`Replace the local working design with imported revision ${restored.revision}? Export your current draft first if needed.`)) {
        setImportFeedback("Import cancelled; current model unchanged."); return;
      }
      setDesign(restored);
      setImportFeedback(`Imported saved revision ${restored.revision}; assumption flags remain unverified.`);
    } catch { setImportFeedback("Import failed; current draft was not changed."); }
  }

  function exportProjection() {
    downloadText(
      `pops-van-rev-${design.revision}-side.svg`,
      createSideProjectionSvg(design),
      "image/svg+xml",
    );
  }

  function exportManifest() {
    downloadText(
      `pops-van-rev-${design.revision}.json`,
      JSON.stringify(design, null, 2),
      "application/json",
    );
  }

  return (
    <main className="workbench">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">AV</div>
          <div>
            <div className="eyebrow">AEROVISTA / AUTOBENCH</div>
            <h1>Pops&apos; Chevy 4x4</h1>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="status-dot" />
          <span>REV {design.revision}</span>
          <span>{hydrated ? "LOCAL DRAFT" : "LOADING DRAFT"}</span>
          <span>MM SOT</span>
          <button onClick={exportManifest}>Export manifest</button>
          <label style={{cursor:"pointer",fontSize:12,border:"1px solid #42637a",borderRadius:6,padding:"6px 9px"}}>
            Import manifest
            <input type="file" accept=".json,application/json" style={{display:"none"}} aria-label="Import AutoBench JSON manifest"
              onChange={event => {void importManifest(event.target.files?.[0]);event.target.value="";}} />
          </label>
        </div>
      </header>

      {importFeedback && <p role="status" style={{margin:0,padding:"8px 18px",fontSize:13,background:"#162d3b",color:"#e8f0f6"}}>{importFeedback}</p>}
      <section className="modebar">
        {["CAPTURE", "MODEL", "MODIFY", "VALIDATE", "PLAN", "RENDER"].map(
          (mode) => (
            <button key={mode} className={mode === "MODIFY" ? "active" : ""}
              onClick={() => window.location.assign(mode === "CAPTURE" ? "/capture" : mode === "MODIFY" ? "/" : "/" + mode.toLowerCase())}
              title={mode === "MODEL" ? "Return to the live vehicle model" : "Open " + mode.toLowerCase() + " stage"}>
              {mode}
            </button>
          ),
        )}
      </section>

      <section className="workspace-grid">
        <aside className="panel left-panel">
          <div className="panel-heading">
            <span>PROJECT TREE</span>
            <small>baseline + scenario</small>
          </div>
          <nav className="tree">
            <div className="tree-root">▾ Pops&apos; Chevy 4x4</div>
            <div className="tree-child">▾ Reference</div>
            <a className="tree-leaf reference-tree-link" href={`/references/g10-1986?offset=${offsetIn}`}>
              ◇ 1986 G10 front-end photo
            </a>
            <div className="tree-leaf warning">○ Measurements — assumed</div>
            <div className="tree-child">▾ Chassis</div>
            <div className="tree-leaf">◇ Frame rails</div>
            <div className="tree-leaf">◇ Front axle</div>
            <div className="tree-leaf">◇ Rear axle</div>
            <div className="tree-child">▾ Body</div>
            <div className="tree-leaf">◇ Main envelope</div>
            <div className="tree-leaf">◇ Front clip</div>
            <div className="tree-leaf">◇ Bumper · {concepts.bumper}</div>
            <div className="tree-leaf">◇ Rounded roof / raked cab</div>
            <div className="tree-leaf">◇ Exterior · {exteriorPreset}</div>
            <div className="tree-leaf">◇ Side glazing · {concepts.sideGlass}</div>
            <div className="tree-child">▾ Front suspension concepts</div>
            <div className="tree-leaf">◇ Shocks · {concepts.shock}</div>
            <div className="tree-leaf">◇ Springs · {concepts.spring}</div>
          </nav>

          <div className="panel-heading spaced">
            <span>SCENARIOS</span>
            <small>branch targets</small>
          </div>
          <div className="scenario-list">
            {scenarioInches.map((value) => (
              <button
                key={value}
                className={Math.abs(offsetIn - value) < 0.05 ? "selected" : ""}
                onClick={() =>
                  setOffset(
                    value,
                    value === 0
                      ? "Return to as-captured baseline"
                      : `Evaluate front axle +${value} in`,
                  )
                }
              >
                <span>{value === 0 ? "Baseline" : `Axle +${value}\"`}</span>
                <small>{value === 0 ? "assumed" : "candidate"}</small>
              </button>
            ))}
          </div>

          <a className="workbench-reference-card" href={`/references/g10-1986?offset=${offsetIn}`}>
            <img src="/references/1986-chevrolet-g10-gr-auto-gallery.jpg"
              width="790" height="527" alt="1986 G10 reference, dark blue front three-quarter view" />
            <strong>1986 G10 · visual reference 01</strong>
            <span>Grille · stacked lamps · hood · bumper · wheel arch</span>
            <small>View front-end guide →</small>
          </a>
        </aside>

        <section className="viewport-column">
          <VehicleViewport design={design} inspectSuspension={inspectSuspension} />

          <div className="metric-strip">
            <Metric
              label="Wheelbase"
              value={`${formatInches(metrics.wheelbaseMm)} in`}
              detail={`${Math.round(metrics.wheelbaseMm)} mm`}
            />
            <Metric
              label="Front axle"
              value={`+${metrics.frontAxleOffsetIn.toFixed(1)} in`}
              detail="from baseline"
              accent
            />
            <Metric
              label="Approach"
              value={`${metrics.approachAngleDeg.toFixed(1)}°`}
              detail={`${formatInches(metrics.approachRunMm)} in run`}
            />
            <Metric
              label="Original arch envelope"
              value={
                metrics.wheelOpeningClearanceMm >= 0
                  ? `+${formatInches(metrics.wheelOpeningClearanceMm)} in`
                  : `${formatInches(metrics.wheelOpeningClearanceMm)} in`
              }
              detail={clearanceState === "pass" ? "legacy body reference" : "legacy interference"}
              danger={clearanceState === "conflict"}
            />
          </div>
          <FrontClipReviewPanel design={design} />
        </section>

        <aside className="panel inspector">
          <div className="panel-heading">
            <span>MODIFY / FRONT AXLE</span>
            <small>designed parameter</small>
          </div>

          <div className="control-block">
            <div className="control-label">
              <span>Offset from baseline</span>
              <strong>{offsetIn.toFixed(1)} in</strong>
            </div>
            <input
              aria-label="Front axle offset"
              type="range"
              min="0"
              max="14"
              step="0.5"
              value={offsetIn}
              onChange={(event) => setOffset(Number(event.target.value))}
            />
            <div className="range-ends">
              <span>0</span>
              <span>14 in</span>
            </div>
          </div>

          <div className="panel-heading spaced">
            <span>BODY / CONCEPT PROPORTIONS</span>
            <small>reference-informed · not measured</small>
          </div>
          {([
            ["bodyWidthMm", "Body width", 74, 86],
            ["bodyHeightMm", "Body height", 74, 90],
            ["rearOverhangMm", "Rear overhang", 42, 64],
          ] as const).map(([field, label, min, max]) => (
            <div className="control-block body-proportion-control" key={field}>
              <div className="control-label">
                <span>{label}</span>
                <strong>{(design.parameters[field] / INCH).toFixed(1)} in</strong>
              </div>
              <input type="range" min={min} max={max} step={0.5}
                aria-label={label} value={design.parameters[field] / INCH}
                onChange={event => setDesign(current =>
                  setVehicleParameter(current, field, Number(event.target.value) * INCH,
                    `Provisional G-series body proportion: ${label}`))} />
              <div className="range-ends"><span>{min} in</span><span>{max} in</span></div>
            </div>
          ))}
          <div className="panel-heading spaced">
            <span>GEOMETRY / RIDE HEIGHT &amp; WHEELS</span>
            <small>draft dimensions · check fitment</small>
          </div>
          <p style={{fontSize:12,lineHeight:1.5,color:"#a9bfd0"}}>These controls modify the actual saved geometry model, not just the drawing. Tire changes require steering and suspension clearance validation; ride height is not a suspension lift specification.</p>
          {([
            ["frontOverhangMm", "Front body overhang", 26, 48, 0.5],
            ["groundClearanceMm", "Ground clearance", 6, 22, 0.5],
            ["tireDiameterMm", "Tire diameter", 25, 40, 0.5],
            ["tireWidthMm", "Tire section width", 8, 15, 0.25],
            ["wheelOpeningHalfLengthMm", "Wheel-opening half-length", 16, 30, 0.5],
            ["frontTrackMm", "Front track", 58, 80, 0.5],
            ["rearTrackMm", "Rear track", 58, 80, 0.5],
            ["bumperLeadMm", "Front bumper projection", 0, 18, 0.5],
          ] as const).map(([field, title, min, max, step]) => (
            <div key={field} className="control-block body-proportion-control">
              <div className="control-label"><span>{title}</span>
                <strong>{(design.parameters[field] / INCH).toFixed(2)} in</strong></div>
              <input type="range" min={min} max={max} step={step}
                aria-label={title} value={design.parameters[field] / INCH}
                onChange={event => setDesign(current =>
                  setVehicleParameter(current, field, Math.round(Number(event.target.value)*INCH*100)/100,
                    `Provisional design dimension: ${title}`))} />
              <div className="range-ends"><span>{min} in</span><span>{max} in</span></div>
            </div>
          ))}
          <div className="panel-heading spaced">
            <span>EXTERIOR / VAN IDENTITY</span>
            <small>switchable CAD · not measured</small>
          </div>
          <div className="exterior-preset-grid" aria-label="Exterior presets">
            {(Object.keys(exteriorPresets) as ExteriorPreset[]).map(name => (
              <button key={name} type="button" aria-pressed={exteriorPreset === name}
                className={exteriorPreset === name ? "active" : ""}
                onClick={() => setDesign(current => applyExteriorPreset(current, name))}>
                {name === "cargo" ? "Cargo" : name === "classic" ? "Classic van" :
                  name === "camper" ? "Camper" : "Expedition"}
              </button>
            ))}
          </div>
          <div className="concept-options exterior-options">
            <label>
              <span>Side glazing</span>
              <select aria-label="Side window configuration" value={concepts.sideGlass}
                onChange={event => setConcept("sideGlass",
                  event.target.value as VehicleConceptOptions["sideGlass"])}>
                <option value="conversion">Conversion van · side windows</option>
                <option value="cargo">Cargo · solid side panels</option>
                <option value="porthole">Camper · rear portholes</option>
              </select>
            </label>
            {([
              ["twoTone", "Two-tone side sweep"],
              ["roofRack", "Roof rack concept"],
              ["sideSteps", "Side entry steps"],
              ["rearSpare", "Rear-mounted spare concept"],
              ["auxiliaryLights", "Auxiliary front lights"],
            ] as const).map(([key, label]) => (
              <label className="concept-visibility" key={key}>
                <input type="checkbox" aria-label={label} checked={concepts[key]}
                  onChange={event => setConcept(key, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="microcopy">Concept parts export with the same OCCT assembly.
            Window cuts, accessory mounts and weights require physical verification.</p>

          <div className="panel-heading spaced">
            <span>FRONT-END CONCEPTS</span>
            <small>no fitment approval</small>
          </div>
          <div className="concept-options">
            <label>
              <span>Front bumper</span>
              <select aria-label="Front bumper concept" value={concepts.bumper}
                onChange={event => setConcept("bumper",
                  event.target.value as VehicleConceptOptions["bumper"])}>
                <option value="chrome-stock">G-series chrome profile</option>
                <option value="plate-trail">Aftermarket-style steel trail</option>
                <option value="winch-plate">Winch plate envelope · unverified</option>
                <option value="brush-guard">Chrome + brush guard</option>
              </select>
            </label>
            <label>
              <span>Front shocks</span>
              <select aria-label="Front shock concept" value={concepts.shock}
                onChange={event => setConcept("shock",
                  event.target.value as VehicleConceptOptions["shock"])}>
                <option value="unverified">Not yet identified</option>
                <option value="monotube">Heavy-duty monotube concept</option>
                <option value="remote-reservoir">Remote-reservoir concept</option>
              </select>
            </label>
            <label>
              <span>Front springs</span>
              <select aria-label="Front spring concept" value={concepts.spring}
                onChange={event => setConcept("spring",
                  event.target.value as VehicleConceptOptions["spring"])}>
                <option value="unverified">Not yet identified</option>
                <option value="leaf-service">Leaf-spring service concept</option>
                <option value="heavy-duty-leaf">Heavy-duty leaf-pack concept</option>
              </select>
            </label>
            <label className="concept-visibility">
              <input type="checkbox" checked={inspectSuspension}
                onChange={event => setInspectSuspension(event.target.checked)} />
              <span>Isolate chassis and suspension CAD</span>
            </label>
          </div>
          <div className="validation-card concept-safety">
            <div className="validation-title">
              <span className="pill fail">UNVERIFIED</span>
              Parts and mount compatibility
            </div>
            <p>{conceptCautions[0]}</p>
            <p>These are selectable CAD packages, not identified commercial SKUs or approved conversions.
              No suspension travel, frame loads or bracket attachment verified.</p>
          </div>

          <div className="validation-card">
            <div className="validation-title">
              <span className={clearanceState === "pass" ? "pill pass" : "pill fail"}>
                {clearanceState === "pass" ? "PASS" : "CONFLICT"}
              </span>
              Original body opening
            </div>
            <p>
              Remaining longitudinal envelope:{" "}
              <b>{formatInches(metrics.wheelOpeningClearanceMm)} in</b>.
            </p>
            {clearanceState === "conflict" && (
              <p className="danger-text">
                The original fixed opening conflicts with this axle position.
                The new CAD fender arch follows the axle; its static margin and measured
                fitment review appear below the 3D viewport.
              </p>
            )}
          </div>

          <div className="control-block compact">
            <div className="control-label">
              <span>Source confidence</span>
              <strong className="warning-text">LOW</strong>
            </div>
            <p className="microcopy">
              Current dimensions are placeholders. Pops Van capture will replace
              these with observed / scan-derived measurements and locks.
            </p>
          </div>

          <div className="export-stack">
            <button onClick={exportProjection}>Export side SVG</button>
            <button onClick={exportManifest}>Export design JSON</button>
          </div>

          <div className="panel-heading spaced">
            <span>KERNEL BAKE-OFF</span>
            <small>M0 gate</small>
          </div>
          <div className="kernel-list">
            {kernelScorecard.map((kernel) => (
              <div key={kernel.kernel} className="kernel-row">
                <span>{kernel.kernel}</span>
                <small>{kernel.status.toUpperCase()}</small>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="bottom-dock">
        <div className="ai-command">
          <span className="ai-chip">AI</span>
          <div>
            <strong>Design command</strong>
            <span>
              “Move the front axle forward 10 inches and show what conflicts.”
            </span>
          </div>
          <button
            onClick={() =>
              setOffset(
                10,
                "AI candidate: move front axle forward 10 in and expose conflicts",
              )
            }
          >
            Run candidate
          </button>
        </div>

        <div className="history">
          <span>OPERATIONS</span>
          <div className="history-items">
            {design.operationLog.length === 0 ? (
              <small>No edits yet — baseline revision.</small>
            ) : (
              design.operationLog
                .slice()
                .reverse()
                .slice(0, 4)
                .map((op) => (
                  <small key={op.id}>
                    r{design.revision - design.operationLog.length + design.operationLog.indexOf(op) + 1} ·{" "}
                    {String(op.target)} → {(op.nextValue / INCH).toFixed(1)} in
                  </small>
                ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  accent,
  danger,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`metric ${accent ? "accent" : ""} ${danger ? "danger" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
