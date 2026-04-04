import { AppShell } from '../components/layout/AppShell';

export function MainApp() {
  return (
    <AppShell>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-brand-card border border-brand-border rounded-lg p-8 text-center">
            <h2 className="text-brand-text text-xl font-semibold mb-2">
              BOM Generator
            </h2>
            <p className="text-brand-muted text-sm">
              Phase 2 — Fence configuration form coming next.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
