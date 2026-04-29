import { type ReactNode } from "react";

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
}

export function Segmented({
  value,
  onChange,
  options,
  size = "sm",
  className = "",
}: SegmentedProps) {
  const sizeClasses =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div
      className={`inline-flex rounded-lg bg-neutral-200 p-0.5 gap-0.5 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-md font-medium transition-all",
              sizeClasses,
              active
                ? "bg-neutral-700 text-neutral-100 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
