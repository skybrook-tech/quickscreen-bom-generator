import { Pencil, Trash2 } from 'lucide-react';
import type { GateConfig } from '../../schemas/gate.schema';
import { GATE_TYPES, GATE_POST_SIZES } from '../../lib/constants';

interface GateListProps {
  gates: GateConfig[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

function gateLabel(gate: GateConfig): string {
  const type = GATE_TYPES.find((t) => t.value === gate.gateType)?.label ?? gate.gateType;
  return `${type} — ${gate.openingWidth}mm wide`;
}

function gateSubLabel(gate: GateConfig): string {
  const height = gate.gateHeight === 'match-fence' ? 'match fence height' : `${gate.gateHeight}mm`;
  const postSize = GATE_POST_SIZES.find((p) => p.value === gate.gatePostSize)?.label ?? gate.gatePostSize;
  const colour = gate.colour === 'match-fence' ? 'match fence colour' : gate.colour;
  return `${height} · ${postSize} · ${colour}`;
}

export function GateList({ gates, onEdit, onRemove }: GateListProps) {
  if (gates.length === 0) {
    return (
      <p className="text-sm text-brand-muted py-1">No gates configured.</p>
    );
  }

  return (
    <ul className="space-y-2" data-testid="gate-list">
      {gates.map((gate, idx) => (
        <li
          key={gate.id}
          data-testid={`gate-item-${idx}`}
          className="flex items-center justify-between px-3 py-3 bg-brand-bg border border-brand-border rounded-lg hover:border-brand-accent/40 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center shrink-0 border border-brand-accent/20">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-text truncate">{gateLabel(gate)}</p>
              <p className="text-xs text-brand-muted mt-0.5 truncate">{gateSubLabel(gate)}</p>
            </div>
          </div>
          <div className="flex gap-1 ml-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(gate.id)}
              data-testid={`gate-edit-${idx}`}
              aria-label="Edit gate"
              className="p-1.5 rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-border/60 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(gate.id)}
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
  );
}
