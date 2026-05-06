import { type ReactNode, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
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
  SEGMENT_OPTION_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import { SchemaDrivenForm } from "./SchemaDrivenForm";
import NumberInput from "../shared/NumberInput";
import { TerminationControl } from "./TerminationControl";

const POST_SIZE_LABELS: Record<string, string> = {
  "50": "50mm Post Standard",
  "65": "65mm Post Standard HD",
};

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

function sectionStorageKey(segmentId: string) {
  return `qsg-segment-settings:${segmentId}`;
}

function SettingsSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
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
        <span className="text-xs font-bold text-brand-primary">
          {open ? "Hide" : "Show"}
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
  const [showMoreSettings, setShowMoreSettings] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(sectionStorageKey(seg.segmentId)) === "open";
  });

  useEffect(() => {
    setMaxSpacingDraft(String(effectiveMax));
  }, [effectiveMax]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      sectionStorageKey(seg.segmentId),
      showMoreSettings ? "open" : "closed",
    );
  }, [seg.segmentId, showMoreSettings]);

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
  function handleOptionChange(key: string, value: string | number | boolean) {
    onJobOverrideChange(key, value);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setShowMoreSettings((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/35 bg-brand-primary/10 px-3 py-2 text-sm font-extrabold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
        aria-label={showMoreSettings ? "Hide more settings" : "Show more settings"}
        title={showMoreSettings ? "Hide more settings" : "Show more settings"}
      >
        <SlidersHorizontal size={16} />
        Additional settings
      </button>

      {showMoreSettings && (
        <>
          <SettingsSection title="Post spacing" defaultOpen>
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

          {optionFields.length > 0 ? (
            <SettingsSection title="Style overrides" defaultOpen>
              {optionFields.length > 0 && (
                <SchemaDrivenForm
                  fields={optionFields}
                  variables={mergedJobDisplay}
                  onChange={handleOptionChange}
                />
              )}
            </SettingsSection>
          ) : null}

          <SettingsSection title="End conditions" defaultOpen>
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

          <SettingsSection title="Posts">
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

          <SettingsSection title="Advanced">
            {isCustomPost ? (
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
            ) : (
              <p className="text-xs font-semibold text-brand-muted">
                Choose a non-standard post type to enter a custom post width.
              </p>
            )}
          </SettingsSection>
        </>
      )}

    </div>
  );
}
