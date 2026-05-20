import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronUp, Plus, Settings, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { defaultGateVariables } from "../../lib/gateOptionRules";
import {
  clampPostSpacing,
  maxPanelWidthForSystem,
} from "../../lib/productOptionRules";
import { Button } from "../shared/Button";
import { SegmentRow } from "./SegmentRow";
import { colourName } from "./ColourPalette";
import { RunSettingsEditor } from "./RunSettingsEditor";
import { RUN_DEFAULTS_TEACHING_KEY } from "../../lib/uiCopy";
import { ConfirmButton } from "../shared/ConfirmButton";

const GATE_PRODUCT_CODE = "QS_GATE";
const RUN_SETTINGS_AUTO_COLLAPSE_MS = 60000;

const MOUNTING_LABELS: Record<string, string> = {
  in_ground: "Concreted in ground",
  base_plate: "Base plated",
  core_drill: "Core drilled",
};

interface Props {
  run: CanonicalRun;
  runIdx: number;
  autoOpenFirstSection?: boolean;
  onAutoOpenConsumed?: () => void;
}

const calcTotalLength = (run: CanonicalRun) =>
  run.segments.reduce((acc, seg) => {
    const qty =
      run.productCode === "BAYG" && seg.segmentKind !== "gate_opening"
        ? Math.max(1, Math.round(Number(seg.variables?.panel_quantity ?? 1)))
        : 1;
    return acc + (seg.segmentWidthMm ?? 0) * qty;
  }, 0);

function firstFenceSegment(run: CanonicalRun) {
  return run.segments.find((segment) => segment.segmentKind !== "gate_opening");
}

function runMasterVariables(
  run: CanonicalRun,
  jobVariables: Record<string, string | number | boolean> | undefined,
) {
  return {
    ...(jobVariables ?? {}),
    ...(run.variables ?? {}),
  };
}

export function RunCard({ run, runIdx, autoOpenFirstSection = false, onAutoOpenConsumed }: Props) {
  const { state, dispatch } = useCalculator();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runSettingsOpen, setRunSettingsOpen] = useState(false);
  const [teachingDismissed, setTeachingDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(RUN_DEFAULTS_TEACHING_KEY) === "true",
  );
  const runCollapseRef = useRef<number | null>(null);

  const runVariables = useMemo(
    () => runMasterVariables(run, state.payload?.variables),
    [run, state.payload?.variables],
  );
  const jobMax = clampPostSpacing(
    runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode),
    maxPanelWidthForSystem(run.productCode),
  );
  const firstSegment = firstFenceSegment(run);
  const runLengthM = (calcTotalLength(run) / 1000).toFixed(2);
  const slatSize = Number(runVariables.slat_size_mm ?? 65);
  const slatGap = Number(runVariables.slat_gap_mm ?? 5);
  const mounting = String(runVariables.mounting_method ?? runVariables.mounting_type ?? "in_ground").replace(/_/g, " ");
  const isBayg = run.productCode === "BAYG";

  useEffect(
    () => () => {
      if (runCollapseRef.current) window.clearTimeout(runCollapseRef.current);
    },
    [],
  );

  useEffect(() => {
    if (runCollapseRef.current) window.clearTimeout(runCollapseRef.current);
    if (!runSettingsOpen) return;
    runCollapseRef.current = window.setTimeout(() => setRunSettingsOpen(false), RUN_SETTINGS_AUTO_COLLAPSE_MS);
  }, [runSettingsOpen]);

  useEffect(() => {
    if (!autoOpenFirstSection || !firstSegment) return;
    setRunSettingsOpen(false);
    setExpandedId(firstSegment.segmentId);
    onAutoOpenConsumed?.();
  }, [autoOpenFirstSection, firstSegment, onAutoOpenConsumed]);

  function dismissRunDefaultsTeaching() {
    setTeachingDismissed(true);
    window.localStorage.setItem(RUN_DEFAULTS_TEACHING_KEY, "true");
  }

  function keepRunSettingsOpen() {
    if (runCollapseRef.current) window.clearTimeout(runCollapseRef.current);
  }

  function scheduleRunSettingsCollapse() {
    if (runCollapseRef.current) window.clearTimeout(runCollapseRef.current);
    runCollapseRef.current = window.setTimeout(() => setRunSettingsOpen(false), RUN_SETTINGS_AUTO_COLLAPSE_MS);
  }

  function resetRunSettingsCollapse() {
    if (!runSettingsOpen) return;
    scheduleRunSettingsCollapse();
  }

  function upsertSegment(segment: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment });
  }

  function addFenceSegment() {
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      segmentKind: "panel",
      segmentWidthMm: 0,
      targetHeightMm: Number(runVariables.target_height_mm ?? 1800),
      variables: isBayg ? { panel_quantity: 1 } : undefined,
    });
  }

  function addGateSegment() {
    const masterVariables = runMasterVariables(run, state.payload?.variables);
    const targetHeight = Number(masterVariables.target_height_mm ?? 1800);
    const segmentId = crypto.randomUUID();
    upsertSegment({
      segmentId,
      sortOrder: run.segments.length + 1,
      segmentKind: "gate_opening",
      segmentWidthMm: 900,
      targetHeightMm: targetHeight,
      gateProductCode: GATE_PRODUCT_CODE,
      variables: defaultGateVariables({ ...masterVariables, productCode: run.productCode }, targetHeight),
    });
    setExpandedId(segmentId);
  }

  return (
    <div className="rounded-2xl border-2 border-brand-primary/20 bg-brand-card py-4 shadow-md">
      <div className="px-4 mb-3 flex flex-wrap items-start justify-between gap-3">
        <h3 className="grid gap-1 text-brand-text">
          <span className="text-xl font-extrabold leading-tight tracking-normal">
            Run {runIdx + 1} — {runLengthM}m
          </span>
          <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-brand-muted">
            <span>System Type: <strong className="text-brand-text">{run.productCode}</strong></span>
            <span>Color: <strong className="text-brand-text">{colourName(runVariables.colour_code)}</strong></span>
            <span>Slat size: <strong className="text-brand-text">{slatSize}mm</strong></span>
            <span>Gap size: <strong className="text-brand-text">{slatGap}mm</strong></span>
            <span>Post mounting: <strong className="text-brand-text">{isBayg ? "Not required" : MOUNTING_LABELS[mounting] ?? mounting}</strong></span>
            <span>Max post spacing: <strong className="text-brand-text">{jobMax}mm</strong></span>
            <span>Corners: <strong className="text-brand-text">{run.corners?.length ?? 0}</strong></span>
          </span>
        </h3>
        <div
          className="mb-3"
          onMouseEnter={keepRunSettingsOpen}
          onMouseLeave={scheduleRunSettingsCollapse}
        >
          <div className="flex justify-end">

            <button
              type="button"
              onClick={() =>
                setRunSettingsOpen((value) => {
                  const next = !value;
                  if (next) setExpandedId(null);
                  return next;
                })
              }
              className={`ml-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-extrabold transition-colors ${runSettingsOpen
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary"
                }`}
              aria-label={runSettingsOpen ? "Collapse run settings" : "Open run settings"}
              title={runSettingsOpen ? "Collapse run settings" : "Open run settings"}
            >
              {runSettingsOpen ? <ChevronUp size={16} /> : <Settings size={16} />}
            </button>
          </div>
        </div>
      </div>

      {runSettingsOpen && (
        <div
          onPointerDown={resetRunSettingsCollapse}
          onKeyDown={resetRunSettingsCollapse}
          onScroll={resetRunSettingsCollapse}
          onInput={resetRunSettingsCollapse}
          onChange={resetRunSettingsCollapse}
        >
          <RunSettingsEditor run={run} onCollapse={() => setRunSettingsOpen(false)} />
        </div>
      )}


      {!runSettingsOpen && (
        <>

          {run.segments.length === 0 && (
            <p className="px-4 mb-3 text-xs italic text-brand-muted">
              No sections yet. Draw on canvas or add manually.
            </p>
          )}

          <div className="px-4 space-y-2">
            {run.segments
              .filter((segment) => segment.segmentKind !== "gate_opening")
              .map((seg, segIdx) => (
                <SegmentRow
                  key={seg.segmentId}
                  runId={run.runId}
                  seg={seg}
                  segIdx={segIdx}
                  runIdx={runIdx}
                  displayLabel={`R${runIdx + 1}S${segIdx + 1}`}
                  open={expandedId === seg.segmentId}
                  showRunDefaultsTeaching={
                    expandedId === seg.segmentId &&
                    seg.segmentId === firstSegment?.segmentId &&
                    !teachingDismissed &&
                    !state.bomResult
                  }
                  onDismissRunDefaultsTeaching={dismissRunDefaultsTeaching}
                  onToggle={() =>
                    setExpandedId((id) => {
                      const next = id === seg.segmentId ? null : seg.segmentId;
                      if (id === seg.segmentId && seg.segmentId === firstSegment?.segmentId) {
                        dismissRunDefaultsTeaching();
                      }
                      return next;
                    })
                  }
                />
              ))}
            {!isBayg && run.segments.some((segment) => segment.segmentKind === "gate_opening") && (
              <div className="pt-2">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-muted">
                  <CheckCircle2 size={16} />
                  Gates
                </p>
                <div className="space-y-2">
                  {run.segments
                    .filter((segment) => segment.segmentKind === "gate_opening")
                    .map((seg, gateIdx) => (
                      <SegmentRow
                        key={seg.segmentId}
                        runId={run.runId}
                        seg={seg}
                        segIdx={gateIdx}
                        runIdx={runIdx}
                        displayLabel={`R${runIdx + 1}G${gateIdx + 1}`}
                        open={expandedId === seg.segmentId}
                        onToggle={() =>
                          setExpandedId((id) => (id === seg.segmentId ? null : seg.segmentId))
                        }
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-4 mt-3 flex flex-wrap justify-end gap-2">
            <Button onClick={addFenceSegment} icon={Plus} variant="ghost" size="small">
              {isBayg ? "Add panel size" : "Add section"}
            </Button>
            {!isBayg && (
              <Button onClick={addGateSegment} icon={Plus} variant="ghost" size="small">
                Add gate
              </Button>
            )}
            <ConfirmButton
              onConfirm={() => dispatch({ type: "REMOVE_RUN", runId: run.runId })}
              confirmLabel={<><Trash2 size={16} /> Click again to confirm</>}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-danger/30 px-3 py-1.5 text-xs font-semibold text-brand-danger transition-colors hover:bg-brand-danger/10"
            >
              <Trash2 size={16} />
              Remove run
            </ConfirmButton>
          </div>
        </>
      )}


    </div>
  );
}
