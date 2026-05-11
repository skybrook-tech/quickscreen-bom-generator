import { Map, Route } from "lucide-react";

export type RightPaneView = "map" | "plan";

interface RightPaneTabsProps {
  activeView: RightPaneView;
  onChange: (view: RightPaneView) => void;
}

const tabs: Array<{ id: RightPaneView; label: string; icon: typeof Map }> = [
  { id: "map", label: "Map", icon: Map },
  { id: "plan", label: "Plan", icon: Route },
];

export function RightPaneTabs({ activeView, onChange }: RightPaneTabsProps) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-brand-border bg-brand-card/95 px-3 py-2 backdrop-blur">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition-colors hover:shadow-sm ${
            activeView === id
              ? "bg-brand-primary text-white"
              : "border border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary"
          }`}
          aria-pressed={activeView === id}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
      {activeView === "map" && (
        <button
          type="button"
          onClick={() => onChange("plan")}
          className="ml-1 rounded-lg border border-brand-border px-3 py-2 text-xs font-black text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
          title="Minimize map to Plan view"
        >
          Minimize map
        </button>
      )}
      <p className="ml-auto hidden text-xs font-bold text-brand-muted sm:block">
        Switch views without losing the layout
      </p>
    </div>
  );
}
