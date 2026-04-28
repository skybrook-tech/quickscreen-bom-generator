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

const sharedStyles = "rounded-md flex items-center gap-2 hover:opacity-70";

const variants = {
  secondary:
    "bg-brand-bg border border-brand-border text-brand-text hover:bg-brand-border/20",
  primary: "bg-brand-accent text-brand-bg hover:bg-brand-accent/80",
  danger: "bg-red-500 text-white hover:bg-red-600",
  warning: "bg-yellow-500 text-white hover:bg-yellow-600",
  info: "bg-blue-500 text-white hover:bg-blue-600",
  success: "bg-green-500 text-white hover:bg-green-600",
  ghost: "bg-transparent text-brand-accent border border-brand-accent",
  "ghost-danger": "bg-transparent text-red-500 border border-red-500",
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
      {IconNode && <IconNode size={14} />}
      {children}
    </button>
  );
}
