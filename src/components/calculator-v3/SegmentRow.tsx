import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import { X } from "lucide-react";
import { ConfirmButton } from "../shared/ConfirmButton";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";
import NumberInput from "../shared/NumberInput";
import {
  GATE_SEGMENT_STUB_KEYS,
  SEGMENT_TERMINATION_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import {
  clearGateOpeningWidthMm,
  defaultGateBuildForMovement,
  gateMovementOrDefault,
} from "../../lib/gateOptionRules";
import { hingeGapForSku, latchGapForSku } from "../../lib/gateHardware";
import { heightEntriesForSystem } from "../../lib/productOptionRules";
import {
  derivedHeightForSlatCount,
  nearestDerivedHeight,
  type DerivedHeight,
} from "../../lib/heights";
import { InlineHeightEditor } from "./InlineHeightEditor";
import { systemDisplayName } from "../../lib/systemDisplay";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  segIdx: number;
  runIdx: number;
  displayLabel?: string;
}

function sameValue(left: unknown, right: unknown) {
  if (left === undefined || left === null || left === "") {
    return right === undefined || right === null || right === "";
  }
  return String(left) === String(right ?? "");
}

function unsetOrSame(vars: Record<string, unknown>, key: string, defaultValue: unknown) {
  return vars[key] === undefined || vars[key] === null || sameValue(vars[key], defaultValue);
}

export function SegmentRow({
  runId,
  seg,
  segIdx,
  runIdx,
  displayLabel,
}: Props) {
  const { state, dispatch } = useCalculator();
  const gate = seg.segmentKind === "gate_opening";

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const runVariables = {
    ...(state.payload?.variables ?? {}),
    ...(run?.variables ?? {}),
  };
  const masterVariables = {
    ...runVariables,
  };
  const runDefaultHeight = Number(masterVariables.target_height_mm ?? 1800);
  const segmentVariables = {
    ...runVariables,
    ...(seg.variables ?? {}),
  };
  const runProductCode = run?.productCode ?? state.payload?.productCode ?? "QSHS";
  const productCode = String(seg.variables?.product_code ?? runProductCode);
  const isBayg = productCode === "BAYG";
  const heightEntries = run
    ? heightEntriesForSystem(productCode, segmentVariables)
    : [];
  const selectedHeightEntry =
    derivedHeightForSlatCount(heightEntries, seg.variables?.slat_count ?? segmentVariables.slat_count) ??
    nearestDerivedHeight(
      heightEntries,
      Number(seg.targetHeightMm ?? segmentVariables.target_height_mm ?? 1800),
    );
  const selectedHeight =
    selectedHeightEntry?.height ?? Number(seg.targetHeightMm ?? segmentVariables.target_height_mm ?? 1800);
  const segmentLength = Number(seg.segmentWidthMm ?? 0);
  const gateVars = seg.variables ?? {};
  const gateBuild = String(
    gateVars[GATE_SEGMENT_STUB_KEYS.gateBuild] ??
    (productCode === "VS" ? "qsg_hinged_vertical" : "qsg_hinged_horizontal"),
  );
  const expectedGateBuild =
    gateBuild ===
    defaultGateBuildForMovement(
      gateMovementOrDefault(gateVars[GATE_SEGMENT_STUB_KEYS.gateMovement]),
      runProductCode === "VS",
    );
  const compactLabel =
    displayLabel?.replace(/\s+/g, "") ??
    `R${runIdx + 1}${gate ? "G" : "S"}${segIdx + 1}`;
  const titleLabel = gate
    ? `Gate ${segIdx + 1}`
    : isBayg
      ? `Panel ${segIdx + 1}`
      : `Section ${segIdx + 1}`;
  const systemName = systemDisplayName(productCode);
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
    const keys = [
      "product_code",
      "colour_code",
      "post_colour_code",
      "slat_size_mm",
      "slat_gap_mm",
      "slat_gap_mode",
      "post_size",
      "post_system",
      "mounting_type",
      "mounting_method",
      "max_panel_width_mm",
      SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype,
      SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype,
    ];
    return (
      settingsKindMatches(SEGMENT_TERMINATION_KEYS.leftKind) &&
      settingsKindMatches(SEGMENT_TERMINATION_KEYS.rightKind) &&
      keys.every((key) => unsetOrSame(vars, key, masterVariables[key]))
    );
  })();

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

  function resetToMaster() {
    if (!run) return;
    if (gate) {
      const movement = gateMovementOrDefault(seg.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
      dispatch({
        type: "UPSERT_SEGMENT",
        runId,
        segment: {
          ...patchSegmentVariables(seg, {
            [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
              movement,
              run.productCode === "VS",
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
          slat_count: null,
          product_code: null,
          colour_code: null,
          post_colour_code: null,
          slat_size_mm: null,
          slat_gap_mm: null,
          slat_gap_mode: null,
          post_size: null,
          post_system: null,
          mounting_type: null,
          mounting_method: null,
          max_panel_width_mm: null,
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

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-primary via-brand-primary/70 to-brand-primary/15 p-[2px] shadow-md">
      <div className="relative overflow-hidden rounded-[0.9rem] bg-brand-card text-sm font-semibold shadow-inner">
        <div className="p-2">

          <div className="min-w-0 space-y-3 w-full">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-left text-base font-black text-brand-text">
                  <span>{titleLabel}</span>
                  <span className="text-xs font-black text-brand-primary">{systemName}</span>
                </p>
                <div className="mt-2 grid grid-cols-[minmax(5.5rem,0.85fr)_minmax(8rem,1.15fr)] gap-2">
                  <label className="min-w-0 text-xs font-bold text-brand-muted">
                    <span>{gate || isBayg ? "Width" : "Length"}</span>
                    <span className="mt-1 flex items-center gap-1">
                      <NumberInput
                        value={gate || isBayg ? segmentLength : parseFloat((segmentLength / 1000).toFixed(2))}
                        step={gate || isBayg ? 50 : 0.01}
                        min={0}
                        className="w-16 shrink-0 px-2 py-1.5 text-center tabular-nums"
                        onChange={(v) =>
                          updateGeometry(
                            "segmentWidthMm",
                            gate || isBayg ? Math.round(Number(v)) : Math.round(Number(v) * 1000),
                          )
                        }
                      />
                      <span>{gate || isBayg ? "mm" : "m"}</span>
                    </span>
                  </label>
                  <label className="min-w-0 text-xs font-bold text-brand-muted">
                    <span>Height</span>
                    <span className="mt-1 block">
                      <InlineHeightEditor
                        productCode={productCode}
                        variables={segmentVariables}
                        valueMm={selectedHeight}
                        ariaLabel={`${titleLabel} height`}
                        onChange={updateInlineHeight}
                        className="w-full"
                        compactLabels
                      />
                    </span>
                  </label>
                  {isBayg && !gate && (
                    <label className="flex items-center gap-2 text-xs font-bold text-brand-muted">
                      <span>Qty</span>
                      <NumberInput
                        value={Math.max(1, Math.round(Number(seg.variables?.panel_quantity ?? 1)))}
                        step={1}
                        min={1}
                        className="w-20 px-2 py-1.5 text-center tabular-nums"
                        onChange={(v) => updatePanelQuantity(Number(v))}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-end gap-2">
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
                <ConfirmButton
                  onConfirm={() =>
                    dispatch({
                      type: "REMOVE_SEGMENT",
                      runId,
                      segmentId: seg.segmentId,
                    })
                  }
                  confirmLabel={<X size={16} strokeWidth={3} />}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-danger transition-colors hover:bg-brand-danger/10 hover:text-brand-danger/90"
                  aria-label={gate ? "Remove gate" : "Remove section"}
                  title={gate ? "Remove gate" : "Remove section"}
                >
                  <X size={15} strokeWidth={3} />
                </ConfirmButton>
              </div>
            </div>
            <div className="pt-1">
              {gate ? (
                <GateSegmentDetails runId={runId} seg={seg} compact />
              ) : (
                <FenceSegmentDetails runId={runId} seg={seg} compact />
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
