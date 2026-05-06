import { useState } from "react";
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
  HINGE_OPTIONS,
  LATCH_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_MOTOR_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  defaultGateBuildForMovement,
  gateBuildsForMovement,
  gateMovementOrDefault,
  isSwingGateMovement,
  optionLabel,
  type GateOption,
} from "../../lib/gateOptionRules";
import NumberInput from "../shared/NumberInput";
import { useProductSearch } from "../../hooks/useProductSearch";
import { ColourPalette } from "./ColourPalette";

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

  function upsertVariables(patch: Record<string, string | number | boolean | null | undefined>) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(seg, patch),
    });
  }

  function setMovement(value: string) {
    const nextMovement = gateMovementOrDefault(value);
    const nextBuild = defaultGateBuildForMovement(nextMovement, prefersVerticalGate);
    upsertVariables({
      [GATE_SEGMENT_STUB_KEYS.gateMovement]: nextMovement,
      [GATE_SEGMENT_STUB_KEYS.gateBuild]: nextBuild,
      [GATE_SEGMENT_STUB_KEYS.openingDirection]:
        nextMovement === "sliding" ? "right" : "out",
      [GATE_SEGMENT_STUB_KEYS.leafCount]: nextMovement === "double_swing" ? 2 : 1,
      [GATE_SEGMENT_STUB_KEYS.dropBoltType]:
        nextMovement === "double_swing" ? "SS-0300DB-B" : "none",
      [GATE_SEGMENT_STUB_KEYS.hingeType]:
        nextMovement === "sliding" ? "none" : v[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B",
      [GATE_SEGMENT_STUB_KEYS.latchType]:
        nextMovement === "sliding" ? "none" : v[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA",
      [GATE_SEGMENT_STUB_KEYS.gateStopType]:
        nextMovement === "sliding" ? "none" : v[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none",
    });
  }

  function updateHeight(value: number) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...patchSegmentVariables(seg, {
          [GATE_SEGMENT_STUB_KEYS.matchRunHeight]: false,
          [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: value,
        }),
        targetHeightMm: value,
      },
    });
  }

  return (
    <div className="space-y-4 text-sm font-semibold">
      <div className="space-y-3 rounded-2xl border border-brand-border/50 bg-brand-bg/60 p-3">
        <OptionPills
          label="Gate type"
          value={movement}
          options={GATE_MOVEMENTS}
          onChange={setMovement}
        />
        <OptionPills
          label="QSG gate system"
          value={build}
          options={buildOptions}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.gateBuild]: value })}
        />
        <OptionPills
          label={isSwing ? "Opening direction" : "Slide direction"}
          value={currentDirection}
          options={directionOptions}
          onChange={(value) =>
            upsertVariables({ [GATE_SEGMENT_STUB_KEYS.openingDirection]: value })
          }
        />
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-muted">Gate height</span>
            <div className="flex items-center gap-2">
              <NumberInput
                value={Number(seg.targetHeightMm ?? v[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ?? runVars.target_height_mm ?? 1800)}
                min={600}
                max={2500}
                step={50}
                onChange={(value) => updateHeight(Number(value))}
              />
              <span className="text-brand-muted">mm</span>
            </div>
          </label>
        </div>
        <OptionPills
          label="Gate post"
          value={String(v[GATE_SEGMENT_STUB_KEYS.gatePostSizeMm] ?? masterVars.post_size ?? masterPostSize)}
          options={GATE_POST_SIZE_OPTIONS}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: Number(value) })}
        />
        <div className="space-y-1">
          <p className="text-sm font-bold text-brand-muted">Gate colour</p>
          <ColourPalette
            value={String(v[GATE_SEGMENT_STUB_KEYS.colourCode] ?? masterVars.colour_code ?? "B")}
            options={COLOUR_OPTIONS.map((option) => option.value)}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.colourCode]: value })}
          />
        </div>
        <OptionPills
          label="Gate slat size"
          value={String(v[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? masterVars.slat_size_mm ?? 65)}
          options={SLAT_SIZE_OPTIONS}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(value) })}
        />
        <OptionPills
          label="Gate slat gap"
          value={String(v[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? masterVars.slat_gap_mm ?? 9)}
          options={SLAT_GAP_OPTIONS}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slatGapMm]: Number(value) })}
        />
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
      </div>

      {isSwing ? (
        <div className="space-y-3 rounded-2xl border border-brand-border/50 bg-brand-bg/60 p-3">
          <HardwareDropdown
            label="Hinge / closer"
            value={String(v[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B")}
            options={HINGE_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.hingeType]: value })}
          />
          <HardwareDropdown
            label="Latch / lock"
            value={String(v[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA")}
            options={LATCH_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.latchType]: value })}
          />
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
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-brand-border/50 bg-brand-bg/60 p-3">
          <HardwareDropdown
            label="Track"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST")}
            options={SLIDING_TRACK_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingTrackType]: value })}
          />
          <HardwareDropdown
            label="Catch"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U")}
            options={SLIDING_CATCH_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingCatchType]: value })}
          />
          <HardwareDropdown
            label="Motor kit"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingMotorType] ?? "none")}
            options={SLIDING_MOTOR_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingMotorType]: value })}
          />
        </div>
      )}

    </div>
  );
}
