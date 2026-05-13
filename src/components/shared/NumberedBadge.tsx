import type { ReactNode } from "react";

interface NumberedBadgeProps {
  children: ReactNode;
  title?: string;
  active?: boolean;
  interactive?: boolean;
  className?: string;
}

export function NumberedBadge({
  children,
  title,
  active = false,
  interactive = false,
  className = "",
}: NumberedBadgeProps) {
  const classes = [
    "inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-brand-warning bg-brand-warning px-1.5 text-[11px] font-black leading-none text-brand-text shadow-sm transition",
    active ? "ring-2 ring-brand-primary/45 ring-offset-1 ring-offset-brand-card" : "",
    interactive ? "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-primary/40" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} title={title}>
      {children}
    </span>
  );
}
