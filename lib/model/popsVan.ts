import baseline from "../../data/pops-van.baseline.json";
import type { VehicleDesign } from "./types";

export const INCH = 25.4;

// The JSON file is the portable project seed used by both the web workbench
// and exact-kernel verification. Values remain assumptions until capture.
export const popsVanBaseline = structuredClone(
  baseline,
) as unknown as VehicleDesign;
