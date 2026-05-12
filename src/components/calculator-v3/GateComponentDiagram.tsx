import {
  GATE_DIAGRAM_COMPONENTS,
  gateDiagramTitle,
  type GateDiagramNumber,
} from "../../lib/gateDiagramMapping";
import { setGateDiagramHover, useGateDiagramHover } from "../../lib/gateDiagramHover";

type GateDiagramOrientation = "horizontal" | "vertical";

interface GateComponentDiagramProps {
  orientation: GateDiagramOrientation;
}

const HORIZONTAL_POINTS: Record<GateDiagramNumber, { x: number; y: number }> = {
  1: { x: 35, y: 92 },
  2: { x: 159, y: 48 },
  3: { x: 160, y: 128 },
  4: { x: 59, y: 92 },
  5: { x: 266, y: 56 },
  6: { x: 70, y: 62 },
  7: { x: 79, y: 111 },
  8: { x: 50, y: 70 },
  9: { x: 95, y: 118 },
  10: { x: 38, y: 34 },
  11: { x: 58, y: 152 },
  12: { x: 281, y: 126 },
};

const VERTICAL_POINTS: Record<GateDiagramNumber, { x: number; y: number }> = {
  1: { x: 35, y: 96 },
  2: { x: 165, y: 47 },
  3: { x: 164, y: 119 },
  4: { x: 61, y: 96 },
  5: { x: 267, y: 55 },
  6: { x: 76, y: 65 },
  7: { x: 95, y: 78 },
  8: { x: 111, y: 45 },
  9: { x: 140, y: 157 },
  10: { x: 42, y: 34 },
  11: { x: 58, y: 154 },
  12: { x: 282, y: 127 },
};

function Badge({
  number,
  point,
  active,
}: {
  number: GateDiagramNumber;
  point: { x: number; y: number };
  active: boolean;
}) {
  return (
    <g
      onMouseEnter={() => setGateDiagramHover(number)}
      onMouseLeave={() => setGateDiagramHover(null)}
      className="cursor-help"
      aria-label={gateDiagramTitle(number)}
    >
      <circle
        cx={point.x}
        cy={point.y}
        r={active ? 10 : 8}
        className={active ? "fill-brand-warning stroke-brand-primary" : "fill-brand-warning stroke-white"}
        strokeWidth={active ? 2.2 : 1.2}
      />
      <text
        x={point.x}
        y={point.y + 3.5}
        textAnchor="middle"
        className="select-none fill-brand-text text-[9px] font-black"
      >
        {number}
      </text>
    </g>
  );
}

export function GateComponentDiagram({ orientation }: GateComponentDiagramProps) {
  const hoveredNumber = useGateDiagramHover();
  const points = orientation === "vertical" ? VERTICAL_POINTS : HORIZONTAL_POINTS;
  const isVertical = orientation === "vertical";
  const slats = isVertical
    ? Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x={91 + i * 12} y="71" width="7" height="92" rx="1" className="fill-slate-600" />
      ))
    : Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x="84" y={70 + i * 8} width="154" height="5" rx="1" className="fill-slate-600" />
      ));

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-brand-text">Required components for this gate</p>
          <p className="text-xs font-semibold text-brand-muted">
            Hover a number to match it to the BOM rows.
          </p>
        </div>
        <span className="rounded-full border border-brand-border bg-brand-bg px-2 py-1 text-[11px] font-black uppercase tracking-wide text-brand-muted">
          {isVertical ? "Vertical" : "Horizontal"}
        </span>
      </div>
      <svg viewBox="0 0 320 190" role="img" aria-label={`${orientation} slat gate component diagram`} className="w-full">
        <rect x="9" y="8" width="302" height="174" rx="12" className="fill-brand-bg stroke-brand-border" />
        <rect x="46" y="43" width="14" height="122" rx="2" className="fill-slate-500" />
        <rect x="260" y="43" width="14" height="122" rx="2" className="fill-slate-500" />
        <rect x="74" y="47" width="172" height="14" rx="2" className="fill-slate-500" />
        <rect x="74" y="166" width="172" height="14" rx="2" className="fill-slate-500" />
        <rect x="81" y="64" width="158" height="98" rx="2" className="fill-slate-800 stroke-slate-400" />
        {slats}
        <rect x="63" y="42" width="5" height="124" rx="2" className="fill-slate-300" />
        <rect x="251" y="43" width="5" height="123" rx="2" className="fill-slate-300" />
        <rect x="38" y="31" width="30" height="7" rx="2" className="fill-slate-300" />
        <circle cx="54" cy="126" r="7" className="fill-slate-900 stroke-slate-300" />
        <circle cx="54" cy="153" r="7" className="fill-slate-900 stroke-slate-300" />
        <circle cx="282" cy="121" r="8" className="fill-slate-900 stroke-slate-300" />
        <path d="M282 113 h18 v22 h-18" className="fill-none stroke-slate-300" strokeWidth="4" />
        <g className="stroke-brand-muted/40" strokeWidth="1">
          {Object.entries(points).map(([number, point]) => (
            <line key={`leader-${number}`} x1={point.x} y1={point.y} x2={160} y2={96} />
          ))}
        </g>
        {(Object.keys(GATE_DIAGRAM_COMPONENTS) as unknown as GateDiagramNumber[]).map((number) => (
          <Badge
            key={number}
            number={number}
            point={points[number]}
            active={hoveredNumber === number}
          />
        ))}
      </svg>
    </div>
  );
}
