import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import type { SegmentDiagnostic } from "../../types/bom.types";
import { Settings2, AlertCircle, AlertTriangle } from "lucide-react";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";
import NumberInput from "../ui/NumberInput";
import { Badge } from "../ui/Badge";
import { AchievedHeightBadge } from "./AchievedHeightBadge";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  open: boolean;
  onToggle: () => void;
}

export function SegmentRow({ runId, seg, segIdx, open, onToggle }: Props) {
  const { state, dispatch } = useCalculator();
  const gate = seg.kind === "gate";

  const segDiagnostics = (
    (state.bomResult?.segmentDiagnostics as SegmentDiagnostic[] | undefined) ??
    []
  ).filter((d) => d.segmentId === seg.segmentId);

  const hasError = segDiagnostics.some((d) => d.severity === "error");
  const hasWarning =
    !hasError && segDiagnostics.some((d) => d.severity === "warning");

  const jobMax = Number(state.payload?.variables.max_panel_width_mm ?? 2600);
  const effectiveMax = Number(seg.variables?.max_panel_width_mm ?? jobMax);
  const panelsLive = seg.segmentWidthMm
    ? Math.ceil(seg.segmentWidthMm / effectiveMax)
    : 0;

  function updateGeometry(
    key: "segmentWidthMm" | "targetHeightMm",
    value: number,
  ) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: { ...seg, [key]: value },
    });
  }

  return (
    <div className="rounded border border-brand-border/50 bg-brand-bg text-xs overflow-hidden">
      <div className="flex gap-2 items-center p-2">
        <span className="text-brand-muted w-8 shrink-0">#{segIdx + 1}</span>
        <Badge
          variant={gate ? "warning" : "info"}
          className="w-[65px] justify-center rounded uppercase tracking-wide text-[10px] shrink-0"
        >
          {gate ? "Gate" : "Segment"}
        </Badge>
        <div>
          <div className="flex items-center gap-1">
            <label className="text-brand-muted shrink-0">Segment width:</label>
            <NumberInput
              value={parseFloat(((seg.segmentWidthMm ?? 0) / 1000).toFixed(2))}
              step={0.01}
              min={0.3}
              onChange={(v) =>
                updateGeometry("segmentWidthMm", Math.round(Number(v) * 1000))
              }
            />
            <span className="text-brand-muted">m</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <label className="text-brand-muted shrink-0">Target height:</label>
            <NumberInput
              value={seg.targetHeightMm ?? 1800}
              onChange={(v) => updateGeometry("targetHeightMm", Number(v))}
            />
            <span className="text-brand-muted">mm</span>
          </div>
        </div>

        {!gate && seg.segmentWidthMm ? (
          <span className="text-[10px] text-brand-muted">
            × {panelsLive} {panelsLive === 1 ? "panel" : "panels"}
          </span>
        ) : null}
        {!gate && !!state.bomResult?.computed && (
          <AchievedHeightBadge
            computed={
              state.bomResult.computed as Record<
                string,
                Record<string, unknown>
              >
            }
            runId={runId}
            segmentId={seg.segmentId}
            targetHeightMm={seg.targetHeightMm}
          />
        )}
        <div className="flex items-center gap-1 ml-auto">
          {hasError && (
            <button
              type="button"
              onClick={onToggle}
              title={segDiagnostics
                .filter((d) => d.severity === "error")
                .map((d) => d.message)
                .join(" | ")}
              className="text-red-400 hover:text-red-300"
              aria-label="Segment has errors"
            >
              <AlertCircle size={15} />
            </button>
          )}
          {hasWarning && (
            <button
              type="button"
              onClick={onToggle}
              title={segDiagnostics
                .filter((d) => d.severity === "warning")
                .map((d) => d.message)
                .join(" | ")}
              className="text-amber-400 hover:text-amber-300"
              aria-label="Segment has warnings"
            >
              <AlertTriangle size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="ml-1 p-1 rounded text-brand-muted hover:text-brand-text hover:bg-brand-border/50"
            aria-expanded={open}
            aria-label={open ? "Collapse details" : "Expand details"}
          >
            <Settings2
              size={16}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: "REMOVE_SEGMENT",
                runId,
                segmentId: seg.segmentId,
              })
            }
            className="ml-auto text-red-400 hover:text-red-300 text-xs p-1"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-brand-border/50 p-3 space-y-4 bg-brand-card/40">
          {gate ? (
            <GateSegmentDetails
              runId={runId}
              seg={seg}
              diagnostics={segDiagnostics}
            />
          ) : (
            <FenceSegmentDetails
              runId={runId}
              seg={seg}
              diagnostics={segDiagnostics}
            />
          )}
        </div>
      )}
    </div>
  );
}
