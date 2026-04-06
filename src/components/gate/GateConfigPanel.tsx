import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useGates } from '../../context/GateContext';
import type { GateConfig } from '../../schemas/gate.schema';
import { GateModal } from './GateModal';
import { GateList } from './GateList';

type EditingState =
  | { mode: 'idle' }
  | { mode: 'adding'; id: string }
  | { mode: 'editing'; id: string };

export function GateConfigPanel() {
  const { gates, dispatch } = useGates();
  const [editing, setEditing] = useState<EditingState>({ mode: 'idle' });

  const handleSave = (gate: GateConfig) => {
    if (editing.mode === 'adding') {
      dispatch({ type: 'ADD_GATE', gate });
    } else if (editing.mode === 'editing') {
      dispatch({ type: 'UPDATE_GATE', id: gate.id, updates: gate });
    }
    setEditing({ mode: 'idle' });
  };

  const handleEdit = (id: string) => {
    setEditing({ mode: 'editing', id });
  };

  const handleRemove = (id: string) => {
    dispatch({ type: 'REMOVE_GATE', id });
    if (editing.mode === 'editing' && editing.id === id) {
      setEditing({ mode: 'idle' });
    }
  };

  const handleClose = () => {
    setEditing({ mode: 'idle' });
  };

  const editingGate =
    editing.mode === 'editing'
      ? gates.find((g) => g.id === editing.id)
      : undefined;

  return (
    <div>
      {/* Gate list */}
      <GateList
        gates={gates}
        onEdit={handleEdit}
        onRemove={handleRemove}
      />

      {/* Add gate button */}
      <button
        type="button"
        onClick={() => setEditing({ mode: 'adding', id: crypto.randomUUID() })}
        data-testid="add-gate-btn"
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-accent border border-dashed border-brand-accent/30 rounded-lg hover:bg-brand-accent/5 hover:border-brand-accent/60 transition-colors"
      >
        <Plus size={15} />
        Add Gate
      </button>

      {/* Modal */}
      {editing.mode !== 'idle' && (
        <GateModal
          mode={editing.mode}
          gateId={editing.id}
          initialValues={editingGate}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
