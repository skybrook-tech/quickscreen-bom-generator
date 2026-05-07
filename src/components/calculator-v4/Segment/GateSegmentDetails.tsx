import { useEffect, useMemo, useState } from "react";
import { Segmented } from "../../ui/Segmented";
import { ColourSwatches, type ColourOption } from "../../ui/ColourSwatches";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { patchSegmentVariables } from "../../../lib/segmentTermination";
import {
  DROP_BOLT_OPTIONS,
  GATE_MOVEMENTS,
  GATE_STOP_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_GUIDE_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  defaultGateBuildForMovement,
  gateBuildsForMovement,
  gateMovementOrDefault,
  isSwingGateMovement,
  optionLabel,
  type GateOption,
} from "../../../lib/gateOptionRules";
import {
  baseHardwareSku,
  estimateGateWeight,
  isWhiteHardwareFinish,
  kitForHardwareSelection,
  rankHinges,
  rankLatches,
  type GateHardwareStatus,
  type GateWeightEstimate,
  type HingeHardware,
  type LatchHardware,
  type RankedHardware,
} from "../../../lib/gateHardware";
import NumberInput from "../../ui/NumberInput";
import { useProductSearch } from "../../../hooks/useProductSearch";
import {
  COLOUR_HEX,
} from "../../../lib/colourHex";
import {
  mergeFenceJobRun,
  resolveMatchFenceSegmentVars,
  gateStoredVarsMatchFence,
  clampGateHeightMm,
} from "../../../lib/gateFenceResolve";
import { TerminationControl } from "./TerminationControl";
import { VALIDATION } from "../../../lib/constants";

const GATE_POST_SIZE_OPTIONS: GateOption[] = [
  { value: "50", label: "50mm Post Standard" },
  { value: "65", label: "65mm Post Standard HD" },
];

const COLOUR_OPTIONS: ColourOption[] = Object.keys(COLOUR_HEX).map((key) => ({
  value: key,
  label: key
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()),
}));

const SWING_DIRECTION_OPTIONS: GateOption[] = [
  { value: "out", label: "Swing out" },
  { value: "in", label: "Swing in" },
];

const SLIDING_DIRECTION_OPTIONS: GateOption[] = [
  { value: "left", label: "Slide left" },
  { value: "right", label: "Slide right" },
];

const SLAT_GAP_OPTIONS: GateOption[] = [
  { value: "5", label: "5mm" },
  { value: "9", label: "9mm" },
  { value: "20", label: "20mm" },
];

const GATE_HEIGHT_PRESETS_MM = [900, 1050, 1200, 1500, 1800, 1950, 2100] as const;

interface Props {
  runId: string;
  seg: CanonicalSegment;
  locked?: boolean;
}

// ── Labelled segmented control ───────────────────────────────────────────────

function SegmentedField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: GateOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <Segmented
        value={value}
        onChange={disabled ? () => {} : onChange}
        options={options}
        size="sm"
        className={disabled ? "pointer-events-none opacity-60" : ""}
      />
    </div>
  );
}

// ── Hardware search dropdown ─────────────────────────────────────────────────

function HardwareDropdown({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: GateOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selectedLabel = optionLabel(options, value);
  const hasPresetValue = options.some((o) => o.value === value);
  const [query, setQuery] = useState("");
  const { data: suggestions = [], isFetching } = useProductSearch(query);
  const filteredSuggestions = suggestions.filter((item) => {
    const h =
      `${item.sku} ${item.name} ${item.description} ${item.category}`.toLowerCase();
    return (
      h.includes("gate") ||
      h.includes("hinge") ||
      h.includes("latch") ||
      h.includes("bolt") ||
      h.includes("catch") ||
      h.includes("track") ||
      h.includes("motor") ||
      h.includes("stop")
    );
  });

  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
          {label}
        </span>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none"
        >
          {!hasPresetValue && value && (
            <option value={value}>{value} — inventory selection</option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-md border border-brand-border/70 bg-brand-card/80 p-2">
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search inventory for ${label.toLowerCase()}`}
          className="w-full rounded-md border border-brand-border bg-brand-bg px-2 py-1.5 text-xs text-brand-text placeholder:text-brand-muted/70 focus:border-brand-accent focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-brand-muted">
          Selected:{" "}
          <span className="text-brand-text">{selectedLabel || value}</span>
        </p>
        {query.trim().length >= 2 && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-brand-border/60 bg-brand-bg">
            {isFetching ? (
              <div className="px-2 py-2 text-xs text-brand-muted">
                Searching…
              </div>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <button
                  key={item.sku}
                  type="button"
                  onClick={() => {
                    onChange(item.sku);
                    setQuery("");
                  }}
                  className="block w-full border-b border-brand-border/50 px-2 py-2 text-left text-xs text-brand-text last:border-b-0 hover:bg-brand-accent hover:text-white"
                >
                  <span className="block font-medium">{item.sku}</span>
                  <span className="block text-brand-muted">{item.name}</span>
                </button>
              ))
            ) : (
              <div className="px-2 py-2 text-xs text-brand-muted">
                No hardware matches.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hardware status helpers ──────────────────────────────────────────────────

function statusClasses(status: GateHardwareStatus) {
  if (status === "fit")
    return "border-green-500/50 bg-green-500/10 text-green-500";
  if (status === "tight")
    return "border-amber-500/60 bg-amber-500/10 text-amber-500";
  return "border-red-500/50 bg-red-500/10 text-red-500";
}


function GateWeightCard({ estimate }: { estimate: GateWeightEstimate }) {
  return (
    <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-text">
            Estimated gate weight
          </p>
          <p className="text-[11px] text-brand-muted">
            Frame + slats + hardware allowance, 30% hinge safety margin.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold tabular-nums text-brand-accent">
            {estimate.totalKg.toFixed(1)}kg
          </p>
          <p className="text-[11px] text-brand-muted">
            Need {estimate.requiredRatingKg}kg+ hinges
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-brand-muted">
        <span>
          Slats <b className="text-brand-text">{estimate.slatCount}</b>
        </span>
        <span>
          Slat kg{" "}
          <b className="text-brand-text">{estimate.slatWeightKg.toFixed(1)}</b>
        </span>
        <span>
          Frame kg{" "}
          <b className="text-brand-text">
            {estimate.frameWeightKg.toFixed(1)}
          </b>
        </span>
      </div>
    </div>
  );
}

function HardwareReasonTags({
  status,
  reasons,
}: {
  status: GateHardwareStatus;
  reasons: string[];
}) {
  const tags =
    reasons.length > 0
      ? reasons
      : status === "tight"
        ? ["Close to required rating"]
        : [];
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {tags.map((reason) => (
        <span
          key={reason}
          className={`rounded-full border px-1.5 py-0 text-[10px] ${statusClasses(status)}`}
        >
          {reason}
        </span>
      ))}
    </div>
  );
}

function HingePicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: RankedHardware<HingeHardware>[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const baseValue = baseHardwareSku(value);
  const visible = options.filter((o) => o.status !== "fail");
  const failCount = options.length - visible.length;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
        Hinge / closer
      </p>
      <div className="divide-y divide-brand-border/50 rounded-lg border border-brand-border overflow-hidden">
        {visible.map((opt) => {
          const active = baseValue === opt.sku || value === opt.effectiveSku;
          return (
            <button
              key={opt.sku}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.effectiveSku)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition ${
                active
                  ? "bg-brand-accent/10"
                  : "bg-brand-card hover:bg-brand-accent/5"
              }`}
            >
              <span
                className={`shrink-0 h-3.5 w-3.5 rounded-full border-2 ${active ? "border-brand-accent bg-brand-accent" : "border-brand-border bg-transparent"}`}
              />
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-brand-text truncate">
                  {opt.label}
                </span>
                <span className="block text-[11px] text-brand-muted">
                  {opt.effectiveSku} · {opt.ratingKg}kg · gap {opt.gapMinMm}–{opt.gapMaxMm}mm
                </span>
                <HardwareReasonTags status={opt.status} reasons={opt.reasons} />
              </span>
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                {opt.recommended && (
                  <span className="rounded-full bg-green-500 px-1.5 py-0 text-[10px] text-white">
                    Best fit
                  </span>
                )}
                {opt.status === "tight" && (
                  <span className={`rounded-full border px-1.5 py-0 text-[10px] ${statusClasses("tight")}`}>
                    Tight
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {failCount > 0 && (
        <p className="text-[11px] text-brand-muted px-1">
          {failCount} hinge{failCount !== 1 ? "s" : ""} not compatible with this gate weight / gap.
        </p>
      )}
    </div>
  );
}

function LatchPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: RankedHardware<LatchHardware>[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const baseValue = baseHardwareSku(value);
  const visible = options.filter((o) => o.status !== "fail");
  const failCount = options.length - visible.length;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
        Latch / lock
      </p>
      <div className="divide-y divide-brand-border/50 rounded-lg border border-brand-border overflow-hidden">
        {visible.map((opt) => {
          const active = baseValue === opt.sku || value === opt.effectiveSku;
          return (
            <button
              key={opt.sku}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.effectiveSku)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition ${
                active
                  ? "bg-brand-accent/10"
                  : "bg-brand-card hover:bg-brand-accent/5"
              }`}
            >
              <span
                className={`shrink-0 h-3.5 w-3.5 rounded-full border-2 ${active ? "border-brand-accent bg-brand-accent" : "border-brand-border bg-transparent"}`}
              />
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-brand-text truncate">
                  {opt.label}
                </span>
                <span className="block text-[11px] text-brand-muted">
                  {opt.effectiveSku}
                  {opt.lockable ? " · lockable" : ""}
                  {opt.poolSafe ? " · pool safe" : ""}
                </span>
              </span>
              {opt.recommended && (
                <span className="shrink-0 rounded-full bg-green-500 px-1.5 py-0 text-[10px] text-white">
                  Recommended
                </span>
              )}
            </button>
          );
        })}
      </div>
      {failCount > 0 && (
        <p className="text-[11px] text-brand-muted px-1">
          {failCount} latch{failCount !== 1 ? "es" : ""} not compatible with this gate movement / finish.
        </p>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function GateSegmentDetails({ runId, seg, locked = false }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const v = seg.variables ?? {};
  const run = state.payload?.runs.find((r) => r.runId === runId);
  const runVars = run?.variables ?? {};
  const jobVars = state.payload?.variables ?? {};

  const fenceContext = useMemo(
    () => mergeFenceJobRun(jobVars, runVars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(jobVars), JSON.stringify(runVars)],
  );

  const maxFenceSegmentHeightMm = useMemo(() => {
    const fenceSegs = run?.segments.filter((s) => s.kind === "fence") ?? [];
    const heights = fenceSegs
      .map((s) => s.targetHeightMm)
      .filter((h): h is number => typeof h === "number" && h > 0);
    return heights.length > 0 ? Math.max(...heights) : undefined;
  }, [run?.segments]);

  // Match-fence toggle — inferred from stored vars vs resolved fence context
  const matchFence = useMemo(
    () =>
      gateStoredVarsMatchFence(
        v as Record<string, string | number | boolean>,
        fenceContext,
        maxFenceSegmentHeightMm,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(v), JSON.stringify(fenceContext), maxFenceSegmentHeightMm],
  );

  const movement = gateMovementOrDefault(v.gate_movement);
  const isSwing = isSwingGateMovement(movement);
  const prefersVertical = run?.productCode === "VS";
  const buildOptions = gateBuildsForMovement(movement);
  const build = buildOptions.some((o) => o.value === v.gate_build)
    ? String(v.gate_build)
    : defaultGateBuildForMovement(movement, prefersVertical);
  const directionOptions = isSwing
    ? SWING_DIRECTION_OPTIONS
    : SLIDING_DIRECTION_OPTIONS;
  const currentDirection = String(v.opening_direction ?? (isSwing ? "out" : "right"));

  const gateColour = String(v.colour_code ?? fenceContext.colour_code ?? "black-satin");
  const slatSizeMm = Number(v.slat_size_mm ?? fenceContext.slat_size_mm ?? 65);
  const slatGapMm = Number(v.slat_gap_mm ?? fenceContext.slat_gap_mm ?? 5);
  const gateHeightMm = Number(
    seg.targetHeightMm ?? v.gate_height_mm ?? fenceContext.target_height_mm ?? 1800,
  );
  const gateWidthMm = Number(seg.segmentWidthMm ?? v.gate_width_mm ?? 900);
  const whiteFinish = isWhiteHardwareFinish(gateColour);

  const weightEstimate = useMemo(
    () =>
      estimateGateWeight({
        widthMm: gateWidthMm,
        heightMm: gateHeightMm,
        slatSizeMm,
        slatGapMm,
        finishFamily: String(fenceContext.finish_type ?? "standard"),
        build,
        movement,
      }),
    [build, gateHeightMm, gateWidthMm, movement, slatGapMm, slatSizeMm, fenceContext.finish_type],
  );

  const rankedHinges = useMemo(
    () =>
      rankHinges({
        requiredRatingKg: weightEstimate.requiredRatingKg,
        gateGapMm: 20,
        whiteFinish,
        requireSelfClosing: true,
      }),
    [weightEstimate.requiredRatingKg, whiteFinish],
  );

  const rankedLatches = useMemo(
    () => rankLatches({ movement, whiteFinish }),
    [movement, whiteFinish],
  );

  const currentHingeValue = String(v.hinge_type ?? "TC-H-AT-HD-B");
  const currentLatchValue = String(v.latch_sku ?? "LL-DL-KA");
  const currentHingeBase = baseHardwareSku(currentHingeValue);
  const currentLatchBase = baseHardwareSku(currentLatchValue);

  const currentHingeStatus =
    rankedHinges.find(
      (o) => o.sku === currentHingeBase || o.effectiveSku === currentHingeValue,
    )?.status ?? "fail";
  const currentLatchStatus =
    rankedLatches.find(
      (o) => o.sku === currentLatchBase || o.effectiveSku === currentLatchValue,
    )?.status ?? "fail";

  const currentHingeEffectiveSku = rankedHinges.find(
    (o) => o.sku === currentHingeBase || o.effectiveSku === currentHingeValue,
  )?.effectiveSku;
  const currentLatchEffectiveSku = rankedLatches.find(
    (o) => o.sku === currentLatchBase || o.effectiveSku === currentLatchValue,
  )?.effectiveSku;

  const recommendedHingeSku = rankedHinges.find((o) => o.recommended)
    ?.effectiveSku;
  const recommendedLatchSku = rankedLatches.find((o) => o.recommended)
    ?.effectiveSku;

  const matchingHardwareKit = kitForHardwareSelection(
    currentHingeValue,
    currentLatchValue,
  );
  const selectedKitSku = String(v.hardware_kit_sku ?? "");
  const latchCanUseExternalAccessKit =
    currentLatchBase === "LLAA" || currentLatchBase.startsWith("LL-DL");

  const automationEnabled = v.automation_enabled === true;
  const automationPower = String(v.automation_power_source ?? "mains");
  const cableDistanceM = Number(v.automation_cable_distance_m ?? 0);
  const automationMotorSku =
    automationPower === "mains" && cableDistanceM > 30
      ? "XPSG-FILO-400PRO-SP"
      : "XPSG-FILO-400";
  const extraRemoteCount = Math.min(
    10,
    Math.max(0, Number(v.automation_extra_remotes ?? 0)),
  );

  // Auto-fix: when the currently selected hinge fails the weight check, switch
  // to the recommended one (e.g. after gate dimensions change).
  useEffect(() => {
    if (!isSwing || !recommendedHingeSku || currentHingeStatus !== "fail")
      return;
    upsertVariables({ hinge_type: recommendedHingeSku });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHingeStatus, isSwing, recommendedHingeSku]);

  useEffect(() => {
    if (!isSwing || !currentHingeEffectiveSku || currentHingeStatus === "fail")
      return;
    if (currentHingeValue === currentHingeEffectiveSku) return;
    upsertVariables({ hinge_type: currentHingeEffectiveSku });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHingeEffectiveSku, currentHingeStatus, currentHingeValue, isSwing]);

  useEffect(() => {
    if (!isSwing || !recommendedLatchSku || currentLatchStatus !== "fail")
      return;
    upsertVariables({ latch_sku: recommendedLatchSku });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLatchStatus, isSwing, recommendedLatchSku]);

  useEffect(() => {
    if (!isSwing || !currentLatchEffectiveSku || currentLatchStatus === "fail")
      return;
    if (currentLatchValue === currentLatchEffectiveSku) return;
    upsertVariables({ latch_sku: currentLatchEffectiveSku });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLatchEffectiveSku, currentLatchStatus, currentLatchValue, isSwing]);

  function upsertVariables(
    patch: Record<string, string | number | boolean | null | undefined>,
  ) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(seg, patch),
    });
  }

  function setMovement(value: string) {
    const nextMovement = gateMovementOrDefault(value);
    const nextBuild = defaultGateBuildForMovement(nextMovement, prefersVertical);
    upsertVariables({
      gate_movement: nextMovement,
      gate_build: nextBuild,
      opening_direction: nextMovement === "sliding" ? "right" : "out",
      leaf_count: nextMovement === "double_swing" ? 2 : 1,
      drop_bolt_sku:
        nextMovement === "double_swing" ? "SS-0300DB-B" : "none",
      hinge_type:
        nextMovement === "sliding"
          ? "none"
          : (v.hinge_type as string) ?? "TC-H-AT-HD-B",
      latch_sku:
        nextMovement === "sliding"
          ? "none"
          : (v.latch_sku as string) ?? "LL-DL-KA",
      gate_stop_sku:
        nextMovement === "sliding" ? "none" : (v.gate_stop_sku as string) ?? "none",
      sliding_track_sku:
        nextMovement === "sliding"
          ? (v.sliding_track_sku as string) ?? "XPSG-6000-TRACK-ST"
          : "XPSG-6000-TRACK-ST",
      sliding_guide_sku:
        nextMovement === "sliding"
          ? (v.sliding_guide_sku as string) ?? "XPSG-GUIDE"
          : "XPSG-GUIDE",
      sliding_catch_sku:
        nextMovement === "sliding"
          ? (v.sliding_catch_sku as string) ?? "XPSG-CATCH-U"
          : "XPSG-CATCH-U",
      hardware_kit_sku: "",
      include_external_access_kit: false,
    });
  }

  function applyMatchFence(enabled: boolean) {
    if (enabled) {
      const matchVars = resolveMatchFenceSegmentVars(
        fenceContext,
        maxFenceSegmentHeightMm,
      );
      dispatch({
        type: "UPSERT_SEGMENT",
        runId,
        segment: {
          ...patchSegmentVariables(seg, matchVars),
          targetHeightMm: matchVars.gate_height_mm as number,
        },
      });
    }
  }

  function updateHeight(value: number) {
    const h = clampGateHeightMm(value);
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...patchSegmentVariables(seg, { gate_height_mm: h }),
        targetHeightMm: h,
      },
    });
  }

  function updateWidth(value: number) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...patchSegmentVariables(seg, { gate_width_mm: value }),
        segmentWidthMm: value > 0 ? value : undefined,
      },
    });
  }

  const widthSoftWarn =
    Number.isFinite(gateWidthMm) && gateWidthMm > VALIDATION.maxSwingGateWidth && isSwing;

  const labelClass =
    "block text-[11px] font-medium uppercase tracking-wider text-brand-muted";

  return (
    <div className="p-3 bg-white dark:bg-brand-card space-y-4">
      {/* Match-fence toggle */}
      <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-brand-border bg-brand-card/40 px-3 py-2.5">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-brand-border"
          checked={matchFence}
          disabled={locked}
          onChange={(e) => applyMatchFence(e.target.checked)}
          data-testid="v4-gate-match-fence"
        />
        <span className="text-sm">
          <span className="font-medium text-brand-text">Match gate to fence</span>
          <span className="block text-brand-muted text-xs mt-0.5">
            Colour, slat size, gap and height copied from fence.
          </span>
        </span>
      </label>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Opening width (mm)</label>
          <NumberInput
            value={gateWidthMm}
            min={400}
            step={1}
            disabled={locked}
            onChange={updateWidth}
            data-testid="v4-gate-width-mm"
          />
          {widthSoftWarn && (
            <p className="text-[11px] text-amber-400" data-testid="v4-gate-width-warning">
              Over recommended max swing width ({VALIDATION.maxSwingGateWidth}mm).
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Gate height (mm)</label>
          {matchFence ? (
            <p className="rounded-md border border-brand-border/60 bg-brand-card/30 px-3 py-2 text-sm text-brand-text tabular-nums">
              {gateHeightMm} mm
            </p>
          ) : (
            <div className="space-y-1">
              <select
                value={GATE_HEIGHT_PRESETS_MM.includes(gateHeightMm as (typeof GATE_HEIGHT_PRESETS_MM)[number]) ? String(gateHeightMm) : "custom"}
                disabled={locked}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== "custom") updateHeight(Number(val));
                }}
                className="w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text"
                data-testid="v4-gate-height-preset"
              >
                {GATE_HEIGHT_PRESETS_MM.map((p) => (
                  <option key={p} value={p}>{p} mm</option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {!GATE_HEIGHT_PRESETS_MM.includes(gateHeightMm as (typeof GATE_HEIGHT_PRESETS_MM)[number]) && (
                <NumberInput
                  value={gateHeightMm}
                  min={600}
                  max={2100}
                  step={1}
                  disabled={locked}
                  onChange={updateHeight}
                  data-testid="v4-gate-height-custom"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gate configuration */}
      <div className="space-y-3 rounded-xl border border-brand-border/50 bg-brand-bg/60 p-3">
        <SegmentedField
          label="Gate type"
          value={movement}
          options={GATE_MOVEMENTS}
          onChange={setMovement}
          disabled={locked}
        />
        <SegmentedField
          label="QSG gate system"
          value={build}
          options={buildOptions}
          onChange={(value) => upsertVariables({ gate_build: value })}
          disabled={locked}
        />
        <SegmentedField
          label={isSwing ? "Opening direction" : "Slide direction"}
          value={currentDirection}
          options={directionOptions}
          onChange={(value) => upsertVariables({ opening_direction: value })}
          disabled={locked}
        />
        <SegmentedField
          label="Gate post"
          value={String(v.gate_post_size_mm ?? String(fenceContext.post_size ?? "50"))}
          options={GATE_POST_SIZE_OPTIONS}
          onChange={(value) => upsertVariables({ gate_post_size_mm: value })}
          disabled={locked}
        />

        {/* Post colour — always visible; defaults to match gate colour */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
              Post colour
            </p>
            <label className="flex items-center gap-1.5 text-xs text-brand-muted cursor-pointer">
              <input
                type="checkbox"
                disabled={locked}
                checked={!!v.post_colour_code}
                onChange={(e) =>
                  upsertVariables({ post_colour_code: e.target.checked ? gateColour : "" })
                }
              />
              Custom
            </label>
          </div>
          {v.post_colour_code ? (
            <div className={locked ? "pointer-events-none opacity-60" : ""}>
              <ColourSwatches
                value={String(v.post_colour_code)}
                onChange={(value) => upsertVariables({ post_colour_code: value })}
                colours={COLOUR_OPTIONS}
              />
            </div>
          ) : (
            <p className="text-xs text-brand-muted">
              Matching gate colour —{" "}
              <span className="text-brand-text">
                {COLOUR_OPTIONS.find((o) => o.value === gateColour)?.label ?? gateColour}
              </span>
            </p>
          )}
        </div>

        {/* Colour / slat options — hidden when match-fence */}
        {!matchFence && (
          <>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
                Gate colour
              </p>
              <div className={locked ? "pointer-events-none opacity-60" : ""}>
                <ColourSwatches
                  value={gateColour}
                  onChange={(value) => upsertVariables({ colour_code: value })}
                  colours={COLOUR_OPTIONS}
                />
              </div>
            </div>
            <SegmentedField
              label="Gate slat size"
              value={String(slatSizeMm)}
              options={[
                { value: "65", label: "65mm" },
                { value: "90", label: "90mm" },
              ]}
              onChange={(value) => upsertVariables({ slat_size_mm: Number(value) })}
              disabled={locked}
            />
            <SegmentedField
              label="Gate slat gap"
              value={String(slatGapMm)}
              options={SLAT_GAP_OPTIONS}
              onChange={(value) => upsertVariables({ slat_gap_mm: Number(value) })}
              disabled={locked}
            />
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={locked}
            checked={v.use_gate_posts_as_fence_termination !== false}
            onChange={(e) =>
              upsertVariables({ use_gate_posts_as_fence_termination: e.target.checked })
            }
          />
          <span className="text-brand-muted">
            Use gate posts as fence termination posts
          </span>
        </label>
      </div>

      {/* Hardware — swing vs sliding */}
      {isSwing ? (
        <div className="space-y-3 rounded-xl border border-brand-border/50 bg-brand-bg/60 p-3">
          <GateWeightCard estimate={weightEstimate} />
          <HingePicker
            value={currentHingeValue}
            options={rankedHinges}
            disabled={locked}
            onChange={(value) =>
              upsertVariables({ hinge_type: value, hardware_kit_sku: "" })
            }
          />
          <LatchPicker
            value={currentLatchValue}
            options={rankedLatches}
            disabled={locked}
            onChange={(value) =>
              upsertVariables({ latch_sku: value, hardware_kit_sku: "" })
            }
          />
          {matchingHardwareKit && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-green-500">
                    Save as kit
                  </p>
                  <p className="text-[11px] text-brand-muted">
                    {matchingHardwareKit.label} —{" "}
                    {matchingHardwareKit.kitSku}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() =>
                    upsertVariables({
                      hardware_kit_sku:
                        selectedKitSku === matchingHardwareKit.kitSku
                          ? ""
                          : matchingHardwareKit.kitSku,
                    })
                  }
                  className="rounded-lg border border-green-500 bg-brand-card px-3 py-1.5 text-xs font-medium text-green-500 hover:shadow-sm"
                >
                  {selectedKitSku === matchingHardwareKit.kitSku
                    ? "Using kit"
                    : "Use kit"}
                </button>
              </div>
            </div>
          )}
          {latchCanUseExternalAccessKit && (
            <label className="flex items-center gap-2 rounded-lg border border-brand-border/70 bg-brand-card p-3 text-sm">
              <input
                type="checkbox"
                disabled={locked}
                checked={v.include_external_access_kit === true}
                onChange={(e) =>
                  upsertVariables({
                    include_external_access_kit: e.target.checked,
                  })
                }
              />
              <span className="text-brand-muted">
                Add external access kit{" "}
                <b className="text-brand-text">LLB</b>
              </span>
            </label>
          )}
          <HardwareDropdown
            label="Drop bolt"
            value={String(
              v.drop_bolt_sku ??
                (movement === "double_swing" ? "SS-0300DB-B" : "none"),
            )}
            options={DROP_BOLT_OPTIONS}
            disabled={locked}
            onChange={(value) => upsertVariables({ drop_bolt_sku: value })}
          />
          <HardwareDropdown
            label="Gate stop"
            value={String(v.gate_stop_sku ?? "none")}
            options={GATE_STOP_OPTIONS}
            disabled={locked}
            onChange={(value) => upsertVariables({ gate_stop_sku: value })}
          />
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-brand-border/50 bg-brand-bg/60 p-3">
          <HardwareDropdown
            label="Track"
            value={String(v.sliding_track_sku ?? "XPSG-6000-TRACK-ST")}
            options={SLIDING_TRACK_OPTIONS}
            disabled={locked}
            onChange={(value) => upsertVariables({ sliding_track_sku: value })}
          />
          <HardwareDropdown
            label="Top guide system"
            value={String(v.sliding_guide_sku ?? "XPSG-GUIDE")}
            options={SLIDING_GUIDE_OPTIONS}
            disabled={locked}
            onChange={(value) => upsertVariables({ sliding_guide_sku: value })}
          />
          <HardwareDropdown
            label="Catch type"
            value={String(v.sliding_catch_sku ?? "XPSG-CATCH-U")}
            options={SLIDING_CATCH_OPTIONS}
            disabled={locked}
            onChange={(value) => upsertVariables({ sliding_catch_sku: value })}
          />
          {/* Automation */}
          <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={locked}
                checked={automationEnabled}
                onChange={(e) =>
                  upsertVariables({ automation_enabled: e.target.checked })
                }
              />
              <span className="font-medium text-brand-text">
                Add automation kit?
              </span>
            </label>
            {automationEnabled && (
              <div className="space-y-3">
                <SegmentedField
                  label="Power source"
                  value={automationPower}
                  options={[
                    { value: "mains", label: "Mains powered" },
                    { value: "solar", label: "Solar powered" },
                  ]}
                  disabled={locked}
                  onChange={(value) =>
                    upsertVariables({ automation_power_source: value })
                  }
                />
                {automationPower === "mains" && (
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>
                      Motor distance from mains outlet (m)
                    </span>
                    <NumberInput
                      value={cableDistanceM}
                      min={0}
                      step={1}
                      disabled={locked}
                      onChange={(value) =>
                        upsertVariables({
                          automation_cable_distance_m: Number(value),
                        })
                      }
                    />
                    {cableDistanceM > 30 && (
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] text-green-500">
                        Switched to Split Pack — better for long cable runs
                      </span>
                    )}
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={v.automation_battery === true}
                    onChange={(e) =>
                      upsertVariables({ automation_battery: e.target.checked })
                    }
                  />
                  <span className="text-brand-muted">
                    Add backup battery for power outages
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={v.automation_keypad === true}
                    onChange={(e) =>
                      upsertVariables({ automation_keypad: e.target.checked })
                    }
                  />
                  <span className="text-brand-muted">Wireless keypad</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Extra remotes</span>
                  <NumberInput
                    value={extraRemoteCount}
                    min={0}
                    max={10}
                    step={1}
                    disabled={locked}
                    onChange={(value) =>
                      upsertVariables({
                        automation_extra_remotes: Math.min(
                          10,
                          Math.max(0, Number(value)),
                        ),
                      })
                    }
                  />
                </label>
                <div className="rounded-lg border border-brand-border/70 bg-brand-bg/70 p-3 text-xs">
                  <p className="font-medium text-brand-text">
                    Automation summary
                  </p>
                  <div className="mt-2 space-y-1 text-brand-muted">
                    <div className="flex justify-between">
                      <span>1 × {automationMotorSku}</span>
                    </div>
                    {automationPower === "solar" && (
                      <div className="flex justify-between">
                        <span>1 × XPSG-FILO-SOLAR</span>
                      </div>
                    )}
                    {v.automation_battery === true && (
                      <div className="flex justify-between">
                        <span>1 × XPSG-FILO-BATTERY</span>
                      </div>
                    )}
                    {v.automation_keypad === true && (
                      <div className="flex justify-between">
                        <span>1 × XPSG-FILO-WKP</span>
                      </div>
                    )}
                    {extraRemoteCount > 0 && (
                      <div className="flex justify-between">
                        <span>{extraRemoteCount} × XPSG-FILO-REMOTE</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>
                        {Math.max(1, Math.ceil(gateWidthMm / 1000))} ×
                        XPSG-FILO-RACK
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-brand-muted">
                    Installation by certified electrician recommended for
                    mains-powered kits.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TerminationControl runId={runId} seg={seg} side="left" locked={locked} />
        <TerminationControl runId={runId} seg={seg} side="right" locked={locked} />
      </div>
    </div>
  );
}
