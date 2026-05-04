import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check, AlertCircle } from 'lucide-react';

// ─── Column definition ────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'boolean' | 'select' | 'json' | 'textarea' | 'readonly';

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  width?: string;
  /** Hide from the table view (show in modal only). */
  modalOnly?: boolean;
}

interface EngineTableProps<T extends { id: string }> {
  columns: ColumnDef[];
  data: T[];
  isLoading?: boolean;
  /** Extra fixed fields injected on insert (e.g. org_id, product_id). */
  defaultValues?: Partial<T>;
  onSave: (row: Partial<T>, isNew: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyMessage?: string;
  entityLabel?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(value: string, max = 60) {
  return value.length > max ? value.slice(0, max) + '…' : value;
}

function displayValue(value: unknown, type: ColumnType): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-brand-border/60 italic text-xs">—</span>;
  }
  if (type === 'boolean') {
    return (
      <span className={`text-xs font-medium ${value ? 'text-brand-success' : 'text-brand-muted'}`}>
        {value ? 'true' : 'false'}
      </span>
    );
  }
  if (type === 'json') {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return (
        <code className="text-xs text-brand-muted font-mono">
          {truncate(str, 50)}
        </code>
      );
    } catch {
      return <span className="text-xs text-brand-danger">invalid json</span>;
    }
  }
  if (type === 'textarea') {
    return <span className="text-xs text-brand-text">{truncate(String(value), 80)}</span>;
  }
  return <span className="text-xs text-brand-text">{truncate(String(value), 60)}</span>;
}

function parseFieldValue(raw: string, type: ColumnType): unknown {
  if (type === 'number') return raw === '' ? null : Number(raw);
  if (type === 'boolean') return raw === 'true';
  if (type === 'json') {
    if (raw.trim() === '') return null;
    return JSON.parse(raw); // throws on invalid — caught in modal
  }
  return raw;
}

function toInputValue(value: unknown, type: ColumnType): string {
  if (value === null || value === undefined) return '';
  if (type === 'json') {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
  return String(value);
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps<T extends { id: string }> {
  columns: ColumnDef[];
  row: Partial<T>;
  isNew: boolean;
  entityLabel: string;
  onSave: (row: Partial<T>) => Promise<void>;
  onClose: () => void;
}

function EditModal<T extends { id: string }>({
  columns,
  row,
  isNew,
  entityLabel,
  onSave,
  onClose,
}: EditModalProps<T>) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const col of columns) {
      if (col.type === 'readonly') continue;
      init[col.key] = toInputValue((row as Record<string, unknown>)[col.key], col.type);
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    try {
      const parsed: Record<string, unknown> = { ...row };
      for (const col of columns) {
        if (col.type === 'readonly') continue;
        parsed[col.key] = parseFieldValue(form[col.key] ?? '', col.type);
      }
      setSaving(true);
      await onSave(parsed as Partial<T>);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-brand-card border border-brand-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <h2 className="text-sm font-semibold text-brand-text">
            {isNew ? `Add ${entityLabel}` : `Edit ${entityLabel}`}
          </h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text p-1 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {columns
            .filter((c) => c.type !== 'readonly')
            .map((col) => (
              <div key={col.key}>
                <label className="block text-xs font-medium text-brand-muted mb-1">
                  {col.label}
                  {col.required && <span className="text-brand-danger ml-0.5">*</span>}
                </label>

                {col.type === 'select' ? (
                  <select
                    value={form[col.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [col.key]: e.target.value }))}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                  >
                    <option value="">— select —</option>
                    {col.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : col.type === 'boolean' ? (
                  <select
                    value={form[col.key] ?? 'true'}
                    onChange={(e) => setForm((f) => ({ ...f, [col.key]: e.target.value }))}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : col.type === 'textarea' || col.type === 'json' ? (
                  <textarea
                    value={form[col.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [col.key]: e.target.value }))}
                    rows={col.type === 'json' ? 4 : 3}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-sm text-brand-text font-mono focus:outline-none focus:border-brand-accent resize-y"
                    placeholder={col.type === 'json' ? '{}' : undefined}
                  />
                ) : (
                  <input
                    type={col.type === 'number' ? 'number' : 'text'}
                    value={form[col.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [col.key]: e.target.value }))}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                  />
                )}
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-brand-border flex items-center justify-between">
          {error ? (
            <div className="flex items-center gap-2 text-xs text-brand-danger">
              <AlertCircle size={16} />
              {error}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-brand-muted hover:text-brand-text border border-brand-border rounded hover:bg-brand-border/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-accent text-white rounded hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
            >
              <Check size={16} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EngineTable ──────────────────────────────────────────────────────────────

export function EngineTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  defaultValues,
  onSave,
  onDelete,
  emptyMessage = 'No rows',
  entityLabel = 'row',
}: EngineTableProps<T>) {
  const [editing, setEditing] = useState<{ row: Partial<T>; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visibleCols = columns.filter((c) => !c.modalOnly);

  const handleAdd = () => {
    setEditing({ row: { ...defaultValues } as Partial<T>, isNew: true });
  };

  const handleEdit = (row: T) => {
    setEditing({ row: { ...row }, isNew: false });
  };

  const handleDeleteConfirm = async (id: string) => {
    setDeleteError(null);
    try {
      await onDelete(id);
      setDeleting(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-brand-muted animate-pulse">Loading…</div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-brand-muted">{data.length} row{data.length !== 1 ? 's' : ''}</span>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-brand-accent/10 text-brand-accent border border-brand-accent/30 rounded hover:bg-brand-accent/20 transition-colors"
        >
          <Plus size={16} />
          Add {entityLabel}
        </button>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="py-10 text-center text-sm text-brand-muted border border-dashed border-brand-border rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 text-left font-medium text-brand-muted ${col.width ?? ''}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-medium text-brand-muted w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-brand-border/50 hover:bg-brand-border/10 ${
                    i % 2 === 0 ? '' : 'bg-brand-bg/30'
                  }`}
                >
                  {visibleCols.map((col) => (
                    <td key={col.key} className="px-3 py-2 align-top">
                      {displayValue((row as Record<string, unknown>)[col.key], col.type)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(row)}
                      className="p-1 text-brand-muted hover:text-brand-accent rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => { setDeleting(row.id); setDeleteError(null); }}
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
      )}

      {/* Edit/Add modal */}
      {editing && (
        <EditModal
          columns={columns}
          row={editing.row}
          isNew={editing.isNew}
          entityLabel={entityLabel}
          onSave={(updated) => onSave(updated, editing.isNew)}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirm dialog */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-brand-card border border-brand-border rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-brand-text mb-2">Delete {entityLabel}?</h3>
            <p className="text-xs text-brand-muted mb-4">This cannot be undone.</p>
            {deleteError && (
              <p className="text-xs text-brand-danger mb-3">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeleting(null); setDeleteError(null); }}
                className="px-3 py-1.5 text-xs text-brand-muted hover:text-brand-text border border-brand-border rounded hover:bg-brand-border/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deleting)}
                className="px-3 py-1.5 text-xs font-medium bg-brand-danger/10 text-brand-danger border border-brand-danger/30 rounded hover:bg-brand-danger/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
