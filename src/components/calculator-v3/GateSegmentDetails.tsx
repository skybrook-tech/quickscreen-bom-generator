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
  type GateOption,
} from "../../lib/gateOptionRules";
import NumberInput from "../shared/NumberInput";

const GATE_POST_SIZE_OPTIONS: GateOption[] = [
  { value: "50", label: "Standard Post 50mm" },
  { value: "65", label: "Standard Post 65mm HD" },
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
      ? "border-blue-800 bg-blue-800 text-white shadow-sm"
      : "border-brand-border bg-brand-card text-brand-text hover:border-blue-800 hover:text-blue-800"
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
  const masterPostSize = String(runVars.post_size ?? 50);
  const firstFenceSegment = run?.segments.find((segment) => segment.segmentKind !== "gate_opening");
  const masterVars = {
    ...runVars,
    ...(firstFenceSegment?.variables ?? {}),
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
        <OptionPills
          label="Gate colour"
          value={String(v[GATE_SEGMENT_STUB_KEYS.colourCode] ?? masterVars.colour_code ?? "B")}
          options={COLOUR_OPTIONS}
          onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.colourCode]: value })}
        />
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
          <OptionPills
            label="Hinge / closer"
            value={String(v[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B")}
            options={HINGE_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.hingeType]: value })}
          />
          <OptionPills
            label="Latch / lock"
            value={String(v[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA")}
            options={LATCH_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.latchType]: value })}
          />
          <OptionPills
            label="Drop bolt"
            value={String(v[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? (movement === "double_swing" ? "SS-0300DB-B" : "none"))}
            options={DROP_BOLT_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.dropBoltType]: value })}
          />
          <OptionPills
            label="Gate stop"
            value={String(v[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none")}
            options={GATE_STOP_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.gateStopType]: value })}
          />
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-brand-border/50 bg-brand-bg/60 p-3">
          <OptionPills
            label="Track"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST")}
            options={SLIDING_TRACK_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingTrackType]: value })}
          />
          <OptionPills
            label="Catch"
            value={String(v[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U")}
            options={SLIDING_CATCH_OPTIONS}
            onChange={(value) => upsertVariables({ [GATE_SEGMENT_STUB_KEYS.slidingCatchType]: value })}
          />
          <OptionPills
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
