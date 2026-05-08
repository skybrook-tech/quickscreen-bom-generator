interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * Pill-style tab bar. Shows All / Run N / Gates etc.
 */
export function Tabs({ tabs, activeId, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-brand-border bg-brand-card overflow-x-auto flex-shrink-0">
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--brand-radius-sm)] text-xs font-medium whitespace-nowrap transition ${active
                ? "bg-brand-accent/15 text-brand-accent"
                : "text-brand-muted hover:bg-brand-border/30"
              }`}
            data-testid={`v4-tab-${t.id}`}
          >
            {t.label}
            {t.count != null && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${active
                    ? "bg-brand-accent/20 text-brand-accent"
                    : "bg-brand-border/40 text-brand-muted"
                  }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
