import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  GATE_DIAGRAM_DOTS,
  GATE_DIAGRAM_IMAGES,
  GATE_DIAGRAM_COMPONENTS,
  gateDiagramTitle,
  type GateDiagramOrientation,
  type GateDiagramNumber,
} from "../../lib/gateDiagramMapping";
import { setGateDiagramHover, useGateDiagramHover } from "../../lib/gateDiagramHover";
import { NumberedBadge } from "../shared/NumberedBadge";

type GateMovement = "single_swing" | "double_swing" | "sliding";

interface GateComponentListProps {
  orientation: GateDiagramOrientation;
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

function GateComponentDiagram({
  orientation,
  activeNumber,
  visibleNumbers,
}: {
  orientation: GateDiagramOrientation;
  activeNumber: GateDiagramNumber | null;
  visibleNumbers: readonly GateDiagramNumber[];
}) {
  const image = GATE_DIAGRAM_IMAGES[orientation];
  const visibleNumberSet = new Set<GateDiagramNumber>(visibleNumbers);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-brand-border/70 bg-white">
      <div className="relative mx-auto max-w-[420px]">
        <img
          src={image.src}
          alt={image.alt}
          className="block h-auto w-full select-none"
          draggable={false}
        />
        {GATE_DIAGRAM_DOTS[orientation]
          .filter((dot) => visibleNumberSet.has(dot.number))
          .map((dot, index) => {
            const active = activeNumber === dot.number;
            return (
              <button
                key={`${dot.number}-${index}`}
                type="button"
                aria-label={gateDiagramTitle(dot.number)}
                data-testid={`gate-diagram-dot-${dot.number}`}
                title={gateDiagramTitle(dot.number)}
                onMouseEnter={() => setGateDiagramHover(dot.number)}
                onMouseLeave={() => setGateDiagramHover(null)}
                onFocus={() => setGateDiagramHover(dot.number)}
                onBlur={() => setGateDiagramHover(null)}
                className={`absolute z-10 inline-flex h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand-warning px-1 text-[11px] font-black leading-none text-slate-950 shadow-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 ${
                  active
                    ? "scale-125 ring-4 ring-brand-primary/35"
                    : "hover:scale-110"
                }`}
                style={{ left: `${dot.xPct}%`, top: `${dot.yPct}%` }}
              >
                {dot.number}
              </button>
            );
          })}
      </div>
    </div>
  );
}

export function GateComponentList(props: GateComponentListProps) {
  const hoveredNumber = useGateDiagramHover();
  const rows = useMemo(() => {
    const numbers = Object.keys(GATE_DIAGRAM_COMPONENTS).map(Number) as GateDiagramNumber[];
    return props.movement === "sliding" ? numbers.filter((number) => number !== 11) : numbers;
  }, [props.movement]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<GateDiagramNumber, HTMLDivElement>());

  const setRowRef = useCallback(
    (number: GateDiagramNumber) => (node: HTMLDivElement | null) => {
      if (node) rowRefs.current.set(number, node);
      else rowRefs.current.delete(number);
    },
    [],
  );

  const updateActiveFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    let closestNumber: GateDiagramNumber | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const number of rows) {
      const row = rowRefs.current.get(number);
      if (!row) continue;
      const rowRect = row.getBoundingClientRect();
      const visibleHeight =
        Math.min(rowRect.bottom, containerRect.bottom) -
        Math.max(rowRect.top, containerRect.top);
      if (visibleHeight <= 0) continue;

      const rowCenter = rowRect.top + rowRect.height / 2;
      const distance = Math.abs(rowCenter - containerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNumber = number;
      }
    }

    if (closestNumber !== null) setGateDiagramHover(closestNumber);
  }, [rows]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrame = 0;
    const handleScroll = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveFromScroll);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [updateActiveFromScroll]);

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
      <div
        ref={scrollContainerRef}
        data-testid="gate-component-checklist"
        className="max-h-72 divide-y divide-brand-border/60 overflow-y-auto rounded-lg border border-brand-border/70"
      >
        {rows.map((number) => {
          const active = hoveredNumber === number;
          return (
            <div
              key={number}
              ref={setRowRef(number)}
              data-testid={`gate-component-row-${number}`}
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
      <GateComponentDiagram
        orientation={props.orientation}
        activeNumber={hoveredNumber}
        visibleNumbers={rows}
      />
    </div>
  );
}
