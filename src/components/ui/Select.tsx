import { cn } from "../../lib";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children: React.ReactNode;
}

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(
        "bg-white dark:bg-brand-card border border-brand-border dark:border-brand-border rounded-[var(--brand-radius-sm)] px-3 py-2 text-sm text-brand-text",
        "focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
