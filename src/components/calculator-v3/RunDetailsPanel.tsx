import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { calcRunStats } from "../../lib/runStats";
import { maxPanelWidthForSystem } from "../../lib/productOptionRules";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import { gateMovementOrDefault } from "../../lib/gateOptionRules";
import {
  COLOUR_DISPLAY_NAMES,
  GATE_DIRECTION_DISPLAY_NAMES,
  GATE_MOVEMENT_DISPLAY_NAMES,
  MOUNTING_DISPLAY_NAMES,
  SYSTEM_NAMES,
  TERMINATION_DISPLAY_NAMES,
  displayName,
} from "../../lib/displayNames";

interface RunDetailsPanelProps {
  payload: CanonicalPayload | null;
}

const PARENT_SECTION_KEY = "parent_section_id";

function mm(segment: CanonicalSegment) {
  return Number(segment.segmentWidthMm ?? 0);
}

function varsFor(run: CanonicalRun, payload: CanonicalPayload) {
  return { ...(payload.variables ?? {}), ...(run.variables ?? {}) };
}

function runLength(run: CanonicalRun) {
  return run.segments.reduce((sum, segment) => sum + mm(segment), 0);
}

function gateCountLabel(count: number) {
  if (count === 0) return "no gates";
  if (count === 1) return "1 gate";
  return `${count} gates`;
}

function gateLabel(segment: CanonicalSegment) {
  const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const direction = displayName(
    GATE_DIRECTION_DISPLAY_NAMES,
    segment.variables?.[GATE_SEGMENT_STUB_KEYS.openingDirection] ?? (movement === "sliding" ? "right" : "out"),
    "",
  );
  const hardware =
    segment.variables?.[GATE_SEGMENT_STUB_KEYS.hingeType] ??
    segment.variables?.[GATE_SEGMENT_STUB_KEYS.latchType] ??
    "default hardware";
  return `${displayName(GATE_MOVEMENT_DISPLAY_NAMES, movement)} - ${mm(segment)}mm - ${direction} - ${hardware}`;
}

function segmentOverrides(segment: CanonicalSegment, runVariables: Record<string, unknown>) {
  const vars = segment.variables ?? {};
  const checks = [
    ["system", segment.variables?.product_code, undefined],
    ["colour", vars.colour_code, runVariables.colour_code],
    ["slat size", vars.slat_size_mm, runVariables.slat_size_mm],
    ["gap", vars.slat_gap_mm, runVariables.slat_gap_mm],
    ["mounting", vars.mounting_type ?? vars.mounting_method, runVariables.mounting_type ?? runVariables.mounting_method],
  ] as const;
  return checks
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .filter(([, value, master]) => String(value) !== String(master ?? ""))
    .map(([label, value]) => `${label} ${value}${label.includes("size") || label === "gap" ? "mm" : ""}`);
}

function openRun(runId: string) {
  window.dispatchEvent(new CustomEvent("qsbom:open-run", { detail: runId }));
}

function openSegment(segmentId: string) {
  window.dispatchEvent(new CustomEvent("qsbom:open-segment", { detail: segmentId }));
}

export function RunDetailsPanel({ payload }: RunDetailsPanelProps) {
  if (!payload) return null;

  return (
    <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl border border-brand-border bg-brand-card p-3">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-brand-muted">
        Run details
      </h3>
      {payload.runs.map((run, runIdx) => {
        const runVariables = varsFor(run, payload);
        const stats = calcRunStats(
          run,
          Number(runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode)),
        );
        const fenceSegments = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
        const gates = run.segments.filter((segment) => segment.segmentKind === "gate_opening");

        return (
          <section key={run.runId} className="rounded-xl border border-brand-border/70 bg-brand-bg/45 p-3">
            <button
              type="button"
              className="w-full text-left text-sm font-black text-brand-text hover:text-brand-primary"
              onClick={() => openRun(run.runId)}
            >
              Run {runIdx + 1} - {(runLength(run) / 1000).toFixed(2)}m - {stats.panels} panel{stats.panels === 1 ? "" : "s"} - {gateCountLabel(gates.length)}
            </button>
            <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs font-semibold text-brand-muted sm:grid-cols-2">
              <div><dt className="inline">System: </dt><dd className="inline text-brand-text">{displayName(SYSTEM_NAMES, run.productCode)}</dd></div>
              <div><dt className="inline">Slat size: </dt><dd className="inline text-brand-text">{Number(runVariables.slat_size_mm ?? 65)}mm</dd></div>
              <div><dt className="inline">Gap: </dt><dd className="inline text-brand-text">{Number(runVariables.slat_gap_mm ?? 9)}mm</dd></div>
              <div><dt className="inline">Colour: </dt><dd className="inline text-brand-text">{displayName(COLOUR_DISPLAY_NAMES, runVariables.colour_code, "Black")}</dd></div>
              <div><dt className="inline">Mounting: </dt><dd className="inline text-brand-text">{displayName(MOUNTING_DISPLAY_NAMES, runVariables.mounting_type ?? runVariables.mounting_method, "Concreted in ground")}</dd></div>
              <div><dt className="inline">Termination L: </dt><dd className="inline text-brand-text">{displayName(TERMINATION_DISPLAY_NAMES, run.leftBoundary?.type, "Post")}</dd></div>
              <div><dt className="inline">Termination R: </dt><dd className="inline text-brand-text">{displayName(TERMINATION_DISPLAY_NAMES, run.rightBoundary?.type, "Post")}</dd></div>
              <div><dt className="inline">Corners: </dt><dd className="inline text-brand-text">{run.corners?.length ?? 0}</dd></div>
            </dl>
            <div className="mt-3 space-y-2">
              {fenceSegments.map((segment, sectionIdx) => {
                const linkedGates = gates.filter((gate) => gate.variables?.[PARENT_SECTION_KEY] === segment.segmentId);
                const maxWidth = Number(segment.variables?.max_panel_width_mm ?? runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode));
                const panelCount = mm(segment) > 0 ? Math.max(1, Math.ceil(mm(segment) / maxWidth)) : 0;
                const overrides = segmentOverrides(segment, runVariables);
                return (
                  <div key={segment.segmentId} className="rounded-lg border border-brand-border/50 bg-brand-card/70 p-2">
                    <button
                      type="button"
                      className="text-left text-xs font-black text-brand-text hover:text-brand-primary"
                      onClick={() => openSegment(segment.segmentId)}
                    >
                      Section {sectionIdx + 1} - {(mm(segment) / 1000).toFixed(2)}m - {Number(segment.targetHeightMm ?? 1800)}mm high - {panelCount} panel{panelCount === 1 ? "" : "s"} - {gateCountLabel(linkedGates.length)}
                    </button>
                    <p className="mt-1 text-xs font-semibold text-brand-muted">
                      {overrides.length ? `Overrides: ${overrides.join(", ")}` : "Same settings as run defaults"}
                    </p>
                    {linkedGates.map((gate) => (
                      <button
                        key={gate.segmentId}
                        type="button"
                        className="mt-1 block text-left text-xs font-bold text-brand-warning hover:text-brand-primary"
                        onClick={() => openSegment(gate.segmentId)}
                      >
                        {gateLabel(gate)}
                      </button>
                    ))}
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
