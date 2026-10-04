import type { GeometryEngine } from "./types";

export const previewGeometryEngine: GeometryEngine = {
  name: "preview",
  async compile(design) {
    return {
      kernel: "preview",
      revision: design.revision,
      generatedAt: new Date().toISOString(),
      notes: [
        "Three.js analytical preview",
        "Not authoritative BREP geometry",
      ],
    };
  },
};
