import { useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  DoorOpen,
  GitCompare,
  Trash2,
  RulerDimensionLine,
  Fence,
  GalleryHorizontalEnd,
} from "lucide-react";
import type { CanonicalSegment } from "../../../types/canonical.types";
import type { SegmentDiagnostic } from "../../../types/bom.types";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProductVariables } from "../../../hooks/useProductVariables";
import { useSegmentHeightOptions } from "../../../hooks/useSegmentHeightOptions";
import {
  computeSegmentRunSettingDeviations,
  formatDeviationLine,
} from "../../../lib/segmentRunDeviation";
import { cn } from "../../../lib";
import { CANVAS_GATE_STROKE } from "../../../lib/runLineColors";
import { Tooltip } from "../../ui/Tooltip";
import { InlineEdit } from "./InlineEdit";

const METRIC_ICON = 12;

interface Props {
  runId: string;
  seg: CanonicalSegment;
  /** e.g. S1, G1 — ordinals increment separately per segment kind */
  segmentLabel: string;
  open: boolean;
  onToggle: () => void;
  onLengthChange: (lengthMm: number) => void;
  onHeightChange: (heightMm: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  mergedVars: Record<string, string | number | boolean>;
  productCode: string | null;
  fenceAccentHex: string;
}

export function SegmentHeader({
  runId,
  seg,
  segmentLabel,
  open,
  onToggle,
  onLengthChange,
  onHeightChange,
  onDuplicate,
  onRemove,
  mergedVars,
  productCode,
  fenceAccentHex,
}: Props) {
  const { state, dispatch } = useCalculatorV4();
  const run = state.payload?.runs.find((r) => r.runId === runId);

  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");
  const { data: segmentFields = [] } = useProductVariables(
    productCode,
    "segment",
  );

  const variableLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of jobFields) m.set(f.field_key, f.label);
    for (const f of runFields) m.set(f.field_key, f.label);
    for (const f of segmentFields) m.set(f.field_key, f.label);
    return m;
  }, [jobFields, runFields, segmentFields]);

  const runSettingDeviations = useMemo(
    () =>
      computeSegmentRunSettingDeviations(
        state.payload?.productCode,
        state.payload?.variables ?? {},
        run,
        seg,
      ),
    [state.payload?.productCode, state.payload?.variables, run, seg],
  );

  const runDeviationLines = useMemo(
    () =>
      runSettingDeviations.map((d) =>
        formatDeviationLine(
          d,
          (k) => variableLabelByKey.get(k) ?? k.replace(/_/g, " "),
        ),
      ),
    [runSettingDeviations, variableLabelByKey],
  );

  const lengthM = (seg.segmentWidthMm ?? 0) / 1000;
  const isGate = seg.kind === "gate";
  const locked = seg.confirmed === true;

  const {
    freeform,
    freeformBounds,
    optionsMm: heightOptionsMm,
    clampFreeform,
  } = useSegmentHeightOptions(productCode, mergedVars, seg.targetHeightMm);

  const heightDisplayMm =
    seg.targetHeightMm ?? heightOptionsMm[0] ?? freeformBounds?.minMm ?? 1800;

  const segmentMetrics = useMemo(() => {
    if (seg.kind !== "fence") return null;
    const maxPanelMm = Number(mergedVars["max_panel_width_mm"] ?? 2600);
    const w = seg.segmentWidthMm ?? 0;
    const panels = Math.max(1, Math.ceil(w / maxPanelMm));
    let corners = 0;
    if (seg.leftTermination.kind === "system_corner") corners++;
    if (seg.rightTermination.kind === "system_corner") corners++;
    const posts = panels + 1;
    return { panels, corners, posts };
  }, [seg, mergedVars]);

  const diagnostics = useMemo(
    () =>
      (
        (state.bomResult?.segmentDiagnostics as
          | SegmentDiagnostic[]
          | undefined) ?? []
      ).filter((d) => d.segmentId === seg.segmentId),
    [state.bomResult, seg.segmentId],
  );

  const hasDiagError = diagnostics.some((d) => d.severity === "error");
  const hasDiagWarn =
    !hasDiagError && diagnostics.some((d) => d.severity === "warning");

  const accentColor = isGate ? CANVAS_GATE_STROKE : fenceAccentHex;

  function setConfirmed(checked: boolean) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: { ...seg, confirmed: checked },
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-3 py-2.5 cursor-pointer transition-opacity",
        locked ? "hover:opacity-95 text-white" : "hover:opacity-90",
      )}
      style={
        locked
          ? { backgroundColor: accentColor, color: "#ffffff" }
          : { color: accentColor }
      }
      onClick={() => onToggle()}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            "bg-transparent border-0 p-0 cursor-pointer",
            locked && "text-white",
          )}
          aria-label={open ? "Collapse segment" : "Expand segment"}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <span className="font-mono text-xs font-semibold min-w-[1.5rem] cursor-pointer tabular-nums">
          {segmentLabel}
        </span>

        <InlineEdit
          label="Segment length along run"
          icon={RulerDimensionLine}
          value={lengthM}
          suffix="m"
          displayValue={lengthM.toFixed(2)}
          onCommit={(v) => onLengthChange(v * 1000)}
          disabled={locked}
          onAccentSurface={locked}
        />
        <span
          className={cn(
            "opacity-60",
            locked ? "text-white/40" : "text-brand-border",
          )}
        >
          ·
        </span>
        <Tooltip content="Target fence height (above ground)">
          <span
            className="inline-flex items-center"
            onClick={(e) => e.stopPropagation()}
            aria-label="Fence height"
          >
            <InlineEdit
              label="Target fence height (above ground)"
              icon={RulerDimensionLine}
              extraIconClassName="opacity-90 rotate-90"
              value={heightDisplayMm}
              suffix="mm"
              displayValue={String(heightDisplayMm)}
              onCommit={(v) => onHeightChange(freeform ? clampFreeform(v) : v)}
              disabled={locked}
              onAccentSurface={locked}
              selectOptions={
                !freeform && heightOptionsMm.length > 0
                  ? heightOptionsMm
                  : undefined
              }
              boundedInput={
                freeform && freeformBounds
                  ? {
                      min: freeformBounds.minMm,
                      max: freeformBounds.maxMm,
                      step: 1,
                    }
                  : undefined
              }
            />
          </span>
        </Tooltip>

        <div
          className="flex items-center ml-auto gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {segmentMetrics && (
            <div className="flex items-center w-full justify-end gap-2 mr-0.5">
              <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Tooltip content="Panel bays in this segment (from span width ÷ max panel width)">
                  <span
                    className="inline-flex items-center gap-0.5 cursor-default text-xs tabular-nums"
                    aria-label={`Panels in this segment: ${segmentMetrics.panels}`}
                  >
                    <GalleryHorizontalEnd
                      size={METRIC_ICON}
                      className="shrink-0 opacity-90"
                      aria-hidden
                    />
                    <span className="font-mono">{segmentMetrics.panels}</span>
                    <span className="text-neutral-500 hidden sm:inline text-[11px]">
                      panels
                    </span>
                  </span>
                </Tooltip>
                <Tooltip content="Estimated posts for this segment (panel bays + ends)">
                  <span
                    className="inline-flex items-center gap-0.5 cursor-default text-xs tabular-nums"
                    aria-label={`Estimated posts for this segment: ${segmentMetrics.posts}`}
                  >
                    <Fence
                      size={METRIC_ICON}
                      className="shrink-0 opacity-90"
                      aria-hidden
                    />
                    <span className="font-mono">{segmentMetrics.posts}</span>
                    <span className="text-neutral-500 hidden sm:inline text-[11px]">
                      posts
                    </span>
                  </span>
                </Tooltip>
              </div>
            </div>
          )}

          {isGate && (
            <div className="flex items-center gap-0.5 mr-0.5">
              <span
                className={cn(
                  "opacity-60",
                  locked ? "text-white/40" : "text-brand-border",
                )}
              >
                ·
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium",
                  locked ? "bg-white/20 text-white" : "",
                )}
                style={
                  locked
                    ? undefined
                    : {
                        backgroundColor: "rgba(245, 158, 11, 0.2)",
                        color: "#78350f",
                      }
                }
              >
                <DoorOpen size={10} /> Gate
              </span>
            </div>
          )}

          {runDeviationLines.length > 0 && (
            <Tooltip
              content={
                <div className="max-w-xs space-y-2 text-left">
                  <p className="font-semibold text-xs text-brand-text">
                    Different from run defaults
                  </p>
                  <ul className="list-disc pl-4 text-xs space-y-1 text-brand-text">
                    {runDeviationLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              }
            >
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "p-1 rounded-md shrink-0",
                  locked
                    ? "text-amber-200 hover:text-amber-100 hover:bg-white/10"
                    : "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10",
                )}
                aria-label="Segment settings differ from run defaults"
              >
                <GitCompare size={15} />
              </button>
            </Tooltip>
          )}

          {hasDiagError && (
            <button
              type="button"
              title={diagnostics
                .filter((d) => d.severity === "error")
                .map((d) => d.message)
                .join(" | ")}
              onClick={onToggle}
              className={cn(
                "p-1",
                locked
                  ? "text-white hover:text-white/90"
                  : "text-red-500 hover:text-red-400",
              )}
              aria-label="Segment has BOM errors"
            >
              <AlertCircle size={15} />
            </button>
          )}
          {hasDiagWarn && (
            <button
              type="button"
              title={diagnostics
                .filter((d) => d.severity === "warning")
                .map((d) => d.message)
                .join(" | ")}
              onClick={onToggle}
              className={cn(
                "p-1",
                locked
                  ? "text-white hover:text-white/90"
                  : "text-amber-500 hover:text-amber-400",
              )}
              aria-label="Segment has BOM warnings"
            >
              <AlertTriangle size={15} />
            </button>
          )}

          <Tooltip content="Confirmed — dimensions treated as final for this segment; locks quick edits and stresses the row for install-ready handoff.">
            <label
              className="flex items-center gap-1.5 shrink-0 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setConfirmed(e.target.checked)}
                className={cn(
                  "rounded",
                  locked
                    ? "border-white/70 bg-white/10 accent-white"
                    : "border-brand-border",
                )}
                aria-label="Mark segment confirmed — lock dimensions"
                data-testid={`v4-seg-confirmed-${seg.segmentId}`}
              />
            </label>
          </Tooltip>
          <Tooltip content="Duplicate this segment (same length and settings)">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate segment"
            aria-label="Duplicate segment"
            disabled={locked}
            className={cn(
              "p-1.5 rounded disabled:opacity-40 disabled:pointer-events-none",
              locked
                ? "text-white hover:text-white hover:bg-white/15"
                : "text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10",
            )}
          >
            <Copy size={13} />
          </button>
          </Tooltip>
          <Tooltip content="Remove this segment from the run (layout map updates when segments are removed)">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove segment"
            aria-label="Remove segment"
            className={cn(
              "p-1.5 rounded",
              locked
                ? "text-white hover:text-red-500 hover:bg-red-500/25"
                : "hover:text-red-500 hover:bg-red-500/20",
            )}
          >
            <Trash2 size={13} />
          </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
