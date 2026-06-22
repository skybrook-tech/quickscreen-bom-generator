import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
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
import { ConfirmButton } from "../shared/ConfirmButton";
import { InlineHeightEditor } from "./InlineHeightEditor";
import { useProfile } from "../../context/ProfileContext";
import { useProducts } from "../../hooks/useProducts";
import { getCustomCalculators, isCustomCalculator, findHeightVariableKey } from "../../lib/customCalculators";

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
  const { isAdmin } = useProfile();
  const { data: products } = useProducts();
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
  const runHeight = Number(runVariables.target_height_mm ?? firstSegment?.targetHeightMm ?? 1800);
  const slatSize = Number(runVariables.slat_size_mm ?? 65);
  const slatGap = Number(runVariables.slat_gap_mm ?? 5);
  const mounting = String(runVariables.mounting_method ?? runVariables.mounting_type ?? "in_ground").replace(/_/g, " ");
  const isBayg = run.productCode === "BAYG";
  const product = products?.find((p) => p.system_type === run.productCode);

  const customCalcs = useMemo(() => getCustomCalculators(), []);
  const isCustom = isCustomCalculator(run.productCode);
  const customCalc = isCustom ? customCalcs.find(c => c.id === run.productCode) : null;

  const hasColor = !isCustom || customCalc?.variables.some(v => ["color", "colour_code", "colour"].includes(v.field_key));
  const hasSlatSize = !isCustom || customCalc?.variables.some(v => ["slat_size_mm", "slat_size"].includes(v.field_key));
  const hasGapSize = !isCustom || customCalc?.variables.some(v => ["slat_gap_mm", "gap_size", "gap"].includes(v.field_key));
  const hasMounting = (!isCustom && run.productCode !== "BAYG") || (isCustom && customCalc?.variables.some(v => ["mounting_method", "mounting_type", "mounting"].includes(v.field_key)));
  const hasMaxSpacing = (!isCustom && run.productCode !== "BAYG") || (isCustom && customCalc?.variables.some(v => ["max_panel_width_mm", "max_post_spacing", "post_spacing"].includes(v.field_key)));

  const customFieldsToRender = useMemo(() => {
    if (!customCalc) return [];
    const standardKeys = new Set([
      "target_height_mm", "paling_height", "height", "paling_height_mm",
      "color", "colour_code", "colour",
      "slat_size_mm", "slat_size",
      "slat_gap_mm", "gap_size", "gap",
      "mounting_method", "mounting_type", "mounting",
      "max_panel_width_mm", "max_post_spacing", "post_spacing"
    ]);
    return customCalc.variables.filter(v => !standardKeys.has(v.field_key));
  }, [customCalc]);

  function getVariableValue(field_key: string, defaultValue: any) {
    const val = runVariables[field_key] ?? defaultValue;
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  }

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
    const heightKey = isCustom
      ? (findHeightVariableKey(customCalc?.variables ?? []) ?? "target_height_mm")
      : "target_height_mm";

    const nextVariables: CanonicalRun["variables"] = {
      ...(run.variables ?? {}),
      target_height_mm: heightMm,
    };
    if (isCustom && heightKey && heightKey !== "target_height_mm") {
      nextVariables[heightKey] = String(heightMm);
    }
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
            [heightKey]: null,
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
            {hasColor && (
              <span>Color: <strong className="text-brand-text">{colourName(String(runVariables.colour_code ?? runVariables.color ?? runVariables.colour ?? "B"))}</strong></span>
            )}
            {hasSlatSize && (
              <span>Slat size: <strong className="text-brand-text">{slatSize}mm</strong></span>
            )}
            {hasGapSize && (
              <span>Gap size: <strong className="text-brand-text">{runVariables.slat_gap_mm ?? runVariables.gap_size ?? runVariables.gap ?? slatGap}mm</strong></span>
            )}
            {hasMounting && (
              <span>Post mounting: <strong className="text-brand-text">{isBayg ? "Not required" : MOUNTING_LABELS[mounting] ?? mounting}</strong></span>
            )}
            {hasMaxSpacing && (
              <span>Max post spacing: <strong className="text-brand-text">{jobMax}mm</strong></span>
            )}
            {customFieldsToRender.map((v) => (
              <span key={v.field_key}>
                {v.label}: <strong className="text-brand-text">{getVariableValue(v.field_key, v.default_value_json)}</strong>
              </span>
            ))}
            <span>Corners: <strong className="text-brand-text">{run.corners?.length ?? 0}</strong></span>
          </span>
        </h3>
        <div
          className="mb-3"
          onMouseEnter={keepRunSettingsOpen}
          onMouseLeave={scheduleRunSettingsCollapse}
        >
          <div className="flex justify-end">
            {isAdmin && product && (
              <a
                href={`/admin/products/${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 mr-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-xs font-extrabold text-brand-muted hover:border-brand-primary hover:text-brand-primary transition-colors"
                title="Edit calculator logic / rules"
              >
                Edit Calculator Logic
              </a>
            )}

            <button
              type="button"
              onClick={() =>
                setRunSettingsOpen((value) => {
                  const next = !value;
                  if (next) setExpandedId(null);
                  return next;
                })
              }
              className={`mb-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors ${runSettingsOpen
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
