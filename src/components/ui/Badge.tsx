import { cn } from "../../lib";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "border-brand-border bg-brand-card text-brand-muted",
  success: "border-brand-success/50 bg-brand-success/10 text-brand-success",
  warning: "border-brand-warning/50 bg-brand-warning/10 text-brand-warning",
  danger: "border-brand-danger/50 bg-brand-danger/10 text-brand-danger",
  info: "border-brand-accent/50 bg-brand-accent/10 text-brand-accent",
};

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
