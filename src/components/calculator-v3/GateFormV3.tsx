import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { SchemaDrivenForm } from './SchemaDrivenForm';
import type { SchemaField } from './SchemaDrivenForm';
import type { CanonicalRun, CanonicalSegment } from '../../types/canonical.types';

const GATE_PRODUCT_CODE = 'QS_GATE';

interface GateFormV3Props {
  initialRun: CanonicalRun | null;         // null → adding new
  runFields: SchemaField[];                // QS_GATE run-scope variables
  segmentFields: SchemaField[];            // QS_GATE segment-scope variables
  onCancel: () => void;
  onSave: (run: CanonicalRun) => void;
}

function defaultsFromFields(fields: SchemaField[]): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const f of fields) {
    const d = f.default_value_json;
    if (d === null || d === undefined) continue;
    if (typeof d === 'string' || typeof d === 'number' || typeof d === 'boolean') {
      out[f.field_key] = d;
    }
  }
  return out;
}

export function GateFormV3({ initialRun, runFields, segmentFields, onCancel, onSave }: GateFormV3Props) {
  const initialSegment = initialRun?.segments[0];

  // Combine run + segment variables into a single flat map that the form edits.
  // On save we split them back out by scope.
  const initialVariables = useMemo<Record<string, string | number | boolean>>(() => {
    const base: Record<string, string | number | boolean> = {
      ...defaultsFromFields(runFields),
      ...defaultsFromFields(segmentFields),
    };
    if (initialRun?.variables) {
      for (const [k, v] of Object.entries(initialRun.variables)) base[k] = v;
    }
    if (initialSegment?.variables) {
      for (const [k, v] of Object.entries(initialSegment.variables)) base[k] = v;
    }
    // Seed gate_width/height from any top-level segment shape if present
    if (initialSegment?.segmentWidthMm != null && base.gate_width_mm == null) {
      base.gate_width_mm = initialSegment.segmentWidthMm;
    }
    if (initialSegment?.targetHeightMm != null && base.gate_height_mm == null) {
      base.gate_height_mm = initialSegment.targetHeightMm;
    }
    return base;
  }, [initialRun, initialSegment, runFields, segmentFields]);

  const [variables, setVariables] = useState(initialVariables);

  function handleFieldChange(key: string, value: string | number | boolean) {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    // Split back into run-scope and segment-scope.
    const runScopeKeys = new Set(runFields.map((f) => f.field_key));
    const segmentScopeKeys = new Set(segmentFields.map((f) => f.field_key));

    const runVars: Record<string, string | number | boolean> = {};
    const segVars: Record<string, string | number | boolean> = {};

    for (const [k, v] of Object.entries(variables)) {
      if (runScopeKeys.has(k)) runVars[k] = v;
      else if (segmentScopeKeys.has(k)) segVars[k] = v;
    }

    const segment: CanonicalSegment = {
      segmentId: initialSegment?.segmentId ?? crypto.randomUUID(),
      sortOrder: initialSegment?.sortOrder ?? 1,
      segmentKind: 'gate_opening',
      segmentWidthMm: typeof segVars.gate_width_mm === 'number' ? segVars.gate_width_mm : Number(segVars.gate_width_mm ?? 0) || undefined,
      targetHeightMm: typeof segVars.gate_height_mm === 'number' ? segVars.gate_height_mm : Number(segVars.gate_height_mm ?? 0) || undefined,
      gateProductCode: GATE_PRODUCT_CODE,
      variables: segVars,
    };

    const run: CanonicalRun = {
      runId: initialRun?.runId ?? crypto.randomUUID(),
      productCode: GATE_PRODUCT_CODE,
      variables: runVars,
      leftBoundary: initialRun?.leftBoundary ?? { type: 'product_post' },
      rightBoundary: initialRun?.rightBoundary ?? { type: 'product_post' },
      segments: [segment],
      corners: initialRun?.corners ?? [],
    };

    onSave(run);
  }

  const combinedFields = [...runFields, ...segmentFields];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
      data-testid="gate-form-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-brand-card border border-brand-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border">
          <h3 className="text-sm font-semibold text-brand-text">
            {initialRun ? 'Edit Gate' : 'Add Gate'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1 rounded text-brand-muted hover:text-brand-text hover:bg-brand-border/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {combinedFields.length === 0 ? (
            <p className="text-sm text-brand-muted">Loading gate fields…</p>
          ) : (
            <SchemaDrivenForm
              fields={combinedFields}
              variables={variables}
              onChange={handleFieldChange}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-brand-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            data-testid="gate-form-save"
            className="px-3 py-1.5 text-sm bg-brand-accent text-white rounded-md hover:bg-brand-accent/90 transition-colors"
          >
            {initialRun ? 'Save changes' : 'Add gate'}
          </button>
        </div>
      </div>
    </div>
  );
}
