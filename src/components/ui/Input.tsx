import { forwardRef } from "react";
import { cn } from "../../lib";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text",
          "focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
        {...rest}
      />
    );
  },
);

Input.displayName = "Input";
