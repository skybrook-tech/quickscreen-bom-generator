import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';

interface ColourRow {
  id: string;
  org_id: string;
  value: string;
  short_code: string;
  label: string;
  finish_group: string;
  limited: boolean;
  sort_order: number;
  active: boolean;
}

type EditState = Omit<ColourRow, 'id' | 'org_id'>;

const EMPTY_EDIT: EditState = {
  value: '',
  short_code: '',
  label: '',
  finish_group: 'standard',
  limited: false,
  sort_order: 0,
  active: true,
};

const FINISH_GROUPS = ['standard', 'alumawood'];

const GROUP_COLOURS: Record<string, string> = {
  standard: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20',
  alumawood: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20',
};

export function ColoursAdminPage() {
  const qc = useQueryClient();
  const { orgId: orgId_ } = useProfile();
  const orgId = orgId_ ?? '';

  const { data: colours, isLoading, error } = useQuery<ColourRow[]>({
    queryKey: ['admin-colour-options'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colour_options')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as ColourRow[];
    },
  });

  const [editing, setEditing] = useState<{ row: ColourRow | null; state: EditState } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: async ({ row, state }: { row: ColourRow | null; state: EditState }) => {
      if (!orgId) throw new Error('org_id not loaded');
      if (row) {
        const { error } = await supabase
          .from('colour_options')
          .update({ ...state })
          .eq('id', row.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('colour_options')
          .insert({ ...state, org_id: orgId });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-colour-options'] });
      qc.invalidateQueries({ queryKey: ['colour-options'] });
      setEditing(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('colour_options').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-colour-options'] });
      qc.invalidateQueries({ queryKey: ['colour-options'] });
    },
  });

  const handleEdit = (row: ColourRow) => {
    setFormError(null);
    setEditing({
      row,
      state: {
        value: row.value,
        short_code: row.short_code,
        label: row.label,
        finish_group: row.finish_group,
        limited: row.limited,
        sort_order: row.sort_order,
        active: row.active,
      },
    });
  };

  const handleAdd = () => {
    setFormError(null);
    setEditing({ row: null, state: { ...EMPTY_EDIT } });
  };

  const handleSave = () => {
    if (!editing) return;
    setFormError(null);
    saveMut.mutate({ row: editing.row, state: editing.state });
  };

  const updateField = (key: keyof EditState, value: unknown) => {
    setEditing((prev) => prev ? { ...prev, state: { ...prev.state, [key]: value } } : null);
  };

  const standard = colours?.filter((c) => c.finish_group === 'standard') ?? [];
  const alumawood = colours?.filter((c) => c.finish_group === 'alumawood') ?? [];
  const other = colours?.filter((c) => !['standard', 'alumawood'].includes(c.finish_group)) ?? [];

  return (
    <AdminLayout
      title="Colour Options"
      subtitle="Global colour registry. finish_group controls which product family sees each colour (standard = QuickScreen, alumawood = Xpress/Alumawood)."
    >
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-brand-accent/10 text-brand-accent border border-brand-accent/30 rounded hover:bg-brand-accent/20 transition-colors"
        >
          <Plus size={16} />
          Add colour
        </button>
      </div>

      {isLoading && <div className="text-sm text-brand-muted animate-pulse">Loading…</div>}
      {error && (
        <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-sm text-brand-danger">
          {(error as Error).message}
        </div>
      )}

      {[
        { label: 'Standard (QuickScreen)', items: standard },
        { label: 'Alumawood', items: alumawood },
        { label: 'Other', items: other },
      ].map(
        ({ label, items }) =>
          items.length > 0 && (
            <section key={label} className="mb-8">
              <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
                {label}
              </h2>
              <div className="rounded-lg border border-brand-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-bg/50">
                      <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Value (slug)</th>
                      <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Code</th>
                      <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Label</th>
                      <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Group</th>
                      <th className="px-3 py-2.5 text-left font-medium text-brand-muted w-16">Limited</th>
                      <th className="px-3 py-2.5 text-left font-medium text-brand-muted w-16">Sort</th>
                      <th className="px-3 py-2.5 text-left font-medium text-brand-muted w-16">Active</th>
                      <th className="px-3 py-2.5 w-20 text-right font-medium text-brand-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c, i) => (
                      <tr
                        key={c.id}
                        className={`border-b border-brand-border/50 hover:bg-brand-border/10 ${
                          i % 2 === 0 ? '' : 'bg-brand-bg/30'
                        } ${!c.active ? 'opacity-50' : ''}`}
                      >
                        <td className="px-3 py-2 font-mono text-brand-text">{c.value}</td>
                        <td className="px-3 py-2 font-mono text-brand-accent font-bold">{c.short_code}</td>
                        <td className="px-3 py-2 text-brand-text">{c.label}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${
                              GROUP_COLOURS[c.finish_group] ?? 'text-brand-muted bg-brand-bg border-brand-border'
                            }`}
                          >
                            {c.finish_group}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {c.limited && (
                            <span className="text-xs text-brand-warning">limited</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-brand-muted">{c.sort_order}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs ${c.active ? 'text-brand-success' : 'text-brand-muted'}`}>
                            {c.active ? 'yes' : 'no'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(c)}
                            className="p-1 text-brand-muted hover:text-brand-accent rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${c.label}"?`)) deleteMut.mutate(c.id);
                            }}
                            className="p-1 text-brand-muted hover:text-brand-danger rounded transition-colors ml-1"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
      )}

      {/* Edit/Add modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-brand-card border border-brand-border rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <h2 className="text-sm font-semibold text-brand-text">
                {editing.row ? 'Edit Colour' : 'Add Colour'}
              </h2>
              <button onClick={() => setEditing(null)} className="text-brand-muted hover:text-brand-text p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {[
                { key: 'value', label: 'Value (slug, e.g. black-satin)', type: 'text' },
                { key: 'short_code', label: 'Short Code (e.g. B)', type: 'text' },
                { key: 'label', label: 'Display Label', type: 'text' },
                { key: 'sort_order', label: 'Sort Order', type: 'number' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-brand-muted mb-1">{label}</label>
                  <input
                    type={type}
                    value={String(editing.state[key as keyof EditState] ?? '')}
                    onChange={(e) =>
                      updateField(
                        key as keyof EditState,
                        type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1">Finish Group</label>
                <select
                  value={editing.state.finish_group}
                  onChange={(e) => updateField('finish_group', e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  {FINISH_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-brand-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.state.limited}
                    onChange={(e) => updateField('limited', e.target.checked)}
                    className="accent-brand-accent"
                  />
                  Limited availability
                </label>
                <label className="flex items-center gap-2 text-sm text-brand-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.state.active}
                    onChange={(e) => updateField('active', e.target.checked)}
                    className="accent-brand-accent"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-brand-border flex items-center justify-between">
              {formError ? (
                <div className="flex items-center gap-2 text-xs text-brand-danger">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-3 py-1.5 text-xs text-brand-muted hover:text-brand-text border border-brand-border rounded hover:bg-brand-border/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-accent text-white rounded hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
                >
                  <Check size={16} />
                  {saveMut.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
