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
      <p className="text-sm text-brand-muted py-2">No gates configured.</p>
    );
  }

  return (
    <ul className="space-y-2" data-testid="gate-list">
      {gates.map((gate, idx) => (
        <li
          key={gate.id}
          data-testid={`gate-item-${idx}`}
          className="flex items-center justify-between px-3 py-2.5 bg-brand-bg border border-brand-border rounded-md"
        >
          <div>
            <p className="text-sm font-medium text-brand-text">{gateLabel(gate)}</p>
            <p className="text-xs text-brand-muted mt-0.5">{gateSubLabel(gate)}</p>
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(gate.id)}
              data-testid={`gate-edit-${idx}`}
              aria-label="Edit gate"
              className="p-1.5 text-brand-muted hover:text-brand-text transition-colors"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(gate.id)}
              data-testid={`gate-remove-${idx}`}
              aria-label="Remove gate"
              className="p-1.5 text-brand-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
