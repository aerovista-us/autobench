"use client";

import { useMemo, useState } from "react";
import { VehicleViewport } from "./VehicleViewport";
import { deriveVehicle, formatInches } from "@/lib/model/derive";
import { INCH, popsVanBaseline } from "@/lib/model/popsVan";
import { setVehicleParameter } from "@/lib/model/operations";
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
  const [design, setDesign] = useState<VehicleDesign>(popsVanBaseline);
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
          <span>MM SOT</span>
          <button onClick={exportManifest}>Export manifest</button>
        </div>
      </header>

      <section className="modebar">
        {["CAPTURE", "MODEL", "MODIFY", "VALIDATE", "PLAN", "RENDER"].map(
          (mode, index) => (
            <button key={mode} className={index === 2 ? "active" : ""}>
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
            <div className="tree-leaf warning">○ Measurements — assumed</div>
            <div className="tree-child">▾ Chassis</div>
            <div className="tree-leaf">◇ Frame rails</div>
            <div className="tree-leaf">◇ Front axle</div>
            <div className="tree-leaf">◇ Rear axle</div>
            <div className="tree-child">▾ Body</div>
            <div className="tree-leaf">◇ Main envelope</div>
            <div className="tree-leaf">◇ Front clip</div>
            <div className="tree-leaf">◇ Bumper</div>
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
                <small>{value === 0 ? "as captured" : "candidate"}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="viewport-column">
          <VehicleViewport design={design} />

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
              label="Wheel opening"
              value={
                metrics.wheelOpeningClearanceMm >= 0
                  ? `+${formatInches(metrics.wheelOpeningClearanceMm)} in`
                  : `${formatInches(metrics.wheelOpeningClearanceMm)} in`
              }
              detail={clearanceState === "pass" ? "clear" : "INTERFERENCE"}
              danger={clearanceState === "conflict"}
            />
          </div>
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

          <div className="validation-card">
            <div className="validation-title">
              <span className={clearanceState === "pass" ? "pill pass" : "pill fail"}>
                {clearanceState === "pass" ? "PASS" : "CONFLICT"}
              </span>
              Tire / body opening
            </div>
            <p>
              Remaining longitudinal envelope:{" "}
              <b>{formatInches(metrics.wheelOpeningClearanceMm)} in</b>.
            </p>
            {clearanceState === "conflict" && (
              <p className="danger-text">
                AutoBench is preserving the captured body envelope instead of
                silently moving it. The wheel opening needs a design operation.
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
