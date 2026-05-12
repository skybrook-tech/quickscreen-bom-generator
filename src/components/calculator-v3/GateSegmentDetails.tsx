import { useMemo, useState } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import {
  GATE_SEGMENT_STUB_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import {
  DROP_BOLT_OPTIONS,
  GATE_MOVEMENTS,
  GATE_STOP_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_GUIDE_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  defaultGateBuildForMovement,
  clearGateOpeningWidthMm,
  gateBuildsForMovement,
  gateLeafGeometry,
  gateMovementOrDefault,
  isSwingGateMovement,
  optionLabel,
  type GateOption,
} from "../../lib/gateOptionRules";
import { GateComponentDiagram } from "./GateComponentDiagram";
import {
  baseHardwareSku,
  estimateGateWeight,
  hingeGapForSku,
  isWhiteHardwareFinish,
  kitForHardwareSelection,
  latchGapForSku,
  rankHinges,
  rankLatches,
  type GateHardwareStatus,
  type GateWeightEstimate,
  type HingeHardware,
  type LatchHardware,
  type RankedHardware,
} from "../../lib/gateHardware";
import NumberInput from "../shared/NumberInput";
import { useProductSearch } from "../../hooks/useProductSearch";
import { ColourPalette } from "./ColourPalette";
import { priceForSku } from "../../lib/localBomCalculator";
import {
  OPTIONAL_ACCESSORY_KEY,
  optionalAccessoriesForParent,
  selectedOptionalAddOns,
} from "../../lib/bomMetadata";
import type { ReactNode } from "react";

const GATE_POST_SIZE_OPTIONS: GateOption[] = [
  { value: "50", label: "50mm Post Standard" },
  { value: "65", label: "65mm Post Standard HD" },
];

const COLOUR_OPTIONS: GateOption[] = [
  { value: "B", label: "Black Satin" },
  { value: "MN", label: "Monument Matt" },
  { value: "G", label: "Woodland Grey Matt" },
  { value: "SM", label: "Surfmist Matt" },
  { value: "W", label: "Pearl White Gloss" },
  { value: "BS", label: "Basalt Satin" },
  { value: "D", label: "Dune Satin" },
  { value: "M", label: "Mill" },
  { value: "P", label: "Primrose" },
  { value: "PB", label: "Paperbark" },
  { value: "S", label: "Palladium Silver Pearl" },
  { value: "KWI", label: "Kwila" },
  { value: "WRC", label: "Western Red Cedar" },
];

const SWING_DIRECTION_OPTIONS: GateOption[] = [
  { value: "out", label: "Swing out" },
  { value: "in", label: "Swing in" },
];

const SLIDING_DIRECTION_OPTIONS: GateOption[] = [
  { value: "left", label: "Slide left" },
  { value: "right", label: "Slide right" },
];

const SLIDING_SIDE_OPTIONS: GateOption[] = [
  { value: "front", label: "Slide in front of fence" },
  { value: "back", label: "Slide behind fence" },
];

const SLAT_SIZE_OPTIONS: GateOption[] = [
  { value: "65", label: "65mm slat" },
  { value: "90", label: "90mm slat" },
];

const SLAT_GAP_OPTIONS: GateOption[] = [
  { value: "5", label: "5mm" },
  { value: "9", label: "9mm" },
  { value: "12", label: "12mm" },
  { value: "15", label: "15mm" },
  { value: "20", label: "20mm" },
  { value: "30", label: "30mm" },
];

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

function optionClasses(active: boolean) {
  return `rounded-full border px-3 py-2 text-sm font-bold shadow-sm transition-colors ${
    active
      ? "border-brand-primary bg-brand-primary text-white shadow-sm"
      : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary"
  }`;
}

function OptionPills({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: GateOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-bold text-brand-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={optionClasses(value === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HardwareDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Search inventory",
}: {
  label: string;
  value: string;
  options: GateOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const selectedLabel = optionLabel(options, value);
  const hasPresetValue = options.some((option) => option.value === value);
  const [query, setQuery] = useState("");
  const { data: suggestions = [], isFetching } = useProductSearch(query);
  const filteredSuggestions = suggestions.filter((item) => {
    const haystack = `${item.sku} ${item.name} ${item.description} ${item.category}`.toLowerCase();
    return haystack.includes("gate") || haystack.includes("hinge") || haystack.includes("latch") ||
      haystack.includes("bolt") || haystack.includes("catch") || haystack.includes("track") ||
      haystack.includes("motor") || haystack.includes("stop");
  });

  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold text-brand-muted">{label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-text shadow-sm focus:border-brand-primary focus:outline-none"
        >
          {!hasPresetValue && value && (
            <option value={value}>{value} - inventory selection</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg border border-brand-border/70 bg-brand-card/80 p-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`${placeholder} for ${label.toLowerCase()}`}
          className="w-full rounded-md border border-brand-border bg-brand-bg px-2 py-1.5 text-sm font-semibold text-brand-text placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none"
        />
        <p className="mt-1 text-xs font-semibold text-brand-muted">
          Selected: <span className="text-brand-text">{selectedLabel || value}</span>
        </p>
        {query.trim().length >= 2 && (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-brand-border/60 bg-brand-bg">
            {isFetching ? (
              <div className="px-2 py-2 text-xs font-semibold text-brand-muted">Searching...</div>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <button
                  key={item.sku}
                  type="button"
                  onClick={() => {
                    onChange(item.sku);
                    setQuery("");
                  }}
                  className="block w-full border-b border-brand-border/50 px-2 py-2 text-left text-xs font-semibold text-brand-text last:border-b-0 hover:bg-brand-primary hover:text-white"
                >
                  <span className="block text-sm">{item.sku}</span>
                  <span className="block text-brand-muted">{item.name}</span>
                </button>
              ))
            ) : (
              <div className="px-2 py-2 text-xs font-semibold text-brand-muted">No hardware matches.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function statusClasses(status: GateHardwareStatus) {
  if (status === "fit") return "border-brand-success/50 bg-brand-success/10 text-brand-success";
  if (status === "tight") return "border-brand-warning/60 bg-brand-warning/10 text-brand-warning";
  return "border-brand-danger/50 bg-brand-danger/10 text-brand-danger";
}

function statusLabel(status: GateHardwareStatus) {
  if (status === "fit") return "Fits";
  if (status === "tight") return "Tight fit";
  return "Does not fit";
}

function rankedLabel<T extends { sku: string; label: string }>(
  options: Array<RankedHardware<T>>,
  value: string,
) {
  const match = options.find((option) => option.effectiveSku === value || option.sku === value);
  return match?.label ?? value;
}

function GateSettingsSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-brand-border/50 bg-brand-bg/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-extrabold text-brand-text"
      >
        <span>{title}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-brand-primary">
          {!open && summary ? (
            <span className="max-w-[12rem] truncate rounded-full bg-brand-card px-2 py-0.5 text-brand-muted">
              {summary}
            </span>
          ) : null}
          <span>{open ? "Hide" : "Show"}</span>
        </span>
      </button>
      {open && <div className="space-y-3 border-t border-brand-border/50 p-3">{children}</div>}
    </div>
  );
}

function GateWeightCard({ estimate }: { estimate: GateWeightEstimate }) {
  return (
    <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-text">Estimated leaf weight</p>
          <p className="text-xs font-semibold text-brand-muted">
            Used for hinge rating. It uses the finished leaf size, not stock off-cuts.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black tabular-nums text-brand-primary">{estimate.totalKg.toFixed(1)}kg</p>
          <p className="text-xs font-bold text-brand-muted">
            Need {estimate.requiredRatingKg}kg+ hinges
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-brand-muted">
        <span>Slats <b className="text-brand-text">{estimate.slatCount}</b></span>
        <span>Slat kg <b className="text-brand-text">{estimate.slatWeightKg.toFixed(1)}</b></span>
        <span>Frame kg <b className="text-brand-text">{estimate.frameWeightKg.toFixed(1)}</b></span>
      </div>
    </div>
  );
}

function OptionalAddOns({
  parentSku,
  selected,
  onChange,
}: {
  parentSku: string;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const options = optionalAccessoriesForParent(parentSku);
  if (options.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3">
      <p className="text-sm font-black text-brand-text">Optional add-ons</p>
      <p className="mb-2 text-xs font-semibold text-brand-muted">
        These are offered with {parentSku} and only appear on the BOM when ticked.
      </p>
      <div className="space-y-2">
        {options.map((option) => {
          const checked = selected.includes(option.sku);
          return (
            <label
              key={`${parentSku}-${option.sku}`}
              className="flex items-start gap-2 rounded-lg border border-brand-border/60 bg-brand-bg/50 p-2"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                onChange={(event) => {
                  onChange(
                    event.target.checked
                      ? [...selected, option.sku]
                      : selected.filter((sku) => sku !== option.sku),
                  );
                }}
              />
              <span>
                <span className="block text-sm font-bold text-brand-text">
                  + {option.label}
                </span>
                <span className="block text-xs font-semibold text-brand-muted">
                  {option.sku}
                  {option.unitPrice > 0 ? ` - $${option.unitPrice.toFixed(2)} ex GST` : " - price not set"}
                </span>
              </span>
            </label>
          );
        })}
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
  const tags = reasons.length > 0 ? reasons : status === "tight" ? ["Close to required rating"] : [];
  if (tags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {tags.map((reason) => (
        <span
          key={reason}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClasses(status)}`}
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
}: {
  value: string;
  options: RankedHardware<HingeHardware>[];
  onChange: (value: string) => void;
}) {
  const baseValue = baseHardwareSku(value);
  const primaryOptions = options.filter((option) => option.status !== "fail");
  const otherOptions = options.filter((option) => option.status === "fail");
  const renderOption = (option: RankedHardware<HingeHardware>) => {
    const active = baseValue === option.sku || value === option.effectiveSku;
    return (
      <button
        key={option.sku}
        type="button"
        onClick={() => onChange(option.effectiveSku)}
        className={`rounded-lg border p-3 text-left shadow-none transition hover:shadow-sm ${
          active
            ? "border-brand-primary bg-brand-primary/10"
            : "border-brand-border bg-brand-card hover:border-brand-primary"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-brand-text">{option.label}</p>
            <p className="text-xs font-bold text-brand-muted">
              {option.effectiveSku} - {option.ratingKg}kg - gap {option.gapMinMm}-{option.gapMaxMm}mm
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {option.recommended && (
              <span className="rounded-full bg-brand-success px-2 py-0.5 text-[11px] font-black text-white">
                Recommended cheapest fit
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${statusClasses(option.status)}`}>
              {statusLabel(option.status)}
            </span>
          </div>
        </div>
        <HardwareReasonTags status={option.status} reasons={option.reasons} />
      </button>
    );
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-muted">Hinge / closer</p>
        <span className="text-xs font-bold text-brand-muted">{options.length} catalogue hinges</span>
      </div>
      <div className="grid gap-2">
        {primaryOptions.map(renderOption)}
        {otherOptions.length > 0 && (
          <details className="rounded-lg border border-brand-border bg-brand-card/70">
            <summary className="cursor-pointer px-3 py-2 text-sm font-black text-brand-muted">
              Other hinges
            </summary>
            <div className="grid gap-2 border-t border-brand-border/60 p-2">
              {otherOptions.map(renderOption)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function LatchPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: RankedHardware<LatchHardware>[];
  onChange: (value: string) => void;
}) {
  const baseValue = baseHardwareSku(value);
  const primaryOptions = options.filter((option) => option.status !== "fail");
  const otherOptions = options.filter((option) => option.status === "fail");
  const renderOption = (option: RankedHardware<LatchHardware>) => {
    const active = baseValue === option.sku || value === option.effectiveSku;
    return (
      <button
        key={option.sku}
        type="button"
        onClick={() => onChange(option.effectiveSku)}
        className={`rounded-lg border p-3 text-left shadow-none transition hover:shadow-sm ${
          active
            ? "border-brand-primary bg-brand-primary/10"
            : "border-brand-border bg-brand-card hover:border-brand-primary"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-brand-text">{option.label}</p>
            <p className="text-xs font-bold text-brand-muted">
              {option.effectiveSku}
              {option.lockable ? " - lockable" : ""}
              {option.poolSafe ? " - pool safe" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {option.recommended && (
              <span className="rounded-full bg-brand-success px-2 py-0.5 text-[11px] font-black text-white">
                Recommended
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${statusClasses(option.status)}`}>
              {statusLabel(option.status)}
            </span>
          </div>
        </div>
        <HardwareReasonTags status={option.status} reasons={option.reasons} />
      </button>
    );
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-muted">Latch / lock</p>
        <span className="text-xs font-bold text-brand-muted">Filtered to gate movement</span>
      </div>
      <div className="grid gap-2">
        {primaryOptions.map(renderOption)}
        {otherOptions.length > 0 && (
          <details className="rounded-lg border border-brand-border bg-brand-card/70">
            <summary className="cursor-pointer px-3 py-2 text-sm font-black text-brand-muted">
              Other latches
            </summary>
            <div className="grid gap-2 border-t border-brand-border/60 p-2">
              {otherOptions.map(renderOption)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export function GateSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const v = seg.variables ?? {};
  const run = state.payload?.runs.find((item) => item.runId === runId);
  const runVars = { ...(state.payload?.variables ?? {}), ...(run?.variables ?? {}) };
  const movement = gateMovementOrDefault(v[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const buildOptions = gateBuildsForMovement(movement);
  const prefersVerticalGate =
    run?.productCode === "VS" ||
    String(v[GATE_SEGMENT_STUB_KEYS.gateBuild] ?? "").includes("vertical");
  const build = buildOptions.some((option) => option.value === v[GATE_SEGMENT_STUB_KEYS.gateBuild])
    ? String(v[GATE_SEGMENT_STUB_KEYS.gateBuild])
    : defaultGateBuildForMovement(movement, prefersVerticalGate);
  const isSwing = isSwingGateMovement(movement);
  const directionOptions = isSwing ? SWING_DIRECTION_OPTIONS : SLIDING_DIRECTION_OPTIONS;
  const currentDirection = String(
    v[GATE_SEGMENT_STUB_KEYS.openingDirection] ??
      (isSwing ? "out" : "right"),
  );
  const masterPostSize = String(runVars.post_size ?? 50);
  const masterVars = {
    ...runVars,
  };
  const gateColour = String(v[GATE_SEGMENT_STUB_KEYS.colourCode] ?? masterVars.colour_code ?? "B");
  const slatSizeMm = Number(v[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVars.slat_size_mm ?? 65);
  const slatGapMm = Number(v[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVars.slat_gap_mm ?? 9);
  const gateHeightMm = Number(
    seg.targetHeightMm ??
      v[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ??
      runVars.target_height_mm ??
      1800,
  );
  const gateWidthMm = Number(seg.segmentWidthMm ?? 900);
  const whiteFinish = isWhiteHardwareFinish(gateColour);
  const currentHingeValue = String(v[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B");
  const currentLatchValue = String(v[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA");
  const hingeGapMm = isSwing ? hingeGapForSku(currentHingeValue) : 0;
  const latchGapMm = isSwing ? latchGapForSku(currentLatchValue) : 0;
  const gateGeometry = gateLeafGeometry({
    movement,
    openingWidthMm: gateWidthMm,
    hingeGapMm,
    latchGapMm,
    leafWidthsMm: seg.leaves?.map((leaf) => leaf.widthMm),
  });
  const { leafCount, leafWidthMm, leafWidthsMm } = gateGeometry;
  const clearOpeningMm = clearGateOpeningWidthMm({
    movement,
    openingWidthMm: gateWidthMm,
    hingeGapMm,
    latchGapMm,
  });
  const weightEstimate = useMemo(
    () =>
      estimateGateWeight({
        widthMm: leafWidthMm,
        heightMm: gateHeightMm,
        slatSizeMm,
        slatGapMm,
        finishFamily: String(masterVars.finish_family ?? "standard"),
        build,
        movement,
      }),
    [build, gateHeightMm, leafWidthMm, movement, slatGapMm, slatSizeMm, masterVars.finish_family],
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
    () =>
      rankLatches({
        movement,
        whiteFinish,
      }),
    [movement, whiteFinish],
  );
  const currentLatchBase = baseHardwareSku(currentLatchValue);
  const matchingHardwareKit = kitForHardwareSelection(currentHingeValue, currentLatchValue);
  const selectedKitSku = String(v[GATE_SEGMENT_STUB_KEYS.hardwareKitSku] ?? "");
  const optionalAddOns = selectedOptionalAddOns(v);
  const latchCanUseExternalAccessKit = currentLatchBase === "LLAA" || currentLatchBase.startsWith("LL-DL");
  const automationEnabled = v[GATE_SEGMENT_STUB_KEYS.automationEnabled] === true;
  const automationPower = String(v[GATE_SEGMENT_STUB_KEYS.automationPowerSource] ?? "mains");
  const cableDistanceM = Number(v[GATE_SEGMENT_STUB_KEYS.automationCableDistanceM] ?? 0);
  const automationMotorSku =
    automationPower === "mains" && cableDistanceM > 30
      ? "XPSG-FILO-400PRO-SP"
      : "XPSG-FILO-400";
  const rackCount = Math.max(1, Math.ceil(gateWidthMm / 1000));
  const extraRemoteCount = Math.min(
    10,
    Math.max(0, Number(v[GATE_SEGMENT_STUB_KEYS.automationExtraRemotes] ?? 0)),
  );
  const automationSummary = [
    { sku: automationMotorSku, qty: 1 },
    ...(automationPower === "solar" ? [{ sku: "XPSG-FILO-SOLAR", qty: 1 }] : []),
    ...(v[GATE_SEGMENT_STUB_KEYS.automationBattery] === true ? [{ sku: "XPSG-FILO-BATTERY", qty: 1 }] : []),
    ...(v[GATE_SEGMENT_STUB_KEYS.automationKeypad] === true ? [{ sku: "XPSG-FILO-WKP", qty: 1 }] : []),
    ...(extraRemoteCount > 0 ? [{ sku: "XPSG-FILO-REMOTE", qty: extraRemoteCount }] : []),
    { sku: "XPSG-FILO-RACK", qty: rackCount },
  ];
  const automationSubtotal = automationSummary.reduce(
    (sum, item) => sum + priceForSku(item.sku, item.qty) * item.qty,
    0,
  );

  function upsertSegmentPatch({
    patch,
    leaves,
  }: {
    patch?: Record<string, string | number | boolean | null | undefined>;
    leaves?: Array<{ widthMm: number }>;
  }) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...(patch ? patchSegmentVariables(seg, patch) : seg),
        ...(leaves ? { leaves } : {}),
      },
    });
  }

  function upsertVariables(patch: Record<string, string | number | boolean | null | undefined>) {
    upsertSegmentPatch({ patch });
  }

  function setMovement(value: string) {
    const nextMovement = gateMovementOrDefault(value);
    const nextBuild = defaultGateBuildForMovement(nextMovement, prefersVerticalGate);
    const nextClearOpening = clearGateOpeningWidthMm({
      movement: nextMovement,
      openingWidthMm: gateWidthMm,
      hingeGapMm,
      latchGapMm,
    });
    const nextLeaves =
      nextMovement === "double_swing"
        ? [
            { widthMm: Math.round(nextClearOpening / 2) },
            { widthMm: Math.round(nextClearOpening - Math.round(nextClearOpening / 2)) },
          ]
        : [{ widthMm: Math.round(nextClearOpening) }];
    upsertSegmentPatch({
      leaves: nextLeaves,
      patch: {
      [GATE_SEGMENT_STUB_KEYS.gateMovement]: nextMovement,
      [GATE_SEGMENT_STUB_KEYS.gateBuild]: nextBuild,
      [GATE_SEGMENT_STUB_KEYS.openingDirection]:
        nextMovement === "sliding" ? "right" : "out",
      [GATE_SEGMENT_STUB_KEYS.slidingSide]:
        nextMovement === "sliding" ? v[GATE_SEGMENT_STUB_KEYS.slidingSide] ?? "front" : "front",
      [GATE_SEGMENT_STUB_KEYS.leafCount]: nextMovement === "double_swing" ? 2 : 1,
      [GATE_SEGMENT_STUB_KEYS.dropBoltType]:
        nextMovement === "double_swing" ? "SS-0300DB-B" : "none",
      [GATE_SEGMENT_STUB_KEYS.hingeType]:
        nextMovement === "sliding" ? "none" : v[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B",
      [GATE_SEGMENT_STUB_KEYS.latchType]:
        nextMovement === "sliding" ? "none" : v[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA",
      [GATE_SEGMENT_STUB_KEYS.gateStopType]:
        nextMovement === "sliding" ? "none" : v[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none",
      [GATE_SEGMENT_STUB_KEYS.slidingTrackType]:
        nextMovement === "sliding" ? v[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST" : "XPSG-6000-TRACK-ST",
      [GATE_SEGMENT_STUB_KEYS.slidingGuideType]:
        nextMovement === "sliding" ? v[GATE_SEGMENT_STUB_KEYS.slidingGuideType] ?? "XPSG-GUIDE" : "XPSG-GUIDE",
      [GATE_SEGMENT_STUB_KEYS.slidingCatchType]:
        nextMovement === "sliding" ? v[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U" : "XPSG-CATCH-U",
      [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
      [GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit]: false,
      },
    });
  }

  function updateLeafWidth(leafIndex: 0 | 1, widthMm: number) {
    const total = Math.max(2, Math.round(clearOpeningMm));
    const clamped = Math.min(total - 1, Math.max(1, Math.round(widthMm)));
    const nextLeaf1 = leafIndex === 0 ? clamped : total - clamped;
    const nextLeaf2 = total - nextLeaf1;
    upsertSegmentPatch({
      leaves: [{ widthMm: nextLeaf1 }, { widthMm: nextLeaf2 }],
    });
  }

  function setOptionalAddOns(parentSku: string, selected: string[]) {
    const next = { ...optionalAddOns };
    if (selected.length > 0) {
      next[parentSku] = selected;
    } else {
      delete next[parentSku];
    }
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(seg, {
        [OPTIONAL_ACCESSORY_KEY]: Object.keys(next).length
          ? JSON.stringify(next)
          : null,
      }),
    });
  }

  function clearOptionalAddOnsFor(parentSku: string) {
    if (!optionalAddOns[parentSku]) return {};
    const next = { ...optionalAddOns };
    delete next[parentSku];
    return {
      [OPTIONAL_ACCESSORY_KEY]: Object.keys(next).length
        ? JSON.stringify(next)
        : null,
    };
  }

  return (
    <div className="space-y-4 text-sm font-semibold">
      <GateSettingsSection
        title="Gate type"
        summary={`${optionLabel(GATE_MOVEMENTS, movement)} / ${Number(seg.segmentWidthMm ?? 0)}mm wide`}
      >
        <OptionPills
          label="Gate type"
          value={movement}
          options={GATE_MOVEMENTS}
          onChange={setMovement}
        />
      </GateSettingsSection>

      <GateSettingsSection
        title="QSG gate system"
        summary={optionLabel(buildOptions, build)}
      >
        <OptionPills
          label="QSG gate system"
          value={build}
          options={buildOptions}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.gateBuild]: value })}
        />
      </GateSettingsSection>

      {isSwing && movement === "double_swing" && (
        <GateSettingsSection
          title="Double gate leaves"
          summary={`${Math.round(leafWidthsMm[0] ?? 0)}mm + ${Math.round(leafWidthsMm[1] ?? 0)}mm`}
          defaultOpen
        >
          <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3 text-xs font-bold text-brand-muted">
            Finished leaves are calculated after hinge gaps and the shared latch gap. Changing one leaf automatically adjusts the other.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((index) => {
              const leafWidth = Math.round(leafWidthsMm[index] ?? clearOpeningMm / 2);
              return (
                <label key={index} className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-brand-muted">Leaf {index + 1} finished width (mm)</span>
                  <NumberInput
                    value={leafWidth}
                    min={1}
                    max={Math.max(1, Math.round(clearOpeningMm) - 1)}
                    step={10}
                    className="w-28 px-2 py-1.5 text-center tabular-nums"
                    onChange={(value) => updateLeafWidth(index as 0 | 1, Number(value))}
                  />
                  {leafWidth < 800 && (
                    <span className="text-xs font-bold text-brand-warning">
                      Soft warning: leaf is under 800mm.
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-xs font-semibold text-brand-muted">
            Clear leaf total: <b className="text-brand-text">{Math.round(clearOpeningMm)}mm</b> from a{" "}
            <b className="text-brand-text">{Math.round(gateWidthMm)}mm</b> opening.
          </p>
        </GateSettingsSection>
      )}

      <GateSettingsSection
        title={isSwing ? "Opening direction" : "Slide direction"}
        summary={optionLabel(directionOptions, currentDirection)}
      >
        <OptionPills
          label={isSwing ? "Opening direction" : "Slide direction"}
          value={currentDirection}
          options={directionOptions}
          onChange={(value) =>
            upsertVariables({ [GATE_SEGMENT_STUB_KEYS.openingDirection]: value })
          }
        />
        {!isSwing && (
          <OptionPills
            label="Sliding side"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingSide] ?? "front")}
            options={SLIDING_SIDE_OPTIONS}
            onChange={(value) =>
              upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingSide]: value })
            }
          />
        )}
      </GateSettingsSection>

      <GateSettingsSection
        title="Gate post"
        summary={`${String(v[GATE_SEGMENT_STUB_KEYS.gatePostSizeMm] ?? masterVars.post_size ?? masterPostSize)}mm`}
      >
        <OptionPills
          label="Gate post"
          value={String(v[GATE_SEGMENT_STUB_KEYS.gatePostSizeMm] ?? masterVars.post_size ?? masterPostSize)}
          options={GATE_POST_SIZE_OPTIONS}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(value) })}
        />
      </GateSettingsSection>

      <GateSettingsSection
        title="Gate colour"
        summary={String(v[GATE_SEGMENT_STUB_KEYS.colourCode] ?? masterVars.colour_code ?? "B")}
      >
        <div className="space-y-1">
          <p className="text-sm font-bold text-brand-muted">Gate colour</p>
          <ColourPalette
            value={String(v[GATE_SEGMENT_STUB_KEYS.colourCode] ?? masterVars.colour_code ?? "B")}
            options={COLOUR_OPTIONS.map((option) => option.value)}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.colourCode]: value })}
          />
        </div>
      </GateSettingsSection>

      <GateSettingsSection
        title="Gate slat size"
        summary={`${String(v[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVars.slat_size_mm ?? 65)}mm`}
      >
        <OptionPills
          label="Gate slat size"
          value={String(v[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVars.slat_size_mm ?? 65)}
          options={SLAT_SIZE_OPTIONS}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(value) })}
        />
      </GateSettingsSection>

      <GateSettingsSection
        title="Gate slat gap"
        summary={`${String(v[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVars.slat_gap_mm ?? 9)}mm`}
      >
        <OptionPills
          label="Gate slat gap"
          value={String(v[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVars.slat_gap_mm ?? 9)}
          options={SLAT_GAP_OPTIONS}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(value) })}
        />
      </GateSettingsSection>

      <GateSettingsSection
        title="Gate termination posts"
        summary={v[GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination] === false ? "Fence posts separate" : "Use gate posts"}
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v[GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination] !== false}
            onChange={(e) =>
              upsertVariables({
                [GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination]: e.target.checked,
              })
            }
          />
          <span className="text-brand-muted">Use gate posts as fence termination posts</span>
        </label>
      </GateSettingsSection>

      {isSwing ? (
        <GateSettingsSection
          title="Swing hardware"
          summary={`${rankedLabel(rankedHinges, currentHingeValue)} / ${rankedLabel(rankedLatches, currentLatchValue)}`}
        >
          <GateWeightCard estimate={weightEstimate} />
          <div className="rounded-lg border border-brand-border/70 bg-brand-card p-3 text-xs font-bold text-brand-muted">
            <span className="text-brand-text">{leafCount}</span> leaf{leafCount === 1 ? "" : "s"} from a{" "}
            <span className="text-brand-text">{Math.round(gateWidthMm)}mm</span> opening.{" "}
            {leafCount === 2
              ? `Each leaf is calculated after ${Math.round(hingeGapMm)}mm hinge gap on each side and ${Math.round(latchGapMm)}mm shared latch gap: `
              : `Leaf width after ${Math.round(hingeGapMm)}mm hinge gap and ${Math.round(latchGapMm)}mm latch gap: `}
            <span className="text-brand-text">{leafWidthsMm.map((width) => `${Math.round(width)}mm`).join(" + ")}</span>.
          </div>
          <HingePicker
            value={currentHingeValue}
            options={rankedHinges}
            onChange={(value) =>
              upsertVariables({
                [GATE_SEGMENT_STUB_KEYS.hingeType]: value,
                [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
                ...clearOptionalAddOnsFor(baseHardwareSku(currentHingeValue)),
              })
            }
          />
          <OptionalAddOns
            parentSku={baseHardwareSku(currentHingeValue)}
            selected={optionalAddOns[baseHardwareSku(currentHingeValue)] ?? []}
            onChange={(selected) => setOptionalAddOns(baseHardwareSku(currentHingeValue), selected)}
          />
          <LatchPicker
            value={currentLatchValue}
            options={rankedLatches}
            onChange={(value) =>
              upsertVariables({
                [GATE_SEGMENT_STUB_KEYS.latchType]: value,
                [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
                ...clearOptionalAddOnsFor(baseHardwareSku(currentLatchValue)),
              })
            }
          />
          {matchingHardwareKit && (
            <div className="rounded-lg border border-brand-success/40 bg-brand-success/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-brand-success">Save as kit</p>
                  <p className="text-xs font-bold text-brand-muted">
                    {matchingHardwareKit.label} - {matchingHardwareKit.kitSku}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    upsertVariables({
                      [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]:
                        selectedKitSku === matchingHardwareKit.kitSku ? "" : matchingHardwareKit.kitSku,
                    })
                  }
                  className="rounded-lg border border-brand-success bg-brand-card px-3 py-1.5 text-xs font-black text-brand-success hover:shadow-sm"
                >
                  {selectedKitSku === matchingHardwareKit.kitSku ? "Using kit" : "Use kit"}
                </button>
              </div>
            </div>
          )}
          {latchCanUseExternalAccessKit && (
            <label className="flex items-center gap-2 rounded-lg border border-brand-border/70 bg-brand-card p-3">
              <input
                type="checkbox"
                checked={v[GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit] === true}
                onChange={(e) =>
                  upsertVariables({
                    [GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit]: e.target.checked,
                  })
                }
              />
              <span className="text-sm font-bold text-brand-muted">
                Add external access kit <b className="text-brand-text">LLB</b>
              </span>
            </label>
          )}
          <HardwareDropdown
            label="Drop bolt"
            value={String(v[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? (movement === "double_swing" ? "SS-0300DB-B" : "none"))}
            options={DROP_BOLT_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.dropBoltType]: value })}
          />
          <HardwareDropdown
            label="Gate stop"
            value={String(v[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none")}
            options={GATE_STOP_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.gateStopType]: value })}
          />
        </GateSettingsSection>
      ) : (
        <GateSettingsSection
          title="Sliding hardware"
          summary={`${String(v[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST")} / ${automationEnabled ? "Automation on" : "Manual"}`}
        >
          <HardwareDropdown
            label="Track"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST")}
            options={SLIDING_TRACK_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingTrackType]: value })}
          />
          <HardwareDropdown
            label="Top guide system"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingGuideType] ?? "XPSG-GUIDE")}
            options={SLIDING_GUIDE_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingGuideType]: value })}
          />
          <HardwareDropdown
            label="Catch type"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U")}
            options={SLIDING_CATCH_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingCatchType]: value })}
          />
          <div className="space-y-3 rounded-lg border border-brand-border/70 bg-brand-card p-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={automationEnabled}
                onChange={(e) =>
                  upsertVariables({
                    [GATE_SEGMENT_STUB_KEYS.automationEnabled]: e.target.checked,
                    [GATE_SEGMENT_STUB_KEYS.slidingMotorType]: e.target.checked ? "none" : "none",
                  })
                }
              />
              <span className="text-sm font-black text-brand-text">Add automation kit?</span>
            </label>
            {automationEnabled && (
              <div className="space-y-3">
                <OptionPills
                  label="Power source"
                  value={automationPower}
                  options={[
                    { value: "mains", label: "Mains powered" },
                    { value: "solar", label: "Solar powered" },
                  ]}
                  onChange={(value) =>
                    upsertVariables({ [GATE_SEGMENT_STUB_KEYS.automationPowerSource]: value })
                  }
                />
                {automationPower === "mains" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-brand-muted">Motor distance from mains outlet (m)</span>
                    <NumberInput
                      value={cableDistanceM}
                      min={0}
                      step={1}
                      className="w-24 px-2 py-1.5 text-center tabular-nums"
                      onChange={(value) =>
                        upsertVariables({
                          [GATE_SEGMENT_STUB_KEYS.automationCableDistanceM]: Number(value),
                        })
                      }
                    />
                    {cableDistanceM > 30 && (
                      <span className="rounded-full border border-brand-success/30 bg-brand-success/10 px-2 py-1 text-xs font-bold text-brand-success">
                        Switched to Split Pack - better for long cable runs
                      </span>
                    )}
                  </label>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={v[GATE_SEGMENT_STUB_KEYS.automationBattery] === true}
                    onChange={(e) =>
                      upsertVariables({ [GATE_SEGMENT_STUB_KEYS.automationBattery]: e.target.checked })
                    }
                  />
                  <span className="text-sm font-bold text-brand-muted">Add backup battery for power outages</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={v[GATE_SEGMENT_STUB_KEYS.automationKeypad] === true}
                    onChange={(e) =>
                      upsertVariables({ [GATE_SEGMENT_STUB_KEYS.automationKeypad]: e.target.checked })
                    }
                  />
                  <span className="text-sm font-bold text-brand-muted">Wireless keypad</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-brand-muted">Extra remotes</span>
                  <NumberInput
                    value={extraRemoteCount}
                    min={0}
                    max={10}
                    step={1}
                    className="w-20 px-2 py-1.5 text-center tabular-nums"
                    onChange={(value) =>
                      upsertVariables({
                        [GATE_SEGMENT_STUB_KEYS.automationExtraRemotes]: Math.min(10, Math.max(0, Number(value))),
                      })
                    }
                  />
                </label>
                <div className="rounded-lg border border-brand-border/70 bg-brand-bg/70 p-3">
                  <p className="text-sm font-black text-brand-text">Automation summary</p>
                  <div className="mt-2 space-y-1 text-xs font-bold text-brand-muted">
                    {automationSummary.map((item) => (
                      <div key={item.sku} className="flex justify-between gap-2">
                        <span>{item.qty} x {item.sku}</span>
                        <span>${priceForSku(item.sku, item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-sm font-black text-brand-text">
                    <span>Automation subtotal</span>
                    <span>${automationSubtotal.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-brand-muted">
                    Installation by certified electrician recommended for mains-powered kits.
                  </p>
                </div>
              </div>
              )}
          </div>
        </GateSettingsSection>
      )}

      <GateComponentDiagram orientation={build.includes("vertical") ? "vertical" : "horizontal"} />
    </div>
  );
}
