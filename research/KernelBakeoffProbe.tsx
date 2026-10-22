"use client";

import { useEffect, useState } from "react";
import { Matrix4 } from "three";
import baselineManifest from "@/data/pops-van.baseline.json";

const MM = 1 / 1000;
const INCH = 25.4;

type ProbeResult = {
  status: "pass";
  kernel: "opengeometry";
  initMs: number;
  baseline: ScenarioResult;
  axlePlus10: ScenarioResult;
  projection: {
    baselineLineCount: number;
    movedLineCount: number;
    hiddenLineRemoval: "experimental";
  };
  step: {
    perSolid: "pass";
    assembly: "blocked-analytic-worldgraph";
    note: string;
  };
};

type ScenarioResult = {
  metrics: {
    frontAxleXmm: number;
    rearAxleXmm: number;
    wheelbaseMm: number;
    bodyFrontXmm: number;
    bodyRearXmm: number;
  };
  triangleCount: number;
  bodyStepBytes: number;
  frontTireStepBytes: number;
  compileMs: number;
  projectionLines: number;
};

function approx(actual: number, expected: number, tolerance: number, label: string) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    throw new Error(`${label}: non-finite value actual=${actual} expected=${expected}`);
  }
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function midpoint(min: number, max: number) {
  return (min + max) / 2;
}

export function KernelBakeoffProbe() {
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void runOpenGeometry()
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .catch((failure) => {
        console.error("OpenGeometry bake-off failed", failure);
        if (!cancelled) setError(String(failure));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "ui-monospace, monospace", background: "#071019", color: "#e8f0f6", minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "system-ui, sans-serif", marginTop: 0 }}>AutoBench M0 Kernel Bake-off</h1>
      <p>This route is a CI/runtime probe, not a customer-facing screen.</p>
      {error ? (
        <>
          <h2 style={{ color: "#ff6e67" }}>OPEN GEOMETRY FAIL</h2>
          <pre data-opengeometry-error>{error}</pre>
        </>
      ) : result ? (
        <>
          <h2 style={{ color: "#6ee7b7" }}>OPEN GEOMETRY PASS</h2>
          <pre data-opengeometry-result style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </>
      ) : (
        <h2>OPEN GEOMETRY RUNNING</h2>
      )}
    </main>
  );
}

async function runOpenGeometry(): Promise<ProbeResult> {
  const {
    Cuboid,
    Cylinder,
    OpenGeometry,
    Vector3,
    WorldGraph,
  } = await import("opengeometry");

  const initStart = performance.now();
  await OpenGeometry.create({});
  const initMs = performance.now() - initStart;

  const baseline = structuredClone(baselineManifest);
  const moved = structuredClone(baselineManifest);
  moved.revision = baseline.revision + 1;
  moved.parameters.frontAxleOffsetMm = 10 * INCH;

  const base = compileScenario(baseline, { Cuboid, Cylinder, Vector3, WorldGraph });
  const candidate = compileScenario(moved, { Cuboid, Cylinder, Vector3, WorldGraph });

  approx(base.metrics.frontAxleXmm, baseline.parameters.baselineWheelbaseMm, 0.05, "baseline front axle X");
  approx(base.metrics.rearAxleXmm, 0, 0.05, "baseline rear axle X");
  approx(candidate.metrics.frontAxleXmm, baseline.parameters.baselineWheelbaseMm + 254, 0.05, "moved front axle X");
  approx(candidate.metrics.rearAxleXmm, 0, 0.05, "moved rear axle X");
  approx(candidate.metrics.wheelbaseMm - base.metrics.wheelbaseMm, 254, 0.05, "wheelbase delta");
  approx(candidate.metrics.bodyFrontXmm, base.metrics.bodyFrontXmm, 0.05, "body front preserved");
  approx(candidate.metrics.bodyRearXmm, base.metrics.bodyRearXmm, 0.05, "body rear preserved");

  if (base.triangleCount <= 0 || candidate.triangleCount <= 0) {
    throw new Error("OpenGeometry produced an empty display mesh");
  }
  if (base.projectionLines <= 0 || candidate.projectionLines <= 0) {
    throw new Error("OpenGeometry projection returned no lines");
  }

  return {
    status: "pass",
    kernel: "opengeometry",
    initMs,
    baseline: base,
    axlePlus10: candidate,
    projection: {
      baselineLineCount: base.projectionLines,
      movedLineCount: candidate.projectionLines,
      hiddenLineRemoval: "experimental",
    },
    step: {
      perSolid: "pass",
      assembly: "blocked-analytic-worldgraph",
      note: "OpenGeometry 2.0.16 exports authoritative STEP per AnalyticSolid, while WorldGraph multi-item STEP currently refuses analytic definitions.",
    },
  };
}

function compileScenario(design: typeof baselineManifest, api: any): ScenarioResult {
  const { Cuboid, Cylinder, Vector3, WorldGraph } = api;
  const start = performance.now();
  const p = design.parameters;
  const graph = new WorldGraph();
  const solids: any[] = [];

  const rearAxleX = 0;
  const frontAxleX = p.baselineWheelbaseMm + p.frontAxleOffsetMm;
  const bodyRearX = -p.rearOverhangMm;
  const bodyFrontX = p.baselineWheelbaseMm + p.frontOverhangMm;
  const tireRadius = p.tireDiameterMm / 2;

  function addBox(id: string, x1: number, canonicalY1: number, z1: number, x2: number, canonicalY2: number, z2: number) {
    const width = (x2 - x1) * MM;
    const height = (z2 - z1) * MM;
    const depth = (canonicalY2 - canonicalY1) * MM;
    const solid = new Cuboid({
      center: new Vector3(0, 0, 0),
      width,
      height,
      depth,
      deflection: 0.004,
    });
    solids.push(solid);
    graph.define(id, solid);
    const centerX = ((x1 + x2) / 2) * MM;
    const centerY = ((z1 + z2) / 2) * MM;
    const sceneZ = -((canonicalY1 + canonicalY2) / 2) * MM;
    graph.addNode({
      id,
      parent: "vehicle",
      definition: id,
      local: new Matrix4().makeTranslation(centerX, centerY, sceneZ),
    });
    solid.position.set(centerX, centerY, sceneZ);
    solid.updateMatrixWorld(true);
    return solid;
  }

  function addLateralCylinder(id: string, radiusMm: number, lengthMm: number, xMm: number, canonicalCenterYMm: number, centerZMm: number) {
    const solid = new Cylinder({
      center: new Vector3(0, 0, 0),
      radius: radiusMm * MM,
      height: lengthMm * MM,
      deflection: 0.004,
    });
    solids.push(solid);
    graph.define(id, solid);

    const local = new Matrix4().makeRotationX(Math.PI / 2);
    local.setPosition(xMm * MM, centerZMm * MM, -canonicalCenterYMm * MM);
    graph.addNode({
      id,
      parent: "vehicle",
      definition: id,
      local,
    });

    solid.rotation.x = Math.PI / 2;
    solid.position.set(xMm * MM, centerZMm * MM, -canonicalCenterYMm * MM);
    solid.updateMatrixWorld(true);
    return solid;
  }

  graph.addNode({ id: "vehicle" });

  const body = addBox(
    "body",
    bodyRearX,
    -p.bodyWidthMm / 2,
    p.groundClearanceMm,
    bodyFrontX,
    p.bodyWidthMm / 2,
    p.groundClearanceMm + p.bodyHeightMm,
  );

  const clipWidth = p.bodyWidthMm * 0.94;
  const clipHeight = p.bodyHeightMm * 0.74;
  addBox(
    "front-clip",
    bodyFrontX - 520,
    -clipWidth / 2,
    p.groundClearanceMm,
    bodyFrontX,
    clipWidth / 2,
    p.groundClearanceMm + clipHeight,
  );

  addBox(
    "bumper",
    bodyFrontX,
    -(p.bodyWidthMm + 90) / 2,
    p.groundClearanceMm,
    bodyFrontX + p.bumperLeadMm,
    (p.bodyWidthMm + 90) / 2,
    p.groundClearanceMm + 180,
  );

  const frameLength = bodyFrontX - bodyRearX - 180;
  const frameCenterX = (bodyFrontX + bodyRearX) / 2 - 40;
  const frameStartX = frameCenterX - frameLength / 2;
  const frameEndX = frameCenterX + frameLength / 2;

  addBox(
    "left-rail",
    frameStartX,
    p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
    p.groundClearanceMm,
    frameEndX,
    p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
    p.groundClearanceMm + p.frameRailHeightMm,
  );
  addBox(
    "right-rail",
    frameStartX,
    -p.frameRailSpacingMm / 2 - p.frameRailWidthMm / 2,
    p.groundClearanceMm,
    frameEndX,
    -p.frameRailSpacingMm / 2 + p.frameRailWidthMm / 2,
    p.groundClearanceMm + p.frameRailHeightMm,
  );

  addLateralCylinder("front-axle", 55, p.frontTrackMm + 160, frontAxleX, 0, tireRadius);
  addLateralCylinder("rear-axle", 55, p.rearTrackMm + 160, rearAxleX, 0, tireRadius);
  const frontLeftTire = addLateralCylinder(
    "front-left-tire",
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    p.frontTrackMm / 2,
    tireRadius,
  );
  addLateralCylinder(
    "front-right-tire",
    tireRadius,
    p.tireWidthMm,
    frontAxleX,
    -p.frontTrackMm / 2,
    tireRadius,
  );
  addLateralCylinder(
    "rear-left-tire",
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    p.rearTrackMm / 2,
    tireRadius,
  );
  addLateralCylinder(
    "rear-right-tire",
    tireRadius,
    p.tireWidthMm,
    rearAxleX,
    -p.rearTrackMm / 2,
    tireRadius,
  );

  const bodyBounds = graph.getWorldBounds("body");
  const frontBounds = graph.getWorldBounds("front-left-tire");
  const rearBounds = graph.getWorldBounds("rear-left-tire");
  if (!bodyBounds || !frontBounds || !rearBounds) {
    throw new Error("OpenGeometry did not return exact world bounds");
  }

  const metrics = {
    frontAxleXmm: midpoint(frontBounds.min.x, frontBounds.max.x) / MM,
    rearAxleXmm: midpoint(rearBounds.min.x, rearBounds.max.x) / MM,
    wheelbaseMm: (midpoint(frontBounds.min.x, frontBounds.max.x) - midpoint(rearBounds.min.x, rearBounds.max.x)) / MM,
    bodyFrontXmm: bodyBounds.max.x / MM,
    bodyRearXmm: bodyBounds.min.x / MM,
  };

  const camera = {
    position: { x: midpoint(bodyRearX, bodyFrontX) * MM, y: 1.3, z: -8 },
    target: { x: midpoint(bodyRearX, bodyFrontX) * MM, y: 1.3, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    near: 0.1,
    projection_mode: "Orthographic" as const,
  };
  const projection = graph.projectLines(
    ["vehicle"],
    camera,
    { hide_hidden_edges: true },
    0.004,
  );

  const triangleCount = solids.reduce((sum, solid) => {
    const indexCount = solid.surface.geometry.index?.count ?? 0;
    return sum + indexCount / 3;
  }, 0);

  const bodyStep = body.exportStep("millimetre");
  const tireStep = frontLeftTire.exportStep("millimetre");

  const result = {
    metrics,
    triangleCount,
    bodyStepBytes: new TextEncoder().encode(bodyStep.text).byteLength,
    frontTireStepBytes: new TextEncoder().encode(tireStep.text).byteLength,
    compileMs: performance.now() - start,
    projectionLines: projection.lines.length,
  };

  graph.dispose();
  for (const solid of solids) solid.dispose();

  return result;
}
