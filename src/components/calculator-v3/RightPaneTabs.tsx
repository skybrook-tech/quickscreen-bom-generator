import { FileText, Map } from "lucide-react";

export type RightPaneView = "map" | "bom";

interface RightPaneTabsProps {
  activeView: RightPaneView;
  onChange: (view: RightPaneView) => void;
}

const tabs: Array<{ id: RightPaneView; label: string; icon: typeof Map }> = [
  { id: "map", label: "Map", icon: Map },
  { id: "bom", label: "BOM", icon: FileText },
];

export function RightPaneTabs({ activeView, onChange }: RightPaneTabsProps) {
  return (
    <div className="inline-flex items-center rounded-xl border border-brand-primary/35 bg-brand-bg/70 p-1 shadow-inner">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`inline-flex min-w-[5.5rem] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition-colors ${
            activeView === id
              ? "bg-brand-primary text-white shadow-sm"
              : "text-brand-muted hover:bg-brand-card hover:text-brand-primary"
          }`}
          aria-pressed={activeView === id}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}
