import { useState } from "react";
import { PenTool } from "lucide-react";
import type { CanvasLayout } from "./canvasEngine";

interface LayoutMinimapProps {
  layout: CanvasLayout;
}

const PAD = 24; // SVG-unit padding around the drawing

function fmtLength(mm: number): string {
  return mm >= 1000
    ? `${(mm / 1000).toFixed(2)}m`
    : `${Math.round(mm)}mm`;
}

export function LayoutMinimap({ layout }: LayoutMinimapProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (layout.segments.length === 0) return null;

  // Bounding box of all segment endpoints
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const seg of layout.segments) {
    minX = Math.min(minX, seg.startX, seg.endX);
    minY = Math.min(minY, seg.startY, seg.endY);
    maxX = Math.max(maxX, seg.startX, seg.endX);
    maxY = Math.max(maxY, seg.startY, seg.endY);
  }

  const dataW = Math.max(maxX - minX, 1);
  const dataH = Math.max(maxY - minY, 1);
  const vbW = dataW + PAD * 2;
  const vbH = dataH + PAD * 2;

  const tx = (x: number) => x - minX + PAD;
  const ty = (y: number) => y - minY + PAD;

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-brand-border flex items-center gap-2">
        <PenTool size={12} className="text-brand-muted" />
        <span className="text-xs font-medium text-brand-muted">Layout</span>
      </div>

      {/* SVG minimap */}
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full"
        style={{ height: "220px", display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background fill to respect theme */}
        <rect
          x={0} y={0}
          width={vbW} height={vbH}
          fill="var(--brand-bg)"
        />

        {/* Gate markers — rendered below segments */}
        {layout.gates.map((gate, idx) => {
          const seg = layout.segments[gate.segmentIndex];
          if (!seg) return null;
          const gx = tx(seg.startX + (seg.endX - seg.startX) * gate.positionOnSegment);
          const gy = ty(seg.startY + (seg.endY - seg.startY) * gate.positionOnSegment);
          return (
            <rect
              key={idx}
              x={gx - 5} y={gy - 5}
              width={10} height={10}
              rx={2}
              fill="var(--brand-accent)"
              opacity={0.8}
            />
          );
        })}

        {/* Segments */}
        {layout.segments.map((seg, idx) => {
          const isHovered = hoveredIdx === idx;
          const x1 = tx(seg.startX), y1 = ty(seg.startY);
          const x2 = tx(seg.endX),   y2 = ty(seg.endY);
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          // Clamp tooltip so it doesn't clip at edges
          const tipW = 64, tipH = 22;
          const tipX = Math.min(Math.max(midX - tipW / 2, 2), vbW - tipW - 2);
          const tipY = midY < vbH / 2
            ? midY + 8       // tooltip below midpoint
            : midY - tipH - 8; // tooltip above midpoint

          const label = fmtLength(seg.lengthMM);

          return (
            <g key={idx}>
              {/* Wide invisible hit area */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="transparent"
                strokeWidth={14}
                style={{ cursor: "default" }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* Visible line */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isHovered ? "var(--brand-accent)" : "var(--brand-muted)"}
                strokeWidth={isHovered ? 3 : 2}
                strokeLinecap="round"
                pointerEvents="none"
              />
              {/* Endpoint dots */}
              <circle cx={x1} cy={y1} r={3} fill="var(--brand-muted)" pointerEvents="none" />
              <circle cx={x2} cy={y2} r={3} fill="var(--brand-muted)" pointerEvents="none" />

              {/* Hover tooltip */}
              {isHovered && (
                <g pointerEvents="none">
                  <rect
                    x={tipX} y={tipY}
                    width={tipW} height={tipH}
                    rx={4}
                    fill="var(--brand-card)"
                    stroke="var(--brand-accent)"
                    strokeWidth={1}
                  />
                  <text
                    x={tipX + tipW / 2}
                    y={tipY + tipH / 2 + 4}
                    textAnchor="middle"
                    fill="var(--brand-text)"
                    fontSize={11}
                    fontFamily="ui-monospace, monospace"
                    fontWeight={600}
                  >
                    {label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Total */}
      <div className="px-3 py-2 border-t border-brand-border flex items-center justify-between">
        <span className="text-xs text-brand-muted">Total run</span>
        <span className="text-xs font-semibold text-brand-text tabular-nums">
          {layout.totalLengthM.toFixed(2)}m
        </span>
      </div>
    </div>
  );
}
