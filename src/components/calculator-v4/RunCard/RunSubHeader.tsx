import { Edit2 } from "lucide-react";
import { COLOUR_HEX } from "../../../lib/colourHex";

export type RunTab = "style" | "posts" | "defaults";

interface Props {
  editing: boolean;
  onToggleEditing: () => void;
  effectiveVars: Record<string, string | number | boolean>;
  activeTab: RunTab;
  onTabChange: (tab: RunTab) => void;
  isBayg?: boolean;
}

const TABS: { id: RunTab; label: string }[] = [
  { id: "style", label: "Style" },
  { id: "posts", label: "Posts & mounting" },
  { id: "defaults", label: "Defaults" },
];

export function RunSubHeader({
  editing,
  onToggleEditing,
  effectiveVars,
  activeTab,
  onTabChange,
  isBayg = false,
}: Props) {
  const colourCode = String(effectiveVars["colour_code"] ?? "");
  const colourHex = COLOUR_HEX[colourCode];
  const tabs = isBayg ? TABS.filter((tab) => tab.id !== "posts") : TABS;

  return (
    <div className="flex items-center min-h-[40px]">
      <div className="flex-1 overflow-hidden">
        {!editing ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-neutral-500 font-mono tabular-nums">
            <span className="flex items-center gap-1.5">
              {colourHex && (
                <span
                  className="w-2.5 h-2.5 rounded-sm ring-1 ring-neutral-700"
                  style={{ backgroundColor: colourHex }}
                />
              )}
              {colourCode || "—"}
            </span>
            <span>·</span>
            <span>{String(effectiveVars["slat_size_mm"] ?? "—")}mm slat</span>
            <span>·</span>
            <span>{String(effectiveVars["slat_gap_mm"] ?? "—")}mm gap</span>
            <span>·</span>
            <span>{String(effectiveVars["mounting_type"] ?? "—")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-0 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={[
                  "py-2 px-3 text-xs font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-brand-accent text-brand-accent"
                    : "border-transparent text-neutral-500 hover:text-neutral-300",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 px-3">
        <button
          onClick={onToggleEditing}
          type="button"
          title="Edit fence specifications for this run (colour, slats, posts, defaults)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/60 min-w-[5.5rem] justify-center transition-colors"
          data-testid="v4-run-edit-toggle"
        >
          <Edit2 size={12} aria-hidden />
          {editing ? "Done" : "Edit specs"}
        </button>
      </div>
    </div>
  );
}
