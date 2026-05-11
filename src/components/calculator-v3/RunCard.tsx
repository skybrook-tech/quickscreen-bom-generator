import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
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
import { calcRunStats } from "../../lib/runStats";
import { RUN_DEFAULTS_TEACHING_KEY } from "../../lib/uiCopy";
import { ConfirmButton } from "../shared/ConfirmButton";

const GATE_PRODUCT_CODE = "QS_GATE";
const PARENT_SECTION_KEY = "parent_section_id";

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

function assignGateParents(segments: CanonicalSegment[]) {
  let lastSectionId: string | null = null;
  let changed = false;
  const next = segments.map((segment) => {
    if (segment.segmentKind !== "gate_opening") {
      lastSectionId = segment.segmentId;
      return segment;
    }
    if (segment.variables?.[PARENT_SECTION_KEY] || !lastSectionId) return segment;
    changed = true;
    return {
      ...segment,
      variables: {
        ...(segment.variables ?? {}),
        [PARENT_SECTION_KEY]: lastSectionId,
      },
    };
  });
  return changed ? next : segments;
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
  const runStats = calcRunStats(run, jobMax);
  const panelSummary = state.bomResult ? `${runStats.panels}P` : "\u2014 P";
  const gateCount = run.segments.filter((segment) => segment.segmentKind === "gate_opening").length;
  const runHeight = Number(runVariables.target_height_mm ?? firstSegment?.targetHeightMm ?? 1800);
  const slatSize = Number(runVariables.slat_size_mm ?? 65);
  const slatGap = Number(runVariables.slat_gap_mm ?? 5);
  const isBayg = run.productCode === "BAYG";

  useEffect(
    () => () => {
      if (runCollapseRef.current) window.clearTimeout(runCollapseRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!autoOpenFirstSection || !firstSegment) return;
    setRunSettingsOpen(false);
    setExpandedId(firstSegment.segmentId);
    onAutoOpenConsumed?.();
  }, [autoOpenFirstSection, firstSegment, onAutoOpenConsumed]);

  useEffect(() => {
    const openRun = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== run.runId) return;
      setRunSettingsOpen(true);
      document
        .querySelector(`[data-run-id="${run.runId}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    const openSegment = (event: Event) => {
      const segmentId = (event as CustomEvent<string>).detail;
      if (!run.segments.some((segment) => segment.segmentId === segmentId)) return;
      setRunSettingsOpen(false);
      setExpandedId(segmentId);
      window.setTimeout(() => {
        document
          .querySelector(`[data-segment-id="${segmentId}"]`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 0);
    };
    window.addEventListener("qsbom:open-run", openRun);
    window.addEventListener("qsbom:open-segment", openSegment);
    return () => {
      window.removeEventListener("qsbom:open-run", openRun);
      window.removeEventListener("qsbom:open-segment", openSegment);
    };
  }, [run.runId, run.segments]);

  useEffect(() => {
    const nextSegments = assignGateParents(run.segments);
    const changed = nextSegments.some((segment, index) => segment !== run.segments[index]);
    if (!changed) return;
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        segments: nextSegments,
      },
    });
  }, [dispatch, run]);

  function dismissRunDefaultsTeaching() {
    setTeachingDismissed(true);
    window.localStorage.setItem(RUN_DEFAULTS_TEACHING_KEY, "true");
  }

  function keepRunSettingsOpen() {
    if (runCollapseRef.current) window.clearTimeout(runCollapseRef.current);
  }

  function scheduleRunSettingsCollapse() {
    if (runCollapseRef.current) window.clearTimeout(runCollapseRef.current);
    runCollapseRef.current = window.setTimeout(() => setRunSettingsOpen(false), 10000);
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

  function addGateSegment(parentSectionId?: string) {
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
      variables: {
        ...defaultGateVariables({ ...masterVariables, productCode: run.productCode }, targetHeight),
        ...(parentSectionId ? { [PARENT_SECTION_KEY]: parentSectionId } : {}),
      },
    });
    setExpandedId(segmentId);
  }

  function gatesForSection(sectionId: string) {
    return assignGateParents(run.segments).filter(
      (segment) =>
        segment.segmentKind === "gate_opening" &&
        segment.variables?.[PARENT_SECTION_KEY] === sectionId,
    );
  }

  return (
    <div data-run-id={run.runId} className="rounded-2xl border-2 border-brand-primary/20 bg-brand-card py-4 shadow-md">
      <div className="px-4 mb-3 flex flex-wrap items-start justify-between gap-3">
        <h3 className="grid gap-1 text-brand-text">
          <span className="text-xl font-extrabold leading-tight tracking-normal">
            Run {runIdx + 1} — {runLengthM}m
          </span>
          <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-brand-muted">
            <span>System Type: <strong className="text-brand-text">{run.productCode}</strong></span>
            <span>{isBayg ? "Total panel width" : "Length"}: <strong className="text-brand-text">{runLengthM}m</strong></span>
            {gateCount > 0 && <span>Gates: <strong className="font-mono tabular-nums text-brand-text">{gateCount}G</strong></span>}
            <span>Panels: <strong className="font-mono tabular-nums text-brand-text">{panelSummary}</strong></span>
            <span>Height: <strong className="text-brand-text">{runHeight}mm</strong></span>
            <span>Color: <strong className="text-brand-text">{colourName(runVariables.colour_code)}</strong></span>
            <span>Slat size: <strong className="text-brand-text">{slatSize}mm</strong></span>
            <span>Gap size: <strong className="text-brand-text">{slatGap}mm</strong></span>
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
              onClick={() => setRunSettingsOpen((value) => !value)}
              className={`ml-auto mb-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-extrabold transition-colors ${runSettingsOpen
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary"
                }`}
              title={runSettingsOpen ? "Collapse run settings" : "Open run settings"}
            >
              <SlidersHorizontal size={16} />
              {runSettingsOpen ? "Save run settings" : "Run settings"}
            </button>
          </div>
        </div>
      </div>

      {runSettingsOpen && (
        <RunSettingsEditor run={run} onCollapse={() => setRunSettingsOpen(false)} />
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
              .map((seg, segIdx) => {
                const linkedGates = gatesForSection(seg.segmentId);
                return (
                  <div key={seg.segmentId} data-segment-id={seg.segmentId} className="space-y-2">
                    <SegmentRow
                      runId={run.runId}
                      seg={seg}
                      segIdx={segIdx}
                      runIdx={runIdx}
                      displayLabel={`R${runIdx + 1}S${segIdx + 1}`}
                      linkedGates={linkedGates}
                      onAddGate={(sectionId) => addGateSegment(sectionId)}
                      onEditGate={(gateId) => setExpandedId(gateId)}
                      onRemoveGate={(gateId) =>
                        dispatch({ type: "REMOVE_SEGMENT", runId: run.runId, segmentId: gateId })
                      }
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
                    {linkedGates.map((gateSeg, gateIdx) =>
                      expandedId === gateSeg.segmentId ? (
                        <div key={gateSeg.segmentId} data-segment-id={gateSeg.segmentId} className="ml-4 border-l-2 border-brand-warning/40 pl-3">
                          <SegmentRow
                            runId={run.runId}
                            seg={gateSeg}
                            segIdx={gateIdx}
                            runIdx={runIdx}
                            displayLabel={`R${runIdx + 1}G${run.segments.filter((segment) => segment.segmentKind === "gate_opening").findIndex((item) => item.segmentId === gateSeg.segmentId) + 1}`}
                            open
                            onToggle={() => setExpandedId(null)}
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                );
              })}
          </div>

          <div className="px-4 mt-3 flex flex-wrap justify-end gap-2">
            <Button onClick={addFenceSegment} icon={Plus} variant="ghost" size="small">
              {isBayg ? "Add panel size" : "Add section"}
            </Button>
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
