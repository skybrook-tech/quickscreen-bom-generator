import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GateForm } from './GateForm';
import type { GateConfig } from '../../schemas/gate.schema';

interface GateModalProps {
  mode: 'adding' | 'editing';
  gateId: string;
  initialValues?: Partial<GateConfig>;
  onSave: (gate: GateConfig) => void;
  onClose: () => void;
  /** Optional suffix shown next to the modal title, e.g. "(2 remaining)" */
  headerSuffix?: string;
}

export function GateModal({ mode, gateId, initialValues, onSave, onClose, headerSuffix }: GateModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'adding' ? 'Add Gate' : 'Edit Gate'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-2xl bg-brand-card border border-brand-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <h2 className="text-base font-semibold text-brand-text flex items-baseline gap-2">
            {mode === 'adding' ? 'Add Gate' : 'Edit Gate'}
            {headerSuffix && (
              <span className="text-xs font-normal text-brand-muted">{headerSuffix}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-border/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 overflow-y-auto max-h-[80vh]">
          <GateForm
            gateId={gateId}
            initialValues={initialValues}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
