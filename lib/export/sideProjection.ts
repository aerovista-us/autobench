import { deriveVehicle } from "@/lib/model/derive";
import type { VehicleDesign } from "@/lib/model/types";

export function createSideProjectionSvg(design: VehicleDesign) {
  const p = design.parameters;
  const d = deriveVehicle(design);
  const scale = 0.16;
  const pad = 80;
  const width = Math.ceil((d.bumperFrontXmm - d.bodyRearXmm) * scale + pad * 2);
  const height = Math.ceil(p.bodyHeightMm * scale + 180);
  const groundY = height - 55;
  const bodyTopY = groundY - p.bodyHeightMm * scale;
  const bodyX = pad;
  const bodyWidth = (d.bodyFrontXmm - d.bodyRearXmm) * scale;
  const wheelRadius = (p.tireDiameterMm / 2) * scale;
  const xFor = (xMm: number) => pad + (xMm - d.bodyRearXmm) * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#081018"/>
  <g fill="none" stroke="#9fd4ff" stroke-width="2">
    <line x1="40" y1="${groundY}" x2="${width - 40}" y2="${groundY}" opacity=".45"/>
    <rect x="${bodyX}" y="${bodyTopY}" width="${bodyWidth}" height="${p.bodyHeightMm * scale}" rx="20"/>
    <line x1="${xFor(0)}" y1="${groundY - p.groundClearanceMm * scale}" x2="${xFor(d.frontAxleXmm)}" y2="${groundY - p.groundClearanceMm * scale}" stroke="#6ee7b7"/>
    <circle cx="${xFor(0)}" cy="${groundY - wheelRadius}" r="${wheelRadius}"/>
    <circle cx="${xFor(d.frontAxleXmm)}" cy="${groundY - wheelRadius}" r="${wheelRadius}" stroke="#f5b942"/>
    <line x1="${xFor(d.frontAxleXmm)}" y1="${groundY - wheelRadius}" x2="${xFor(d.frontAxleXmm)}" y2="${bodyTopY - 18}" stroke="#f5b942" stroke-dasharray="6 6"/>
  </g>
  <g fill="#dbeafe" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">
    <text x="${pad}" y="24">AutoBench — ${escapeXml(design.name)} — Rev ${design.revision}</text>
    <text x="${pad}" y="46">Wheelbase: ${(d.wheelbaseMm / 25.4).toFixed(1)} in | Front axle offset: ${d.frontAxleOffsetIn.toFixed(1)} in | Approach: ${d.approachAngleDeg.toFixed(1)}°</text>
    <text x="${pad}" y="${height - 18}">PREVIEW PROJECTION — assumptions remain until capture measurements are locked</text>
  </g>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    const table: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return table[char];
  });
}
