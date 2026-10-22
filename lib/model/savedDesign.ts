"use client";

import { useEffect, useState } from "react";
import { popsVanBaseline } from "./popsVan";
import type { VehicleDesign } from "./types";

const STORAGE_KEY = "autobench:pops-van:design:v1";
const parameterKeys = Object.keys(popsVanBaseline.parameters) as Array<keyof VehicleDesign["parameters"]>;
const conceptAllowed: Record<string, readonly (string | boolean)[]> = {
  sideGlass: ["conversion", "cargo", "porthole"],
  roofRack: [true, false], sideSteps: [true, false], rearSpare: [true, false],
  auxiliaryLights: [true, false], twoTone: [true, false],
  bumper: ["chrome-stock", "plate-trail", "winch-plate", "brush-guard"],
  shock: ["unverified", "monotube", "remote-reservoir"],
  spring: ["unverified", "leaf-service", "heavy-duty-leaf"],
};

/** Reject malformed or foreign stored data rather than silently using it as engineering evidence. */
export function parseStoredDesign(raw: string | null): VehicleDesign | null {
  if (!raw || raw.length > 250_000) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== "object") return null;
    const value = candidate as Partial<VehicleDesign>;
    if (value.id !== popsVanBaseline.id || value.units !== "mm" ||
      !Number.isSafeInteger(value.revision) || value.revision! < popsVanBaseline.revision ||
      !value.parameters || typeof value.parameters !== "object" ||
      !Array.isArray(value.measurements) || !Array.isArray(value.operationLog) || value.operationLog.length > 300 || (value.conceptHistory?.length ?? 0) > 300) return null;
    for (const key of parameterKeys) {
      const n = value.parameters[key];
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100_000) return null;
    }
    if (value.conceptOptions) {
      for (const key of Object.keys(value.conceptOptions)) {
        if (!conceptAllowed[key]?.includes(value.conceptOptions[key as keyof typeof value.conceptOptions])) return null;
      }
    }
    // Measurement records remain the checked-in baseline until an evidence-aware
    // capture import is implemented. Never trust stored "verified" flags.
    return {
      ...popsVanBaseline,
      revision: value.revision!,
      parameters: { ...popsVanBaseline.parameters, ...value.parameters },
      conceptOptions: value.conceptOptions,
      conceptHistory: Array.isArray(value.conceptHistory) ? value.conceptHistory.slice(-300) : [],
      operationLog: value.operationLog.slice(-300),
    };
  } catch { return null; }
}

export function useSavedVehicleDesign() {
  const [design, setDesign] = useState<VehicleDesign>(popsVanBaseline);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try { setDesign(parseStoredDesign(window.localStorage.getItem(STORAGE_KEY)) ?? popsVanBaseline); }
    catch { setDesign(popsVanBaseline); }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(design)); }
    catch { /* Storage unavailable: session remains usable; not persisted. */ }
  }, [design, hydrated]);
  return { design, setDesign, hydrated };
}
