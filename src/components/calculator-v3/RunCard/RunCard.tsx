import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../../context/CalculatorContext";
import type { CanonicalRun, CanonicalSegment } from "../../../types/canonical.types";
import { defaultGateVariables } from "../../../lib/gateOptionRules";
import { defaultVariablesFromFields } from "../../../hooks/useProductVariables";
import { clampPostSpacing } from "../../../lib/productOptionRules";
import { runFields, segmentOnlyFields } from "../../../lib/runFieldOverrides";
import type { DerivedHeight } from "../../../lib/heights";
import {
  GATE_SEGMENT_STUB_KEYS,
  patchSegmentVariables,
} from "../../../lib/segmentTermination";
import { Button } from "../../shared/Button";
import { SegmentRow } from "./SegmentRow";
import { colourName } from "../ColourPalette";
import { RunCardSettings } from "./RunCardSettings";
import { RUN_DEFAULTS_TEACHING_KEY } from "../../../lib/uiCopy";
import { ConfirmButton } from "../../shared/ConfirmButton";
import { InlineHeightEditor } from "./InlineHeightEditor";
import { valueLabel } from "../SchemaDrivenForm";
import { InlineEdit } from "./InlineEdit";
import { useCalculatorConfig } from "../../../hooks/useCalculatorConfig";
import { useRunReconciliation } from "../../../hooks/useRunReconciliation";
import type { UiCalculatorConfig } from "../../../types/calculatorConfig.types";

const RUN_SETTINGS_AUTO_COLLAPSE_MS = 60000;

interface Props {
  run: CanonicalRun;
  runIdx: number;
  autoOpenFirstSection?: boolean;
  onAutoOpenConsumed?: () => void;
}

const calcTotalLength = (run: CanonicalRun, isPanelStrategy: boolean) =>
  run.segments.reduce((acc, seg) => {
    const qty =
      isPanelStrategy && seg.segmentKind !== "gate_opening"
        ? Math.max(1, Math.round(Number(seg.variables?.panel_quantity ?? 1)))
        : 1;
    return acc + (seg.segmentWidthMm ?? 0) * qty;
  }, 0);

function firstFenceSegment(run: CanonicalRun) {
  return run.segments.find((segment) => segment.segmentKind !== "gate_opening");
}

// mounting_type has a legacy mounting_method alias written by some payloads —
// config only declares one field_key, so resolve both here rather than baking
// the alias into every future summary field.
function summaryVariableValue(fieldKey: string, vars: Record<string, unknown>) {
  if (fieldKey === "mounting_type") return vars.mounting_method ?? vars.mounting_type ?? "in_ground";
  return vars[fieldKey];
}

function RunCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-brand-primary/50 bg-brand-card py-4 shadow-md">
      <div className="px-4 mb-3 h-20 animate-pulse rounded-lg bg-brand-bg/60" />
      <div className="px-4 mb-3 h-32 animate-pulse rounded-lg bg-brand-bg/60" />
    </div>
  );
}

function RunCardInner({
  run,
  runIdx,
  autoOpenFirstSection = false,
  onAutoOpenConsumed,
}: Omit<Props, "run"> & { run: CanonicalRun }) {
  const { state, dispatch } = useCalculator();
  const runVariables = useMemo<Record<string, string | number | boolean>>(
    () => ({ ...(run.variables ?? {}) }),
    [run],
  );
  const config = useCalculatorConfig(run.productCode, runVariables) as
    | UiCalculatorConfig
    | undefined;
  // Run-scoped cascade corrections (economy finish snap, etc.). Side-effect
  // only; never touches segment-level overrides.
  useRunReconciliation(run);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runSettingsOpen, setRunSettingsOpen] = useState(false);
  const [teachingDismissed, setTeachingDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(RUN_DEFAULTS_TEACHING_KEY) === "true",
  );
  const runCollapseRef = useRef<number | null>(null);
  const firstSegment = firstFenceSegment(run);
  const segmentDefaults = useMemo(
    () => defaultVariablesFromFields(config ? segmentOnlyFields(config) : []),
    [config],
  );

  const summaryChips = useMemo(
    () =>
      (config ? runFields(config) : [])
        .filter((field) => field.show_in_run_summary)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((field) => ({
          key: field.field_key,
          label: field.label,
          value: valueLabel(field, summaryVariableValue(field.field_key, runVariables), "Default", config?.colours.names),
        })),
    [config, runVariables],
  );

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

  if (!config) {
    return <RunCardSkeleton />;
  }

  const isPanelStrategy = config.strategy.fence === "panel";

  const jobMax = clampPostSpacing(
    runVariables.max_panel_width_mm ?? config.panelRules.maxPanelWidthMm,
    config.panelRules.maxPanelWidthMm,
  );
  const runLengthM = (calcTotalLength(run, config.strategy.fence === "panel") / 1000).toFixed(2);
  const runHeight = Number(runVariables.target_height_mm ?? firstSegment?.targetHeightMm ?? 1800);

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
      variables: isPanelStrategy ? (segmentDefaults as Record<string, string | number | boolean>) : undefined,
    });
  }

  function addGateSegment() {
    const targetHeight = Number(runVariables.target_height_mm ?? 1800);
    const segmentId = crypto.randomUUID();
    upsertSegment({
      segmentId,
      sortOrder: run.segments.length + 1,
      segmentKind: "gate_opening",
      segmentWidthMm: 900,
      targetHeightMm: targetHeight,
      gateProductCode: config!.gateRules.gateProductCode,
      variables: defaultGateVariables(
        { ...runVariables, gateDefaultInfill: config!.gateRules.defaultInfill },
        targetHeight,
      ),
    });
    setExpandedId(segmentId);
  }

  const sectionSegments = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
  const gateSegments = run.segments.filter((segment) => segment.segmentKind === "gate_opening");
  const gatesSupported = config.gateRules.supported;

  return (
    <div className="rounded-2xl border-2 border-brand-primary/50 bg-brand-card py-4 shadow-md">
      <div className="px-4 mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>

          <h3 className="grid min-w-0 flex-1 gap-1 text-brand-text">
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
              <span className="text-xl font-extrabold tracking-normal">Run {runIdx + 1}</span>
              <span className="text-lg text-brand-muted tracking-normal">Total length <span className="text-brand-text">{runLengthM}m</span></span>
            </span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-brand-muted">
              <span className="inline-flex items-center gap-1.5">
                Height: <strong className="text-brand-text">{runHeight}mm</strong>
              </span>
              <span>Color: <strong className="text-brand-text">{colourName(runVariables.colour_code, config?.colours.names)}</strong></span>
              {summaryChips.map((chip) => (
                <span key={chip.key}>
                  {chip.label}: <strong className="text-brand-text">{isPanelStrategy && chip.key === "mounting_type" ? "Not required" : chip.value}</strong>
                </span>
              ))}
              <span>{isPanelStrategy ? "Max panel spacing" : "Max post spacing"}: <strong className="text-brand-text">{jobMax}mm</strong></span>
              <span>Corners: <strong className="text-brand-text">{run.corners?.length ?? 0}</strong></span>
            </span>
          </h3>
        </div>
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
              className={`ml-auto mb-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors ${runSettingsOpen
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary"
                }`}
              aria-label={runSettingsOpen ? "Collapse run settings" : "Open run settings"}
              title={runSettingsOpen ? "Collapse run settings" : "Run settings"}
            >
              <span>Run Settings</span>
              {runSettingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
          <RunCardSettings run={run} onCollapse={() => setRunSettingsOpen(false)} />
        </div>
      )}


      {!runSettingsOpen && (
        <>

          {run.segments.length === 0 && (
            <p className="px-4 mb-3 text-xs italic text-brand-muted">
              No sections yet. Draw on canvas or add manually.
            </p>
          )}

          <div className="">
            {sectionSegments
              .map((seg, segIdx) => (
                <SegmentRow
                  isLastSegment={segIdx === sectionSegments.length - 1}
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
            {gatesSupported && run.segments.some((segment) => segment.segmentKind === "gate_opening") && (
              <div className="">
                <div className="px-4 bg-brand-accent/5">
                  <p className="py-2 flex items-center gap-2 text-sm font-bold text-brand-muted">
                    <CheckCircle2 size={16} />
                    Gates
                  </p>
                </div>
                <div className="space-y-2">
                  {gateSegments
                    .map((seg, gateIdx) => (
                      <SegmentRow
                        isLastSegment={gateIdx === gateSegments.length - 1}
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
              {isPanelStrategy ? "Add panel size" : "Add section"}
            </Button>
            {gatesSupported && (
              <Button onClick={addGateSegment} icon={Plus} variant="ghost" size="small">
                Add gate
              </Button>
            )}
            <ConfirmButton
              onConfirm={() => dispatch({ type: "REMOVE_RUN", runId: run.runId })}
              confirmLabel={<><Trash2 size={16} /> Click again to confirm</>}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-brand-danger/30 px-3 py-2 text-xs font-semibold text-brand-danger transition-colors hover:bg-brand-danger/10"
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

export function RunCard({ run, runIdx, autoOpenFirstSection = false, onAutoOpenConsumed }: Props) {
  return (
    <RunCardInner
      run={run}
      runIdx={runIdx}
      autoOpenFirstSection={autoOpenFirstSection}
      onAutoOpenConsumed={onAutoOpenConsumed}
    />
  );
}
