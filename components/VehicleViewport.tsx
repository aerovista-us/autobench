"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { BufferAttribute, BufferGeometry } from "three";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef } from "react";
import type { VehicleDesign } from "@/lib/model/types";
import { deriveVehicle } from "@/lib/model/derive";
import {
  compileExactPops,
  type ExactVehicleMesh,
} from "@/lib/geometry/occtExact";

type ViewAngle = "front" | "side" | "rear" | "top";
const MM = 1 / 1000;
const sceneZ = (canonicalY: number) => -canonicalY;

function Tire({
  x,
  z,
  diameter,
  width,
  accent = false,
  opacity = 1,
}: {
  x: number;
  z: number;
  diameter: number;
  width: number;
  accent?: boolean;
  opacity?: number;
}) {
  return (
    <mesh
      position={[x * MM, (diameter / 2) * MM, z * MM]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <cylinderGeometry
        args={[(diameter / 2) * MM, (diameter / 2) * MM, width * MM, 40]}
      />
      <meshStandardMaterial
        color={accent ? "#f4b84a" : "#20252c"}
        roughness={0.82}
        metalness={0.08}
        transparent={opacity < 1}
        opacity={opacity}
        wireframe={opacity < 0.5}
      />
    </mesh>
  );
}

function AnalyticalVehicleModel({ design }: { design: VehicleDesign }) {
  const p = design.parameters;
  const d = deriveVehicle(design);
  const bodyLength = d.bodyFrontXmm - d.bodyRearXmm;
  const bodyCenterX = (d.bodyFrontXmm + d.bodyRearXmm) / 2;
  const frameLength = d.bodyFrontXmm - d.bodyRearXmm - 180;
  const frameCenterX = (d.bodyFrontXmm + d.bodyRearXmm) / 2 - 40;
  const frontTrackHalf = p.frontTrackMm / 2;
  const rearTrackHalf = p.rearTrackMm / 2;
  const baselineFrontX = p.baselineWheelbaseMm;

  return (
    <group>
      <mesh
        position={[
          bodyCenterX * MM,
          (p.groundClearanceMm + p.bodyHeightMm / 2) * MM,
          0,
        ]}
      >
        <boxGeometry
          args={[bodyLength * MM, p.bodyHeightMm * MM, p.bodyWidthMm * MM]}
        />
        <meshStandardMaterial
          color="#17314a"
          roughness={0.62}
          metalness={0.18}
          transparent
          opacity={0.58}
        />
      </mesh>

      <mesh
        position={[
          (d.bodyFrontXmm - 260) * MM,
          (p.groundClearanceMm + p.bodyHeightMm * 0.43) * MM,
          0,
        ]}
      >
        <boxGeometry
          args={[
            520 * MM,
            p.bodyHeightMm * 0.74 * MM,
            p.bodyWidthMm * 0.94 * MM,
          ]}
        />
        <meshStandardMaterial color="#254d70" roughness={0.5} metalness={0.22} />
      </mesh>

      <mesh
        position={[
          (d.bodyFrontXmm + p.bumperLeadMm / 2) * MM,
          (p.groundClearanceMm + 90) * MM,
          0,
        ]}
      >
        <boxGeometry
          args={[p.bumperLeadMm * MM, 180 * MM, (p.bodyWidthMm + 90) * MM]}
        />
        <meshStandardMaterial color="#101419" roughness={0.45} metalness={0.72} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            frameCenterX * MM,
            (p.groundClearanceMm + p.frameRailHeightMm / 2) * MM,
            sceneZ(side * p.frameRailSpacingMm / 2) * MM,
          ]}
        >
          <boxGeometry
            args={[
              frameLength * MM,
              p.frameRailHeightMm * MM,
              p.frameRailWidthMm * MM,
            ]}
          />
          <meshStandardMaterial color="#3f4953" roughness={0.5} metalness={0.55} />
        </mesh>
      ))}

      <mesh
        position={[d.frontAxleXmm * MM, (p.tireDiameterMm / 2) * MM, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[55 * MM, 55 * MM, (p.frontTrackMm + 160) * MM, 20]}
        />
        <meshStandardMaterial color="#71808d" metalness={0.65} roughness={0.34} />
      </mesh>

      <mesh
        position={[0, (p.tireDiameterMm / 2) * MM, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[55 * MM, 55 * MM, (p.rearTrackMm + 160) * MM, 20]}
        />
        <meshStandardMaterial color="#71808d" metalness={0.65} roughness={0.34} />
      </mesh>

      <Tire
        x={0}
        z={sceneZ(rearTrackHalf)}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
      />
      <Tire
        x={0}
        z={sceneZ(-rearTrackHalf)}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
      />
      <Tire
        x={d.frontAxleXmm}
        z={sceneZ(frontTrackHalf)}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
        accent
      />
      <Tire
        x={d.frontAxleXmm}
        z={sceneZ(-frontTrackHalf)}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
        accent
      />

      {p.frontAxleOffsetMm !== 0 && (
        <>
          <Tire
            x={baselineFrontX}
            z={sceneZ(frontTrackHalf)}
            diameter={p.tireDiameterMm}
            width={p.tireWidthMm}
            opacity={0.2}
          />
          <Tire
            x={baselineFrontX}
            z={sceneZ(-frontTrackHalf)}
            diameter={p.tireDiameterMm}
            width={p.tireWidthMm}
            opacity={0.2}
          />
        </>
      )}
    </group>
  );
}

function ExactVehicleModel({ exact, inspectSuspension }: { exact: ExactVehicleMesh; inspectSuspension: boolean }) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    const positions = new Float32Array(exact.positions.length);
    const normals = new Float32Array(exact.normals.length);

    // OCCT uses the canonical AutoBench axes: X forward, Y left, Z up.
    // Three.js scene uses X forward, Y up, -Z left. The sign preserves handedness.
    for (let i = 0; i < exact.positions.length; i += 3) {
      positions[i] = exact.positions[i] * MM;
      positions[i + 1] = exact.positions[i + 2] * MM;
      positions[i + 2] = -exact.positions[i + 1] * MM;

      normals[i] = exact.normals[i];
      normals[i + 1] = exact.normals[i + 2];
      normals[i + 2] = -exact.normals[i + 1];
    }

    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("normal", new BufferAttribute(normals, 3));
    result.setIndex(new BufferAttribute(exact.indices, 1));
    exact.materialGroups.forEach((group, index) => {
      result.addGroup(group.start, group.count, index);
    });
    result.computeBoundingSphere();
    return result;
  }, [exact]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const finishes = {
    body: { color: "#194773", roughness: 0.32, metalness: 0.24 },
    chrome: { color: "#e0e8f0", roughness: 0.3, metalness: 0.65 },
    dark: { color: "#313b47", roughness: 0.75, metalness: 0.08 },
    glass: { color: "#183b53", roughness: 0.18, metalness: 0.12 },
    rubber: { color: "#2d3138", roughness: 0.96, metalness: 0.01 },
    steel: { color: "#647381", roughness: 0.6, metalness: 0.7 },
    light: { color: "#f3e9cf", roughness: 0.23, metalness: 0.15 },
    suspension: { color: "#e6a143", roughness: 0.42, metalness: 0.35 },
    accent: { color: "#36789a", roughness: 0.4, metalness: 0.2 },
  } as const;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {exact.materialGroups.map((group, index) => (
        <meshStandardMaterial key={`${group.material}-${index}`} attach={`material-${index}`}
          {...finishes[group.material]}
          visible={!inspectSuspension || group.inspectionVisible} />
      ))}
    </mesh>
  );
}

function DesignGuides({ design }: { design: VehicleDesign }) {
  const p = design.parameters;
  const d = deriveVehicle(design);
  const frontTrackHalf = p.frontTrackMm / 2;

  return (
    <>
      {p.frontAxleOffsetMm !== 0 && (
        <>
          <Tire
            x={p.baselineWheelbaseMm}
            z={sceneZ(frontTrackHalf)}
            diameter={p.tireDiameterMm}
            width={p.tireWidthMm}
            opacity={0.16}
          />
          <Tire
            x={p.baselineWheelbaseMm}
            z={sceneZ(-frontTrackHalf)}
            diameter={p.tireDiameterMm}
            width={p.tireWidthMm}
            opacity={0.16}
          />
        </>
      )}
      <mesh position={[d.frontAxleXmm * MM, 1.55, 0]}>
        <boxGeometry args={[0.018, 3.1, 0.018]} />
        <meshBasicMaterial color="#f4b84a" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

function ViewCameraControls({ view, compact }: { view: ViewAngle; compact: boolean }) {
  const { camera } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    const positions: Record<ViewAngle, [number, number, number]> = {
      front: compact ? [10.8, 4.6, 12.0] : [9.6, 4.1, 11.2],
      side: compact ? [1.3, 3.2, 15.5] : [1.3, 3.0, 12.8],
      rear: compact ? [-10.5, 4.6, 11.5] : [-8.6, 4.1, 10.8],
      top: compact ? [1.3, 18, 0.4] : [1.3, 15.5, 0.4],
    };
    camera.position.set(...positions[view]);
    controls.current?.target.set(1.3, 1.15, 0);
    controls.current?.update();
  }, [camera, compact, view]);
  return <OrbitControls ref={controls} target={[1.3, 1.15, 0]}
    minDistance={3} maxDistance={compact ? 30 : 22}
    enableDamping dampingFactor={0.08} />;
}

export function VehicleViewport({ design, inspectSuspension = false }: {
  design: VehicleDesign; inspectSuspension?: boolean;
}) {
  const [compact, setCompact] = useState(false);
  const [view, setView] = useState<ViewAngle>("front");
  const [exact, setExact] = useState<ExactVehicleMesh | null>(null);
  const [exactState, setExactState] = useState<
    "loading" | "ready" | "error"
  >("loading");

  useEffect(() => {
    const update = () => setCompact(window.innerWidth < 840);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setExactState("loading");
      compileExactPops(design)
        .then((result) => {
          if (cancelled) return;
          setExact(result);
          setExactState("ready");
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("Exact OCCT compile failed", error);
          setExactState("error");
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [design]);

  const exactForRevision = exact?.revision === design.revision ? exact : null;

  return (
    <div className="viewport-shell" data-inspection-mode={inspectSuspension ? "chassis" : "full"}>
      <Canvas
        key={compact ? "mobile" : "desktop"}
        shadows
        camera={{ position: compact ? [10.8, 4.6, 12.0] : [9.6, 4.1, 11.2],
          fov: 39, near: 0.1, far: 100 }}
        dpr={[1, 1.6]}
      >
        <color attach="background" args={["#071019"]} />
        <fog attach="fog" args={["#071019", 11, 23]} />
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[4, 9, 6]}
          intensity={2.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-5, 4, -5]} intensity={0.9} />
        <Suspense fallback={null}>
          {exactForRevision ? (
            <ExactVehicleModel exact={exactForRevision} inspectSuspension={inspectSuspension} />
          ) : (
            <AnalyticalVehicleModel design={design} />
          )}
          <DesignGuides design={design} />
          <Grid
            args={[30, 30]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#284052"
            sectionSize={2.5}
            sectionThickness={0.8}
            sectionColor="#406078"
            fadeDistance={18}
            fadeStrength={1}
            infiniteGrid
          />
        </Suspense>
        <ViewCameraControls view={view} compact={compact} />
      </Canvas>
      <div className="viewport-view-buttons" role="group" aria-label="Vehicle camera views">
        {(["front", "side", "rear", "top"] as const).map(angle => (
          <button type="button" key={angle} aria-pressed={view === angle}
            onClick={() => setView(angle)}>{angle === "front" ? "3/4 FRONT" :
              angle === "side" ? "SIDE" : angle === "rear" ? "3/4 REAR" : "TOP"}</button>
        ))}
      </div>
      <div className="viewport-badge" data-testid="exact-status"
        data-revision={exactForRevision?.revision ?? ""}>
        {exactState === "ready" && exactForRevision
          ? `EXACT OCCT · ${exactForRevision.triangleCount.toLocaleString()} TRI · PROVISIONAL DIMENSIONS`
          : exactState === "error"
            ? "ANALYTICAL FALLBACK · EXACT KERNEL ERROR"
            : "ANALYTICAL FALLBACK · BUILDING EXACT OCCT"}
      </div>
      <div className="axis-key">
        <span><b>X</b> forward</span>
        <span><b>Y</b> left</span>
        <span><b>Z</b> up</span>
      </div>
    </div>
  );
}
