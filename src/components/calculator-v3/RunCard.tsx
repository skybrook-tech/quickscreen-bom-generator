import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { defaultGateVariables } from "../../lib/gateOptionRules";
import {
  clampPostSpacing,
  maxPanelWidthForSystem,
} from "../../lib/productOptionRules";
import type { DerivedHeight } from "../../lib/heights";
import {
  GATE_SEGMENT_STUB_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import { systemDisplayName } from "../../lib/systemDisplay";
import { Button } from "../shared/Button";
import { SegmentRow } from "./SegmentRow";
import { colourName } from "./ColourPalette";
import { RunSettingsEditor } from "./RunSettingsEditor";
import { RUN_DEFAULTS_TEACHING_KEY } from "../../lib/uiCopy";
import { InlineHeightEditor } from "./InlineHeightEditor";

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
  const [removeRunDialogOpen, setRemoveRunDialogOpen] = useState(false);
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
  const runHeight = Number(runVariables.target_height_mm ?? firstSegment?.targetHeightMm ?? 1800);
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

  function segmentInheritsRunHeight(segment: CanonicalSegment) {
    const segmentHeight = Number(segment.targetHeightMm ?? runHeight);
    const variables = segment.variables ?? {};
    const hasHeightOverride =
      variables.target_height_mm != null ||
      variables.slat_count != null ||
      variables[GATE_SEGMENT_STUB_KEYS.gateHeightMm] != null;
    return !hasHeightOverride || segmentHeight === runHeight;
  }

  function updateRunHeight(heightMm: number, entry?: DerivedHeight) {
    const nextVariables: CanonicalRun["variables"] = {
      ...(run.variables ?? {}),
      target_height_mm: heightMm,
    };
    if (entry) nextVariables.slat_count = entry.N;
    else delete nextVariables.slat_count;

    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        variables: nextVariables,
        segments: run.segments.map((segment) => {
          if (!segmentInheritsRunHeight(segment)) return segment;
          const cleared = patchSegmentVariables(segment, {
            target_height_mm: null,
            slat_count: null,
            [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: null,
          });
          return {
            ...cleared,
            targetHeightMm: heightMm,
          };
        }),
      },
    });
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
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4">
        <h3 className="grid min-w-0 gap-1 text-brand-text">
          <span className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-center leading-tight">
            <span className="text-xl font-extrabold tracking-normal">Run {runIdx + 1}</span>
            <span className="text-lg font-extrabold tracking-normal">{runLengthM}m</span>
            <span className="whitespace-nowrap text-xl font-extrabold tracking-normal text-brand-text [font-family:'Playfair_Display',serif]">
              {systemDisplayName(run.productCode)}
            </span>
          </span>
          <span className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm text-brand-muted">
            <span className="inline-flex items-center gap-1.5">
              Height:
              <InlineHeightEditor
                productCode={run.productCode}
                variables={runVariables}
                valueMm={runHeight}
                ariaLabel={`Run ${runIdx + 1} default height`}
                onChange={updateRunHeight}
              />
            </span>
            <span>Color: <strong className="text-brand-text">{colourName(runVariables.colour_code)}</strong></span>
            <span>Slat size: <strong className="text-brand-text">{slatSize}mm</strong></span>
            <span>Gap size: <strong className="text-brand-text">{slatGap}mm</strong></span>
            <span>Post mounting: <strong className="text-brand-text">{isBayg ? "Not required" : MOUNTING_LABELS[mounting] ?? mounting}</strong></span>
            <span>Max post spacing: <strong className="text-brand-text">{jobMax}mm</strong></span>
            <span>Corners: <strong className="text-brand-text">{run.corners?.length ?? 0}</strong></span>
          </span>
        </h3>
        <div
          className="mb-3 flex flex-col items-end gap-2"
          onMouseEnter={keepRunSettingsOpen}
          onMouseLeave={scheduleRunSettingsCollapse}
        >
          <button
            type="button"
            onClick={() =>
              setRunSettingsOpen((value) => {
                const next = !value;
                if (next) setExpandedId(null);
                return next;
              })
            }
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors ${runSettingsOpen
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary"
              }`}
            aria-label={runSettingsOpen ? "Collapse run settings" : "Open run settings"}
            title={runSettingsOpen ? "Collapse run settings" : "Run settings"}
          >
            <span>Run Settings</span>
            {runSettingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            type="button"
            onClick={() => setRemoveRunDialogOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-danger transition-colors hover:bg-brand-danger/10 hover:text-brand-danger/90"
            aria-label={`Remove run ${runIdx + 1}`}
            title="Remove run"
          >
            <X size={20} strokeWidth={3} />
          </button>
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
              <div className="space-y-2 pt-2">
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
            )}
          </div>

          <div className="px-4 mt-3 flex flex-wrap justify-end gap-2">
            <Button
              onClick={addFenceSegment}
              icon={Plus}
              variant="ghost"
              size="small"
              className="border-blue-800 bg-blue-800 text-white hover:bg-blue-700"
            >
              {isBayg ? "Add Panel Size" : "Add Section"}
            </Button>
            {!isBayg && (
              <Button
                onClick={addGateSegment}
                icon={Plus}
                variant="ghost"
                size="small"
                className="border-blue-800 bg-blue-800 text-white hover:bg-blue-700"
              >
                Add Gate
              </Button>
            )}
          </div>
        </>
      )}

      {removeRunDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Remove this run?"
          onClick={() => setRemoveRunDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-black text-brand-text">Remove this run?</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-brand-muted">
              This will delete the entire run and all its sections and gates. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveRunDialogOpen(false)}
                className="rounded-lg border border-brand-border px-4 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemoveRunDialogOpen(false);
                  dispatch({ type: "REMOVE_RUN", runId: run.runId });
                }}
                className="rounded-lg bg-brand-danger px-4 py-2 text-sm font-black text-white transition-colors hover:bg-brand-danger/90"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
