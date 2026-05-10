import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type EntryChoiceVariant = "draw" | "describe" | "select";

function ChoiceIcon({ variant, fallback: Icon }: { variant: EntryChoiceVariant; fallback?: LucideIcon }) {
  if (variant === "draw") {
    return (
      <span className="entry-card-blueprint relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-primary/20 bg-brand-primary/5 text-brand-primary">
        <svg className="entry-card-pencil" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21l4-1 11.5-11.5a2 2 0 0 0 0-2.83l-1.17-1.17a2 2 0 0 0-2.83 0L3 16v5z" />
          <path d="M14 7l3 3" />
          <path className="entry-card-draw-line" d="M3 21h7" strokeWidth="1.5" />
        </svg>
      </span>
    );
  }
  if (variant === "describe") {
    return (
      <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-warning/20 bg-brand-warning/5 text-brand-primary">
        <svg className="entry-card-speech" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <path d="M8 10h6" />
          <path d="M8 13h4" />
        </svg>
        <span className="entry-card-mic absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-brand-warning" />
      </span>
    );
  }
  if (variant === "select") {
    return (
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-success/25 bg-brand-success/10 text-brand-primary">
        <svg viewBox="0 0 28 28" width="26" height="26" fill="none" aria-hidden>
          <rect className="entry-card-grid-cell" x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="transparent" />
          <path d="M5 6h6M5 8h6M5 10h6" stroke="currentColor" strokeWidth="0.8" />
          <rect className="entry-card-grid-cell" x="15" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="transparent" />
          <path d="M18 5v6M20 5v6M22 5v6" stroke="currentColor" strokeWidth="0.8" />
          <rect className="entry-card-grid-cell" x="3" y="15" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="transparent" />
          <rect x="5.5" y="17.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
          <rect className="entry-card-grid-cell" x="15" y="15" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="transparent" />
          <path d="M17 17v6M19 17v6M21 17v6M23 17v6" stroke="currentColor" strokeWidth="0.7" />
        </svg>
      </span>
    );
  }
  return Icon ? (
    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-bg text-brand-primary">
      <Icon size={20} strokeWidth={2.25} />
    </span>
  ) : null;
}

export function EntryChoiceCard({
  number,
  title,
  description,
  icon: Icon,
  variant,
  onClick,
}: {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  icon?: LucideIcon;
  variant: EntryChoiceVariant;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="entry-choice-card group flex min-h-[100px] w-full items-start gap-3 rounded-lg border border-brand-border bg-brand-card p-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-brand-primary active:translate-y-0"
    >
      <span
        className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums text-white"
        style={{
          background: "linear-gradient(180deg, #34464E 0%, #2D3F46 100%)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.10), inset 0 -1px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        {number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-2 flex items-center gap-3">
          <ChoiceIcon variant={variant} fallback={Icon} />
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-[15px] font-extrabold leading-snug text-brand-text">
              {title}
            </span>
            <ChevronRight
              size={16}
              className="ml-auto shrink-0 translate-x-[-3px] text-brand-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden
            />
          </span>
        </span>
        <span className="block text-[13px] font-semibold leading-relaxed text-brand-muted">
          {description}
        </span>
      </span>
    </button>
  );
}
