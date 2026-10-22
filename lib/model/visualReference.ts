export type FrontAxleScenarioInches = 0 | 8 | 10 | 12 | 14;

export interface VisualReference {
  id: string;
  title: string;
  vehicle: string;
  role: "styling-only";
  view: "front-driver-three-quarter";
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  sourceName: string;
  sourceUrl: string;
  credit: string;
  sourceDescription: string;
  referenceVehicleIsPopsVan: false;
  dimensionAuthority: false;
  designCues: readonly { id: string; title: string; description: string; x: number; y: number }[];
}

export const g10FrontReference: VisualReference = {
  id: "1986-g10-front-three-quarter",
  title: "1986 Chevrolet G10 — factory front-end reference",
  vehicle: "1986 Chevrolet G10 cargo van",
  role: "styling-only",
  view: "front-driver-three-quarter",
  imagePath: "/references/1986-chevrolet-g10-gr-auto-gallery.jpg",
  imageWidth: 790,
  imageHeight: 527,
  sourceName: "GR Auto Gallery / ClassicCars.com",
  sourceUrl: "https://classiccars.com/listings/view/1998014/1986-chevrolet-g10-van-for-sale-in-kentwood-michigan-49512",
  credit: "Reference photograph: GR Auto Gallery of Metro Detroit. Source image retains the photographer/dealer watermark; rights remain with their respective owners.",
  sourceDescription: "Reference G10 is a separate 1986 vehicle, not a photograph of Pops Van. Dealer listing identifies a stock G10 with a 4.3 L V6 and rear-wheel drive; Pops Van's proposed drivetrain is different.",
  referenceVehicleIsPopsVan: false,
  dimensionAuthority: false,
  designCues: [
    {
      id: "grille",
      title: "Square chrome grille",
      description: "Retain the horizontal grille and rectangular bezel rhythm; avoid a modernized or angled fascia.",
      x: 0.22, y: 0.645,
    },
    {
      id: "lamps",
      title: "Stacked rectangular headlights",
      description: "Preserve the two-light vertical arrangement and the outer trim frame.",
      x: 0.282, y: 0.646,
    },
    {
      id: "hood",
      title: "Short sloping hood",
      description: "Keep the compact hood-to-windshield relationship while allowing front-clip and cooling packaging changes.",
      x: 0.33, y: 0.526,
    },
    {
      id: "bumper",
      title: "Straight chrome bumper",
      description: "Use the stock bumper line as a visual datum; winch/4x4 mounts are independent engineered parts.",
      x: 0.224, y: 0.788,
    },
    {
      id: "arch",
      title: "Rounded front wheel opening",
      description: "Keep the arch language, but redraw opening and flare clearance when moving the axle forward.",
      x: 0.401, y: 0.738,
    },
    {
      id: "beltline",
      title: "Long, clean body beltline",
      description: "Keep the subtle side character line continuous into the modified front clip.",
      x: 0.58, y: 0.548,
    },
  ],
};

export const frontEndScenarios: Record<FrontAxleScenarioInches, {
  title: string;
  intent: string;
  focus: readonly string[];
}> = {
  0: {
    title: "Factory-style baseline",
    intent: "Preserve the stock-looking nose, bumper, hood, grille, and wheel-opening relationship.",
    focus: ["Use only as a styling comparison; the measured Pops Van baseline is not yet accepted.", "Do not copy pixel dimensions from this perspective photo."],
  },
  8: {
    title: "Subtle axle-forward treatment",
    intent: "Explore a modest forward wheel placement while keeping the recognizable factory grille and hood.",
    focus: ["Review tire-to-door and wheel-opening clearance.", "Keep grille and bumper aligned to the front clip, not to a guessed photo dimension."],
  },
  10: {
    title: "Preferred first concept",
    intent: "Start with +10 in front axle placement, retaining the G10 face while revising the wheel opening and 4x4 packaging.",
    focus: ["Develop a new front fender/arch relationship rather than stretching the entire stock nose.", "Check steering sweep, suspension, frame extension, driveshaft, radiator, and winch clearances from measured CAD."],
  },
  12: {
    title: "Pronounced axle-forward concept",
    intent: "Test the stronger stance without losing the stacked-lamp and chrome-grille identity.",
    focus: ["Expect substantial wheel opening and fender work.", "Reassess bumper/approach geometry, frame extension and suspension packaging."],
  },
  14: {
    title: "Maximum exploration candidate",
    intent: "Explore the most aggressive proposed offset, with factory cues preserved only where feasible.",
    focus: ["Treat front clip, wheel arch, frame and steering geometry as a major redesign.", "Do not present this as build-ready without verified physical measurements and engineering review."],
  },
};

export const frontAxleScenarioInches = [0, 8, 10, 12, 14] as const;

export function parseFrontAxleScenario(value: string | null): FrontAxleScenarioInches {
  if (value === null || value.trim() === "") return 10;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 14) return 10;
  return frontAxleScenarioInches.reduce<FrontAxleScenarioInches>(
    (nearest, candidate) => Math.abs(candidate - n) < Math.abs(nearest - n) ? candidate : nearest,
    frontAxleScenarioInches[0],
  );
}
