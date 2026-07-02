import { useEffect, useMemo, useRef } from "react";
import { useCalculator } from "../../../context/CalculatorContext";
import { useCalculatorConfig } from "../../../hooks/useCalculatorConfig";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { ConfirmButton } from "../../shared/ConfirmButton";
import { valueLabel } from "../SchemaDrivenForm";
import {
  GATE_SEGMENT_STUB_KEYS,
  SEGMENT_TERMINATION_KEYS,
  patchSegmentVariables,
} from "../../../lib/segmentTermination";
import {
  clearGateOpeningWidthMm,
  defaultGateBuildForMovementInfill,
  gateMovementOrDefault,
} from "../../../lib/gateOptionRules";
import { hingeGapForSku, latchGapForSku } from "../../../lib/gateHardware";
import {
  gatePatchForAlternative,
  validateGateWidth,
} from "../../../lib/gateConstraints";
import { clampPostSpacing } from "../../../lib/productOptionRules";
import {
  derivedHeightForSlatCount,
  nearestDerivedHeight,
  type DerivedHeight,
} from "../../../lib/heights";
import { colourName } from "../ColourPalette";
import { InlineEdit } from "./InlineEdit";
import {
  clearSegmentOverridePatch,
  segmentDifferenceBits,
  segmentMatchesRun,
} from "../../../lib/runFieldOverrides";
import {
  gateHardwareSummaryItems,
  gateMovementLabel,
  postLabel,
  sameValue,
  unsetOrSame,
  type SummaryItem,
} from "./segmentSummary";
import { SegmentRowSettings } from "./SegmentRowSettings";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  runIdx: number;
  open: boolean;
  onToggle: () => void;
  displayLabel?: string;
  onAddGate?: (sectionId: string) => void;
  showRunDefaultsTeaching?: boolean;
  onDismissRunDefaultsTeaching?: () => void;
  isLastSegment?: boolean;
}

export function SegmentRow({
  runId,
  seg,
  segIdx,
  runIdx,
  open,
  onToggle,
  displayLabel,
  onAddGate,
  showRunDefaultsTeaching = false,
  onDismissRunDefaultsTeaching,
  isLastSegment = false,
}: Props) {
  const { state, dispatch } = useCalculator();
  const collapseTimerRef = useRef<number | null>(null);
  const gate = seg.segmentKind === "gate_opening";

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const runProductCode = run?.productCode ?? state.payload?.productCode ?? "QSHS";
  const segProductCode = String(seg.variables?.product_code ?? runProductCode);
  const masterVariables = useMemo<Record<string, string | number | boolean>>(
    () => ({ ...(state.payload?.variables ?? {}), ...(run?.variables ?? {}) }),
    [state.payload?.variables, run],
  );
  const gateConfig = useCalculatorConfig(gate ? "QS_GATE" : "");

  const runDefaultHeight = Number(masterVariables.target_height_mm ?? 1800);
  const segmentVariables = {
    ...masterVariables,
    ...(seg.variables ?? {}),
  };
  // Segment-resolved config: height ladder + option lists resolved for this
  // segment's merged variables (segment overrides — including a per-segment
  // product_code — included). Cache-keyed, cheap; shares data with the run-
  // level fetch when the segment inherits the run product + variables.
  const config = useCalculatorConfig(segProductCode, segmentVariables);
  if (!config) {
    // Still resolving the segment-specific config (e.g. a segment override
    // changed the variables key). Render nothing rather than a malformed row.
    return null;
  }

  const isPanelStrategy = config.strategy.fence === "panel";
  const isFreeform = config.heightUi.mode === "freeform";
  const mountingField = config.formFields.run.find(
    (field) => field.field_key === "mounting_type" || field.field_key === "mounting_method",
  );
  const postSizeField = config.formFields.run.find((field) => field.field_key === "post_size");
  const slatSizeField = config.formFields.job.find((field) => field.field_key === "slat_size_mm");
  const slatGapField = config.formFields.job.find((field) => field.field_key === "slat_gap_mm");
  const segmentNumber = segIdx + 1;

  const heightEntries: DerivedHeight[] = config.heightLadder.entries;
  const heightInputsReady =
    isFreeform ||
    (Number.isFinite(Number(segmentVariables.slat_size_mm)) &&
      Number.isFinite(Number(segmentVariables.slat_gap_mm)));
  const selectedHeightEntry =
    derivedHeightForSlatCount(heightEntries, seg.variables?.slat_count ?? segmentVariables.slat_count) ??
    nearestDerivedHeight(
      heightEntries,
      Number(seg.targetHeightMm ?? segmentVariables.target_height_mm ?? 1800),
    );
  const selectedHeight =
    selectedHeightEntry?.height ?? Number(seg.targetHeightMm ?? segmentVariables.target_height_mm ?? 1800);
  const fenceColour = String(segmentVariables.colour_code ?? "B");
  const postColour = String(segmentVariables.post_colour_code ?? fenceColour);
  const maxSpacing = clampPostSpacing(
    segmentVariables.max_panel_width_mm ?? config.panelRules.maxPanelWidthMm,
    config.panelRules.maxPanelWidthMm,
  );
  const segmentLength = Number(seg.segmentWidthMm ?? 0);
  const panelCount = segmentLength > 0 ? Math.max(1, Math.ceil(segmentLength / maxSpacing)) : 0;
  const panelWidthSummary =
    panelCount <= 0
      ? "0mm"
      : panelCount === 1
        ? `${Math.round(segmentLength)}mm`
        : `${panelCount} x ${Math.round(segmentLength / panelCount)}mm`;
  const gateVars = seg.variables ?? {};
  const gateWidthValidation = gate ? validateGateWidth(seg, gateConfig) : null;
  const gateInfill = config.gateRules.defaultInfill;
  const gateBuild = String(
    gateVars[GATE_SEGMENT_STUB_KEYS.gateBuild] ??
      defaultGateBuildForMovementInfill("single_swing", gateInfill),
  );
  const expectedGateBuild =
    gateBuild ===
    defaultGateBuildForMovementInfill(
      gateMovementOrDefault(gateVars[GATE_SEGMENT_STUB_KEYS.gateMovement]),
      gateInfill,
    );
  const compactLabel =
    displayLabel?.replace(/\s+/g, "") ??
    `R${runIdx + 1}${gate ? "G" : "S"}${segmentNumber}`;

  const titleLabel = gate
    ? `Gate ${segmentNumber}`
    : isPanelStrategy
      ? `Panel ${segmentNumber}`
      : `Section ${segmentNumber}`;


  const matchesMaster = (() => {
    if (!run) return true;
    if (gate) {
      return (
        expectedGateBuild &&
        unsetOrSame(gateVars, GATE_SEGMENT_STUB_KEYS.colourCode, masterVariables.colour_code ?? "B") &&
        unsetOrSame(gateVars, GATE_SEGMENT_STUB_KEYS.slatSizeMm, masterVariables.slat_size_mm ?? 65) &&
        unsetOrSame(gateVars, GATE_SEGMENT_STUB_KEYS.slatGapMm, masterVariables.slat_gap_mm ?? 9)
      );
    }
    const vars = seg.variables ?? {};
    const settingsKindMatches = (key: string) => {
      const value = vars[key];
      const master = masterVariables[key];
      const structural = value === undefined || value === null || value === "" || value === "system_post" || value === "corner";
      const masterStructural = master === undefined || master === null || master === "" || master === "system_post" || master === "corner";
      if (structural && masterStructural) return true;
      return sameValue(value, master);
    };
    const terminationSubtypeKeys = [
      SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype,
      SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype,
    ];
    return (
      sameValue(segProductCode, runProductCode) &&
      settingsKindMatches(SEGMENT_TERMINATION_KEYS.leftKind) &&
      settingsKindMatches(SEGMENT_TERMINATION_KEYS.rightKind) &&
      terminationSubtypeKeys.every((key) => unsetOrSame(vars, key, masterVariables[key])) &&
      segmentMatchesRun(config, vars, masterVariables)
    );
  })();
  const masterFenceColour = String(masterVariables.colour_code ?? "B");
  const masterPostColour = String(masterVariables.post_colour_code ?? masterFenceColour);
  const masterMaxSpacing = clampPostSpacing(
    masterVariables.max_panel_width_mm ?? config.panelRules.maxPanelWidthMm,
    config.panelRules.maxPanelWidthMm,
  );
  const masterPanelCount = segmentLength > 0 ? Math.max(1, Math.ceil(segmentLength / masterMaxSpacing)) : 0;
  const summaryBitsBase = [
    gate
      ? { label: "Type", value: gateMovementLabel(gateVars[GATE_SEGMENT_STUB_KEYS.gateMovement]), emphasis: true }
      : null,
    ...(gate ? gateHardwareSummaryItems(gateVars) : []),
    ...(isPanelStrategy && !gate
      ? [{ label: "Qty", value: Math.max(1, Math.round(Number(seg.variables?.panel_quantity ?? 1))), emphasis: true }]
      : []),
  ].filter(Boolean) as SummaryItem[];

  const BESPOKE_DIFFERENCE_FIELD_KEYS = new Set([
    "colour_code",
    "post_colour_code",
    "slat_size_mm",
    "slat_gap_mm",
    "post_system",
    "post_size",
    "mounting_type",
    "mounting_method",
    "max_panel_width_mm",
  ]);

  const genericExtraDifferenceBits = gate
    ? []
    : segmentDifferenceBits(config, segmentVariables, masterVariables).filter(
      (bit) => !BESPOKE_DIFFERENCE_FIELD_KEYS.has(bit.field_key),
    );

  const rawDifferenceBits = gate
    ? [
      {
        label: "Height",
        value: `${selectedHeight}mm`,
        changed: !sameValue(
          selectedHeight,
          masterVariables.target_height_mm ?? 1800,
        ),
      },
      {
        label: "Gate style",
        value: gateBuild.includes("vertical") ? "Vertical slat" : "Horizontal slat",
        changed: !expectedGateBuild,
      },
      {
        label: "Colour",
        value: colourName(fenceColour),
        changed: !sameValue(fenceColour, masterFenceColour),
      },
      {
        label: "Slat",
        value: `${segmentVariables[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVariables.slat_size_mm ?? 65}mm`,
        changed: !sameValue(
          segmentVariables[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVariables.slat_size_mm ?? 65,
          masterVariables.slat_size_mm ?? 65,
        ),
      },
      {
        label: "Gap",
        value: `${segmentVariables[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVariables.slat_gap_mm ?? 9}mm`,
        changed: !sameValue(
          segmentVariables[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVariables.slat_gap_mm ?? 9,
          masterVariables.slat_gap_mm ?? 9,
        ),
      },
      ...(postColour !== fenceColour
        ? [
          {
            label: "Post colour",
            value: colourName(postColour),
            changed: !sameValue(postColour, masterPostColour),
          },
        ]
        : []),
    ]
    : [
      {
        label: "System",
        value: segProductCode,
        changed: !sameValue(segProductCode, runProductCode),
      },
      {
        label: "Height",
        value: `${selectedHeight}mm`,
        changed: !sameValue(
          selectedHeight,
          masterVariables.target_height_mm ?? 1800,
        ),
      },
      { label: "Colour", value: colourName(fenceColour), changed: !sameValue(fenceColour, masterFenceColour) },
      ...(postColour !== fenceColour
        ? [
          {
            label: "Post colour",
            value: colourName(postColour),
            changed: !sameValue(postColour, masterPostColour),
          },
        ]
        : []),
      {
        label: "Slat",
        value: valueLabel(slatSizeField, segmentVariables.slat_size_mm ?? 65),
        changed: !sameValue(segmentVariables.slat_size_mm ?? 65, masterVariables.slat_size_mm ?? 65),
      },
      {
        label: "Gap",
        value: valueLabel(slatGapField, segmentVariables.slat_gap_mm ?? 9),
        changed: !sameValue(segmentVariables.slat_gap_mm ?? 9, masterVariables.slat_gap_mm ?? 9),
      },
      {
        label: "Post",
        value: postLabel(postSizeField, segmentVariables),
        changed:
          !isPanelStrategy &&
          (!sameValue(segmentVariables.post_system, masterVariables.post_system) ||
            !sameValue(segmentVariables.post_size ?? 50, masterVariables.post_size ?? 50)),
      },
      {
        label: "Mounting",
        value: valueLabel(
          mountingField,
          segmentVariables.mounting_method ?? segmentVariables.mounting_type ?? "in_ground",
          "Concreted in ground",
        ),
        changed:
          !isPanelStrategy &&
          !sameValue(
            segmentVariables.mounting_method ?? segmentVariables.mounting_type ?? "in_ground",
            masterVariables.mounting_method ?? masterVariables.mounting_type ?? "in_ground",
          ),
      },
      { label: "Panel Count", value: panelCount, changed: !isPanelStrategy && !sameValue(panelCount, masterPanelCount) },
      { label: "Panel width", value: panelWidthSummary, changed: !isPanelStrategy && !sameValue(maxSpacing, masterMaxSpacing) },
      // Any other job/run-scope field this product declares (e.g. post-fixing
      // material, base-plate substrate, boundary types, louvre treatment) that
      // doesn't have a bespoke bit above — kept generic so a new product's own
      // fields surface here automatically instead of being silently invisible.
      ...genericExtraDifferenceBits,
    ];

  const differenceBits =
    matchesMaster ? [] : rawDifferenceBits.filter((item) => item.changed && item.label !== "Height");

  const summaryText = [
    ...(gate
      ? summaryBitsBase.map((item) => `${item.label}: ${item.value}`)
      : []),
    ...differenceBits.map((item) => `${item.label}: ${item.value}`),
  ].join(", ");

  const visibleSettings = rawDifferenceBits.filter((item) => {
    if (item.label === "Height") return false;
    if (isPanelStrategy && ["Post", "Mounting", "Panel Count", "Panel width"].includes(item.label)) {
      return false;
    }
    return true;
  });

  function updateGeometry(
    key: "segmentWidthMm" | "targetHeightMm",
    value: number,
  ) {
    const nextSegment =
      gate && key === "segmentWidthMm"
        ? (() => {
          const movement = gateMovementOrDefault(seg.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
          if (movement === "sliding") {
            return { ...seg, [key]: value, leaves: [{ widthMm: Math.max(1, Math.round(value)) }] };
          }
          const hingeGapMm = hingeGapForSku(String(seg.variables?.[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B"));
          const latchGapMm = latchGapForSku(String(seg.variables?.[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA"));
          const clearOpeningMm = clearGateOpeningWidthMm({
            openingWidthMm: value,
            movement,
            hingeGapMm,
            latchGapMm,
          });
          if (movement === "double_swing") {
            const existing = seg.leaves?.map((leaf) => Number(leaf.widthMm)).filter((width) => Number.isFinite(width) && width > 0) ?? [];
            const oldTotal = existing.reduce((sum, width) => sum + width, 0);
            const firstRatio = existing.length === 2 && oldTotal > 0 ? existing[0] / oldTotal : 0.5;
            const first = Math.max(1, Math.min(Math.round(clearOpeningMm) - 1, Math.round(clearOpeningMm * firstRatio)));
            return {
              ...seg,
              [key]: value,
              leaves: [{ widthMm: first }, { widthMm: Math.max(1, Math.round(clearOpeningMm) - first) }],
            };
          }
          return { ...seg, [key]: value, leaves: [{ widthMm: Math.max(1, Math.round(clearOpeningMm)) }] };
        })()
        : null;

    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment:
        nextSegment ??
        (gate && key === "targetHeightMm"
          ? {
            ...patchSegmentVariables(seg, {
              [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: value,
            }),
            targetHeightMm: value,
          }
          : { ...seg, [key]: value }),
    });
  }

  function updateDerivedHeight(entry: DerivedHeight) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment:
        gate
          ? {
            ...patchSegmentVariables(seg, {
              [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: entry.height,
              target_height_mm: entry.height,
              slat_count: entry.N,
            }),
            targetHeightMm: entry.height,
          }
          : {
            ...patchSegmentVariables(seg, {
              target_height_mm: entry.height,
              slat_count: entry.N,
            }),
            targetHeightMm: entry.height,
          },
    });
  }

  function updateInlineHeight(heightMm: number, entry?: DerivedHeight) {
    if (heightMm === runDefaultHeight) {
      dispatch({
        type: "UPSERT_SEGMENT",
        runId,
        segment: {
          ...patchSegmentVariables(seg, {
            [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: null,
            target_height_mm: null,
            slat_count: null,
          }),
          targetHeightMm: heightMm,
        },
      });
      return;
    }
    if (entry) {
      updateDerivedHeight(entry);
      return;
    }
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment:
        gate
          ? {
            ...patchSegmentVariables(seg, {
              [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: heightMm,
              target_height_mm: heightMm,
              slat_count: null,
            }),
            targetHeightMm: heightMm,
          }
          : {
            ...patchSegmentVariables(seg, {
              target_height_mm: heightMm,
              slat_count: null,
            }),
            targetHeightMm: heightMm,
          },
    });
  }

  function updatePanelQuantity(value: number) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(seg, {
        panel_quantity: Math.max(1, Math.round(Number(value) || 1)),
      }),
    });
  }

  function switchGateToAlternative() {
    if (!gateWidthValidation?.alternative) return;
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(
        seg,
        gatePatchForAlternative(
          gateWidthValidation.alternative,
          gateMovementOrDefault(seg.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]),
        ),
      ),
    });
  }

  function resetToMaster() {
    if (!run) return;

    if (gate) {
      const movement = gateMovementOrDefault(seg.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
      dispatch({
        type: "UPSERT_SEGMENT",
        runId,
        segment: {
          ...patchSegmentVariables(seg, {
            [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovementInfill(
              movement,
              config!.gateRules.defaultInfill,
            ),
            [GATE_SEGMENT_STUB_KEYS.colourCode]: String(masterVariables.colour_code ?? "B"),
            [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(masterVariables.slat_size_mm ?? 65),
            [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(masterVariables.slat_gap_mm ?? 9),
            [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(masterVariables.post_size ?? 50),
          }),
        },
      });
      return;
    }
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...patchSegmentVariables(seg, {
          // slat_count is a height-ladder derivation artifact, not a
          // job/run form field — clear it alongside the config-driven keys.
          slat_count: null,
          ...clearSegmentOverridePatch(config!),
        }),
      },
    });
  }

  function setMapHover(value: string | null) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("qsbom:hover-map-label", { detail: value }),
    );
  }

  useEffect(
    () => () => {
      if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    },
    [],
  );

  const lengthValue = gate || isPanelStrategy ? Number(seg.segmentWidthMm ?? 0) : parseFloat(((seg.segmentWidthMm ?? 0) / 1000).toFixed(2))
  const lengthSuffix = gate || isPanelStrategy ? "mm" : "m"

  const onValueChange = (v: number) => {
    if (gate || isPanelStrategy) {
      updateGeometry("segmentWidthMm", v);
    } else {
      updateGeometry("segmentWidthMm", v * 1000);
    }
  }

  const freeformBounds = isFreeform
    ? {
        min: config.heightUi.freeformMinMm ?? 300,
        max: config.heightUi.freeformMaxMm ?? 2400,
        step: config.heightUi.freeformStepMm ?? 50,
      }
    : undefined;

  return (
    <div className={`border-t py-1 ${isLastSegment ? "border-b" : ""}`}>
      <div className="relative cursor-pointer overflow-hidden rounded-[0.9rem] text-sm font-semibold"
        onDoubleClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button,input,select,textarea,a")) return;
          onToggle();
        }}
        title="Double-click to edit options"
      >
        <div className="p-2 ">

          <div className="min-w-0 space-y-3 w-full pl-2 ">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2">
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-left text-lg font-black text-brand-text">
                {titleLabel}
                <div className="flex items-center gap-2">

                  <InlineEdit
                    label="Length"
                    value={lengthValue}
                    suffix={lengthSuffix}
                    displayValue={lengthValue.toFixed(2)}
                    onCommit={onValueChange}
                    disabled={false}
                  />

                  <InlineEdit
                    label="Height"
                    value={selectedHeight}
                    suffix={
                      !heightInputsReady
                        ? ""
                        : isFreeform
                          ? "mm"
                          : ""
                    }
                    displayValue={
                      !heightInputsReady
                        ? "Set slat & gap"
                        : isFreeform
                          ? undefined
                          : selectedHeightEntry
                            ? `${selectedHeight}mm - ${selectedHeightEntry.N} slats`
                            : undefined
                    }
                    disabled={!heightInputsReady}
                    min={300}
                    selectOptions={
                      heightEntries.length > 0
                        ? heightEntries.map((entry) => ({
                            value: entry.height,
                            label: `${entry.height}mm - ${entry.N} slats`,
                          }))
                        : undefined
                    }
                    boundedInput={freeformBounds}
                    onCommit={(h) => {
                      if (isFreeform) {
                        updateInlineHeight(h);
                        return;
                      }
                      const entry = heightEntries.find((e) => e.height === h);
                      updateInlineHeight(h, entry);
                    }}
                  />
                </div>
              </p>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={resetToMaster}
                  title={matchesMaster ? "Settings match run settings" : "Click to restore to run settings"}
                  aria-label={matchesMaster ? `${compactLabel} settings match run settings` : `${compactLabel} differs from run settings. Click to restore.`}
                  className={`rounded-full px-2 py-1 text-center shadow-sm ring-1 ring-inset transition-colors ${matchesMaster
                    ? "bg-brand-success text-white ring-brand-success"
                    : "bg-brand-warning/15 text-black ring-brand-warning/30 hover:bg-brand-primary hover:text-white"
                    }`}
                >
                  <span
                    onMouseEnter={() => setMapHover(compactLabel)}
                    onMouseLeave={() => setMapHover(null)}
                    title={matchesMaster ? "Settings match run settings" : "Click to restore to run settings"}
                    className="text-base font-black leading-none tracking-normal"
                  >
                    {compactLabel}
                  </span>
                </button>
              </div>
              {!gate && !isPanelStrategy && onAddGate && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddGate(seg.segmentId);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-brand-border px-3 text-xs font-extrabold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
                  title="Add gate to this section"
                  aria-label="Add gate to this section"
                >
                  <Plus size={15} />
                  Gate
                </button>
              )}
              <div className="flex items-center justify-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={onToggle}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors ${open
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary"
                    }`}
                  aria-label={open ? `Collapse ${gate ? "gate" : "section"} settings` : `Open ${gate ? "gate" : "section"} settings`}
                  title={open ? `Collapse ${gate ? "gate" : "section"} settings` : `${gate ? "Gate" : "Section"} settings`}
                >
                  <span>Settings</span>
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
              <div className="flex justify-end">
                <ConfirmButton
                  onConfirm={() =>
                    dispatch({
                      type: "REMOVE_SEGMENT",
                      runId,
                      segmentId: seg.segmentId,
                    })
                  }
                  confirmLabel={<X size={16} strokeWidth={3} />}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-danger transition-colors hover:bg-brand-danger/10 hover:text-brand-danger/90"
                  aria-label={gate ? "Remove gate" : "Remove section"}
                  title={gate ? "Remove gate" : "Remove section"}
                >
                  <X size={16} strokeWidth={3} />
                </ConfirmButton>
              </div>
            </div>
            {summaryText && (
              <div
                className="min-w-0 truncate text-[11px] font-semibold leading-tight text-brand-muted"
                title={summaryText}
              >
                {summaryText}
              </div>
            )}

          </div>

        </div>

        {open && (
          <SegmentRowSettings
            runId={runId}
            seg={seg}
            isPanelStrategy={isPanelStrategy}
            isFreeform={isFreeform}
            gate={gate}
            segmentVariables={segmentVariables}
            heightEntries={heightEntries}
            heightInputsReady={heightInputsReady}
            selectedHeight={selectedHeight}
            gateWidthValidation={gateWidthValidation}
            matchesMaster={matchesMaster}
            visibleSettings={visibleSettings}
            showRunDefaultsTeaching={showRunDefaultsTeaching}
            onDismissRunDefaultsTeaching={onDismissRunDefaultsTeaching}
            updateGeometry={updateGeometry}
            updateDerivedHeight={updateDerivedHeight}
            updatePanelQuantity={updatePanelQuantity}
            switchGateToAlternative={switchGateToAlternative}
          />
        )}
      </div>
    </div>
  );
}
