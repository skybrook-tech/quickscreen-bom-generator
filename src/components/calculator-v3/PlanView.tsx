import { DoorOpen } from "lucide-react";
import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import { gateMovementOrDefault } from "../../lib/gateOptionRules";

interface PlanViewProps {
  payload: CanonicalPayload | null;
}

function segmentWidth(segment: CanonicalSegment) {
  return Math.max(0, Number(segment.segmentWidthMm ?? 0));
}

function runLength(run: CanonicalRun) {
  return run.segments.reduce((sum, segment) => sum + segmentWidth(segment), 0);
}

function movementLabel(segment: CanonicalSegment) {
  const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  if (movement === "double_swing") return "Double gate";
  if (movement === "sliding") return "Sliding gate";
  return "Single gate";
}

function planSegments(run: CanonicalRun) {
  const total = Math.max(1, runLength(run));
  return run.segments
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((segment) => ({
      segment,
      basis: Math.max(7, (segmentWidth(segment) / total) * 100),
    }));
}

export function PlanView({ payload }: PlanViewProps) {
  if (!payload || payload.runs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-border bg-brand-bg/50 p-6 text-center text-sm font-bold text-brand-muted">
        Start a run from the sidebar or draw on the Map tab to build the plan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payload.runs.map((run, runIdx) => {
        const sorted = planSegments(run);
        const lengthM = runLength(run) / 1000;
        const gates = run.segments.filter((segment) => segment.segmentKind === "gate_opening");
        return (
          <section
            key={run.runId}
            className="rounded-2xl border border-brand-border bg-brand-card p-4"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-black text-brand-text">
                Run {runIdx + 1} — {lengthM.toFixed(2)}m
              </h3>
              <p className="text-xs font-bold text-brand-muted">
                {run.productCode} · {run.segments.filter((s) => s.segmentKind !== "gate_opening").length} sections
                {gates.length ? ` · ${gates.length} gates` : ""}
              </p>
            </div>
            <div className="flex min-h-24 overflow-hidden rounded-xl border border-brand-border bg-brand-bg">
              {sorted.map(({ segment, basis }, index) => {
                const isGate = segment.segmentKind === "gate_opening";
                const label = isGate
                  ? `G${gates.findIndex((gate) => gate.segmentId === segment.segmentId) + 1}`
                  : `S${run.segments.filter((s) => s.segmentKind !== "gate_opening").findIndex((item) => item.segmentId === segment.segmentId) + 1}`;
                return (
                  <div
                    key={segment.segmentId}
                    className={`relative flex min-w-[4.25rem] flex-col items-center justify-center border-r border-brand-border/70 px-2 py-3 text-center last:border-r-0 ${
                      isGate ? "bg-brand-warning/15" : index % 2 ? "bg-brand-card/70" : "bg-brand-card"
                    }`}
                    style={{ flexBasis: `${basis}%` }}
                    title={`${label} ${segmentWidth(segment)}mm`}
                  >
                    {isGate && <DoorOpen size={20} className="mb-1 text-brand-warning" />}
                    <span className="font-mono text-sm font-black text-brand-text">{label}</span>
                    <span className="mt-1 text-xs font-bold text-brand-muted">
                      {isGate ? movementLabel(segment) : "Section"}
                    </span>
                    <span className="mt-1 font-mono text-xs font-black text-brand-primary">
                      {segmentWidth(segment)}mm
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
