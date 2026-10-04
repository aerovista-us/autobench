"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { BufferAttribute, BufferGeometry } from "three";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { VehicleDesign } from "@/lib/model/types";
import { deriveVehicle } from "@/lib/model/derive";
import {
  compileExactPops,
  type ExactVehicleMesh,
} from "@/lib/geometry/occtExact";

const MM = 1 / 1000;

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
            (side * p.frameRailSpacingMm / 2) * MM,
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
        z={rearTrackHalf}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
      />
      <Tire
        x={0}
        z={-rearTrackHalf}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
      />
      <Tire
        x={d.frontAxleXmm}
        z={frontTrackHalf}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
        accent
      />
      <Tire
        x={d.frontAxleXmm}
        z={-frontTrackHalf}
        diameter={p.tireDiameterMm}
        width={p.tireWidthMm}
        accent
      />

      {p.frontAxleOffsetMm !== 0 && (
        <>
          <Tire
            x={baselineFrontX}
            z={frontTrackHalf}
            diameter={p.tireDiameterMm}
            width={p.tireWidthMm}
            opacity={0.2}
          />
          <Tire
            x={baselineFrontX}
            z={-frontTrackHalf}
            diameter={p.tireDiameterMm}
            width={p.tireWidthMm}
            opacity={0.2}
          />
        </>
      )}
    </group>
  );
}

function ExactVehicleModel({ exact }: { exact: ExactVehicleMesh }) {
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
    result.computeBoundingSphere();
    return result;
  }, [exact]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#245277"
        roughness={0.55}
        metalness={0.22}
      />
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
            z={frontTrackHalf}
            diameter={p.tireDiameterMm}
            width={p.tireWidthMm}
            opacity={0.16}
          />
          <Tire
            x={p.baselineWheelbaseMm}
            z={-frontTrackHalf}
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

export function VehicleViewport({ design }: { design: VehicleDesign }) {
  const [exact, setExact] = useState<ExactVehicleMesh | null>(null);
  const [exactState, setExactState] = useState<
    "loading" | "ready" | "error"
  >("loading");

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
    <div className="viewport-shell">
      <Canvas
        shadows
        camera={{ position: [6.7, 4.3, 7.2], fov: 39, near: 0.1, far: 100 }}
        dpr={[1, 1.6]}
      >
        <color attach="background" args={["#071019"]} />
        <fog attach="fog" args={["#071019", 11, 23]} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[4, 9, 6]}
          intensity={2.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-5, 4, -5]} intensity={0.75} />
        <Suspense fallback={null}>
          {exactForRevision ? (
            <ExactVehicleModel exact={exactForRevision} />
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
        <OrbitControls
          target={[1.3, 1.1, 0]}
          minDistance={3}
          maxDistance={18}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <div className="viewport-badge">
        {exactState === "ready" && exactForRevision
          ? `EXACT OCCT · ${exactForRevision.triangleCount.toLocaleString()} TRI`
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
