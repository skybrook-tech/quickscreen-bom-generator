import { useMemo, useState } from "react";
import { useProductVariables } from "../../../hooks/useProductVariables";
import type { SchemaField } from "../../calculator-v3/SchemaDrivenForm";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { SchemaDrivenFormV4 } from "../RunCard/SchemaDrivenFormV4";

const GATE_PRODUCT_CODE = "QS_GATE";

interface Props {
  /** Existing gate segment when editing, null for adding new. */
  initialSegment: CanonicalSegment | null;
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

/**
 * v4 Gate form — same data-driven approach as v3 GateFormV3 but rendered
 * inside a slide-out pane (GatePane) instead of a modal. Builds a single
 * gate segment that lives inside an existing run's segment list.
 */
export function GateForm({ initialSegment, onCancel, onSave }: Props) {
  const { data: runFields = [] } = useProductVariables(GATE_PRODUCT_CODE, "run");
  const { data: segmentFields = [] } = useProductVariables(
    GATE_PRODUCT_CODE,
    "segment",
  );

  const initialVariables = useMemo<
    Record<string, string | number | boolean>
  >(() => {
    const base: Record<string, string | number | boolean> = {
      ...defaultsFromFields(runFields),
      ...defaultsFromFields(segmentFields),
    };
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
  }, [initialSegment, runFields, segmentFields]);

  const [variables, setVariables] = useState(initialVariables);

  function handleChange(key: string, value: string | number | boolean) {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const runScopeKeys = new Set(runFields.map((f) => f.field_key));
    const segScopeKeys = new Set(segmentFields.map((f) => f.field_key));
    const segVars: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(variables)) {
      if (runScopeKeys.has(k) || segScopeKeys.has(k)) segVars[k] = v;
    }
    const segment: CanonicalSegment = {
      segmentId: initialSegment?.segmentId ?? crypto.randomUUID(),
      sortOrder: initialSegment?.sortOrder ?? 0,
      kind: "gate",
      productCode: GATE_PRODUCT_CODE,
      segmentWidthMm:
        typeof segVars.gate_width_mm === "number"
          ? segVars.gate_width_mm
          : Number(segVars.gate_width_mm ?? 0) || undefined,
      targetHeightMm:
        typeof segVars.gate_height_mm === "number"
          ? segVars.gate_height_mm
          : Number(segVars.gate_height_mm ?? 0) || undefined,
      leftTermination: initialSegment?.leftTermination ?? { kind: "system" },
      rightTermination: initialSegment?.rightTermination ?? { kind: "system" },
      variables: segVars,
    };
    onSave(segment);
  }

  const combinedFields = [...runFields, ...segmentFields].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5">
        {combinedFields.length === 0 ? (
          <p className="text-sm text-brand-muted">Loading gate fields…</p>
        ) : (
          <SchemaDrivenFormV4
            fields={combinedFields}
            variables={variables}
            onChange={handleChange}
          />
        )}
      </div>
      <div className="flex justify-end gap-2 px-5 py-3 border-t border-brand-border flex-shrink-0">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm text-brand-muted hover:text-brand-text"
        >
          Cancel
        </button>
        <button
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
