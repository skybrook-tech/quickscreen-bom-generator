import {
  GATE_DIAGRAM_COMPONENTS,
  gateDiagramTitle,
  type GateDiagramNumber,
} from "../../lib/gateDiagramMapping";
import { setGateDiagramHover, useGateDiagramHover } from "../../lib/gateDiagramHover";
import { NumberedBadge } from "../shared/NumberedBadge";

type GateOrientation = "horizontal" | "vertical";
type GateMovement = "single_swing" | "double_swing" | "sliding";

interface GateComponentListProps {
  orientation: GateOrientation;
  movement: GateMovement;
  slatSizeMm: number;
  slatGapMm: number;
  colourCode: string;
  hingeSku?: string;
  latchSku?: string;
}

function colourSuffix(colourCode: string) {
  return colourCode || "B";
}

function gapCode(gapMm: number) {
  return `${String(Math.round(gapMm)).padStart(2, "0")}MM`;
}

function componentCode({
  number,
  movement,
  slatSizeMm,
  slatGapMm,
  colourCode,
  hingeSku,
  latchSku,
}: GateComponentListProps & { number: GateDiagramNumber }) {
  const colour = colourSuffix(colourCode);
  const railSize = slatSizeMm >= 90 ? "90" : "65";

  switch (number) {
    case 1:
      return `QSG-4200-GSF50-${colour}`;
    case 2:
      return movement === "sliding"
        ? `QSG-S-6100-TR${railSize}-${colour}`
        : `QSG-4800-RAIL${railSize}-${colour}`;
    case 3:
      return slatSizeMm >= 90 ? `QS-6100-S90-${colour}` : `XP-6100-S65-${colour}`;
    case 4:
      return `QSG-${slatSizeMm >= 90 || movement === "sliding" ? "4800-INF" : "4200-CINF"}-${colour}`;
    case 5:
      return `QSG-4200-COVER-${colour}`;
    case 6:
      return `QSG-JOINER${railSize}-4PK`;
    case 7:
      return `QS-SPACER-${gapCode(slatGapMm)}-50PK`;
    case 8:
      return "AR-SCR-BR-50PK";
    case 9:
      return "QS-SCREWS-50PK";
    case 10:
      return `QSG-GFC-50X50-${colour}`;
    case 11:
      return movement === "sliding" ? "Not used for sliding gate" : hingeSku || "Gate hinges vary";
    case 12:
      return movement === "sliding" ? "Sliding catch / guide varies" : latchSku || "Gate latch varies";
    default:
      return "";
  }
}

export function GateComponentList(props: GateComponentListProps) {
  const hoveredNumber = useGateDiagramHover();
  const numbers = Object.keys(GATE_DIAGRAM_COMPONENTS).map(Number) as GateDiagramNumber[];
  const rows = props.movement === "sliding" ? numbers.filter((number) => number !== 11) : numbers;

  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-brand-text">Gate components</p>
          <p className="text-xs font-semibold text-brand-muted">
            Hover a number to match it to the BOM rows.
          </p>
        </div>
        <span className="rounded-full border border-brand-border bg-brand-bg px-2 py-1 text-[11px] font-black uppercase tracking-wide text-brand-muted">
          {props.orientation}
        </span>
      </div>
      <div className="divide-y divide-brand-border/60 overflow-hidden rounded-lg border border-brand-border/70">
        {rows.map((number) => {
          const active = hoveredNumber === number;
          return (
            <div
              key={number}
              onMouseEnter={() => setGateDiagramHover(number)}
              onMouseLeave={() => setGateDiagramHover(null)}
              className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-3 py-2 text-sm transition-colors sm:grid-cols-[auto_1fr_auto] ${
                active ? "bg-brand-warning/15" : "bg-brand-card hover:bg-brand-accent/5"
              }`}
              title={gateDiagramTitle(number)}
            >
              <NumberedBadge active={active}>{number}</NumberedBadge>
              <span className="font-bold text-brand-text">{GATE_DIAGRAM_COMPONENTS[number]}</span>
              <span className="col-start-2 font-mono text-xs font-bold text-brand-primary sm:col-start-auto">
                {componentCode({ ...props, number })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
