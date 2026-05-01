import { useMemo, useState } from "react";
import { useProductVariables } from "../../../hooks/useProductVariables";
import type { SchemaField } from "../../calculator-v3/SchemaDrivenForm";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { SchemaDrivenFormV4 } from "../RunCard/SchemaDrivenFormV4";
import { VALIDATION } from "../../../lib/constants";
import {
  clampGateHeightMm,
  gateStoredVarsMatchFence,
  resolveMatchFenceSegmentVars,
} from "../../../lib/gateFenceResolve";

const GATE_PRODUCT_CODE = "QS_GATE";

/** Standard pedestrian heights aligned with legacy sandbox overlap + QS_GATE band. */
const GATE_HEIGHT_PRESETS_MM = [
  900, 1050, 1200, 1500, 1800, 1950, 2100,
] as const;

const ALWAYS_CUSTOM_FIELDS = new Set(["gate_width_mm", "gate_height_mm"]);

function matchFenceHiddenKeys(matchFence: boolean): Set<string> {
  const s = new Set<string>(ALWAYS_CUSTOM_FIELDS);
  if (matchFence) {
    s.add("finish_type");
    s.add("colour_code");
    s.add("slat_size_mm");
    s.add("slat_gap_mm");
  }
  return s;
}

interface Props {
  /** Existing gate segment when editing, null for adding new. */
  initialSegment: CanonicalSegment | null;
  /** Job + parent run variables merged (fence context). */
  fenceContext: Record<string, string | number | boolean>;
  /** Max `targetHeightMm` among fence segments on this run, if any. */
  maxFenceSegmentHeightMm?: number;
  onCancel: () => void;
  onSave: (segment: CanonicalSegment) => void;
}

function defaultsFromFields(
  fields: SchemaField[],
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const f of fields) {
    const d = f.default_value_json;
    if (d == null) continue;
    if (typeof d === "string" || typeof d === "number" || typeof d === "boolean")
      out[f.field_key] = d;
  }
  return out;
}

function heightPresetMode(
  mm: number,
): { mode: "preset"; preset: number } | { mode: "custom"; value: number } {
  const rounded = Math.round(mm);
  if (GATE_HEIGHT_PRESETS_MM.includes(rounded as (typeof GATE_HEIGHT_PRESETS_MM)[number]))
    return { mode: "preset", preset: rounded };
  return { mode: "custom", value: clampGateHeightMm(rounded) };
}

/**
 * v4 Gate form — data-driven fields plus match-fence resolution, opening width,
 * and gate height presets/custom (QS_GATE segment scope).
 */
export function GateForm({
  initialSegment,
  fenceContext,
  maxFenceSegmentHeightMm,
  onCancel,
  onSave,
}: Props) {
  const { data: runFields = [] } = useProductVariables(GATE_PRODUCT_CODE, "run");
  const { data: segmentFields = [] } = useProductVariables(
    GATE_PRODUCT_CODE,
    "segment",
  );

  const [matchFence, setMatchFence] = useState(() =>
    initialSegment
      ? gateStoredVarsMatchFence(
          initialSegment.variables ?? {},
          fenceContext,
          maxFenceSegmentHeightMm,
        )
      : true,
  );

  const initialVariables = useMemo<
    Record<string, string | number | boolean>
  >(() => {
    const base: Record<string, string | number | boolean> = {
      ...defaultsFromFields(runFields),
      ...defaultsFromFields(segmentFields),
    };
    if (!initialSegment) {
      Object.assign(
        base,
        resolveMatchFenceSegmentVars(fenceContext, maxFenceSegmentHeightMm),
      );
    }
    if (initialSegment?.variables) {
      for (const [k, v] of Object.entries(initialSegment.variables))
        base[k] = v;
    }
    if (initialSegment?.segmentWidthMm != null && base.gate_width_mm == null) {
      base.gate_width_mm = initialSegment.segmentWidthMm;
    }
    if (initialSegment?.targetHeightMm != null && base.gate_height_mm == null) {
      base.gate_height_mm = initialSegment.targetHeightMm;
    }
    return base;
  }, [
    initialSegment,
    runFields,
    segmentFields,
    fenceContext,
    maxFenceSegmentHeightMm,
  ]);

  const [variables, setVariables] = useState(initialVariables);

  function handleChange(key: string, value: string | number | boolean) {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }

  function applyMatchFence(next: boolean) {
    setMatchFence(next);
    if (next) {
      setVariables((prev) => ({
        ...prev,
        ...resolveMatchFenceSegmentVars(fenceContext, maxFenceSegmentHeightMm),
      }));
    }
  }

  function handleSave() {
    const runScopeKeys = new Set(runFields.map((f) => f.field_key));
    const segScopeKeys = new Set(segmentFields.map((f) => f.field_key));
    const allowedKeys = new Set([...runScopeKeys, ...segScopeKeys]);

    const segVars: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(variables)) {
      if (!allowedKeys.has(k)) continue;
      segVars[k] = v;
    }

    if (matchFence) {
      Object.assign(
        segVars,
        resolveMatchFenceSegmentVars(fenceContext, maxFenceSegmentHeightMm),
      );
    }

    const gwRaw = segVars.gate_width_mm;
    let gw = typeof gwRaw === "number" ? gwRaw : Number(gwRaw ?? NaN);
    if (!Number.isFinite(gw) || gw <= 0) gw = 900;
    segVars.gate_width_mm = gw;
    segVars.gate_height_mm = clampGateHeightMm(
      Number(segVars.gate_height_mm ?? 1800),
    );

    const segment: CanonicalSegment = {
      segmentId: initialSegment?.segmentId ?? crypto.randomUUID(),
      sortOrder: initialSegment?.sortOrder ?? 0,
      kind: "gate",
      productCode: GATE_PRODUCT_CODE,
      segmentWidthMm: gw || undefined,
      targetHeightMm: segVars.gate_height_mm as number,
      leftTermination: initialSegment?.leftTermination ?? { kind: "system" },
      rightTermination: initialSegment?.rightTermination ?? { kind: "system" },
      variables: segVars,
    };
    onSave(segment);
  }

  const combinedFields = [...runFields, ...segmentFields].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const hidden = matchFenceHiddenKeys(matchFence);
  const schemaFields = combinedFields.filter((f) => !hidden.has(f.field_key));

  const gateWidthNum = Number(variables.gate_width_mm ?? NaN);
  const widthSoftWarn =
    Number.isFinite(gateWidthNum) &&
    gateWidthNum > VALIDATION.maxSwingGateWidth;

  const ghNum = Number(variables.gate_height_mm ?? NaN);
  const heightUi = Number.isFinite(ghNum)
    ? heightPresetMode(ghNum)
    : { mode: "custom" as const, value: 1800 };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-brand-border bg-brand-card/40 px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-1 rounded border-brand-border"
            checked={matchFence}
            onChange={(e) => applyMatchFence(e.target.checked)}
            data-testid="v4-gate-match-fence"
          />
          <span className="text-sm">
            <span className="font-medium text-brand-text">Match gate to fence</span>
            <span className="block text-brand-muted mt-0.5">
              When enabled, colour, slat size, gap and height are copied from the
              fence at save (concrete engine values). Uncheck to set them
              independently below.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-brand-text">
            Opening width (mm)
          </label>
          <input
            type="number"
            min={400}
            step={1}
            value={
              variables.gate_width_mm === undefined ||
              variables.gate_width_mm === ""
                ? ""
                : String(variables.gate_width_mm)
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                handleChange("gate_width_mm", "");
                return;
              }
              const n = Number(raw);
              handleChange("gate_width_mm", Number.isFinite(n) ? n : raw);
            }}
            className="w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text"
            data-testid="v4-gate-width-mm"
          />
          {widthSoftWarn ? (
            <p
              className="text-xs text-amber-400/95"
              data-testid="v4-gate-width-warning"
            >
              Opening exceeds recommended maximum swing width (
              {VALIDATION.maxSwingGateWidth}
              mm). QS pedestrian gate BOM validates to 1200mm — reduce width or
              confirm product scope.
            </p>
          ) : null}
        </div>

        {!matchFence ? (
          <div className="space-y-2">
            <span className="block text-sm font-medium text-brand-text">
              Gate height (mm)
            </span>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={
                  heightUi.mode === "preset"
                    ? String(heightUi.preset)
                    : "custom"
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") {
                    handleChange(
                      "gate_height_mm",
                      heightUi.mode === "custom"
                        ? heightUi.value
                        : clampGateHeightMm(1800),
                    );
                    return;
                  }
                  handleChange("gate_height_mm", Number(v));
                }}
                className="rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text"
                data-testid="v4-gate-height-preset"
              >
                {GATE_HEIGHT_PRESETS_MM.map((p) => (
                  <option key={p} value={p}>
                    {p} mm
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {heightUi.mode === "custom" ? (
                <input
                  type="number"
                  min={600}
                  max={2100}
                  step={1}
                  value={heightUi.value}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    handleChange("gate_height_mm", clampGateHeightMm(n));
                  }}
                  className="w-28 rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text"
                  data-testid="v4-gate-height-custom"
                />
              ) : null}
            </div>
            <p className="text-xs text-brand-muted">
              Allowed range 600–2100 mm (QS_GATE).
            </p>
          </div>
        ) : (
          <p className="text-sm text-brand-muted rounded-md border border-brand-border/60 bg-brand-card/30 px-3 py-2">
            Gate height matches fence:{" "}
            <span className="text-brand-text font-medium tabular-nums">
              {resolveMatchFenceSegmentVars(fenceContext, maxFenceSegmentHeightMm)
                .gate_height_mm as number}{" "}
              mm
            </span>
          </p>
        )}

        {schemaFields.length === 0 ? (
          <p className="text-sm text-brand-muted">Loading gate fields…</p>
        ) : (
          <SchemaDrivenFormV4
            fields={schemaFields}
            variables={variables}
            onChange={handleChange}
          />
        )}
      </div>
      <div className="flex justify-end gap-2 px-5 py-3 border-t border-brand-border flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm text-brand-muted hover:text-brand-text"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-md bg-brand-accent text-white text-sm font-medium hover:opacity-90"
          data-testid="v4-gate-save"
        >
          {initialSegment ? "Save changes" : "Add gate"}
        </button>
      </div>
    </div>
  );
}
