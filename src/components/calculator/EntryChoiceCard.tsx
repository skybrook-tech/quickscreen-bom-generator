import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function EntryChoiceCard({
  number,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[112px] w-full items-start gap-3 rounded-lg border border-brand-border bg-brand-card p-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-brand-primary hover:shadow-sm active:translate-y-0"
    >
      <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-black tabular-nums text-white shadow-sm">
        {number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-2 flex items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-primary/5 text-brand-primary transition-colors group-hover:border-brand-primary group-hover:bg-brand-primary/10">
            <Icon size={20} strokeWidth={2.25} />
          </span>
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
