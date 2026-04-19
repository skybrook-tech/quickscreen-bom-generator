import { useState } from 'react';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { useProductVariables } from '../../hooks/useProductVariables';
import { GateFormV3 } from './GateFormV3';
import type { CanonicalRun } from '../../types/canonical.types';

const GATE_PRODUCT_CODE = 'QS_GATE';

function gateLabel(run: CanonicalRun): string {
  const seg = run.segments[0];
  const width = seg?.panelWidthMm ?? (seg?.variables?.gate_width_mm as number | undefined) ?? 0;
  const height = seg?.targetHeightMm ?? (seg?.variables?.gate_height_mm as number | undefined) ?? 0;
  const qty = (seg?.variables?.gate_qty as number | undefined) ?? 1;
  const qtyLabel = qty > 1 ? ` ×${qty}` : '';
  return `${width}mm × ${height}mm${qtyLabel}`;
}

function gateSubLabel(run: CanonicalRun): string {
  const hinge = (run.variables?.hinge_type as string | undefined) ?? '—';
  const latch = (run.variables?.latch_type as string | undefined) ?? '—';
  return `${hinge} · ${latch}`;
}

export function GateListV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.canonicalPayload;
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const { data: runFields = [] } = useProductVariables(GATE_PRODUCT_CODE, 'run');
  const { data: segmentFields = [] } = useProductVariables(GATE_PRODUCT_CODE, 'segment');

  if (!payload) return null;

  const gateRuns = payload.runs.filter((r) => r.productCode === GATE_PRODUCT_CODE);
  const editingRun = editingRunId
    ? gateRuns.find((r) => r.runId === editingRunId) ?? null
    : null;

  function handleAdd() {
    setIsAdding(true);
    setEditingRunId(null);
  }

  function handleRemove(runId: string) {
    if (!payload) return;
    dispatch({
      type: 'SET_CANONICAL_PAYLOAD',
      payload: { ...payload, runs: payload.runs.filter((r) => r.runId !== runId) },
    });
  }

  function handleSaveNew(run: CanonicalRun) {
    dispatch({ type: 'UPSERT_RUN', run });
    setIsAdding(false);
  }

  function handleSaveExisting(run: CanonicalRun) {
    dispatch({ type: 'UPSERT_RUN', run });
    setEditingRunId(null);
  }

  const modalOpen = isAdding || editingRun !== null;

  return (
    <div className="space-y-3" data-testid="gate-list-v3">
      {gateRuns.length === 0 ? (
        <p className="text-sm text-brand-muted">No gates configured.</p>
      ) : (
        <ul className="space-y-2">
          {gateRuns.map((run, idx) => (
            <li
              key={run.runId}
              data-testid={`gate-run-${idx}`}
              className="flex items-center justify-between px-3 py-3 bg-brand-bg border border-brand-border rounded-lg hover:border-brand-accent/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center shrink-0 border border-brand-accent/20">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{gateLabel(run)}</p>
                  <p className="text-xs text-brand-muted mt-0.5 truncate">{gateSubLabel(run)}</p>
                </div>
              </div>
              <div className="flex gap-1 ml-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setEditingRunId(run.runId)}
                  data-testid={`gate-edit-${idx}`}
                  aria-label="Edit gate"
                  className="p-1.5 rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-border/60 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(run.runId)}
                  data-testid={`gate-remove-${idx}`}
                  aria-label="Remove gate"
                  className="p-1.5 rounded-md text-brand-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAdd}
        data-testid="gate-add"
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-accent hover:bg-brand-accent/10 rounded-md transition-colors"
      >
        <PlusCircle size={14} />
        Add gate
      </button>

      {modalOpen && (
        <GateFormV3
          initialRun={editingRun}
          runFields={runFields}
          segmentFields={segmentFields}
          onCancel={() => {
            setIsAdding(false);
            setEditingRunId(null);
          }}
          onSave={editingRun ? handleSaveExisting : handleSaveNew}
        />
      )}
    </div>
  );
}
