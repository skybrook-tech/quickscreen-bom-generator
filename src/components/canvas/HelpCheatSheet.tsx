import { X } from "lucide-react";

interface HelpCheatSheetProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: "Drawing fence runs",
    items: [
      "Choose Draw, then click each corner or change of direction.",
      "Double-click the last blue marker to finish the run.",
      "Use Move / Edit to drag points or click a length label to edit the measurement.",
    ],
  },
  {
    title: "Placing gates",
    items: [
      "Choose Gate, then click a fence segment.",
      "Drag a gate in Move / Edit mode to reposition it.",
      "Open the gate editor to choose single, double, sliding, and swing direction.",
    ],
  },
  {
    title: "Map underlay & address",
    items: [
      "Enter the job address to load the satellite underlay.",
      "The map auto-calibrates the canvas scale when it loads.",
      "Use Boundary to draw existing fences, walls, or property lines for context only.",
    ],
  },
  {
    title: "Keyboard shortcuts",
    items: [
      "Ctrl+Z undo. Ctrl+Y or Ctrl+Shift+Z redo.",
      "Scroll to zoom. Right-drag to pan the canvas.",
      "Escape finishes or cancels the active drawing action.",
    ],
  },
];

export function HelpCheatSheet({ open, onClose }: HelpCheatSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Layout map help"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-brand-text">
              Layout map help
            </h2>
            <p className="mt-1 text-xs text-brand-muted">
              Quick reference for drawing runs, gates, and map underlays.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="rounded-lg border border-brand-border p-2 text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-text"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-lg border border-brand-border bg-brand-bg/50 p-4"
            >
              <h3 className="text-sm font-semibold text-brand-text">
                {section.title}
              </h3>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-brand-muted">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
