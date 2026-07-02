import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import { useCalculatorConfig } from "../../hooks/useCalculatorConfig";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { defaultGateVariables } from "../../lib/gateOptionRules";
import { defaultVariablesFromFields } from "../../hooks/useProductVariables";
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
import { ConfirmButton } from "../shared/ConfirmButton";
import { InlineHeightEditor } from "./InlineHeightEditor";
import { valueLabel } from "./SchemaDrivenForm";

const GATE_PRODUCT_CODE = "QS_GATE";
const RUN_SETTINGS_AUTO_COLLAPSE_MS = 60000;

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

// mounting_type has a legacy mounting_method alias written by some payloads —
// config only declares one field_key, so resolve both here rather than baking
// the alias into every future summary field.
function summaryVariableValue(fieldKey: string, vars: Record<string, unknown>) {
  if (fieldKey === "mounting_type") return vars.mounting_method ?? vars.mounting_type ?? "in_ground";
  return vars[fieldKey];
}

export function RunCard({ run, runIdx, autoOpenFirstSection = false, onAutoOpenConsumed }: Props) {
  const { state, dispatch } = useCalculator();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runSettingsOpen, setRunSettingsOpen] = useState(false);
  const [teachingDismissed, setTeachingDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(RUN_DEFAULTS_TEACHING_KEY) === "true",
  );
  const runCollapseRef = useRef<number | null>(null);

  // Prefetch/warm the shared TanStack cache (['calculator-config', productCode])
  // so RunSettingsEditor / FenceSegmentDetails / GateSegmentDetails have their
  // form field config ready the moment a section or run settings is expanded,
  // instead of a fetch firing (and forms flashing empty) on first expand.
  const config = useCalculatorConfig(run.productCode);
  const hasGateSegments = run.segments.some((segment) => segment.segmentKind === "gate_opening");
  useCalculatorConfig(hasGateSegments ? GATE_PRODUCT_CODE : "");
  const segmentDefaults = useMemo(
    () => defaultVariablesFromFields(config.formFields.segment),
    [config.formFields.segment],
  );

  const runVariables = useMemo(
    () => runMasterVariables(run, state.payload?.variables),
    [run, state.payload?.variables],
  );
  const jobMax = clampPostSpacing(
    runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode, config),
    maxPanelWidthForSystem(run.productCode, config),
  );
  const firstSegment = firstFenceSegment(run);
  const runLengthM = (calcTotalLength(run) / 1000).toFixed(2);
  const runHeight = Number(runVariables.target_height_mm ?? firstSegment?.targetHeightMm ?? 1800);
  const isBayg = run.productCode === "BAYG";
  const isPanelStrategy = config.strategy.fence === "panel";
  const summaryChips = useMemo(
    () =>
      [...config.formFields.job, ...config.formFields.run]
        .filter((field) => field.show_in_run_summary)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((field) => ({
          key: field.field_key,
          label: field.label,
          value: valueLabel(field, summaryVariableValue(field.field_key, runVariables)),
        })),
    [config.formFields.job, config.formFields.run, runVariables],
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
      variables: isBayg ? (segmentDefaults as Record<string, string | number | boolean>) : undefined,
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

  const sectionSegments = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
  const gateSegments = run.segments.filter((segment) => segment.segmentKind === "gate_opening");

  return (
    <div className="rounded-2xl border-2 border-brand-primary/50 bg-brand-card py-4 shadow-md">
      <div className="px-4 mb-3 flex flex-wrap items-start justify-between gap-3">
        <h3 className="grid min-w-0 flex-1 gap-1 text-brand-text">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
            <span className="text-xl font-extrabold tracking-normal">Run {runIdx + 1}</span>
            <span className="text-lg font-extrabold tracking-normal">{runLengthM}m</span>
            <span className="text-sm font-semibold text-brand-muted">
              {systemDisplayName(run.productCode)}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-brand-muted">
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
            {summaryChips.map((chip) => (
              <span key={chip.key}>
                {chip.label}: <strong className="text-brand-text">{isBayg && chip.key === "mounting_type" ? "Not required" : chip.value}</strong>
              </span>
            ))}
            <span>{isPanelStrategy ? "Max panel spacing" : "Max post spacing"}: <strong className="text-brand-text">{jobMax}mm</strong></span>
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
            {!isBayg && run.segments.some((segment) => segment.segmentKind === "gate_opening") && (
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
