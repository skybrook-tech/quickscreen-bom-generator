import { cn } from "../../lib";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "border-brand-border bg-brand-card text-brand-muted",
  success:
    "border-green-500/50 bg-green-500/10 text-green-400",
  warning:
    "border-amber-500/50 bg-amber-500/10 text-amber-400",
  danger:
    "border-red-500/50 bg-red-500/10 text-red-400",
  info:
    "border-brand-accent/50 bg-brand-accent/10 text-brand-accent",
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
