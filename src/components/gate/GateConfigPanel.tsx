import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useGates } from '../../context/GateContext';
import type { GateConfig } from '../../schemas/gate.schema';
import { GateForm } from './GateForm';
import { GateList } from './GateList';

type EditingState =
  | { mode: 'idle' }
  | { mode: 'adding' }
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
    // If currently editing this gate, close the form
    if (editing.mode === 'editing' && editing.id === id) {
      setEditing({ mode: 'idle' });
    }
  };

  const handleCancel = () => {
    setEditing({ mode: 'idle' });
  };

  const editingGate =
    editing.mode === 'editing'
      ? gates.find((g) => g.id === editing.id)
      : undefined;

  const newGateId =
    editing.mode === 'adding' ? crypto.randomUUID() : '';

  return (
    <div>
      {/* Gate list */}
      <GateList
        gates={gates}
        onEdit={handleEdit}
        onRemove={handleRemove}
      />

      {/* Inline form */}
      {editing.mode === 'idle' ? (
        <button
          type="button"
          onClick={() => setEditing({ mode: 'adding' })}
          data-testid="add-gate-btn"
          className="mt-3 flex items-center gap-2 text-sm text-brand-accent hover:text-brand-accent-hover transition-colors"
        >
          <Plus size={16} />
          Add Gate
        </button>
      ) : (
        <div className="mt-4 p-4 border border-brand-border rounded-md bg-brand-card">
          <h3 className="text-sm font-semibold text-brand-text mb-4">
            {editing.mode === 'adding' ? 'Add Gate' : 'Edit Gate'}
          </h3>
          <GateForm
            gateId={editing.mode === 'adding' ? newGateId : editing.id}
            initialValues={editingGate}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
