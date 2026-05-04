import { type ReactNode } from "react";
import { cn } from "../../lib";

interface SegmentedOption {
  value: string;
  label: ReactNode;
}

interface SegmentedProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedOption[];
  size?: "sm" | "md";
  className?: string;
  separated?: boolean;
}

export function Segmented({
  value,
  onChange,
  options,
  size = "sm",
  className = "",
  separated = false,
}: SegmentedProps) {
  const sizeClasses =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div
      className={cn(
        "inline-flex rounded-full p-0.5",
        separated
          ? "bg-slate-200/80 dark:bg-white/10 gap-2"
          : "bg-brand-bg gap-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn([
              "rounded-full font-medium transition-all",
              sizeClasses,
              {
                "bg-brand-accent text-white shadow-sm": active || separated,
                "text-brand-text hover:text-brand-accent": !active && !separated,
              },
            ])}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
