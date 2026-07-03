import { useMemo } from "react";
import { useCalculator } from "../../../context/CalculatorContext";
import type { CanonicalSegment } from "../../../types/canonical.types";
import {
  GATE_SEGMENT_STUB_KEYS,
  patchSegmentVariables,
} from "../../../lib/segmentTermination";
import {
  clearGateOpeningWidthMm,
  defaultGateBuildForMovementInfill,
  gateBuildsForMovement,
  gateLeafGeometry,
  gateMovementOrDefault,
  isSwingGateMovement,
} from "../../../lib/gateOptionRules";
import { GateComponentList } from "../GateComponentList";
import {
  baseHardwareSku,
  hingeGapForSku,
  isWhiteHardwareFinish,
  kitForHardwareSelection,
  latchGapForSku,
  listHinges,
  listLatches,
} from "../../../lib/gateHardware";
import { OPTIONAL_ACCESSORY_KEY, selectedOptionalAddOns } from "../../../lib/bomMetadata";
import { SchemaSettingsForm } from "../SchemaSettingsForm";
import { useCalculatorConfig } from "../../../hooks/useCalculatorConfig";
import { segmentFields } from "../../../lib/runFieldOverrides";

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function GateSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const run = state.payload?.runs.find((item) => item.runId === runId);
  const runProductCode = run?.productCode ?? state.payload?.productCode ?? "QSHS";
  const v = seg.variables ?? {};
  const runVars = { ...(run?.variables ?? {}) };
  const runConfig = useCalculatorConfig(runProductCode, runVars);

  const movement = gateMovementOrDefault(v[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const buildOptions = gateBuildsForMovement(movement);
  const verticalDefault = runConfig?.gateRules.defaultInfill === "vertical";
  const build = buildOptions.some((option) => option.value === v[GATE_SEGMENT_STUB_KEYS.gateBuild])
    ? String(v[GATE_SEGMENT_STUB_KEYS.gateBuild])
    : defaultGateBuildForMovementInfill(movement, verticalDefault ? "vertical" : "horizontal");
  const isSwing = isSwingGateMovement(movement);
  const currentDirection = String(
    v[GATE_SEGMENT_STUB_KEYS.openingDirection] ??
      (isSwing ? "out" : "right"),
  );
  const masterPostSize = String(runVars.post_size ?? 50);
  const gateColour = String(v[GATE_SEGMENT_STUB_KEYS.colourCode] ?? runVars.colour_code ?? "B");
  const slatSizeMm = Number(v[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? runVars.slat_size_mm ?? 65);
  const slatGapMm = Number(v[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? runVars.slat_gap_mm ?? 9);
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
  const { leafCount, leafWidthsMm } = gateGeometry;
  const clearOpeningMm = clearGateOpeningWidthMm({
    movement,
    openingWidthMm: gateWidthMm,
    hingeGapMm,
    latchGapMm,
  });
  const rankedHinges = useMemo(() => listHinges(whiteFinish), [whiteFinish]);
  const rankedLatches = useMemo(() => listLatches(movement, whiteFinish), [movement, whiteFinish]);
  const hingeParentSku = baseHardwareSku(currentHingeValue);
  const matchingHardwareKit = kitForHardwareSelection(currentHingeValue, currentLatchValue);
  const selectedKitSku = String(v[GATE_SEGMENT_STUB_KEYS.hardwareKitSku] ?? "");
  const optionalAddOns = selectedOptionalAddOns(v);
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

  const mergedVariables: Record<string, string | number | boolean> = {
    gate_movement: movement,
    gate_build: build,
    opening_direction: currentDirection,
    sliding_side: String(v[GATE_SEGMENT_STUB_KEYS.slidingSide] ?? "front"),
    colour_code: gateColour,
    slat_size_mm: slatSizeMm,
    slat_gap_mm: slatGapMm,
    gate_post_size_mm: Number(v[GATE_SEGMENT_STUB_KEYS.gatePostSizeMm] ?? runVars.post_size ?? masterPostSize),
    use_gate_posts_as_fence_termination: v[GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination] !== false,
    hinge_type: currentHingeValue,
    latch_type: currentLatchValue,
    hardware_kit_sku: selectedKitSku,
    include_external_access_kit: v[GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit] === true,
    drop_bolt_type: String(v[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? (movement === "double_swing" ? "SS-0300DB-B" : "none")),
    gate_stop_type: String(v[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none"),
    sliding_track_type: String(v[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST"),
    sliding_guide_type: String(v[GATE_SEGMENT_STUB_KEYS.slidingGuideType] ?? "XPSG-GUIDE"),
    sliding_catch_type: String(v[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U"),
    automation_enabled: automationEnabled,
    automation_power_source: automationPower,
    automation_cable_distance_m: cableDistanceM,
    automation_battery: v[GATE_SEGMENT_STUB_KEYS.automationBattery] === true,
    automation_keypad: v[GATE_SEGMENT_STUB_KEYS.automationKeypad] === true,
    automation_extra_remotes: extraRemoteCount,
  };

  // Variables-resolved QS_GATE config — segment field options (gate_build per
  // movement, opening_direction swing/sliding swap) arrive already resolved.
  const config = useCalculatorConfig("QS_GATE", mergedVariables);

  const rendererExtra: Record<string, unknown> = {
    rankedHinges,
    rankedLatches,
    matchingHardwareKit,
    hingeParentSku,
    optionalAddOnsForHinge: optionalAddOns[hingeParentSku] ?? [],
    onOptionalAddOnsChange: setOptionalAddOns,
    leafWidthsMm,
    clearOpeningMm,
    gateWidthMm,
    hingeGapMm,
    latchGapMm,
    updateLeafWidth,
    automationSummary,
  };

  function upsertSegmentPatch({
    patch,
    leaves,
    segmentPatch,
  }: {
    patch?: Record<string, string | number | boolean | null | undefined>;
    leaves?: Array<{ widthMm: number }>;
    segmentPatch?: Partial<CanonicalSegment>;
  }) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: {
        ...(patch ? patchSegmentVariables(seg, patch) : seg),
        ...(leaves ? { leaves } : {}),
        ...(segmentPatch ?? {}),
      },
    });
  }

  function upsertVariables(patch: Record<string, string | number | boolean | null | undefined>) {
    upsertSegmentPatch({ patch });
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

  function setMovement(value: string) {
    const nextMovement = gateMovementOrDefault(value);
    const currentMovement = movement;
    const nextBuild = defaultGateBuildForMovementInfill(
      nextMovement,
      verticalDefault ? "vertical" : "horizontal",
    );
    const currentLeafTotal = leafWidthsMm.reduce((sum, width) => sum + width, 0);
    const nextOpeningWidthMm =
      currentMovement !== "double_swing" && nextMovement === "double_swing"
        ? Math.max(1800, Math.min(4200, Math.round(gateWidthMm * 2)))
        : currentMovement === "double_swing" && nextMovement === "single_swing"
          ? Math.max(1, Math.round(currentLeafTotal || clearOpeningMm))
          : gateWidthMm;
    const nextClearOpening = clearGateOpeningWidthMm({
      movement: nextMovement,
      openingWidthMm: nextOpeningWidthMm,
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
      segmentPatch: { segmentWidthMm: nextOpeningWidthMm },
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

  function handleFieldChange(key: string, value: string | number | boolean) {
    if (key === GATE_SEGMENT_STUB_KEYS.gateMovement) {
      setMovement(String(value));
      return;
    }
    if (key === GATE_SEGMENT_STUB_KEYS.hingeType) {
      upsertVariables({
        [GATE_SEGMENT_STUB_KEYS.hingeType]: value,
        [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
        ...clearOptionalAddOnsFor(baseHardwareSku(currentHingeValue)),
      });
      return;
    }
    if (key === GATE_SEGMENT_STUB_KEYS.latchType) {
      upsertVariables({
        [GATE_SEGMENT_STUB_KEYS.latchType]: value,
        [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
        ...clearOptionalAddOnsFor(baseHardwareSku(currentLatchValue)),
      });
      return;
    }
    if (key === GATE_SEGMENT_STUB_KEYS.automationEnabled) {
      upsertVariables({
        [GATE_SEGMENT_STUB_KEYS.automationEnabled]: value,
        [GATE_SEGMENT_STUB_KEYS.slidingMotorType]: "none",
      });
      return;
    }
    upsertVariables({ [key]: value });
  }

  function handleFieldPatch(patch: Record<string, string | number | boolean | null | undefined>) {
    upsertVariables(patch);
  }

  if (!runConfig || !config) return null;

  const leafGeometryInfo = isSwing ? (
    <div className="w-full rounded-lg border border-brand-border/70 bg-brand-card p-3 text-xs font-bold text-brand-muted">
      <span className="text-brand-text">{leafCount}</span> leaf{leafCount === 1 ? "" : "s"} from a{" "}
      <span className="text-brand-text">{Math.round(gateWidthMm)}mm</span> opening.{" "}
      {leafCount === 2
        ? `Each leaf is calculated after ${Math.round(hingeGapMm)}mm hinge gap on each side and ${Math.round(latchGapMm)}mm shared latch gap: `
        : `Leaf width after ${Math.round(hingeGapMm)}mm hinge gap and ${Math.round(latchGapMm)}mm latch gap: `}
      <span className="text-brand-text">{leafWidthsMm.map((width) => `${Math.round(width)}mm`).join(" + ")}</span>.
    </div>
  ) : null;

  const componentList = (
    <GateComponentList
      orientation={build.includes("vertical") ? "vertical" : "horizontal"}
      movement={movement}
      slatSizeMm={slatSizeMm}
      slatGapMm={slatGapMm}
      colourCode={gateColour}
      hingeSku={currentHingeValue}
      latchSku={currentLatchValue}
    />
  );

  return (
    <div className="space-y-5 text-sm font-semibold">
      <SchemaSettingsForm
        fields={segmentFields(config)}
        groups={config.formGroups}
        variables={mergedVariables}
        onChange={handleFieldChange}
        onPatch={handleFieldPatch}
        extra={rendererExtra}
        extraGroupContent={{
          hardware_weight: leafGeometryInfo,
          components: componentList,
        }}
      />
    </div>
  );
}
