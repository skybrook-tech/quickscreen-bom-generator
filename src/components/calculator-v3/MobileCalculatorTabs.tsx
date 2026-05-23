import { ClipboardList, Map, ReceiptText } from "lucide-react";
import type { MobileCalculatorTab } from "../../lib/mobileShell";

export type { MobileCalculatorTab };

const TABS: Array<{
  id: MobileCalculatorTab;
  label: string;
  Icon: typeof ClipboardList;
}> = [
  { id: "job", label: "Job", Icon: ClipboardList },
  { id: "map", label: "Map", Icon: Map },
  { id: "bom", label: "BOM", Icon: ReceiptText },
];

interface MobileCalculatorTabsProps {
  activeTab: MobileCalculatorTab;
  onChange: (tab: MobileCalculatorTab) => void;
}

export function MobileCalculatorTabs({
  activeTab,
  onChange,
}: MobileCalculatorTabsProps) {
  return (
    <nav
      data-testid="mobile-calculator-tabs"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-brand-border bg-brand-card/95 px-2 pb-[calc(var(--safe-bottom)+0.5rem)] pt-2 shadow-2xl backdrop-blur md:hidden"
      style={{
        paddingLeft: "max(0.5rem, var(--safe-left))",
        paddingRight: "max(0.5rem, var(--safe-right))",
      }}
      aria-label="Calculator sections"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold transition-[background-color,color,opacity] duration-200 ${
              active
                ? "bg-brand-primary text-white opacity-100"
                : "text-brand-muted opacity-80 hover:bg-brand-border/40 hover:text-brand-text hover:opacity-100"
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
