import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  /** Small badge rendered to the right of the title (e.g. a count or "optional"). */
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AccordionSection({ title, badge, defaultOpen = true, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`bg-brand-card border rounded-lg overflow-hidden transition-colors ${open ? 'border-brand-border' : 'border-brand-border'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="accordion-trigger w-full flex items-center justify-between px-5 py-4 text-left hover:bg-brand-border/20 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-brand-text text-sm">{title}</span>
          {badge !== undefined && (
            <span className="text-xs font-medium text-brand-muted bg-brand-border/60 px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-brand-muted group-hover:text-brand-text transition-all duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-brand-border">
          <div className="px-5 pb-5 pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
