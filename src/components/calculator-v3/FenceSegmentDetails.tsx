import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../types/canonical.types";
import {
  applyProductOptionRules,
  clampPostSpacing,
  MAX_POST_SPACING_MM,
  maxPanelWidthForSystem,
  MIN_POST_SPACING_MM,
} from "../../lib/productOptionRules";
import {
  SEGMENT_TERMINATION_KEYS,
  SEGMENT_OPTION_KEYS,
  cornerTypeFromVars,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import { SchemaDrivenForm } from "./SchemaDrivenForm";
import NumberInput from "../shared/NumberInput";
import { TerminationControl } from "./TerminationControl";

const POST_SIZE_LABELS: Record<string, string> = {
  "50": "50mm Post Standard",
  "65": "65mm Post Standard HD",
};

const CORNER_TYPE_OPTIONS = [
  { value: "right", label: "90 degree" },
  { value: "obtuse", label: "135 degree adapter" },
  { value: "custom", label: "Custom - verify" },
] as const;

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

function SettingsSection({
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
    <div className="rounded-2xl border border-brand-border/60 bg-brand-bg/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-extrabold text-brand-text"
      >
        <span>{title}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-brand-primary">
          {!open && summary ? (
            <span className="max-w-[11rem] truncate rounded-full bg-brand-card px-2 py-0.5 text-brand-muted">
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

export function FenceSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const run = state.payload?.runs.find((item) => item.runId === runId);
  const productCode = run?.productCode ?? state.payload?.productCode ?? null;
  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");

  // Post size options from the run-scoped post_size variable
  const postSizeOptions = useMemo(() => {
    const v = runFields.find((f) => f.field_key === "post_size");
    const raw = v?.options_json ?? ["50", "65"];
    return raw.map(String);
  }, [runFields]);

  const v = seg.variables ?? {};
  const runVariables = {
    ...(state.payload?.variables ?? {}),
    ...(run?.variables ?? {}),
  };
  const displayVariables = {
    ...runVariables,
    ...v,
  };
  const fenceSegments = run?.segments.filter((segment) => segment.segmentKind !== "gate_opening") ?? [];
  const segmentIndex = fenceSegments.findIndex((segment) => segment.segmentId === seg.segmentId);
  const leftEndReadOnly = segmentIndex > 0 && !v.left_termination_kind;
  const rightEndReadOnly = segmentIndex >= 0 && segmentIndex < fenceSegments.length - 1 && !v.right_termination_kind;
  const postSize = (displayVariables[SEGMENT_OPTION_KEYS.postSize] as string) ?? "";
  const isCustomPost = postSize === "custom";
  const slatSize = Number(displayVariables.slat_size_mm ?? 65);
  const isBayg = productCode === "BAYG";
  const showLouvreSetting = productCode === "QSHS";
  const louvreEnabled = v.louvre_treatment === true || v.louvre_treatment === "true";
  const cornerControls = (["left", "right"] as const)
    .map((side) => {
      const kindKey =
        side === "left"
          ? SEGMENT_TERMINATION_KEYS.leftKind
          : SEGMENT_TERMINATION_KEYS.rightKind;
      const degreesKey =
        side === "left"
          ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees
          : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
      const measuredKey =
        side === "left"
          ? SEGMENT_TERMINATION_KEYS.leftCornerMeasuredDegrees
          : SEGMENT_TERMINATION_KEYS.rightCornerMeasuredDegrees;
      const typeKey =
        side === "left"
          ? SEGMENT_TERMINATION_KEYS.leftCornerType
          : SEGMENT_TERMINATION_KEYS.rightCornerType;
      const manualKey =
        side === "left"
          ? SEGMENT_TERMINATION_KEYS.leftCornerManual
          : SEGMENT_TERMINATION_KEYS.rightCornerManual;
      const type = cornerTypeFromVars(v, side);
      const degrees = Number(v[measuredKey] ?? v[degreesKey]);
      if (v[kindKey] !== "corner" && !type) return null;
      return { side, kindKey, degreesKey, measuredKey, typeKey, manualKey, type, degrees };
    })
    .filter(Boolean) as Array<{
      side: "left" | "right";
      kindKey: string;
      degreesKey: string;
      measuredKey: string;
      typeKey: string;
      manualKey: string;
      type: "right" | "obtuse" | "custom" | undefined;
      degrees: number;
    }>;

  function upsertSegment(s: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: s });
  }

  function setScalar(key: string, value: string | number | boolean | null) {
    upsertSegment(patchSegmentVariables(seg, { [key]: value }));
  }

  function onJobOverrideChange(key: string, value: string | number | boolean) {
    const base = runVariables[key];
    upsertSegment(
      patchSegmentVariables(seg, { [key]: value === base ? null : value }),
    );
  }

  const jobMax = clampPostSpacing(
    state.payload?.variables.max_panel_width_mm,
    maxPanelWidthForSystem(productCode),
  );
  const effectiveMax = clampPostSpacing(v.max_panel_width_mm, jobMax);
  const [maxSpacingDraft, setMaxSpacingDraft] = useState(String(effectiveMax));
  useEffect(() => {
    setMaxSpacingDraft(String(effectiveMax));
  }, [effectiveMax]);

  function updateMaxPanelWidth(value: number | null) {
    const nextValue = value === null ? null : clampPostSpacing(value, jobMax);
    upsertSegment(patchSegmentVariables(seg, { max_panel_width_mm: nextValue }));
  }

  function commitMaxPanelWidth(value = maxSpacingDraft) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      setMaxSpacingDraft(String(effectiveMax));
      return;
    }
    const clamped = clampPostSpacing(nextValue, jobMax);
    setMaxSpacingDraft(String(clamped));
    updateMaxPanelWidth(clamped);
  }

  const mergedJobDisplay: Record<string, string | number | boolean> = {
    ...displayVariables,
  };
  const optionFields = useMemo(
    () =>
      productCode
        ? applyProductOptionRules(
            productCode,
            jobFields.filter(
              (field) =>
                !field.field_key.endsWith("_stock_length_mm") &&
                field.field_key !== "max_panel_width_mm",
            ),
            mergedJobDisplay,
          )
        : [],
    [jobFields, mergedJobDisplay, productCode],
  );
  const optionSummary = optionFields
    .map((field) => {
      const raw = mergedJobDisplay[field.field_key] ?? field.default_value_json;
      if (raw === undefined || raw === null || raw === "") return null;
      const label =
        raw === true
          ? "Yes"
          : raw === false
            ? "No"
            : `${raw}${field.unit ?? ""}`;
      return `${field.label}: ${label}`;
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  function handleOptionChange(key: string, value: string | number | boolean) {
    onJobOverrideChange(key, value);
  }

  return (
    <div className="space-y-4">
      {!isBayg && (
      <SettingsSection title="Post spacing" summary={`${effectiveMax}mm`} defaultOpen>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-brand-muted">Max Post Spacing (mm)</span>
          <input
            type="number"
            value={maxSpacingDraft}
            onChange={(event) => setMaxSpacingDraft(event.target.value)}
            onBlur={() => commitMaxPanelWidth()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            min={MIN_POST_SPACING_MM}
            max={MAX_POST_SPACING_MM}
            step={50}
            className="w-28 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          />
        </label>
      </SettingsSection>
      )}

          {optionFields.length > 0 ? (
            <SettingsSection title="Style overrides" summary={optionSummary || "Run defaults"}>
              {optionFields.length > 0 && (
                <SchemaDrivenForm
                  fields={optionFields}
                  variables={mergedJobDisplay}
                  onChange={handleOptionChange}
                />
              )}
            </SettingsSection>
          ) : null}

          {showLouvreSetting && (
            <SettingsSection
              title="Louvre treatment"
              summary={louvreEnabled && slatSize === 65 ? "On" : "Off"}
            >
              <div className="rounded-xl border border-brand-border/60 bg-brand-card/70 p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={louvreEnabled && slatSize === 65}
                    disabled={slatSize !== 65}
                    onChange={(event) =>
                      setScalar("louvre_treatment", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                  />
                  <span>
                    <span className="block text-sm font-extrabold text-brand-text">
                      Louvre treatment (40 degree angle)
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-brand-muted">
                      Slats angle 40 degrees downward. Louvres only available with 65mm slats.
                    </span>
                    {slatSize !== 65 && (
                      <span className="mt-1 block text-xs font-bold text-brand-warning">
                        Switch this section to 65mm slats to use louvre brackets.
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </SettingsSection>
          )}

      {!isBayg && (
      <SettingsSection title="End conditions" summary="Left / right ends">
            <div className="grid gap-3 lg:grid-cols-2">
              <TerminationControl
                runId={runId}
                seg={seg}
                side="left"
                readOnly={leftEndReadOnly}
              />
              <TerminationControl
                runId={runId}
                seg={seg}
                side="right"
                readOnly={rightEndReadOnly}
              />
            </div>
      </SettingsSection>
      )}

          {cornerControls.length > 0 && (
            <SettingsSection title="Corners" summary={`${cornerControls.length} corner${cornerControls.length === 1 ? "" : "s"}`}>
              <div className="space-y-3">
                {cornerControls.map((corner) => (
                  <label key={corner.side} className="flex flex-col gap-1">
                    <span className="text-sm font-bold capitalize text-brand-muted">
                      {corner.side} corner
                      {Number.isFinite(corner.degrees)
                        ? ` (${Math.round(corner.degrees)} degrees detected)`
                        : ""}
                    </span>
                    <select
                      value={corner.type ?? "right"}
                      onChange={(event) => {
                        const nextType = event.target.value;
                        const nextDegrees =
                          nextType === "obtuse"
                            ? 135
                            : nextType === "right"
                              ? 90
                              : Number.isFinite(corner.degrees)
                                ? Math.round(corner.degrees)
                                : 100;
                        upsertSegment(
                          patchSegmentVariables(seg, {
                            [corner.kindKey]: "corner",
                            [corner.typeKey]: nextType,
                            [corner.degreesKey]: nextDegrees,
                            [corner.measuredKey]: Number.isFinite(corner.degrees)
                              ? Math.round(corner.degrees)
                              : nextDegrees,
                            [corner.manualKey]: true,
                          }),
                        );
                      }}
                      className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                    >
                      {CORNER_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-semibold text-brand-muted">
                      Manual selection stays in place until the layout is reset.
                    </span>
                  </label>
                ))}
              </div>
            </SettingsSection>
          )}

      {!isBayg && (
      <SettingsSection title="Posts" summary={POST_SIZE_LABELS[postSize] ?? (postSize ? `${postSize}mm Post` : "Run default")}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-brand-muted">Post type</span>
              <select
                value={postSize}
                onChange={(e) =>
                  setScalar(
                    SEGMENT_OPTION_KEYS.postSize,
                    e.target.value || null,
                  )
                }
                className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              >
                <option value="">Job default</option>
                {postSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {POST_SIZE_LABELS[opt] ?? `${opt}mm Post`}
                  </option>
                ))}
                <option value="custom">Non-standard post</option>
              </select>
            </label>
      </SettingsSection>
      )}

      {!isBayg && isCustomPost && (
        <SettingsSection
          title="Custom post width"
          summary={`${v[SEGMENT_OPTION_KEYS.postWidthMm] ?? "Not set"}mm`}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-muted">Post width (mm)</span>
            <NumberInput
              value={(v[SEGMENT_OPTION_KEYS.postWidthMm] as number | null) ?? null}
              onChange={(val) =>
                setScalar(SEGMENT_OPTION_KEYS.postWidthMm, val)
              }
              min={1}
            />
          </label>
        </SettingsSection>
      )}

    </div>
  );
}
