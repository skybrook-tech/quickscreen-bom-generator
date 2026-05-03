import { cn } from "../../lib";
import { type LucideIcon } from "lucide-react";

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: keyof typeof variants;
  icon: LucideIcon;
  size?: keyof typeof sizes;
}

const sharedStyles = "rounded-lg flex items-center gap-2 hover:opacity-70";

const variants = {
  secondary:
    "bg-brand-bg border border-brand-border text-brand-text hover:bg-brand-border/20",
  primary: "bg-brand-accent text-brand-bg hover:bg-brand-accent/80",
  danger: "bg-brand-danger text-white hover:bg-brand-danger/90",
  warning: "bg-brand-warning text-white hover:bg-brand-warning/90",
  info: "bg-brand-primary text-white hover:bg-brand-primary/90",
  success: "bg-brand-success text-white hover:bg-brand-success/90",
  ghost: "bg-transparent text-brand-accent border border-brand-accent",
  "ghost-danger": "bg-transparent text-brand-danger border border-brand-danger",
  link: "text-brand-accent hover:text-brand-accent/80",
};

const sizes = {
  small: "px-2 py-1 text-xs",
  medium: "px-3 py-1.5 text-sm",
  large: "px-4 py-2 text-base",
};

export function Button({
  children,
  variant = "secondary",
  onClick,
  className,
  icon: IconNode,
  size = "medium",
}: ButtonProps) {
  return (
    <button
      className={cn(sharedStyles, variants[variant], sizes[size], className)}
      onClick={onClick}
    >
      {IconNode && <IconNode size={16} />}
      {children}
    </button>
  );
}
